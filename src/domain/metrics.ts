import type { Article, ComputedShelf, Shelf, Zone } from './types';
import { MAXH, SOCLE, ZONES } from './constants';

export const rent = (a: Pick<Article, 'buy' | 'sell' | 'sales'>) => (a.sell - a.buy) * a.sales;

export const zoneOf = (mid: number): Zone => (mid < 60 ? 'bas' : mid < 110 ? 'mains' : mid < 160 ? 'yeux' : 'haut');

export const placedElsewhere = (shelves: Shelf[], aid: string, exceptShelfId: string) =>
  shelves.some((sh) => sh.id !== exceptShelfId && Object.values(sh.place).some((arr) => arr.some((it) => it.aid === aid)));

const placedAnywhere = (shelves: Shelf[], aid: string) =>
  shelves.some((sh) => Object.values(sh.place).some((arr) => arr.some((it) => it.aid === aid)));

/** Normalisation 0–1 de la rentabilité parmi les articles d'une étagère. */
export function rentScale(sh: Shelf, articles: Article[]) {
  const inShelf = new Set<string>();
  Object.values(sh.place).forEach((arr) => arr.forEach((it) => inShelf.add(it.aid)));
  const vals = articles.filter((a) => sh.cats.includes(a.cat) || inShelf.has(a.id)).map(rent);
  const mn = vals.length ? Math.min(...vals) : 0;
  const mx = vals.length ? Math.max(...vals) : 1;
  return (a: Article) => (mx > mn ? Math.max(0, Math.min(1, (rent(a) - mn) / (mx - mn))) : 0.5);
}

export function computeShelf(sh: Shelf, articles: Article[], shelves: Shelf[]): ComputedShelf {
  const byId = new Map(articles.map((a) => [a.id, a]));
  const tOf = rentScale(sh, articles);
  let y = SOCLE;
  const levels = sh.levels.map((lv, i) => {
    const y0 = y;
    y += lv.h;
    const zone = zoneOf(y0 + lv.h / 2);
    const items = (sh.place[lv.id] ?? [])
      .filter((it) => byId.has(it.aid))
      .map((it) => {
        const a = byId.get(it.aid)!;
        return { ...it, a, wcm: a.w * it.f, t: tOf(a) };
      });
    const used = items.reduce((s, it) => s + it.wcm, 0);
    return { ...lv, num: i + 1, y0, zone, items, used, sat: used > sh.width + 0.01 };
  });
  const totalH = y;
  const unplaced = articles.filter((a) => sh.cats.includes(a.cat) && !placedAnywhere(shelves, a.id));

  const alerts: ComputedShelf['alerts'] = [];
  if (!sh.cats.length) alerts.push({ kind: 'nocat', sev: 1, title: 'Aucune famille choisie', detail: 'Touchez « Réglages » pour choisir ce que contient cette étagère.' });
  if (totalH > MAXH) alerts.push({ kind: 'hmax', sev: 2, title: 'Étagère trop haute', detail: `${totalH} cm pour ${MAXH} cm maximum. Réduisez la hauteur d’un niveau.` });
  levels.forEach((l) => {
    if (l.sat) alerts.push({ kind: 'sat', sev: 2, title: `Niveau ${l.num} trop plein`, detail: `Il manque ${fmt(l.used - sh.width)} cm. Retirez un produit ou réduisez le nombre côte à côte.` });
    l.items.forEach((it) => {
      if (it.a.h > l.h) alerts.push({ kind: 'haut', sev: 2, uid: it.uid, title: `${it.a.name} est trop haut`, detail: `${fmt(it.a.h)} cm pour un niveau de ${l.h} cm (niveau ${l.num}). Mettez-le sur un niveau plus haut.` });
      if (!sh.cats.includes(it.a.cat)) alerts.push({ kind: 'hors', sev: 1, uid: it.uid, title: `${it.a.name} n’est pas de cette famille`, detail: 'Il est peut-être mieux sur une autre étagère.' });
      if (it.t < 0.3 && (l.zone === 'yeux' || (l.zone === 'mains' && it.f >= 4)))
        alerts.push({ kind: 'expo', sev: 1, uid: it.uid, title: `${it.a.name} rapporte peu`, detail: `Il occupe une place très visible. Descendez-le ou réduisez le nombre côte à côte.` });
    });
  });
  unplaced.forEach((a) => alerts.push({ kind: 'place', sev: 1, aid: a.id, title: `${a.name} n’est pas encore en rayon`, detail: 'Touchez-le dans « À placer » puis touchez un niveau.' }));
  return { levels, totalH, unplaced, alerts };
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
export const zoneLabel = (z: Zone) => ZONES[z].label;
