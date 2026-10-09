import type { Article, Shelf, Template } from './types';
import { CATS, SHAPES, TEMPLATES } from './constants';

export interface ProjectData {
  articles: Article[];
  shelves: Shelf[];
  tpls: Template[];
  activeShelfId: string;
}
export interface SavedVersion {
  id: string;
  name: string;
  createdAt: string;
  data: ProjectData;
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const number = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const text = (v: unknown, max = 200): v is string =>
  typeof v === 'string' && !!v.trim() && v.length <= max;
const unique = (values: string[]) => new Set(values).size === values.length;

export function validEAN(ean: string) {
  if (!ean) return true;
  if (!/^\d{8}$|^\d{12,14}$/.test(ean)) return false;
  const digits = [...ean].map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function articleErrors(a: Article): string[] {
  const errors: string[] = [];
  if (!text(a.name)) errors.push('Indiquez un nom de 1 à 200 caractères.');
  if (!CATS.some((c) => c.id === a.cat)) errors.push('Catégorie inconnue.');
  if (![a.w, a.h, a.d].every((v) => number(v, 0.1, 300)))
    errors.push('Chaque dimension doit être comprise entre 0,1 et 300 cm.');
  if (![a.buy, a.sell].every((v) => number(v, 0, 1000000)))
    errors.push('Saisissez des prix HT valides et positifs ou nuls.');
  if (!number(a.sales, 0, 1000000) || !Number.isInteger(a.sales))
    errors.push('Les ventes doivent être un nombre entier positif ou nul.');
  if (a.ean !== undefined && (typeof a.ean !== 'string' || !validEAN(a.ean)))
    errors.push(
      'Code EAN / GTIN invalide : vérifiez les chiffres et la clé de contrôle.',
    );
  if (a.promo !== undefined && typeof a.promo !== 'boolean')
    errors.push('Promotion invalide.');
  if (a.shape !== null && !SHAPES.some(([id]) => id === a.shape))
    errors.push('Silhouette inconnue.');
  if (a.tpl !== null && !text(a.tpl)) errors.push('Gabarit invalide.');
  if (
    a.img !== null &&
    (typeof a.img !== 'string' ||
      a.img.length > 2000000 ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a.img))
  )
    errors.push('Photo invalide ou trop volumineuse.');
  return errors;
}

export function validateProject(input: unknown): ProjectData {
  if (
    !record(input) ||
    !Array.isArray(input.articles) ||
    !Array.isArray(input.shelves) ||
    !input.shelves.length ||
    input.shelves.length > 100 ||
    input.articles.length > 10000
  )
    throw new Error(
      'La sauvegarde doit contenir des articles et entre 1 et 100 étagères.',
    );
  const articles = input.articles as Article[];
  if (
    articles.some(
      (a) => !record(a) || !text(a.id) || articleErrors(a).length,
    ) ||
    !unique(articles.map((a) => a.id))
  )
    throw new Error(
      'Articles invalides dans la sauvegarde (dimensions, prix, identifiants ou EAN).',
    );
  const eans = articles.map((a) => a.ean).filter((e): e is string => !!e);
  if (!unique(eans))
    throw new Error('Plusieurs articles utilisent le même EAN.');
  const articleIds = new Set(articles.map((a) => a.id));
  const shelves = input.shelves as Shelf[];
  const uids: string[] = [];
  for (const sh of shelves) {
    if (
      !record(sh) ||
      !text(sh.id) ||
      !text(sh.name) ||
      ![100, 125, 133].includes(sh.width) ||
      (sh.depth !== undefined && !number(sh.depth, 5, 150)) ||
      !Array.isArray(sh.cats) ||
      !unique(sh.cats) ||
      sh.cats.some((id) => !CATS.some((c) => c.id === id)) ||
      !Array.isArray(sh.levels) ||
      sh.levels.length < 2 ||
      sh.levels.length > 8 ||
      !record(sh.place)
    )
      throw new Error('Configuration d’étagère invalide.');
    const ids = sh.levels.map((l) => l.id);
    if (
      !unique(ids) ||
      sh.levels.some(
        (l) =>
          !record(l) ||
          !text(l.id) ||
          !number(l.h, 15, 60) ||
          ![null, 'bas', 'mains', 'yeux', 'haut'].includes(l.zone),
      )
    )
      throw new Error('Niveaux invalides.');
    if (Object.keys(sh.place).some((id) => !ids.includes(id)))
      throw new Error('Un placement référence un niveau absent.');
    for (const id of ids) {
      const items = sh.place[id];
      if (
        !Array.isArray(items) ||
        items.length > 200 ||
        items.some(
          (it) =>
            !record(it) ||
            !text(it.uid) ||
            !articleIds.has(it.aid) ||
            !number(it.f, 1, 24) ||
            !Number.isInteger(it.f) ||
            (it.locked !== undefined && typeof it.locked !== 'boolean'),
        )
      )
        throw new Error('Placements invalides ou références absentes.');
      uids.push(...items.map((it) => it.uid));
    }
  }
  if (!unique(shelves.map((sh) => sh.id)) || !unique(uids))
    throw new Error('Identifiants dupliqués dans les étagères.');
  const tpls = input.tpls as Template[];
  if (
    !Array.isArray(tpls) ||
    tpls.length > 100 ||
    tpls.some(
      (t) =>
        !record(t) ||
        !text(t.id) ||
        !text(t.name) ||
        ![t.w, t.h, t.d].every((v) => number(v, 0.1, 300)),
    ) ||
    !unique(tpls.map((t) => t.id))
  )
    throw new Error('Gabarits invalides.');
  return {
    articles,
    shelves,
    tpls,
    activeShelfId: shelves.some((sh) => sh.id === input.activeShelfId)
      ? (input.activeShelfId as string)
      : shelves[0].id,
  };
}

export function readBackup(json: string): {
  data: ProjectData;
  versions: SavedVersion[];
} {
  const d: unknown = JSON.parse(json);
  if (!record(d) || (d.schemaVersion !== undefined && d.schemaVersion !== 3))
    throw new Error('Version de sauvegarde non prise en charge.');
  const data = validateProject({ ...d, tpls: d.tpls ?? TEMPLATES });
  const versions = d.versions ?? [];
  if (!Array.isArray(versions) || versions.length > 20)
    throw new Error('Liste des versions invalide.');
  const parsed = versions.map((v) => {
    if (
      !record(v) ||
      !text(v.id) ||
      !text(v.name) ||
      typeof v.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(v.createdAt))
    )
      throw new Error('Version nommée invalide.');
    return {
      id: v.id,
      name: v.name,
      createdAt: v.createdAt,
      data: validateProject(v.data),
    };
  });
  if (!unique(parsed.map((v) => v.id))) throw new Error('Versions dupliquées.');
  return { data, versions: parsed };
}
