import { describe, expect, it } from 'vitest';
import { seedArticles, seedShelves } from './seed';
import { computeShelf, rent, zoneOf } from './metrics';
import { autoArrange } from './autoArrange';

describe('métriques', () => {
  it('rentabilité = marge × ventes', () => {
    expect(rent({ buy: 0.42, sell: 0.95, sales: 48 })).toBeCloseTo(25.44, 2);
  });
  it('zones selon la hauteur du milieu du niveau', () => {
    expect(zoneOf(59)).toBe('bas');
    expect(zoneOf(60)).toBe('mains');
    expect(zoneOf(110)).toBe('yeux');
    expect(zoneOf(160)).toBe('haut');
  });
  it('détecte un niveau saturé sur les données de démo', () => {
    const arts = seedArticles(), shelves = seedShelves();
    const c = computeShelf(shelves[0], arts, shelves);
    expect(c.levels[1].sat).toBe(true); // niveau 2 : 139 cm pour 133
    expect(c.alerts.some((a) => a.kind === 'sat')).toBe(true);
    expect(c.unplaced.map((a) => a.id)).toEqual(['a19']);
  });
});

describe('rangement automatique', () => {
  it.each([0, 1, 2])('ne sature rien et ne dépasse pas la hauteur (étagère %i)', (i) => {
    const arts = seedArticles(), shelves = seedShelves();
    let k = 0;
    const place = autoArrange(shelves[i], arts, shelves, () => 'u' + k++)!;
    const next = { ...shelves[i], place };
    const c = computeShelf(next, arts, shelves.map((s, j) => (j === i ? next : s)));
    expect(c.levels.every((l) => !l.sat)).toBe(true);
    expect(c.alerts.filter((a) => a.kind === 'haut')).toEqual([]);
    expect(c.unplaced.length).toBe(0);
  });
});
