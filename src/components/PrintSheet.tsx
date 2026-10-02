import type { ComputedShelf, Shelf } from '../domain/types';
import { CATS, ZONES } from '../domain/constants';
import { stripes } from '../domain/shapes';
import { colorFor } from './ShelfView';
import { num } from './ui';

const PSCALE = 2.5;

export function PrintSheet({ shelf, computed, color, showList, scale = PSCALE }: { shelf: Shelf; computed: ComputedShelf; color: boolean; showList: boolean; scale?: number }) {
  const rows = [...computed.levels].reverse();
  const list = rows.flatMap((l) => l.items.map((it, i) => ({ code: `${l.num}.${i + 1}`, a: it.a, f: it.f, wcm: it.wcm, zone: l.zone })));
  const total = list.reduce((s, r) => s + r.f, 0);
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const catNames = shelf.cats.map((c) => CATS.find((x) => x.id === c)?.name).join(', ') || 'aucune catégorie';
  const module = shelf.width === 100 ? '1 m' : shelf.width === 125 ? '1,25 m' : '1,33 m';

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="print-kicker">Planogramme de mise en rayon</p>
          <h2>{shelf.name}</h2>
          <p className="print-sub">Module {module} · {shelf.levels.length} niveaux · {computed.totalH} cm · {total} facings · {catNames}</p>
        </div>
        <div className="sheet-meta"><span>{date}</span><b>Score {computed.score} / 100</b></div>
      </header>
      <div className="sheet-body">
        <div className="sheet-shelf">
          {rows.map((l) => (
            <div key={l.id} className="print-level">
              <b>{l.num}</b>
              <div className="print-level-box" style={{ width: Math.round(shelf.width * scale) + 4, height: Math.round(l.h * scale) + 4, background: color ? ZONES[l.zone].bg : '#fff' }}>
                {l.items.map((it, i) => (
                  <div key={it.uid} className="print-item" style={{ width: Math.round(it.wcm * scale), height: Math.round(Math.min(it.a.h, l.h) * scale), background: `${stripes(it.a.w * scale)}, ${color ? colorFor(it.a, it.t, 'cat') : '#fff'}`, boxShadow: 'inset 0 0 0 1px #201e1d' }}>
                    <span className="print-pos">{l.num}.{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="print-socle" style={{ width: Math.round(shelf.width * scale) + 4 }}>Socle 10 cm</div>
        </div>
        {showList && (
          <table className="table print-table">
            <thead><tr><th>Pos.</th><th>Article</th><th>Facings</th><th>Largeur</th><th>Zone</th><th>Fait</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.code}><td><b>{r.code}</b></td><td>{r.a.name}</td><td>×{r.f}</td><td>{num(r.wcm)} cm</td><td>{ZONES[r.zone].label}</td><td><span className="checkbox" /></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <footer className="print-foot">
        <span>Placer de gauche à droite, niveau par niveau, en partant du haut. Le code « niveau.rang » figure sur chaque bloc.</span>
        <span>Mis en rayon par : ____________ le __ / __ / ____</span>
      </footer>
    </div>
  );
}
