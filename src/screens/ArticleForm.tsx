import { useRef, useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { CATS, SHAPES, catById } from '../domain/constants';
import { globalScale, rent } from '../domain/metrics';
import { fitBox, guessShape, pc, shapeUrl } from '../domain/shapes';
import type { Article, CategoryId, Shape } from '../domain/types';
import { useStore } from '../store/useStore';
import { Stepper, eur, num, parse, str } from '../components/ui';
import { useDevice } from '../hooks';
import { articleErrors } from '../domain/validation';
import { BarcodeScanner } from '../components/BarcodeScanner';

const resize = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error('image'));
      img.onload = () => {
        const k = Math.min(1, 360 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const g = c.getContext('2d')!;
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.86));
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(file);
  });

export function ArticleForm() {
  const {
    editing,
    articles,
    tpls,
    shelves,
    go,
    saveArticle,
    deleteArticle,
    updateTpl,
  } = useStore();
  const { phone } = useDevice();
  const photo = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(editing?.name ?? '');
  const [cat, setCat] = useState<CategoryId>(editing?.cat ?? 'boissons');
  const [tpl, setTpl] = useState<string | null>(
    editing ? editing.tpl : 'canette',
  );
  const [shape, setShape] = useState<Shape | null>(editing?.shape ?? null);
  const [img, setImg] = useState<string | null>(editing?.img ?? null);
  const [dims, setDims] = useState({
    w: str(editing?.w ?? 6.6),
    h: str(editing?.h ?? 11.5),
    d: str(editing?.d ?? 6.6),
  });
  const [buy, setBuy] = useState(editing ? str(editing.buy.toFixed(2)) : '');
  const [sell, setSell] = useState(editing ? str(editing.sell.toFixed(2)) : '');
  const [sales, setSales] = useState(editing?.sales ?? 10);
  const [error, setError] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [ean, setEan] = useState(editing?.ean ?? '');
  const [promo, setPromo] = useState(editing?.promo ?? false);

  const draft = (): Article => ({
    id: editing?.id ?? 'a' + Math.random().toString(36).slice(2, 8),
    name: name.trim(),
    cat,
    tpl,
    shape,
    img,
    ean: ean.trim(),
    promo,
    w: parse(dims.w),
    h: parse(dims.h),
    d: parse(dims.d),
    buy: parse(buy),
    sell: parse(sell),
    sales,
  });
  const a = draft();
  const m = a.sell - a.buy;
  const r = rent(a);
  const { mn, mx } = globalScale(articles);
  const t = mx > mn ? Math.max(0, Math.min(1, (r - mn) / (mx - mn))) : 0.5;
  const curTpl = tpls.find((x) => x.id === tpl);
  const modified =
    !!curTpl && (a.w !== curTpl.w || a.h !== curTpl.h || a.d !== curTpl.d);
  const target = shelves.find((s) => s.cats.includes(cat));
  const color = catById(cat).color;
  const fa = { name, tpl, shape, w: a.w || 7, h: a.h || 10 };
  const autoShape = guessShape({ ...fa, shape: null });

  const advice =
    t > 0.66
      ? [
          'Niveau des yeux',
          'Parmi vos articles les plus rentables : donnez-lui la meilleure visibilité.',
        ]
      : t > 0.33
        ? [
            'Niveau des mains',
            'Rentabilité moyenne : à portée de main, sans prendre la place des meilleurs.',
          ]
        : [
            'Niveau bas ou haut',
            'Peu rentable : gardez les meilleures places pour d’autres articles.',
          ];

  const pS = Math.min(2.4, 96 / fa.h, 260 / (fa.w * 3));
  const save = (andPlace: boolean) => {
    const errors = articleErrors(draft());
    if (errors.length) {
      setError(true);
      setMessages(errors);
      return;
    }
    try {
      saveArticle(draft(), andPlace);
    } catch (e) {
      setError(true);
      setMessages([
        e instanceof Error ? e.message : 'Enregistrement impossible.',
      ]);
    }
  };

  return (
    <div className="form-page">
      <button className="btn btn-ghost back" onClick={() => go('articles')}>
        <ArrowLeft size={20} /> Articles
      </button>
      <h1>{editing ? 'Modifier l’article' : 'Nouvel article'}</h1>
      <p className="muted">
        Prix exprimés hors taxes · dimensions en centimètres.
      </p>
      {messages.length > 0 && (
        <div className="validation-errors" role="alert">
          <b>Vérifiez les informations suivantes</b>
          <ul>
            {messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-grid">
        <div className="form-main">
          <section>
            <h2 className="h6">1 · Article</h2>
            <div className="field">
              <label htmlFor="a-name">Nom de l’article</label>
              <input
                id="a-name"
                className="input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(false);
                }}
                placeholder="Ex. Limonade artisanale 33 cl"
                aria-invalid={error && !name.trim()}
              />
              {error && !name.trim() && (
                <span className="warn">Indiquez un nom pour enregistrer.</span>
              )}
            </div>
            <div className="field">
              <label htmlFor="a-ean">Code EAN / GTIN (facultatif)</label>
              <div className="actions">
                <input
                  id="a-ean"
                  className="input grow"
                  inputMode="numeric"
                  value={ean}
                  maxLength={14}
                  onChange={(e) => setEan(e.target.value)}
                  placeholder="Ex. 3017620422003"
                />
                <BarcodeScanner onCode={setEan} />
              </div>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={promo}
                onChange={(e) => setPromo(e.target.checked)}
              />{' '}
              Article en promotion
            </label>
            <span className="seglabel">Catégorie</span>
            <div className="pick-grid">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  className={'pick' + (cat === c.id ? ' on' : '')}
                  aria-pressed={cat === c.id}
                  onClick={() => setCat(c.id)}
                >
                  <i className="dot" style={{ background: c.color }} /> {c.name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="h6">2 · Dimensions</h2>
            <p className="muted">
              Choisissez un gabarit, puis ajustez les mesures au besoin.
            </p>
            <div className="tpl-grid">
              {tpls.map((x) => (
                <button
                  key={x.id}
                  className={'tpl' + (tpl === x.id ? ' on' : '')}
                  aria-pressed={tpl === x.id}
                  onClick={() => {
                    setTpl(x.id);
                    setDims({ w: str(x.w), h: str(x.h), d: str(x.d) });
                  }}
                >
                  <span className="tpl-sketch">
                    <span
                      style={{
                        width: Math.round(x.w * 2.4),
                        height: Math.round(x.h * 2.4),
                        border: '1.5px solid var(--color-text)',
                      }}
                    />
                  </span>
                  <b>{x.name}</b>
                  <small>
                    {num(x.w)} × {num(x.h)} × {num(x.d)} cm
                  </small>
                </button>
              ))}
              <button
                className={'tpl' + (!tpl ? ' on' : '')}
                aria-pressed={!tpl}
                onClick={() => setTpl(null)}
              >
                <span className="tpl-sketch">
                  <span
                    style={{
                      width: 28,
                      height: 40,
                      border: '1.5px dashed var(--color-text)',
                    }}
                  />
                </span>
                <b>Sur mesure</b>
                <small>Saisir les mesures</small>
              </button>
            </div>
            <div className="dims">
              {(['w', 'h', 'd'] as const).map((k) => (
                <div className="field" key={k}>
                  <label htmlFor={'d-' + k}>
                    {k === 'w'
                      ? 'Largeur (cm)'
                      : k === 'h'
                        ? 'Hauteur (cm)'
                        : 'Profondeur (cm)'}
                  </label>
                  <input
                    id={'d-' + k}
                    className="input"
                    inputMode="decimal"
                    value={dims[k]}
                    onChange={(e) => setDims({ ...dims, [k]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            {modified && curTpl && (
              <div className="notice">
                <span>Mesures différentes du gabarit « {curTpl.name} ».</span>
                <button
                  className="btn btn-secondary"
                  disabled={[a.w, a.h, a.d].some(
                    (v) => !Number.isFinite(v) || v < 0.1 || v > 300,
                  )}
                  onClick={() => updateTpl(curTpl.id, a.w, a.h, a.d)}
                >
                  Mettre à jour le gabarit
                </button>
              </div>
            )}
          </section>

          <section>
            <h2 className="h6">3 · Prix et ventes</h2>
            <div className="dims">
              <div className="field">
                <label htmlFor="a-buy">Prix d’achat HT (€)</label>
                <input
                  id="a-buy"
                  className="input"
                  inputMode="decimal"
                  value={buy}
                  onChange={(e) => setBuy(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="a-sell">Prix de vente HT (€)</label>
                <input
                  id="a-sell"
                  className="input"
                  inputMode="decimal"
                  value={sell}
                  onChange={(e) => setSell(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="a-sales">Ventes par semaine</label>
                <input
                  id="a-sales"
                  className="input"
                  type="number"
                  min={0}
                  max={1000000}
                  step={1}
                  value={Number.isFinite(sales) ? sales : ''}
                  onChange={(e) =>
                    setSales(
                      e.target.value === '' ? NaN : Number(e.target.value),
                    )
                  }
                />
                <Stepper
                  label="ventes par semaine"
                  value={Number.isFinite(sales) ? sales : 0}
                  onChange={setSales}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="h6">4 · Visuel</h2>
            <span className="seglabel">Silhouette</span>
            <div className="shape-grid">
              {[
                { id: null as Shape | null, label: 'Auto', shape: autoShape },
                ...SHAPES.map(([id, label]) => ({
                  id: id as Shape | null,
                  label,
                  shape: id,
                })),
              ].map((o) => {
                const { tw, th } = fitBox(fa.w, fa.h, 50);
                return (
                  <button
                    key={o.label}
                    className={'pick shape' + (shape === o.id ? ' on' : '')}
                    aria-pressed={shape === o.id}
                    onClick={() => setShape(o.id)}
                  >
                    <span className="shape-box">
                      <span
                        style={{
                          width: tw,
                          height: th,
                          backgroundImage: shapeUrl(o.shape, color),
                          backgroundSize: '100% 100%',
                        }}
                      />
                    </span>
                    {o.label}
                  </button>
                );
              })}
            </div>
            <span className="seglabel">Photo (facultatif)</span>
            <div className="photo-row">
              <span
                className="photo-prev"
                style={{ backgroundImage: img ? `url("${img}")` : 'none' }}
              >
                {!img && <Camera size={22} aria-hidden />}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => photo.current?.click()}
              >
                <Camera size={18} />{' '}
                {img ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              {img && (
                <button className="btn btn-ghost" onClick={() => setImg(null)}>
                  Retirer
                </button>
              )}
              <input
                ref={photo}
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) {
                    try {
                      setImg(await resize(f));
                    } catch {
                      alert('Impossible de lire cette image.');
                    }
                  }
                }}
              />
            </div>
            <p className="muted">
              Cadrez le produit de face, bien droit, sur fond uni : la photo est
              répétée à l’identique pour chaque facing sur le planogramme.
            </p>
          </section>
        </div>

        <aside className={'panel form-side' + (phone ? '' : ' sticky')}>
          <h2 className="h6">Aperçu en rayon</h2>
          <div className="preview">
            <span
              style={{
                width: Math.round(fa.w * 3 * pS),
                height: Math.round(fa.h * pS),
                backgroundImage: img
                  ? `url("${img}")`
                  : shapeUrl(guessShape(fa), color),
                backgroundSize: `${Math.round(fa.w * pS)}px 100%`,
                backgroundRepeat: 'repeat-x',
                backgroundColor: img ? '#fff' : 'transparent',
              }}
            />
          </div>
          <dl className="kv">
            <dt>Marge unitaire</dt>
            <dd>{eur(m)}</dd>
            <dt>Taux de marque</dt>
            <dd>{a.sell ? num((m / a.sell) * 100, 0) + ' %' : '—'}</dd>
            <dt>Taux de marge</dt>
            <dd>{a.buy ? num((m / a.buy) * 100, 0) + ' %' : '—'}</dd>
            <dt>Marge générée / semaine</dt>
            <dd>
              <span className="pill big" style={{ background: pc(t) }}>
                {eur(r)}
              </span>
            </dd>
          </dl>
          <div className="advice">
            <small>Emplacement conseillé</small>
            <b>{advice[0]}</b>
            <span className="muted">{advice[1]}</span>
            <span className="muted">
              Étagère : {target ? target.name : 'aucune pour cette catégorie'}
            </span>
          </div>
          {m < 0 && a.sell > 0 && (
            <p className="warn">
              Attention : vous vendez moins cher que le prix d’achat.
            </p>
          )}
          <button className="btn btn-primary cta" onClick={() => save(false)}>
            Enregistrer
          </button>
          <button className="btn btn-secondary cta" onClick={() => save(true)}>
            Enregistrer et placer en rayon
          </button>
          {editing && (
            <button
              className="btn btn-ghost"
              onClick={() =>
                confirm('Supprimer cet article ?') && deleteArticle(editing.id)
              }
            >
              Supprimer l’article
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
