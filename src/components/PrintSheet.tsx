import type { ComputedShelf, Shelf } from '../domain/types';
import { CATS, ZONES } from '../domain/constants';
import { stripes } from '../domain/shapes';
import { colorFor } from './ShelfView';
import { num } from './ui';
import { useStore } from '../store/useStore';

const PSCALE = 2.5;

export function PrintSheet({
  shelf,
  computed,
  color,
  showList,
  scale = PSCALE,
}: {
  shelf: Shelf;
  computed: ComputedShelf;
  color: boolean;
  showList: boolean;
  scale?: number;
}) {
  const rows = [...computed.levels].reverse();
  const version = useStore((s) => s.activeVersionName);
  const list = rows.flatMap((l) =>
    l.items.map((it, i) => ({
      code: `${l.num}.${i + 1}`,
      a: it.a,
      f: it.f,
      capacity: it.capacity,
      wcm: it.wcm,
      zone: l.zone,
    })),
  );
  const total = list.reduce((s, r) => s + r.f, 0);
  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const catNames =
    shelf.cats.map((c) => CATS.find((x) => x.id === c)?.name).join(', ') ||
    'aucune catégorie';
  const module =
    shelf.width === 100 ? '1 m' : shelf.width === 125 ? '1,25 m' : '1,33 m';

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="print-kicker">Planogramme de mise en rayon</p>
          <h2>{shelf.name}</h2>
          <p className="print-sub">
            Module {module} · profondeur {shelf.depth ?? 40} cm ·{' '}
            {shelf.levels.length} niveaux · {computed.totalH} cm · {total}{' '}
            facings · {catNames}
          </p>
        </div>
        <div className="sheet-meta">
          <span>{date}</span>
          <b>Version : {version}</b>
          <span>Placement {computed.score} / 100</span>
        </div>
      </header>
      <div className="sheet-body">
        <div className="sheet-shelf">
          {rows.map((l) => (
            <div key={l.id} className="print-level">
              <b>{l.num}</b>
              <div
                className="print-level-box"
                style={{
                  width: Math.round(shelf.width * scale) + 4,
                  height: Math.round(l.h * scale) + 4,
                  background: color ? ZONES[l.zone].bg : '#fff',
                }}
              >
                {l.items.map((it, i) => (
                  <div
                    key={it.uid}
                    className="print-item"
                    style={{
                      width: Math.round(it.wcm * scale),
                      height: Math.round(Math.min(it.a.h, l.h) * scale),
                      background: `${stripes(it.a.w * scale)}, ${color ? colorFor(it.a, it.t, 'cat') : '#fff'}`,
                      boxShadow: 'inset 0 0 0 1px #201e1d',
                    }}
                  >
                    <span className="print-pos">
                      {l.num}.{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div
            className="print-socle"
            style={{ width: Math.round(shelf.width * scale) + 4 }}
          >
            Socle 10 cm
          </div>
        </div>
        {showList && (
          <table className="table print-table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Article / EAN</th>
                <th>Facings</th>
                <th>Qté max.</th>
                <th>Largeur</th>
                <th>Fait</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.code}>
                  <td>
                    <b>{r.code}</b>
                  </td>
                  <td>
                    {r.a.name}
                    {r.a.ean && <small className="print-ean">{r.a.ean}</small>}
                  </td>
                  <td>×{r.f}</td>
                  <td>{r.capacity}</td>
                  <td>{num(r.wcm)} cm</td>
                  <td>
                    <span className="checkbox" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <footer className="print-foot">
        <span>
          Placer de gauche à droite, du haut vers le bas. Les quantités
          maximales supposent un rayon plein, sans empilement.
          {computed.alerts.some((a) => a.sev === 2)
            ? ' ATTENTION : contraintes physiques non respectées, vérifier le brouillon avant mise en rayon.'
            : ''}
        </span>
        <span>Mis en rayon par : ____________ le __ / __ / ____</span>
      </footer>
    </div>
  );
}
