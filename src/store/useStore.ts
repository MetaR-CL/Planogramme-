import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Article, Placement, Shelf, Template } from '../domain/types';
import { seedArticles, seedShelves } from '../domain/seed';
import { TEMPLATES } from '../domain/constants';
import { autoArrange } from '../domain/autoArrange';
import { computeShelf } from '../domain/metrics';

export type Screen = 'articles' | 'form' | 'shelves' | 'planogram' | 'print';
export type ColorMode = 'cat' | 'rent';
export type Visual = 'blocs' | 'silhouettes' | 'photos';
export type View = 'face' | 'relief';
export type SortKey = 'name' | 'cat' | 'dims' | 'buy' | 'sell' | 'marge' | 'sales' | 'rent';

export const uid = () => 'u' + Math.random().toString(36).slice(2, 10);

interface AutoUndo { shelfId: string; place: Shelf['place']; before: number; after: number }
type Src = { kind: 'placed'; uid: string } | { kind: 'new'; aid: string };

interface State {
  articles: Article[];
  tpls: Template[];
  shelves: Shelf[];
  activeShelfId: string;
  colorMode: ColorMode;
  visual: Visual;
  view: View;
  printColor: boolean;
  printList: boolean;
  // transitoire
  screen: Screen;
  editing: Article | null; // null + screen 'form' = nouvel article
  selectedUid: string | null;
  pendingAid: string | null;
  autoUndo: AutoUndo | null;
  sort: { key: SortKey; dir: 1 | -1 };
  query: string;
  catFilter: string;

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
  addLevel: (d: number) => void;
  moveTo: (src: Src, levelId: string, idx: number | null) => void;
  removeItem: (uid: string) => void;
  changeF: (uid: string, d: number) => void;
  runAuto: () => void;
  undoAuto: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetDemo: () => void;
}

const mapPlace = (sh: Shelf, fn: (arr: Placement[]) => Placement[]) => {
  const place: Shelf['place'] = {};
  for (const k in sh.place) place[k] = fn(sh.place[k]);
  return place;
};

const reset = { selectedUid: null, pendingAid: null, autoUndo: null };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      articles: seedArticles(),
      tpls: TEMPLATES,
      shelves: seedShelves(),
      activeShelfId: 's1',
      colorMode: 'cat',
      visual: 'silhouettes',
      view: 'relief',
      printColor: true,
      printList: true,
      screen: 'articles',
      editing: null,
      selectedUid: null,
      pendingAid: null,
      autoUndo: null,
      sort: { key: 'rent', dir: -1 },
      query: '',
      catFilter: 'all',

      go: (screen) => set({ screen, editing: null, selectedUid: null, pendingAid: null }),
      openForm: (editing) => set({ screen: 'form', editing }),
      set: (p) => set(p),
      setActiveShelf: (activeShelfId) => set({ activeShelfId, ...reset }),
      openPlanogram: (id, pendingAid = null) => set({ activeShelfId: id, screen: 'planogram', selectedUid: null, pendingAid, autoUndo: null }),

      saveArticle: (a, andPlace) =>
        set((s) => {
          const exists = s.articles.some((x) => x.id === a.id);
          const articles = exists ? s.articles.map((x) => (x.id === a.id ? a : x)) : [...s.articles, a];
          const base = { articles, editing: null };
          if (!andPlace) return { ...base, screen: 'articles' as Screen };
          const target = s.shelves.find((sh) => sh.cats.includes(a.cat));
          if (!target) return { ...base, screen: 'shelves' as Screen };
          const isPlaced = s.shelves.some((sh) => Object.values(sh.place).some((arr) => arr.some((it) => it.aid === a.id)));
          return { ...base, screen: 'planogram' as Screen, activeShelfId: target.id, pendingAid: isPlaced ? null : a.id, selectedUid: null };
        }),
      deleteArticle: (id) =>
        set((s) => ({
          articles: s.articles.filter((a) => a.id !== id),
          shelves: s.shelves.map((sh) => ({ ...sh, place: mapPlace(sh, (arr) => arr.filter((p) => p.aid !== id)) })),
          editing: null,
          screen: 'articles',
        })),
      updateTpl: (id, w, h, d) => set((s) => ({ tpls: s.tpls.map((t) => (t.id === id ? { ...t, w, h, d } : t)) })),

      updShelf: (id, fn) => set((s) => ({ shelves: s.shelves.map((x) => (x.id === id ? fn(x) : x)) })),
      addShelf: () =>
        set((s) => {
          const id = 's' + uid();
          const ids = [0, 1, 2, 3].map(() => 'L' + uid());
          const sh: Shelf = { id, name: 'Nouvelle étagère', cats: [], width: 100, levels: ids.map((l) => ({ id: l, h: 40, zone: null })), place: Object.fromEntries(ids.map((l) => [l, []])) };
          return { shelves: [...s.shelves, sh], activeShelfId: id, ...reset };
        }),
      deleteShelf: (id) =>
        set((s) => {
          if (s.shelves.length < 2) return s;
          const shelves = s.shelves.filter((x) => x.id !== id);
          return { shelves, activeShelfId: shelves[0].id, ...reset };
        }),
      addLevel: (d) =>
        set((s) => ({
          shelves: s.shelves.map((sh) => {
            if (sh.id !== s.activeShelfId) return sh;
            const levels = [...sh.levels];
            const place = { ...sh.place };
            if (d > 0 && levels.length < 8) { const id = 'L' + uid(); levels.push({ id, h: 30, zone: null }); place[id] = []; }
            if (d < 0 && levels.length > 2) { const g = levels.pop()!; delete place[g.id]; }
            return { ...sh, levels, place };
          }),
        })),

      moveTo: (src, levelId, idx) =>
        set((s) => {
          const sh = s.shelves.find((x) => x.id === s.activeShelfId);
          if (!sh) return s;
          const place = { ...sh.place };
          let item: Placement | undefined;
          if (src.kind === 'placed') {
            for (const k in place) {
              const f = place[k].find((x) => x.uid === src.uid);
              if (f) { item = f; place[k] = place[k].filter((x) => x.uid !== src.uid); }
            }
          } else item = { uid: uid(), aid: src.aid, f: 2 };
          if (!item) return s;
          const arr = [...(place[levelId] ?? [])];
          arr.splice(idx ?? arr.length, 0, item);
          place[levelId] = arr;
          return { shelves: s.shelves.map((x) => (x.id === sh.id ? { ...sh, place } : x)), selectedUid: item.uid, pendingAid: null };
        }),
      removeItem: (u) =>
        set((s) => ({
          shelves: s.shelves.map((sh) => (sh.id === s.activeShelfId ? { ...sh, place: mapPlace(sh, (arr) => arr.filter((x) => x.uid !== u)) } : sh)),
          selectedUid: null,
        })),
      changeF: (u, d) =>
        set((s) => ({
          shelves: s.shelves.map((sh) =>
            sh.id === s.activeShelfId ? { ...sh, place: mapPlace(sh, (arr) => arr.map((x) => (x.uid === u ? { ...x, f: Math.max(1, Math.min(24, x.f + d)) } : x))) } : sh,
          ),
        })),

      runAuto: () => {
        const s = get();
        const sh = s.shelves.find((x) => x.id === s.activeShelfId);
        if (!sh) return;
        const place = autoArrange(sh, s.articles, s.shelves, uid);
        if (!place) return;
        const shelves = s.shelves.map((x) => (x.id === sh.id ? { ...x, place } : x));
        set({
          shelves,
          autoUndo: {
            shelfId: sh.id,
            place: sh.place,
            before: computeShelf(sh, s.articles, s.shelves).score,
            after: computeShelf({ ...sh, place }, s.articles, shelves).score,
          },
          selectedUid: null,
          pendingAid: null,
        });
      },
      undoAuto: () =>
        set((s) => {
          if (!s.autoUndo) return s;
          const { shelfId, place } = s.autoUndo;
          return { shelves: s.shelves.map((x) => (x.id === shelfId ? { ...x, place } : x)), autoUndo: null, selectedUid: null };
        }),

      resetDemo: () => set({ articles: seedArticles(), tpls: TEMPLATES, shelves: seedShelves(), activeShelfId: 's1', ...reset }),
      exportData: () => JSON.stringify({ articles: get().articles, tpls: get().tpls, shelves: get().shelves }, null, 2),
      importData: (json) => {
        try {
          const d = JSON.parse(json);
          if (!Array.isArray(d.articles) || !Array.isArray(d.shelves) || !d.shelves.length) return false;
          set({ articles: d.articles, tpls: d.tpls ?? TEMPLATES, shelves: d.shelves, activeShelfId: d.shelves[0].id, ...reset });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'etal-v2',
      version: 2,
      partialize: (s) => ({
        articles: s.articles, tpls: s.tpls, shelves: s.shelves, activeShelfId: s.activeShelfId,
        colorMode: s.colorMode, visual: s.visual, view: s.view, printColor: s.printColor, printList: s.printList,
      }),
    },
  ),
);

export const useActiveShelf = () => {
  const shelves = useStore((s) => s.shelves);
  const articles = useStore((s) => s.articles);
  const id = useStore((s) => s.activeShelfId);
  const shelf = shelves.find((s) => s.id === id) ?? shelves[0];
  return { shelf, computed: computeShelf(shelf, articles, shelves) };
};
