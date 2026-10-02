import type { CategoryId, Shape, Template, Zone } from './types';

export const SOCLE = 10;
export const MAXH = 200;

export const CATS: { id: CategoryId; name: string; color: string }[] = [
  { id: 'boissons', name: 'Boissons', color: 'oklch(0.80 0.08 235)' },
  { id: 'petitdej', name: 'Petit-déjeuner', color: 'oklch(0.86 0.10 88)' },
  { id: 'sucre', name: 'Épicerie sucrée', color: 'oklch(0.82 0.08 345)' },
  { id: 'sale', name: 'Épicerie salée', color: 'oklch(0.83 0.08 150)' },
  { id: 'conserves', name: 'Conserves', color: 'oklch(0.79 0.07 295)' },
  { id: 'entretien', name: 'Entretien', color: 'oklch(0.82 0.09 45)' },
];
export const catById = (id: CategoryId) => CATS.find((c) => c.id === id) ?? CATS[0];

export const ZONES: Record<Zone, { label: string; w: number; bg: string; range: string; desc: string }> = {
  haut: { label: 'Haut', w: 0.5, bg: 'var(--color-neutral-200)', range: '> 160 cm', desc: 'Visible de loin, peu saisi. Réserve, articles légers.' },
  yeux: { label: 'Yeux', w: 1, bg: 'var(--color-accent-200)', range: '110 – 160 cm', desc: 'La meilleure place : les articles les plus rentables.' },
  mains: { label: 'Mains', w: 0.8, bg: 'var(--color-accent-100)', range: '60 – 110 cm', desc: 'Prise facile : fortes ventes et achats courants.' },
  bas: { label: 'Bas', w: 0.4, bg: 'var(--color-neutral-100)', range: '< 60 cm', desc: 'Produits lourds, volumineux, achats planifiés.' },
};
export const ZONE_ORDER: Zone[] = ['haut', 'yeux', 'mains', 'bas'];

export const MODULES = [
  { w: 100 as const, label: '1 m' },
  { w: 125 as const, label: '1,25 m' },
  { w: 133 as const, label: '1,33 m' },
];

export const SHAPES: [Shape, string][] = [
  ['canette', 'Canette'], ['bouteille', 'Bouteille'], ['flacon', 'Flacon'], ['brique', 'Brique'], ['conserve', 'Conserve'],
  ['bocal', 'Bocal'], ['paquet', 'Paquet'], ['sachet', 'Sachet'], ['boite', 'Boîte'],
];

export const TPL_SHAPE: Record<string, Shape> = {
  canette: 'canette', brique: 'brique', bouteille15: 'bouteille', bouteille75: 'bouteille', conserve: 'conserve', bocal: 'bocal', paquet: 'paquet', sachet: 'sachet',
};

export const TEMPLATES: Template[] = [
  { id: 'canette', name: 'Canette 33 cl', w: 6.6, h: 11.5, d: 6.6 },
  { id: 'brique', name: 'Brique 1 L', w: 9, h: 19.5, d: 6 },
  { id: 'bouteille15', name: 'Bouteille 1,5 L', w: 9, h: 32, d: 9 },
  { id: 'bouteille75', name: 'Bouteille 75 cl', w: 8, h: 30, d: 8 },
  { id: 'conserve', name: 'Conserve 400 g', w: 7.3, h: 11, d: 7.3 },
  { id: 'bocal', name: 'Bocal 370 g', w: 7.5, h: 11, d: 7.5 },
  { id: 'paquet', name: 'Paquet 500 g', w: 12, h: 20, d: 6 },
  { id: 'sachet', name: 'Sachet 1 kg', w: 13, h: 21, d: 7 },
];
