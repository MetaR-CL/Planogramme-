export type CategoryId =
  'boissons' | 'petitdej' | 'sucre' | 'sale' | 'conserves' | 'entretien';
export type Shape =
  | 'canette'
  | 'bouteille'
  | 'flacon'
  | 'brique'
  | 'conserve'
  | 'bocal'
  | 'paquet'
  | 'sachet'
  | 'boite';
export type Zone = 'haut' | 'yeux' | 'mains' | 'bas';

export interface Article {
  id: string;
  name: string;
  cat: CategoryId;
  tpl: string | null;
  w: number;
  h: number;
  d: number;
  buy: number;
  sell: number;
  sales: number;
  shape: Shape | null;
  img: string | null;
  ean?: string;
  promo?: boolean;
}

export interface Template {
  id: string;
  name: string;
  w: number;
  h: number;
  d: number;
}
export interface Level {
  id: string;
  h: number;
  zone: Zone | null;
}
export interface Placement {
  uid: string;
  aid: string;
  f: number;
  locked?: boolean;
}
export interface Shelf {
  id: string;
  name: string;
  cats: CategoryId[];
  width: 100 | 125 | 133;
  depth?: number;
  levels: Level[]; // index 0 = niveau 1 = le plus bas
  place: Record<string, Placement[]>; // gauche → droite
}

export type AlertKind =
  'nocat' | 'hmax' | 'sat' | 'haut' | 'hors' | 'expo' | 'place' | 'depth';
export interface Alert {
  kind: AlertKind;
  sev: 1 | 2;
  title: string;
  detail: string;
  uid?: string;
  aid?: string;
}

export interface ComputedItem extends Placement {
  a: Article;
  wcm: number;
  t: number;
  capacity: number;
  days: number | null;
}
export interface ComputedLevel extends Level {
  num: number;
  y0: number;
  auto: Zone;
  zone: Zone;
  items: ComputedItem[];
  used: number;
  sat: boolean;
}
export interface ComputedShelf {
  levels: ComputedLevel[];
  totalH: number;
  unplaced: Article[];
  alerts: Alert[];
  match: number;
  fill: number;
  pen: number;
  score: number;
  tOf: (a: Article) => number;
}
