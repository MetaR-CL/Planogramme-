import type { Alert, Article, ComputedShelf, Shelf, Zone } from './types';
import { MAXH, SOCLE, ZONES } from './constants';

export const rent = (a: Pick<Article, 'buy' | 'sell' | 'sales'>) => (a.sell - a.buy) * a.sales;
export const zoneOf = (mid: number): Zone => (mid < 60 ? 'bas' : mid < 110 ? 'mains' : mid < 160 ? 'yeux' : 'haut');

const fmt = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });
const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export const placedIds = (shelves: Shelf[]) => {
  const m: Record<string, Set<string>> = {};
  shelves.forEach((sh) => Object.values(sh.place).forEach((arr) => arr.forEach((it) => { (m[it.aid] ||= new Set()).add(sh.id); })));
  return m;
};
export const placedElsewhere = (shelves: Shelf[], aid: string, exceptShelfId: string) =>
  [...(placedIds(shelves)[aid] ?? [])].some((id) => id !== exceptShelfId);

/** Normalisation globale 0–1 sur la liste d'articles. */
export function globalScale(articles: Article[]) {
  const v = articles.map(rent);
  const mn = v.length ? Math.min(...v) : 0;
  const mx = v.length ? Math.max(...v) : 1;
  return { mn, mx, t: (a: Article) => (mx > mn ? Math.max(0, Math.min(1, (rent(a) - mn) / (mx - mn))) : 0.5) };
}

export function computeShelf(sh: Shelf, articles: Article[], shelves: Shelf[]): ComputedShelf {
  const byId = new Map(articles.map((a) => [a.id, a]));
  const placed = placedIds(shelves);
  const inShelf = new Set<string>();
  Object.values(sh.place).forEach((arr) => arr.forEach((it) => inShelf.add(it.aid)));
  const vals = articles.filter((a) => sh.cats.includes(a.cat) || inShelf.has(a.id)).map(rent);
  const mn = vals.length ? Math.min(...vals) : 0;
  const mx = vals.length ? Math.max(...vals) : 1;
  const tOf = (a: Article) => (mx > mn ? Math.max(0, Math.min(1, (rent(a) - mn) / (mx - mn))) : 0.5);

  let y = SOCLE;
  const levels = sh.levels.map((lv, i) => {
    const y0 = y;
    y += lv.h;
    const auto = zoneOf(y0 + lv.h / 2);
    const zone = lv.zone ?? auto;
    const items = (sh.place[lv.id] ?? [])
      .filter((it) => byId.has(it.aid))
      .map((it) => {
        const a = byId.get(it.aid)!;
        return { ...it, a, wcm: a.w * it.f, t: tOf(a) };
      });
    const used = items.reduce((s, it) => s + it.wcm, 0);
    return { ...lv, num: i + 1, y0, auto, zone, items, used, sat: used > sh.width + 0.01 };
  });
  const totalH = y;
  const unplaced = articles.filter((a) => sh.cats.includes(a.cat) && !placed[a.id]);

  const alerts: Alert[] = [];
  if (!sh.cats.length) alerts.push({ kind: 'nocat', sev: 1, title: 'Aucune catégorie choisie', detail: 'Choisissez les catégories de cette étagère dans l’onglet Étagères.' });
  if (totalH > MAXH) alerts.push({ kind: 'hmax', sev: 2, title: 'Étagère trop haute', detail: `${totalH} cm pour ${MAXH} cm maximum. Réduisez un niveau.` });
  levels.forEach((l) => {
    if (l.sat) alerts.push({ kind: 'sat', sev: 2, title: `Niveau ${l.num} saturé`, detail: `${fmt(l.used)} cm occupés pour ${fmt(sh.width, 0)} cm disponibles. Retirez ${fmt(l.used - sh.width)} cm.` });
    l.items.forEach((it) => {
      if (it.a.h > l.h) alerts.push({ kind: 'haut', sev: 2, uid: it.uid, title: `${it.a.name} ne rentre pas`, detail: `${fmt(it.a.h)} cm de haut pour un niveau de ${l.h} cm (niveau ${l.num}).` });
      if (!sh.cats.includes(it.a.cat)) alerts.push({ kind: 'hors', sev: 1, uid: it.uid, title: `${it.a.name} hors catégorie`, detail: 'Cette catégorie ne fait pas partie de celles de cette étagère.' });
      if (it.t < 0.3 && (l.zone === 'yeux' || (l.zone === 'mains' && it.f >= 4)))
        alerts.push({ kind: 'expo', sev: 1, uid: it.uid, title: `${it.a.name} : peu rentable, trop exposé`, detail: `${eur(rent(it.a))} / sem. en zone ${ZONES[l.zone].label.toLowerCase()} avec ${it.f} facings. Descendez-le ou réduisez ses facings.` });
    });
  });
  unplaced.forEach((a) => alerts.push({ kind: 'place', sev: 1, aid: a.id, title: `${a.name} sans place`, detail: 'Glissez-le depuis « À placer » vers un niveau.' }));

  let wsum = 0, msum = 0;
  levels.forEach((l) => l.items.forEach((it) => {
    const z = (ZONES[l.zone].w - 0.4) / 0.6;
    wsum += it.wcm;
    msum += (1 - Math.abs(it.t - z)) * it.wcm;
  }));
  const match = wsum ? msum / wsum : 0;
  const fill = levels.length ? levels.reduce((s, l) => s + Math.min(l.used, sh.width), 0) / (levels.length * sh.width) : 0;
  const PEN = { sat: 8, haut: 5, place: 3, expo: 4, hmax: 10, hors: 3, nocat: 0 } as const;
  const pen = alerts.reduce((s, a) => s + PEN[a.kind], 0);
  const score = Math.max(0, Math.min(100, Math.round(match * 70 + fill * 30 - pen)));
  return { levels, totalH, unplaced, alerts, match, fill, pen, score, tOf };
}
