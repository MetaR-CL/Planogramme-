import type { Article, CategoryId } from './types';
import { CATS } from './constants';
import { articleErrors } from './validation';
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const columns: Record<string, string[]> = {
  name: ['nom', 'name', 'article'],
  cat: ['categorie', 'cat', 'category'],
  ean: ['ean', 'gtin', 'codebarres'],
  w: ['largeur', 'w', 'width', 'largeurcm'],
  h: ['hauteur', 'h', 'height', 'hauteurcm'],
  d: ['profondeur', 'd', 'depth', 'profondeurcm'],
  buy: ['achatht', 'achat', 'buy', 'prixachatht'],
  sell: ['venteht', 'sell', 'prixventeht'],
  sales: ['ventessemaine', 'sales', 'ventessem', 'ventesparsemaine'],
  promo: ['promotion', 'promo'],
};
export function parseCSV(text: string): string[][] {
  const first = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0];
  const delimiter = first.includes(';')
    ? ';'
    : first.includes('\t')
      ? '\t'
      : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && c === delimiter) {
      row.push(cell);
      cell = '';
    } else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('Guillemets non fermés dans le CSV.');
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export interface CataloguePreview {
  articles: Article[];
  errors: string[];
  total: number;
}
export function parseCatalogue(
  rows: unknown[][],
  newId: () => string,
): CataloguePreview {
  if (rows.length < 2)
    throw new Error(
      'Le fichier doit contenir une ligne de titres et des articles.',
    );
  if (rows.length > 10001)
    throw new Error('10 000 articles maximum par import.');
  const headers = rows[0].map((v) => normalize(String(v ?? '')));
  const index = Object.fromEntries(
    Object.entries(columns).map(([key, aliases]) => [
      key,
      headers.findIndex((h) => aliases.includes(h)),
    ]),
  );
  const required = ['name', 'cat', 'w', 'h', 'd', 'buy', 'sell', 'sales'];
  const missing = required.filter((k) => index[k] < 0);
  if (missing.length)
    throw new Error(
      'Colonnes manquantes : ' +
        missing.map((k) => columns[k][0]).join(', ') +
        '. Utilisez le modèle CSV.',
    );
  const articles: Article[] = [],
    errors: string[] = [];
  const eans = new Set<string>();
  let total = 0;
  rows.slice(1).forEach((row, i) => {
    if (
      !row.some((v) => v !== null && v !== undefined && String(v).trim() !== '')
    )
      return;
    total++;
    const text = (key: string) => String(row[index[key]] ?? '').trim();
    const numeric = (key: string) => {
      const v = text(key).replace(/\s/g, '').replace(',', '.');
      return /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
    };
    const cat = CATS.find(
      (c) =>
        normalize(c.id) === normalize(text('cat')) ||
        normalize(c.name) === normalize(text('cat')),
    )?.id;
    const promo = text('promo').toLowerCase();
    const a: Article = {
      id: newId(),
      name: text('name'),
      cat: cat as CategoryId,
      tpl: null,
      shape: null,
      img: null,
      w: numeric('w'),
      h: numeric('h'),
      d: numeric('d'),
      buy: numeric('buy'),
      sell: numeric('sell'),
      sales: numeric('sales'),
      ean: text('ean'),
      promo: ['oui', 'true', '1'].includes(promo),
    };
    const invalid = articleErrors(a);
    if (a.ean && eans.has(a.ean)) invalid.push('EAN dupliqué dans le fichier.');
    if (promo && !['oui', 'non', 'true', 'false', '1', '0'].includes(promo))
      invalid.push('Promotion : indiquez oui ou non.');
    if (a.ean) eans.add(a.ean);
    if (invalid.length)
      errors.push(
        `Ligne ${i + 2} · ${a.name || 'sans nom'} : ${invalid.join(' ')}`,
      );
    else articles.push(a);
  });
  return { articles, errors, total };
}
export const catalogueTemplate =
  'nom;categorie;ean;largeur;hauteur;profondeur;achat_ht;vente_ht;ventes_semaine;promotion\nPâte à tartiner;Épicerie sucrée;3017620422003;8;12;8;2,10;3,90;12;non\n';
