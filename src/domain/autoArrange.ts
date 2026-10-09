import type { Article, Placement, Shelf } from './types';
import { ZONES } from './constants';
import { computeShelf, rent } from './metrics';

export type ArrangeMode = 'margin' | 'restock' | 'category' | 'promo';

/** Range automatiquement une étagère par rentabilité. Retourne le nouveau `place`. */
export function autoArrange(
  sh: Shelf,
  articles: Article[],
  shelves: Shelf[],
  newUid: () => string,
  mode: ArrangeMode = 'margin',
): Record<string, Placement[]> | null {
  const C = computeShelf(sh, articles, shelves);
  const fixed = new Set(
    C.levels.filter((l) => l.items.some((it) => it.locked)).map((l) => l.id),
  );
  const fixedArticles = new Set(
    C.levels
      .filter((l) => fixed.has(l.id))
      .flatMap((l) => l.items.map((it) => it.aid)),
  );
  const priority = (a: Article) =>
    mode === 'restock'
      ? a.sales * a.d
      : mode === 'promo'
        ? (a.promo ? 1e9 : 0) + rent(a)
        : rent(a);
  const cands = articles
    .filter((a) => sh.cats.includes(a.cat) && !fixedArticles.has(a.id))
    .sort((a, b) =>
      mode === 'category'
        ? a.cat.localeCompare(b.cat) || rent(b) - rent(a)
        : priority(b) - priority(a),
    );
  if (!cands.length) return null;

  const rs = cands.map(rent);
  const mn = Math.min(...rs),
    mx = Math.max(...rs);
  const ms = Math.max(...cands.map((a) => a.sales)) || 1;
  const available = C.levels.filter((l) => !fixed.has(l.id));
  if (!available.length) return null;
  const order = [...available].sort(
    (a, b) => ZONES[b.zone].w - ZONES[a.zone].w || a.y0 - b.y0,
  );
  const bottomUp = [...available].sort((a, b) => a.y0 - b.y0);
  const rem: Record<string, number> = {};
  const place: Record<string, Placement[]> = {};
  const f0: Record<string, number> = {};
  C.levels.forEach((l) => {
    rem[l.id] = fixed.has(l.id) ? 0 : sh.width;
    place[l.id] = fixed.has(l.id) ? [...sh.place[l.id]] : [];
  });
  cands.forEach((a) => {
    const t = mx > mn ? (rent(a) - mn) / (mx - mn) : 0.5;
    f0[a.id] = Math.max(
      1,
      Math.min(5, Math.round(1 + 2 * t + (2 * a.sales) / ms)),
    );
  });

  const put = (a: Article, l: { id: string; h: number }) => {
    if (
      a.h > l.h ||
      a.d > (sh.depth ?? 40) ||
      !Number.isFinite(a.w) ||
      a.w <= 0
    )
      return false;
    let f = f0[a.id];
    while (f > 0 && a.w * f > rem[l.id] + 1e-6) f--;
    if (!f) return false;
    place[l.id].push({ uid: newUid(), aid: a.id, f });
    rem[l.id] -= a.w * f;
    return true;
  };

  // 1. articles hauts (≥ 26 cm) : niveau bas d'abord
  const rest: Article[] = [];
  cands.forEach((a) => {
    if (a.h < 26) {
      rest.push(a);
      return;
    }
    if (!bottomUp.some((l) => l.zone === 'bas' && put(a, l)))
      bottomUp.some((l) => put(a, l));
  });

  // 2. répartition par zone, de la plus visible à la moins visible
  const used = (l: { id: string }) => sh.width - rem[l.id];
  const total = cands.reduce((s, a) => s + a.w * f0[a.id], 0);
  const target = Math.min(
    sh.width * 0.9,
    (total / Math.max(1, order.length)) * 1.1,
  );
  let i = 0;
  rest.forEach((a) => {
    while (
      i < order.length - 1 &&
      used(order[i]) > 0 &&
      used(order[i]) + a.w * f0[a.id] > target
    )
      i++;
    if (put(a, order[i])) return;
    for (let k = i + 1; k < order.length; k++) if (put(a, order[k])) return;
    for (let k = 0; k < i; k++) if (put(a, order[k])) return;
  });

  // 3. complétion : facings en plus aux plus rentables
  const byId = new Map(articles.map((a) => [a.id, a]));
  available.forEach((l) => {
    const items = place[l.id].sort((x, y) =>
      mode === 'category'
        ? byId.get(x.aid)!.cat.localeCompare(byId.get(y.aid)!.cat) ||
          rent(byId.get(y.aid)!) - rent(byId.get(x.aid)!)
        : priority(byId.get(y.aid)!) - priority(byId.get(x.aid)!),
    );
    let go = true;
    while (go) {
      go = false;
      items.forEach((it, idx) => {
        const w = byId.get(it.aid)!.w;
        const cap = Math.min(
          8,
          f0[it.aid] + 2,
          idx > 0 ? items[idx - 1].f : 99,
        );
        if (it.f < cap && w <= rem[l.id] + 1e-6) {
          it.f++;
          rem[l.id] -= w;
          go = true;
        }
      });
    }
  });
  return place;
}
