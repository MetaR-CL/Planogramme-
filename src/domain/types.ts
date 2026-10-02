export type CategoryId = 'boissons' | 'petitdej' | 'sucre' | 'sale' | 'conserves' | 'entretien';
export type Shape = 'canette' | 'bouteille' | 'flacon' | 'brique' | 'conserve' | 'bocal' | 'paquet' | 'sachet' | 'boite';
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
}

export interface Template { id: string; name: string; w: number; h: number; d: number; shape: Shape }
export interface Level { id: string; h: number }
export interface Placement { uid: string; aid: string; f: number }
export interface Shelf {
  id: string;
  name: string;
  cats: CategoryId[];
  width: 100 | 125 | 133;
  levels: Level[]; // index 0 = niveau 1 = le plus bas
  place: Record<string, Placement[]>; // gauche → droite
}

export type AlertKind = 'nocat' | 'hmax' | 'sat' | 'haut' | 'hors' | 'expo' | 'place';
export interface Alert { kind: AlertKind; sev: 1 | 2; title: string; detail: string; uid?: string; aid?: string }

export interface ComputedLevel extends Level {
  num: number;
  y0: number;
  zone: Zone;
  items: (Placement & { a: Article; wcm: number; t: number })[];
  used: number;
  sat: boolean;
}
export interface ComputedShelf { levels: ComputedLevel[]; totalH: number; unplaced: Article[]; alerts: Alert[] }
