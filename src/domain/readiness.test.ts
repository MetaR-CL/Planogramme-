import { beforeEach, describe, expect, it } from 'vitest';
import { seedArticles, seedShelves } from './seed';
import {
  articleErrors,
  readBackup,
  validEAN,
  validateProject,
} from './validation';
import { TEMPLATES } from './constants';
import { catalogueTemplate, parseCatalogue, parseCSV } from './catalogue';
import { autoArrange } from './autoArrange';
import { computeShelf } from './metrics';
import { placementIssues } from './placement';
import { useStore } from '../store/useStore';
const project = () => ({
  articles: seedArticles(),
  shelves: seedShelves(),
  tpls: TEMPLATES,
  activeShelfId: 's1',
});

describe('validation et compatibilité', () => {
  it('lit une ancienne sauvegarde sans perdre ses placements', () => {
    const data = project();
    const restored = readBackup(JSON.stringify(data));
    expect(restored.data.shelves).toEqual(data.shelves);
    expect(restored.versions).toEqual([]);
  });
  it('contrôle la clé EAN et conserve les zéros initiaux', () => {
    expect(validEAN('3017620422003')).toBe(true);
    expect(validEAN('3017620422004')).toBe(false);
    expect(validEAN('012345678905')).toBe(true);
    expect(validEAN('')).toBe(true);
  });
  it.each([0, -1, NaN, Infinity])('refuse une largeur invalide %s', (w) =>
    expect(articleErrors({ ...seedArticles()[0], w })).not.toHaveLength(0),
  );
  it('rejette les références absentes et les identifiants dupliqués', () => {
    const d = project();
    d.shelves[0].place.s1a[0].aid = 'absent';
    expect(() => validateProject(d)).toThrow();
    const duplicate = project();
    duplicate.articles.push({ ...duplicate.articles[0] });
    expect(() => validateProject(duplicate)).toThrow();
  });
  it('rejette une version importée qui contient des données corrompues', () => {
    const d = project();
    expect(() =>
      readBackup(
        JSON.stringify({
          ...d,
          schemaVersion: 3,
          versions: [
            {
              id: 'v',
              name: 'Test',
              createdAt: new Date().toISOString(),
              data: { ...d, shelves: [] },
            },
          ],
        }),
      ),
    ).toThrow();
  });
});

describe('catalogue', () => {
  it('lit les virgules décimales françaises et les cellules CSV citées', () => {
    const rows = parseCSV(
      catalogueTemplate.replace('Pâte à tartiner', '"Pâte; à tartiner"'),
    );
    const result = parseCatalogue(rows, () => 'id');
    expect(result.errors).toEqual([]);
    expect(result.articles[0]).toMatchObject({
      name: 'Pâte; à tartiner',
      buy: 2.1,
      sell: 3.9,
      ean: '3017620422003',
    });
  });
  it('signale les colonnes manquantes et les EAN dupliqués', () => {
    expect(() => parseCatalogue([['nom'], ['Test']], () => 'id')).toThrow(
      'Colonnes manquantes',
    );
    const rows = parseCSV(catalogueTemplate);
    rows.push(rows[1]);
    expect(parseCatalogue(rows, () => 'id').errors[0]).toContain(
      'EAN dupliqué',
    );
  });
  it('rejette une cellule numérique qui contient du texte', () => {
    const rows = parseCSV(catalogueTemplate);
    rows[1][3] = '8abc';
    expect(parseCatalogue(rows, () => 'id').errors).not.toHaveLength(0);
  });
});

describe('capacité et implantation', () => {
  it('calcule la capacité sans empilement et l’autonomie au rythme des ventes', () => {
    const d = project();
    const c = computeShelf(
      { ...d.shelves[0], depth: 40 },
      d.articles,
      d.shelves,
    );
    const it = c.levels[0].items[0];
    expect(it.capacity).toBe(24);
    expect(it.days).toBeCloseTo(2.8);
  });
  it('détecte les contraintes pendant un déplacement sans compter deux fois le produit', () => {
    const d = project(),
      sh = d.shelves[0],
      it = sh.place.s1a[0];
    expect(
      placementIssues(sh, d.articles, it.aid, 's1a', it.f, it.uid),
    ).toEqual([]);
    expect(
      placementIssues(
        { ...sh, depth: 5 },
        d.articles,
        it.aid,
        's1a',
        24,
        it.uid,
      ),
    ).toHaveLength(2);
  });
  it('propose une référence déjà placée dans un autre meuble', () => {
    const d = project();
    const clone = {
      ...d.shelves[0],
      id: 'copy',
      place: Object.fromEntries(d.shelves[0].levels.map((l) => [l.id, []])),
    };
    const p = autoArrange(clone, d.articles, [...d.shelves, clone], () =>
      Math.random().toString(),
    );
    expect(
      Object.values(p!)
        .flat()
        .some((it) => it.aid === 'a1'),
    ).toBe(true);
  });
  it.each(['margin', 'restock', 'category', 'promo'] as const)(
    'préserve les niveaux verrouillés en mode %s',
    (mode) => {
      const d = project(),
        sh = d.shelves[0];
      sh.place.s1a[0].locked = true;
      let n = 0;
      const p = autoArrange(sh, d.articles, d.shelves, () => 'u' + n++, mode)!;
      expect(p.s1a).toEqual(sh.place.s1a);
      const c = computeShelf(
        { ...sh, place: p },
        d.articles,
        d.shelves.map((s) => (s.id === sh.id ? { ...sh, place: p } : s)),
      );
      expect(
        c.alerts.filter((a) => ['haut', 'sat', 'depth'].includes(a.kind)),
      ).toEqual([]);
    },
  );
  it('ne place pas un article trop profond', () => {
    const d = project(),
      sh = { ...d.shelves[0], depth: 5 };
    const p = autoArrange(sh, d.articles, d.shelves, () =>
      Math.random().toString(),
    )!;
    expect(
      Object.values(p)
        .flat()
        .every((it) => d.articles.find((a) => a.id === it.aid)!.d <= 5),
    ).toBe(true);
  });
});

describe('historique et versions', () => {
  beforeEach(() =>
    useStore.setState({
      ...project(),
      past: [],
      future: [],
      versions: [],
      selectedUid: null,
      pendingAid: null,
    }),
  );
  it('annule et rétablit un déplacement, puis invalide le rétablissement après une nouvelle action', () => {
    const before = useStore.getState().shelves;
    const it = before[0].place.s1a[0];
    useStore.getState().moveTo({ kind: 'placed', uid: it.uid }, 's1c', 0);
    const moved = useStore.getState().shelves;
    expect(moved).not.toEqual(before);
    useStore.getState().undo();
    expect(useStore.getState().shelves).toEqual(before);
    useStore.getState().redo();
    expect(useStore.getState().shelves).toEqual(moved);
    useStore.getState().undo();
    useStore.getState().changeF(it.uid, 1);
    expect(useStore.getState().future).toEqual([]);
  });
  it('duplique avec de nouveaux identifiants et permet une restauration de version annulable', () => {
    const original = useStore.getState().shelves;
    useStore.getState().saveVersion('Avant');
    useStore.getState().duplicateShelf('s1');
    expect(useStore.getState().shelves).toHaveLength(4);
    validateProject(useStore.getState());
    const v = useStore.getState().versions[0];
    useStore.getState().restoreVersion(v.id);
    expect(useStore.getState().shelves).toEqual(original);
    useStore.getState().undo();
    expect(useStore.getState().shelves).toHaveLength(4);
  });
  it('un import invalide ne modifie pas les données ni l’historique', () => {
    const before = useStore.getState();
    expect(before.importData('{"articles":[],"shelves":[{}]}')).toBe(false);
    expect(useStore.getState().shelves).toBe(before.shelves);
    expect(useStore.getState().past).toEqual([]);
  });
  it('annuler un import restaure aussi les versions déjà conservées', () => {
    useStore.getState().saveVersion('Version à conserver');
    const versions = useStore.getState().versions;
    expect(useStore.getState().importData(JSON.stringify(project()))).toBe(
      true,
    );
    expect(useStore.getState().versions).toEqual([]);
    useStore.getState().undo();
    expect(useStore.getState().versions).toEqual(versions);
    expect(useStore.getState().activeVersionName).toBe('Version à conserver');
  });
  it('exporte les versions et les données du projet dans une sauvegarde relisible', () => {
    useStore.getState().saveVersion('Implantation');
    const restored = readBackup(useStore.getState().exportData());
    expect(restored.versions[0].name).toBe('Implantation');
    expect(restored.data.articles).toHaveLength(27);
  });
});
