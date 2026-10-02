import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CATS, TEMPLATES, catById } from '../domain/constants';
import type { Article, CategoryId } from '../domain/types';
import { useStore } from '../store/useStore';
import { Stepper } from '../components/Stepper';
import { Thumb } from '../components/ProductBlock';

const parse = (s: string) => { const v = parseFloat(String(s).replace(',', '.').replace(/\s/g, '')); return isNaN(v) ? 0 : v; };
const str = (n: number) => String(n).replace('.', ',');
const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function ArticleForm() {
  const { editing, setEditing, saveArticle, deleteArticle, shelves } = useStore();
  const existing = editing !== 'new' && editing ? editing : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [cat, setCat] = useState<CategoryId>(existing?.cat ?? 'boissons');
  const [tpl, setTpl] = useState<string | null>(existing ? existing.tpl : 'canette');
  const [dims, setDims] = useState({ w: str(existing?.w ?? 6.6), h: str(existing?.h ?? 11.5), d: str(existing?.d ?? 6.6) });
  const [buy, setBuy] = useState(existing ? str(existing.buy.toFixed(2)) : '');
  const [sell, setSell] = useState(existing ? str(existing.sell.toFixed(2)) : '');
  const [sales, setSales] = useState(existing?.sales ?? 10);
  const [error, setError] = useState(false);

  const pickTpl = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    setTpl(id);
    if (t) setDims({ w: str(t.w), h: str(t.h), d: str(t.d) });
  };
  const draft = (): Article => ({ id: existing?.id ?? 'a' + Math.random().toString(36).slice(2, 8), name: name.trim(), cat, tpl, w: parse(dims.w), h: parse(dims.h), d: parse(dims.d), buy: parse(buy), sell: parse(sell), sales });
  const preview = draft();
  const margin = preview.sell - preview.buy;
  const target = shelves.find((s) => s.cats.includes(cat));

  const save = () => {
    if (!name.trim()) { setError(true); return; }
    saveArticle(draft());
  };

  return (
    <div className="form">
      <button className="btn btn-ghost back" onClick={() => setEditing(null)}><ArrowLeft size={20} /> Mes articles</button>
      <h1>{existing ? 'Modifier l’article' : 'Nouvel article'}</h1>

      <section>
        <h2 className="h6">1 · Quel produit ?</h2>
        <div className="field">
          <label htmlFor="a-name">Nom</label>
          <input id="a-name" className="input big" value={name} onChange={(e) => { setName(e.target.value); setError(false); }} placeholder="Ex. Limonade artisanale 33 cl" aria-invalid={error} />
          {error && <span className="warn">Indiquez un nom pour enregistrer.</span>}
        </div>
        <div className="tiles">
          {CATS.map((c) => (
            <button key={c.id} className={'tile' + (cat === c.id ? ' on' : '')} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              <i className="dot" style={{ background: c.color }} /> {c.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="h6">2 · Sa taille</h2>
        <p className="muted">Choisissez le modèle le plus proche, vous pourrez ajuster les mesures.</p>
        <div className="tiles">
          {TEMPLATES.map((t) => (
            <button key={t.id} className={'tile' + (tpl === t.id ? ' on' : '')} aria-pressed={tpl === t.id} onClick={() => pickTpl(t.id)}>{t.name}</button>
          ))}
          <button className={'tile' + (tpl === null ? ' on' : '')} aria-pressed={tpl === null} onClick={() => setTpl(null)}>Sur mesure</button>
        </div>
        <div className="dims">
          {(['w', 'h', 'd'] as const).map((k) => (
            <div className="field" key={k}>
              <label htmlFor={'d-' + k}>{k === 'w' ? 'Largeur (cm)' : k === 'h' ? 'Hauteur (cm)' : 'Profondeur (cm)'}</label>
              <input id={'d-' + k} className="input big" inputMode="decimal" value={dims[k]} onChange={(e) => { setDims({ ...dims, [k]: e.target.value }); setTpl(null); }} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="h6">3 · Prix et ventes</h2>
        <div className="dims">
          <div className="field"><label htmlFor="a-buy">Prix d’achat HT (€)</label><input id="a-buy" className="input big" inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value)} /></div>
          <div className="field"><label htmlFor="a-sell">Prix de vente (€)</label><input id="a-sell" className="input big" inputMode="decimal" value={sell} onChange={(e) => setSell(e.target.value)} /></div>
          <div className="field"><label>Vendus par semaine</label><Stepper label="ventes par semaine" value={sales} min={0} max={999} onChange={setSales} /></div>
        </div>
      </section>

      <aside className="panel summary">
        <h2 className="h6">Ce que ça rapporte</h2>
        <div className="row"><Thumb a={preview} box={72} /><b>{preview.name || 'Votre article'}</b></div>
        <p>Gain par article : <b>{eur(margin)}</b>{preview.sell > 0 && <> ({Math.round((margin / preview.sell) * 100)} %)</>}</p>
        <p>Gain par semaine : <b>{eur(margin * sales)}</b></p>
        {preview.sell > 0 && preview.sell < preview.buy && <p className="warn">Attention : vous vendez moins cher que le prix d’achat.</p>}
        <p className="muted">{target ? `Il ira sur l’étagère « ${target.name} ».` : `Aucune étagère ne contient « ${catById(cat).name} » pour l’instant.`}</p>
        <button className="btn btn-primary big" onClick={save}>Enregistrer</button>
        {existing && <button className="btn btn-secondary big" onClick={() => confirm('Supprimer cet article ?') && deleteArticle(existing.id)}>Supprimer l’article</button>}
      </aside>
    </div>
  );
}
