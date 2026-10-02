import type { Article, Shape } from './types';
import { TPL_SHAPE } from './constants';

export const guessShape = (a: Pick<Article, 'name' | 'tpl' | 'shape'>): Shape => {
  if (a.shape) return a.shape;
  if (a.tpl && TPL_SHAPE[a.tpl]) return TPL_SHAPE[a.tpl];
  const n = (a.name || '').toLowerCase();
  if (/lessive|javel|vaisselle|liquide|savon|nettoyant/.test(n)) return 'flacon';
  if (/huile|sirop|vin|vinaigre|bouteille/.test(n)) return 'bouteille';
  if (/confiture|moutarde|miel|bocal|cornichon/.test(n)) return 'bocal';
  if (/thon|pois|tomates|conserve|haricot|sardine/.test(n)) return 'conserve';
  if (/éponge|sac|chips|bonbon/.test(n)) return 'sachet';
  return 'boite';
};

const INK = '#201e1d', MET = '#cfcac4', LBL = 'rgba(255,255,255,.6)';
const SS = `stroke='${INK}' stroke-width='1.5' vector-effect='non-scaling-stroke'`;
const SHAPE_SVG: Record<Shape, (F: string) => string> = {
  canette: (F) => `<rect x='6' y='3' width='88' height='94' rx='14' fill='${F}' ${SS}/><rect x='14' y='30' width='72' height='38' fill='${LBL}'/><rect x='6' y='3' width='88' height='8' rx='4' fill='${MET}' ${SS}/><rect x='6' y='89' width='88' height='8' rx='4' fill='${MET}' ${SS}/>`,
  bouteille: (F) => `<path d='M40 7 H60 V20 C60 28 92 30 92 40 V95 Q92 99 88 99 H12 Q8 99 8 95 V40 C8 30 40 28 40 20 Z' fill='${F}' ${SS}/><rect x='8' y='52' width='84' height='26' fill='${LBL}'/><rect x='37' y='0' width='26' height='8' rx='1' fill='${INK}'/>`,
  flacon: (F) => `<path d='M30 10 H62 V18 L84 26 Q92 28 92 38 V94 Q92 99 86 99 H14 Q8 99 8 94 V38 Q8 28 16 26 L30 18 Z' fill='${F}' ${SS}/><rect x='8' y='48' width='84' height='30' fill='${LBL}'/><rect x='34' y='0' width='24' height='11' rx='1' fill='${INK}'/>`,
  brique: (F) => `<rect x='6' y='14' width='88' height='85' fill='${F}' ${SS}/><path d='M6 14 L20 2 H80 L94 14 Z' fill='${F}' ${SS}/><path d='M6 14 L20 2 H80 L94 14 Z' fill='rgba(0,0,0,.18)'/><rect x='14' y='40' width='72' height='34' fill='${LBL}'/><circle cx='70' cy='8' r='4' fill='#fff' ${SS}/>`,
  conserve: (F) => `<rect x='4' y='5' width='92' height='90' rx='5' fill='${F}' ${SS}/><rect x='4' y='24' width='92' height='52' fill='${LBL}'/><rect x='4' y='3' width='92' height='7' rx='3' fill='${MET}' ${SS}/><rect x='4' y='90' width='92' height='7' rx='3' fill='${MET}' ${SS}/>`,
  bocal: (F) => `<rect x='4' y='13' width='92' height='86' rx='14' fill='${F}' ${SS}/><rect x='4' y='40' width='92' height='32' fill='${LBL}'/><rect x='10' y='0' width='80' height='14' rx='2' fill='#5b5550' ${SS}/>`,
  paquet: (F) => `<rect x='3' y='2' width='94' height='96' rx='3' fill='${F}' ${SS}/><rect x='3' y='2' width='94' height='10' fill='rgba(0,0,0,.15)'/><rect x='18' y='38' width='64' height='34' rx='17' fill='${LBL}'/>`,
  sachet: (F) => `<path d='M6 9 L12 2 L18 9 L24 2 L30 9 L36 2 L42 9 L48 2 L54 9 L60 2 L66 9 L72 2 L78 9 L84 2 L90 9 L94 5 V92 Q94 99 86 99 H14 Q6 99 6 92 Z' fill='${F}' ${SS}/><rect x='16' y='36' width='68' height='34' rx='6' fill='${LBL}'/>`,
  boite: (F) => `<rect x='3' y='3' width='94' height='94' rx='2' fill='${F}' ${SS}/><rect x='3' y='3' width='94' height='16' fill='rgba(0,0,0,.14)'/><rect x='12' y='34' width='76' height='40' fill='${LBL}'/>`,
};

const cache: Record<string, string> = {};
export const shapeUrl = (shape: Shape, fill: string) => {
  const k = shape + fill;
  if (!cache[k]) {
    cache[k] =
      'url("data:image/svg+xml,' +
      encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>${SHAPE_SVG[shape](fill)}</svg>`) +
      '")';
  }
  return cache[k];
};

export const fitBox = (w: number, h: number, box: number) => {
  const s = box / Math.max(w || 1, h || 1);
  return { tw: Math.max(4, Math.round((w || 1) * s)), th: Math.max(4, Math.round((h || 1) * s)) };
};

export const EXTRUDE = 'drop-shadow(2px -2px 0 rgba(0,0,0,.26)) drop-shadow(2px -2px 0 rgba(0,0,0,.18)) drop-shadow(2px -2px 0 rgba(0,0,0,.12))';

/** Rouge → vert selon t ∈ [0,1]. */
export const pc = (t: number, l = 0.85, c = 0.12) => `oklch(${l} ${c} ${Math.round(25 + Math.max(0, Math.min(1, t)) * 120)})`;

export const stripes = (px: number) =>
  px > 3 ? `repeating-linear-gradient(90deg, transparent 0 ${px - 1.5}px, color-mix(in srgb, #201e1d 50%, transparent) ${px - 1.5}px ${px}px)` : 'none';
