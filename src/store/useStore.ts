import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Article, Placement, Shelf } from '../domain/types';
import { seedArticles, seedShelves } from '../domain/seed';
import { TEMPLATES } from '../domain/constants';
import { autoArrange } from '../domain/autoArrange';
import { computeShelf } from '../domain/metrics';
import {
  articleErrors,
  readBackup,
  validateProject,
  type ProjectData,
  type SavedVersion,
} from '../domain/validation';
import { projectStorage } from './storage';

export type Screen = 'articles' | 'form' | 'shelves' | 'planogram' | 'print';
export type ColorMode = 'cat' | 'rent';
export type Visual = 'blocs' | 'silhouettes' | 'photos';
export type View = 'face' | 'relief';
export type SortKey =
  'name' | 'cat' | 'dims' | 'buy' | 'sell' | 'marge' | 'sales' | 'rent';
export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'u' + Math.random().toString(36).slice(2) + Date.now().toString(36);
export type MoveSource =
  { kind: 'placed'; uid: string } | { kind: 'new'; aid: string };
interface AutoUndo {
  shelfId: string;
  before: number;
  after: number;
}
interface HistoryEntry extends ProjectData {
  versions: SavedVersion[];
  activeVersionName: string;
}
interface State extends ProjectData {
  colorMode: ColorMode;
  visual: Visual;
  view: View;
  printColor: boolean;
  printList: boolean;
  screen: Screen;
  editing: Article | null;
  selectedUid: string | null;
  pendingAid: string | null;
  autoUndo: AutoUndo | null;
  sort: { key: SortKey; dir: 1 | -1 };
  query: string;
  catFilter: string;
  past: HistoryEntry[];
  future: HistoryEntry[];
  versions: SavedVersion[];
  activeVersionName: string;
  lastExportAt: string | null;
  go: (s: Screen) => void;
  openForm: (a: Article | null) => void;
  set: (p: Partial<State>) => void;
  setActiveShelf: (id: string) => void;
  openPlanogram: (id: string, pendingAid?: string | null) => void;
  saveArticle: (a: Article, andPlace: boolean) => void;
  deleteArticle: (id: string) => void;
  updateTpl: (id: string, w: number, h: number, d: number) => void;
  updShelf: (id: string, fn: (s: Shelf) => Shelf) => void;
  addShelf: () => void;
  deleteShelf: (id: string) => void;
  duplicateShelf: (id: string) => void;
  addLevel: (d: number) => void;
  moveTo: (src: MoveSource, levelId: string, idx: number | null) => void;
  removeItem: (uid: string) => void;
  changeF: (uid: string, d: number) => void;
  toggleLock: (uid: string) => void;
  applyArrangement: (place: Shelf['place']) => void;
  runAuto: () => void;
  undoAuto: () => void;
  undo: () => void;
  redo: () => void;
  saveVersion: (name: string) => void;
  restoreVersion: (id: string) => void;
  deleteVersion: (id: string) => void;
  importArticles: (articles: Article[]) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetDemo: () => void;
}
const snapshot = (s: ProjectData): ProjectData => ({
  articles: s.articles,
  tpls: s.tpls,
  shelves: s.shelves,
  activeShelfId: s.activeShelfId,
});
const historySnapshot = (s: State): HistoryEntry => ({
  ...snapshot(s),
  versions: s.versions,
  activeVersionName: s.activeVersionName,
});
const reset = { selectedUid: null, pendingAid: null, autoUndo: null };
const mapPlace = (sh: Shelf, fn: (arr: Placement[]) => Placement[]) =>
  Object.fromEntries(Object.entries(sh.place).map(([k, arr]) => [k, fn(arr)]));
const initialData = (): ProjectData => ({
  articles: seedArticles(),
  shelves: seedShelves(),
  tpls: TEMPLATES,
  activeShelfId: 's1',
});

export const useStore = create<State>()(
  persist(
    (rawSet, get) => {
      const set = (patch: Partial<State> | ((s: State) => Partial<State>)) =>
        rawSet((s) => {
          const next = typeof patch === 'function' ? patch(s) : patch;
          const dataChanged = (['articles', 'shelves', 'tpls'] as const).some(
            (k) => next[k] !== undefined && next[k] !== s[k],
          );
          const changed =
            dataChanged ||
            (next.versions !== undefined && next.versions !== s.versions);
          return changed
            ? {
                ...next,
                past: [...s.past.slice(-29), historySnapshot(s)],
                future: [],
                activeVersionName:
                  next.activeVersionName ??
                  (dataChanged ? 'Brouillon' : s.activeVersionName),
                autoUndo: next.autoUndo ?? null,
              }
            : next;
        });
      return {
        ...initialData(),
        colorMode: 'cat',
        visual: 'silhouettes',
        view: 'face',
        printColor: true,
        printList: true,
        screen: 'articles',
        editing: null,
        ...reset,
        sort: { key: 'rent', dir: -1 },
        query: '',
        catFilter: 'all',
        past: [],
        future: [],
        versions: [],
        activeVersionName: 'Brouillon',
        lastExportAt: null,
        go: (screen) =>
          set({ screen, editing: null, selectedUid: null, pendingAid: null }),
        openForm: (editing) => set({ screen: 'form', editing }),
        set,
        setActiveShelf: (activeShelfId) => set({ activeShelfId, ...reset }),
        openPlanogram: (id, pendingAid = null) =>
          set({ activeShelfId: id, screen: 'planogram', ...reset, pendingAid }),
        saveArticle: (a, andPlace) => {
          const errors = articleErrors(a);
          if (errors.length) throw new Error(errors[0]);
          if (
            a.ean &&
            get().articles.some((x) => x.id !== a.id && x.ean === a.ean)
          )
            throw new Error('Cet EAN est déjà attribué à un autre article.');
          set((s) => {
            const articles = s.articles.some((x) => x.id === a.id)
              ? s.articles.map((x) => (x.id === a.id ? a : x))
              : [...s.articles, a];
            const target = s.shelves.find((sh) => sh.cats.includes(a.cat));
            return {
              articles,
              editing: null,
              ...reset,
              screen: andPlace
                ? target
                  ? 'planogram'
                  : 'shelves'
                : 'articles',
              ...(andPlace && target
                ? { activeShelfId: target.id, pendingAid: a.id }
                : {}),
            };
          });
        },
        deleteArticle: (id) =>
          set((s) => ({
            articles: s.articles.filter((a) => a.id !== id),
            shelves: s.shelves.map((sh) => ({
              ...sh,
              place: mapPlace(sh, (arr) => arr.filter((p) => p.aid !== id)),
            })),
            editing: null,
            screen: 'articles',
            ...reset,
          })),
        updateTpl: (id, w, h, d) => {
          if (
            ![w, h, d].every((v) => Number.isFinite(v) && v >= 0.1 && v <= 300)
          )
            throw new Error('Dimensions du gabarit invalides.');
          set((s) => ({
            tpls: s.tpls.map((t) => (t.id === id ? { ...t, w, h, d } : t)),
          }));
        },
        updShelf: (id, fn) =>
          set((s) => ({
            shelves: s.shelves.map((sh) => (sh.id === id ? fn(sh) : sh)),
          })),
        addShelf: () =>
          set((s) => {
            const id = 's' + uid();
            const ids = [0, 1, 2, 3].map(() => 'L' + uid());
            const shelf: Shelf = {
              id,
              name: 'Nouvelle étagère',
              cats: [],
              width: 100,
              depth: 40,
              levels: ids.map((id) => ({ id, h: 40, zone: null })),
              place: Object.fromEntries(ids.map((id) => [id, []])),
            };
            return {
              shelves: [...s.shelves, shelf],
              activeShelfId: id,
              ...reset,
            };
          }),
        deleteShelf: (id) =>
          set((s) =>
            s.shelves.length < 2
              ? {}
              : {
                  shelves: s.shelves.filter((sh) => sh.id !== id),
                  activeShelfId: s.shelves.find((sh) => sh.id !== id)!.id,
                  ...reset,
                },
          ),
        duplicateShelf: (id) =>
          set((s) => {
            const sh = s.shelves.find((x) => x.id === id);
            if (!sh) return {};
            const levels = sh.levels.map((l) => ({ ...l, id: 'L' + uid() }));
            const copy: Shelf = {
              ...sh,
              id: 's' + uid(),
              name: sh.name + ' · copie',
              levels,
              place: Object.fromEntries(
                levels.map((l, i) => [
                  l.id,
                  sh.place[sh.levels[i].id].map((p) => ({ ...p, uid: uid() })),
                ]),
              ),
            };
            return {
              shelves: [...s.shelves, copy],
              activeShelfId: copy.id,
              ...reset,
            };
          }),
        addLevel: (d) =>
          set((s) => ({
            shelves: s.shelves.map((sh) => {
              if (sh.id !== s.activeShelfId) return sh;
              const levels = [...sh.levels];
              const place = { ...sh.place };
              if (d > 0 && levels.length < 8) {
                const id = 'L' + uid();
                levels.push({ id, h: 30, zone: null });
                place[id] = [];
              }
              if (d < 0 && levels.length > 2) {
                const l = levels.pop()!;
                delete place[l.id];
              }
              return { ...sh, levels, place };
            }),
          })),
        moveTo: (src, levelId, idx) =>
          set((s) => {
            const sh = s.shelves.find((x) => x.id === s.activeShelfId);
            if (!sh || !sh.levels.some((l) => l.id === levelId)) return {};
            const place = { ...sh.place };
            let item: Placement | undefined;
            if (src.kind === 'placed')
              for (const k in place) {
                const found = place[k].find((p) => p.uid === src.uid);
                if (found) {
                  item = found;
                  place[k] = place[k].filter((p) => p.uid !== src.uid);
                }
              }
            else if (s.articles.some((a) => a.id === src.aid))
              item = { uid: uid(), aid: src.aid, f: 2 };
            if (!item) return {};
            const arr = [...(place[levelId] ?? [])];
            arr.splice(idx ?? arr.length, 0, item);
            place[levelId] = arr;
            return {
              shelves: s.shelves.map((x) =>
                x.id === sh.id ? { ...sh, place } : x,
              ),
              selectedUid: item.uid,
              pendingAid: null,
            };
          }),
        removeItem: (u) =>
          set((s) => ({
            shelves: s.shelves.map((sh) =>
              sh.id === s.activeShelfId
                ? {
                    ...sh,
                    place: mapPlace(sh, (arr) =>
                      arr.filter((p) => p.uid !== u),
                    ),
                  }
                : sh,
            ),
            selectedUid: null,
          })),
        changeF: (u, d) =>
          set((s) => ({
            shelves: s.shelves.map((sh) =>
              sh.id === s.activeShelfId
                ? {
                    ...sh,
                    place: mapPlace(sh, (arr) =>
                      arr.map((p) =>
                        p.uid === u
                          ? { ...p, f: Math.max(1, Math.min(24, p.f + d)) }
                          : p,
                      ),
                    ),
                  }
                : sh,
            ),
          })),
        toggleLock: (u) =>
          set((s) => ({
            shelves: s.shelves.map((sh) =>
              sh.id === s.activeShelfId
                ? {
                    ...sh,
                    place: mapPlace(sh, (arr) =>
                      arr.map((p) =>
                        p.uid === u ? { ...p, locked: !p.locked } : p,
                      ),
                    ),
                  }
                : sh,
            ),
          })),
        applyArrangement: (place) => {
          const s = get(),
            sh = s.shelves.find((x) => x.id === s.activeShelfId);
          if (!sh) return;
          const shelves = s.shelves.map((x) =>
            x.id === sh.id ? { ...sh, place } : x,
          );
          set({
            shelves,
            autoUndo: {
              shelfId: sh.id,
              before: computeShelf(sh, s.articles, s.shelves).score,
              after: computeShelf({ ...sh, place }, s.articles, shelves).score,
            },
            selectedUid: null,
            pendingAid: null,
          });
        },
        runAuto: () => {
          const s = get(),
            sh = s.shelves.find((x) => x.id === s.activeShelfId);
          if (!sh) return;
          const p = autoArrange(sh, s.articles, s.shelves, uid);
          if (p) s.applyArrangement(p);
        },
        undoAuto: () => get().undo(),
        undo: () =>
          rawSet((s) => {
            const last = s.past[s.past.length - 1];
            return last
              ? {
                  ...last,
                  past: s.past.slice(0, -1),
                  future: [historySnapshot(s), ...s.future].slice(0, 30),
                  editing: null,
                  ...reset,
                }
              : {};
          }),
        redo: () =>
          rawSet((s) => {
            const next = s.future[0];
            return next
              ? {
                  ...next,
                  past: [...s.past, historySnapshot(s)].slice(-30),
                  future: s.future.slice(1),
                  editing: null,
                  ...reset,
                }
              : {};
          }),
        saveVersion: (name) => {
          if (!name.trim() || name.length > 200)
            throw new Error('Indiquez un nom de version.');
          set((s) => {
            if (s.versions.length >= 20)
              throw new Error(
                '20 versions maximum : exportez votre sauvegarde puis retirez une ancienne version.',
              );
            return {
              versions: [
                ...s.versions,
                {
                  id: uid(),
                  name: name.trim(),
                  createdAt: new Date().toISOString(),
                  data: snapshot(s),
                },
              ],
              activeVersionName: name.trim(),
            };
          });
        },
        restoreVersion: (id) => {
          const v = get().versions.find((x) => x.id === id);
          if (v) {
            set({ ...v.data, ...reset, editing: null });
            set({ activeVersionName: v.name });
          }
        },
        deleteVersion: (id) =>
          set((s) => ({ versions: s.versions.filter((v) => v.id !== id) })),
        importArticles: (incoming) => {
          const s = get();
          const articles = [...s.articles];
          incoming.forEach((a) => {
            const i = articles.findIndex(
              (x) => x.id === a.id || (!!a.ean && x.ean === a.ean),
            );
            if (i >= 0)
              articles[i] = {
                ...articles[i],
                ...a,
                id: articles[i].id,
                img: a.img ?? articles[i].img,
                shape: a.shape ?? articles[i].shape,
                tpl: a.tpl ?? articles[i].tpl,
              };
            else articles.push(a);
          });
          validateProject({ ...snapshot(s), articles });
          set({ articles });
        },
        exportData: () =>
          JSON.stringify(
            {
              schemaVersion: 3,
              exportedAt: new Date().toISOString(),
              ...snapshot(get()),
              versions: get().versions,
            },
            null,
            2,
          ),
        importData: (json) => {
          try {
            const b = readBackup(json);
            set({ ...b.data, versions: b.versions, ...reset, editing: null });
            return true;
          } catch {
            return false;
          }
        },
        resetDemo: () => set({ ...initialData(), ...reset, editing: null }),
      };
    },
    {
      name: 'etal-v2',
      version: 2,
      storage: createJSONStorage(() => projectStorage),
      partialize: (s) => ({
        ...snapshot(s),
        versions: s.versions,
        activeVersionName: s.activeVersionName,
        lastExportAt: s.lastExportAt,
        colorMode: s.colorMode,
        visual: s.visual,
        view: s.view,
        printColor: s.printColor,
        printList: s.printList,
      }),
    },
  ),
);

export const useActiveShelf = () => {
  const shelves = useStore((s) => s.shelves),
    articles = useStore((s) => s.articles),
    id = useStore((s) => s.activeShelfId);
  const shelf = shelves.find((s) => s.id === id) ?? shelves[0];
  return { shelf, computed: computeShelf(shelf, articles, shelves) };
};
