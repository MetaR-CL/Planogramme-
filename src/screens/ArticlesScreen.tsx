import { useMemo, useRef, useState } from 'react';
import { Download, Plus, RotateCcw, Search, Upload } from 'lucide-react';
import { CATS, catById } from '../domain/constants';
import { rent } from '../domain/metrics';
import { useStore } from '../store/useStore';
import { Thumb } from '../components/ProductBlock';
import type { CategoryId } from '../domain/types';

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function ArticlesScreen() {
  const { articles, shelves, setEditing, exportData, importData, resetDemo } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const file = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () => articles.filter((a) => (cat === 'all' || a.cat === cat) && a.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => rent(b) - rent(a)),
    [articles, q, cat],
  );
  const max = Math.max(...articles.map(rent), 1);
  const total = articles.reduce((s, a) => s + Math.max(0, rent(a)), 0);
  const shelfOf = (id: string) => shelves.find((sh) => Object.values(sh.place).some((arr) => arr.some((p) => p.aid === id)));

  const doExport = () => {
    const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'etal-sauvegarde.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const doImport = async (f?: File) => {
    if (!f) return;
    if (!importData(await f.text())) alert('Ce fichier n’est pas une sauvegarde Étal valide.');
  };

  return (
    <>
      <div className="head-row">
        <div>
          <h1>Mes articles</h1>
          <p className="muted">{articles.length} articles · marge générée {eur(total)} par semaine</p>
        </div>
        <button className="btn btn-primary big" onClick={() => setEditing('new')}><Plus size={22} /> Ajouter un article</button>
      </div>

      <div className="search">
        <Search size={20} aria-hidden />
        <input className="input big" placeholder="Rechercher un article" aria-label="Rechercher un article" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips">
        <button className={'chip' + (cat === 'all' ? ' on' : '')} onClick={() => setCat('all')}>Toutes</button>
        {CATS.map((c) => (
          <button key={c.id} className={'chip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}><i className="dot" style={{ background: c.color }} /> {c.name}</button>
        ))}
      </div>

      <ul className="article-list">
        {rows.map((a) => {
          const sh = shelfOf(a.id);
          const r = rent(a);
          return (
            <li key={a.id}>
              <button className="article-row" onClick={() => setEditing(a)}>
                <Thumb a={a} />
                <span className="grow">
                  <b>{a.name}</b>
                  <small><i className="dot" style={{ background: catById(a.cat).color }} /> {catById(a.cat).name} · {a.sales} / sem. · {sh ? `Étagère ${sh.name}` : 'Pas encore en rayon'}</small>
                </span>
                <span className="gain">
                  <b>{eur(r)}</b>
                  <small>par semaine</small>
                  <span className="bar"><i style={{ width: `${Math.max(0, (r / max) * 100)}%` }} /></span>
                </span>
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="muted pad">Aucun article ne correspond.</li>}
      </ul>
      <p className="muted">Gain par semaine = (prix de vente − prix d’achat) × nombre vendu par semaine.</p>

      <div className="backup">
        <h2 className="h6">Sauvegarde</h2>
        <p className="muted">Vos données restent sur cet appareil. Faites une sauvegarde pour les garder ou les passer sur un autre appareil.</p>
        <div className="actions">
          <button className="btn btn-secondary" onClick={doExport}><Download size={18} /> Enregistrer une sauvegarde</button>
          <button className="btn btn-secondary" onClick={() => file.current?.click()}><Upload size={18} /> Charger une sauvegarde</button>
          <button className="btn btn-secondary" onClick={() => confirm('Remplacer vos données par les exemples ?') && resetDemo()}><RotateCcw size={18} /> Remettre les exemples</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { doImport(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>
    </>
  );
}
