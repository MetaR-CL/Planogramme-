import { useMemo, useRef } from 'react';
import { Download, Plus, RotateCcw, Search, Upload } from 'lucide-react';
import { CATS, catById } from '../domain/constants';
import { globalScale, placedIds, rent } from '../domain/metrics';
import { pc } from '../domain/shapes';
import { useStore, type SortKey } from '../store/useStore';
import { Thumb, eur, num } from '../components/ui';
import { useDevice } from '../hooks';
import type { Article } from '../domain/types';

const COLS: [SortKey, string][] = [
  ['name', 'Article'], ['cat', 'Catégorie'], ['dims', 'L × H × P (cm)'], ['buy', 'Achat HT'], ['sell', 'Vente'], ['marge', 'Marge'], ['sales', 'Ventes / sem.'], ['rent', 'Rentabilité / sem.'],
];
const PHONE_SORTS: [SortKey, string][] = [['rent', 'Rentabilité'], ['sales', 'Ventes'], ['marge', 'Marge'], ['name', 'Nom']];

export function ArticlesScreen() {
  const S = useStore();
  const { phone } = useDevice();
  const file = useRef<HTMLInputElement>(null);
  const { mx, t } = useMemo(() => globalScale(S.articles), [S.articles]);
  const placed = useMemo(() => placedIds(S.shelves), [S.shelves]);
  const total = S.articles.reduce((s, a) => s + rent(a), 0);

  const val = (a: Article): string | number => ({ name: a.name, cat: catById(a.cat).name, dims: a.w * a.h, buy: a.buy, sell: a.sell, marge: a.sell - a.buy, sales: a.sales, rent: rent(a) }[S.sort.key]);
  const rows = S.articles
    .filter((a) => (S.catFilter === 'all' || a.cat === S.catFilter) && (!S.query.trim() || a.name.toLowerCase().includes(S.query.trim().toLowerCase())))
    .sort((x, y) => {
      const a = val(x), b = val(y);
      return (typeof a === 'string' ? a.localeCompare(b as string, 'fr') : a - (b as number)) * S.sort.dir;
    });

  const sortBy = (k: SortKey) => S.set({ sort: { key: k, dir: S.sort.key === k ? (-S.sort.dir as 1 | -1) : k === 'name' || k === 'cat' ? 1 : -1 } });
  const arrow = (k: SortKey) => (S.sort.key === k ? (S.sort.dir > 0 ? ' ↑' : ' ↓') : '');
  const shelfNames = (id: string) => [...(placed[id] ?? [])].map((sid) => S.shelves.find((s) => s.id === sid)?.name).filter(Boolean).join(', ');

  const doExport = () => {
    const url = URL.createObjectURL(new Blob([S.exportData()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'etal-sauvegarde.json'; a.click();
    URL.revokeObjectURL(url);
  };
  const doImport = async (f?: File) => { if (f && !S.importData(await f.text())) alert('Ce fichier n’est pas une sauvegarde Étal valide.'); };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Articles</h1>
          <p className="muted">{S.articles.length} articles · marge générée {eur(total)} par semaine</p>
        </div>
        <button className="btn btn-primary cta" onClick={() => S.openForm(null)}><Plus size={22} /> Ajouter un article</button>
      </div>

      <div className="search">
        <Search size={20} aria-hidden />
        <input className="input" placeholder="Rechercher un article" aria-label="Rechercher un article" value={S.query} onChange={(e) => S.set({ query: e.target.value })} />
      </div>
      <div className="chips">
        {[{ id: 'all', name: 'Toutes', color: 'transparent' }, ...CATS].map((c) => (
          <button key={c.id} className={'chip' + (S.catFilter === c.id ? ' on' : '')} onClick={() => S.set({ catFilter: c.id })}>
            {c.id !== 'all' && <i className="dot" style={{ background: c.color }} />} {c.name}
          </button>
        ))}
      </div>

      {phone ? (
        <>
          <div className="chips sorts">
            <span className="muted">Trier</span>
            {PHONE_SORTS.map(([k, l]) => <button key={k} className={'chip' + (S.sort.key === k ? ' on' : '')} onClick={() => sortBy(k)}>{l}{arrow(k)}</button>)}
          </div>
          <ul className="cards">
            {rows.map((a) => (
              <li key={a.id}>
                <button className="card-row" onClick={() => S.openForm(a)}>
                  <Thumb a={a} />
                  <span className="grow"><b>{a.name}</b><small><i className="dot" style={{ background: catById(a.cat).color }} />{catById(a.cat).name} · {num(a.sales, 0)} / sem.</small></span>
                  <span className="gain"><span className="pill" style={{ background: pc(t(a)) }}>{eur(rent(a))}</span><small>marge {eur(a.sell - a.buy)}</small></span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="table-wrap">
          <table className="table art-table">
            <thead>
              <tr>{COLS.map(([k, l]) => <th key={k} className={S.sort.key === k ? 'sorted' : ''}><button onClick={() => sortBy(k)}>{l}<span>{arrow(k)}</span></button></th>)}</tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const c = catById(a.cat), m = a.sell - a.buy, r = rent(a), tt = t(a), pl = placed[a.id];
                return (
                  <tr key={a.id} tabIndex={0} onClick={() => S.openForm(a)} onKeyDown={(e) => e.key === 'Enter' && S.openForm(a)}>
                    <td>
                      <span className="art-cell">
                        <Thumb a={a} />
                        <span><b>{a.name}</b>{pl ? <small>Étagère {shelfNames(a.id)}</small> : <span className="tag tag-accent">Pas encore en rayon</span>}</span>
                      </span>
                    </td>
                    <td><i className="dot" style={{ background: c.color }} />{c.name}</td>
                    <td>{num(a.w)} × {num(a.h)} × {num(a.d)}</td>
                    <td>{eur(a.buy)}</td>
                    <td>{eur(a.sell)}</td>
                    <td>{eur(m)} <small>{a.sell ? num((m / a.sell) * 100, 0) + ' %' : '—'}</small></td>
                    <td>{num(a.sales, 0)}</td>
                    <td>
                      <span className="pill" style={{ background: pc(tt) }}>{eur(r)}</span>
                      <span className="bar"><i style={{ width: Math.max(3, Math.round((r / (mx || 1)) * 100)) + '%', background: pc(tt, 0.62, 0.17) }} /></span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length === 0 && <p className="muted pad">Aucun article ne correspond.</p>}

      <div className="legend-row">
        <span>Rentabilité = marge unitaire × ventes par semaine</span>
        <span className="gradient" aria-hidden /><span>Faible</span><span>→</span><span>Forte</span>
      </div>

      <section className="backup">
        <h2 className="h6">Sauvegarde</h2>
        <p className="muted">Vos données restent sur cet appareil. Enregistrez une sauvegarde pour les conserver ou les passer sur un autre appareil.</p>
        <div className="actions">
          <button className="btn btn-secondary" onClick={doExport}><Download size={18} /> Enregistrer une sauvegarde</button>
          <button className="btn btn-secondary" onClick={() => file.current?.click()}><Upload size={18} /> Charger une sauvegarde</button>
          <button className="btn btn-secondary" onClick={() => confirm('Remplacer vos données par les exemples ?') && S.resetDemo()}><RotateCcw size={18} /> Remettre les exemples</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </section>
    </>
  );
}
