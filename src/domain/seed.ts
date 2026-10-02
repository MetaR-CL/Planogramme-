import type { Article, CategoryId, Level, Placement, Shelf } from './types';

const A = (id: string, name: string, cat: CategoryId, tpl: string | null, w: number, h: number, d: number, buy: number, sell: number, sales: number): Article =>
  ({ id, name, cat, tpl, w, h, d, buy, sell, sales, shape: null, img: null });

export const seedArticles = (): Article[] => [
  A('a1', 'Coca-Cola 33 cl', 'boissons', 'canette', 6.6, 11.5, 6.6, 0.42, 0.95, 48),
  A('a16', 'Limonade artisanale 33 cl', 'boissons', 'canette', 6.6, 11.5, 6.6, 0.65, 1.8, 10),
  A('a2', 'Eau minérale 1,5 L', 'boissons', 'bouteille15', 9, 32, 9, 0.28, 0.65, 60),
  A('a3', 'Jus d’orange 1 L', 'boissons', 'brique', 9, 19.5, 6, 1.1, 2.2, 18),
  A('a4', 'Sirop de menthe 75 cl', 'boissons', 'bouteille75', 8, 30, 8, 1.9, 3.4, 3),
  A('a5', 'Lait demi-écrémé 1 L', 'petitdej', 'brique', 9, 19.5, 6, 0.78, 1.15, 40),
  A('a6', 'Café moulu 250 g', 'petitdej', null, 9, 13, 6, 2.1, 3.95, 11),
  A('a17', 'Céréales 375 g', 'petitdej', null, 19, 27, 7, 1.6, 3.2, 8),
  A('a18', 'Thé vert 25 sachets', 'petitdej', null, 7.5, 12, 6, 1.2, 2.9, 6),
  A('a19', 'Chocolat en poudre 400 g', 'petitdej', null, 12, 18, 8, 1.5, 3.1, 5),
  A('a7', 'Confiture de fraises', 'sucre', 'bocal', 7.5, 11, 7.5, 1.3, 2.95, 5),
  A('a8', 'Petits-beurre 200 g', 'sucre', null, 6, 21, 13, 0.85, 1.9, 14),
  A('a20', 'Chocolat noir 100 g', 'sucre', null, 8.5, 17, 1.5, 0.9, 2.2, 20),
  A('a9', 'Fusilli 500 g', 'sale', 'paquet', 12, 20, 6, 0.62, 1.49, 25),
  A('a10', 'Riz basmati 1 kg', 'sale', 'sachet', 13, 21, 7, 1.35, 2.9, 9),
  A('a11', 'Huile d’olive 75 cl', 'sale', null, 7, 29, 7, 4.2, 7.9, 6),
  A('a12', 'Sel fin 1 kg', 'sale', null, 9, 16, 6, 0.35, 0.79, 4),
  A('a13', 'Moutarde de Dijon', 'sale', null, 7, 10, 7, 0.95, 1.85, 4),
  A('a21', 'Biscuits apéritifs 150 g', 'sale', null, 14, 20, 6, 0.7, 1.75, 9),
  A('a14', 'Pois chiches 400 g', 'conserves', 'conserve', 7.3, 11, 7.3, 0.55, 1.29, 12),
  A('a15', 'Tomates pelées 400 g', 'conserves', 'conserve', 7.3, 11, 7.3, 0.48, 1.05, 15),
  A('a22', 'Thon au naturel ×3', 'conserves', null, 8.5, 6, 8.5, 2.1, 3.9, 7),
  A('a23', 'Liquide vaisselle 500 ml', 'entretien', null, 7, 21, 4.5, 0.9, 1.95, 8),
  A('a24', 'Lessive liquide 1,5 L', 'entretien', null, 19, 28, 9, 4.1, 7.9, 4),
  A('a25', 'Éponges ×3', 'entretien', null, 10, 14, 4, 0.6, 1.6, 6),
  A('a26', 'Sacs poubelle 30 L', 'entretien', null, 12, 15, 6, 0.95, 2.2, 7),
  A('a27', 'Eau de Javel 1 L', 'entretien', null, 9, 26, 6, 0.55, 1.35, 5),
];

let n = 0;
const P = (aid: string, f: number): Placement => ({ uid: 'seed' + ++n, aid, f });
const L = (id: string, h: number): Level => ({ id, h, zone: null });

export const seedShelves = (): Shelf[] => [
  {
    id: 's1', name: 'Boissons & petit-déjeuner', cats: ['boissons', 'petitdej'], width: 133,
    levels: [L('s1a', 40), L('s1b', 35), L('s1c', 35), L('s1d', 35), L('s1e', 40)],
    place: { s1a: [P('a2', 6), P('a3', 3)], s1b: [P('a5', 7), P('a17', 4)], s1c: [P('a1', 6), P('a16', 4), P('a18', 4)], s1d: [P('a6', 4), P('a4', 6)], s1e: [] },
  },
  {
    id: 's2', name: 'Épicerie', cats: ['sucre', 'sale', 'conserves'], width: 125,
    levels: [L('s2a', 35), L('s2b', 30), L('s2c', 30), L('s2d', 25), L('s2e', 35)],
    place: { s2a: [P('a10', 3), P('a12', 4)], s2b: [P('a9', 4), P('a14', 4), P('a15', 4)], s2c: [P('a8', 3), P('a7', 3), P('a22', 4)], s2d: [P('a20', 5), P('a11', 3), P('a13', 3)], s2e: [] },
  },
  {
    id: 's3', name: 'Entretien', cats: ['entretien'], width: 100,
    levels: [L('s3a', 45), L('s3b', 40), L('s3c', 40), L('s3d', 40)],
    place: { s3a: [P('a24', 3)], s3b: [], s3c: [P('a23', 4)], s3d: [] },
  },
];
