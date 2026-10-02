import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Article, Placement, Shelf } from '../domain/types';
import { seedArticles, seedShelves } from '../domain/seed';
import { autoArrange } from '../domain/autoArrange';
import { computeShelf } from '../domain/metrics';

export type Screen = 'articles' | 'shelf';
export const uid = () => 'u' + Math.random().toString(36).slice(2, 10);

interface AutoUndo { shelfId: string; place: Shelf['place'] }

interface State {
  articles: Article[];
  shelves: Shelf[];
  activeShelfId: string;
  // transitoire
  screen: Screen;
  editing: Article | 'new' | null;
  selectedUid: string | null;
  pendingAid: string | null;
  autoUndo: AutoUndo | null;

  setScreen: (s: Screen) => void;
  setEditing: (a: Article | 'new' | null) => void;
  setActiveShelf: (id: string) => void;
  select: (uidOrNull: string | null) => void;
  setPending: (aid: string | null) => void;
  saveArticle: (a: Article) => void;
  deleteArticle: (id: string) => void;
  updateShelf: (id: string, fn: (s: Shelf) => Shelf) => void;
  addShelf: () => void;
  deleteShelf: (id: string) => void;
  moveTo: (src: { kind: 'placed'; uid: string } | { kind: 'new'; aid: string }, levelId: string, idx: number | null) => void;
  removeItem: (uid: string) => void;
  changeF: (uid: string, d: number) => void;
  runAuto: () => void;
  undoAuto: () => void;
  dismissAuto: () => void;
  resetDemo: () => void;
  importData: (json: string) => boolean;
  exportData: () => string;
}

const mapPlace = (sh: Shelf, fn: (arr: Placement[]) => Placement[]) => {
  const place: Shelf['place'] = {};
  for (const k in sh.place) place[k] = fn(sh.place[k]);
  return place;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      articles: seedArticles(),
      shelves: seedShelves(),
      activeShelfId: 's1',
      screen: 'shelf',
      editing: null,
      selectedUid: null,
      pendingAid: null,
      autoUndo: null,

      setScreen: (screen) => set({ screen, editing: null, selectedUid: null, pendingAid: null }),
      setEditing: (editing) => set({ editing }),
      setActiveShelf: (activeShelfId) => set({ activeShelfId, selectedUid: null, pendingAid: null, autoUndo: null }),
      select: (selectedUid) => set({ selectedUid, pendingAid: null }),
      setPending: (pendingAid) => set({ pendingAid, selectedUid: null }),

      saveArticle: (a) =>
        set((s) => ({
          articles: s.articles.some((x) => x.id === a.id) ? s.articles.map((x) => (x.id === a.id ? a : x)) : [...s.articles, a],
          editing: null,
        })),
      deleteArticle: (id) =>
        set((s) => ({
          articles: s.articles.filter((a) => a.id !== id),
          shelves: s.shelves.map((sh) => ({ ...sh, place: mapPlace(sh, (arr) => arr.filter((p) => p.aid !== id)) })),
          editing: null,
        })),

      updateShelf: (id, fn) => set((s) => ({ shelves: s.shelves.map((x) => (x.id === id ? fn(x) : x)) })),
      addShelf: () =>
        set((s) => {
          const id = 's' + uid();
          const ids = [0, 1, 2, 3].map(() => 'L' + uid());
          const sh: Shelf = { id, name: 'Nouvelle étagère', cats: [], width: 100, levels: ids.map((l) => ({ id: l, h: 40 })), place: Object.fromEntries(ids.map((l) => [l, []])) };
          return { shelves: [...s.shelves, sh], activeShelfId: id, selectedUid: null, pendingAid: null };
        }),
      deleteShelf: (id) =>
        set((s) => {
          if (s.shelves.length < 2) return s;
          const shelves = s.shelves.filter((x) => x.id !== id);
          return { shelves, activeShelfId: shelves[0].id, selectedUid: null };
        }),

      moveTo: (src, levelId, idx) =>
        set((s) => {
          const sh = s.shelves.find((x) => x.id === s.activeShelfId)!;
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
          return {
            shelves: s.shelves.map((x) => (x.id === sh.id ? { ...sh, place } : x)),
            selectedUid: item.uid,
            pendingAid: null,
          };
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
        const sh = s.shelves.find((x) => x.id === s.activeShelfId)!;
        const place = autoArrange(sh, s.articles, s.shelves, uid);
        if (!place) return;
        set({
          shelves: s.shelves.map((x) => (x.id === sh.id ? { ...x, place } : x)),
          autoUndo: { shelfId: sh.id, place: sh.place },
          selectedUid: null,
          pendingAid: null,
        });
      },
      undoAuto: () =>
        set((s) => {
          if (!s.autoUndo) return s;
          const { shelfId, place } = s.autoUndo;
          return { shelves: s.shelves.map((x) => (x.id === shelfId ? { ...x, place } : x)), autoUndo: null };
        }),
      dismissAuto: () => set({ autoUndo: null }),

      resetDemo: () => set({ articles: seedArticles(), shelves: seedShelves(), activeShelfId: 's1', selectedUid: null, pendingAid: null, autoUndo: null }),
      exportData: () => JSON.stringify({ articles: get().articles, shelves: get().shelves }, null, 2),
      importData: (json) => {
        try {
          const d = JSON.parse(json);
          if (!Array.isArray(d.articles) || !Array.isArray(d.shelves) || !d.shelves.length) return false;
          set({ articles: d.articles, shelves: d.shelves, activeShelfId: d.shelves[0].id, selectedUid: null, pendingAid: null, autoUndo: null });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'etal-v1',
      version: 1,
      partialize: (s) => ({ articles: s.articles, shelves: s.shelves, activeShelfId: s.activeShelfId }),
    },
  ),
);

export const useActiveShelf = () => {
  const { shelves, activeShelfId, articles } = useStore();
  const shelf = shelves.find((s) => s.id === activeShelfId) ?? shelves[0];
  return { shelf, computed: computeShelf(shelf, articles, shelves) };
};
