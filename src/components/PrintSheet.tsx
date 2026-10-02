import type { Article, ComputedShelf, Shelf } from '../domain/types';
import { ZONES, CATS } from '../domain/constants';
import { ProductBlock } from './ProductBlock';

const PSCALE = 2.5;

export function PrintSheet({ shelf, computed }: { shelf: Shelf; computed: ComputedShelf }) {
  const rows = [...computed.levels].reverse();
  const list = computed.levels.flatMap((l) => l.items.map((it, i) => ({ pos: `${l.num}.${i + 1}`, a: it.a as Article, f: it.f, wcm: it.wcm, zone: l.zone }))).sort((a, b) => b.pos.localeCompare(a.pos, 'fr', { numeric: true }));
  const date = new Date().toLocaleDateString('fr-FR');
  const catNames = shelf.cats.map((c) => CATS.find((x) => x.id === c)?.name).join(', ');
  return (
    <section className="print-sheet print-only">
      <p className="print-kicker">Planogramme de mise en rayon</p>
      <h1>{shelf.name}</h1>
      <p className="print-sub">Module {shelf.width / 100} m · {shelf.levels.length} niveaux · {catNames} · {date}</p>
      <div className="print-body">
        <div>
          {rows.map((l) => (
            <div key={l.id} className="print-level">
              <b>{l.num}</b>
              <div className="print-level-box" style={{ width: shelf.width * PSCALE, height: l.h * PSCALE, background: ZONES[l.zone].bg }}>
                {l.items.map((it, i) => (
                  <div key={it.uid} className="print-item" style={{ width: it.a.w * it.f * PSCALE }}>
                    <span className="print-pos">{l.num}.{i + 1}</span>
                    <ProductBlock a={it.a} f={it.f} scale={PSCALE} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <table className="table print-table">
          <thead><tr><th>Pos.</th><th>Article</th><th>Côte à côte</th><th>Largeur</th><th>Zone</th><th>Fait</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.pos}>
                <td>{r.pos}</td><td>{r.a.name}</td><td>×{r.f}</td><td>{r.wcm.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} cm</td>
                <td>{ZONES[r.zone].label}</td><td><span className="checkbox" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="print-foot">Placer de gauche à droite, niveau par niveau, en partant du haut. · Mis en rayon par : ________ le __/__/____</p>
    </section>
  );
}
