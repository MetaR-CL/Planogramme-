import { Copy, Plus, Trash2 } from 'lucide-react';
import {
  CATS,
  MAXH,
  MODULES,
  ZONES,
  ZONE_ORDER,
  catById,
} from '../domain/constants';
import { computeShelf } from '../domain/metrics';
import { useStore } from '../store/useStore';
import { ScoreBadge, Stepper, num } from '../components/ui';
import { useDevice } from '../hooks';
import type { Shelf, Zone } from '../domain/types';

const MSCALE = 0.75;

export function ShelvesScreen() {
  const S = useStore();
  const { w, phone } = useDevice();
  const shelf = S.shelves.find((s) => s.id === S.activeShelfId) ?? S.shelves[0];
  const C = computeShelf(shelf, S.articles, S.shelves);
  const upd = (fn: (s: Shelf) => Shelf) => S.updShelf(shelf.id, fn);
  const setLevel = (
    id: string,
    fn: (l: Shelf['levels'][number]) => Shelf['levels'][number],
  ) =>
    upd((s) => ({
      ...s,
      levels: s.levels.map((l) => (l.id === id ? fn(l) : l)),
    }));
  const cps = Math.max(
    1.2,
    Math.min(
      2.5,
      (w - (phone ? 32 : 48) - 24 - 40) / shelf.width / (phone ? 1 : 2),
    ),
  );
  const rev = [...C.levels].reverse();
  const tooTall = C.totalH > MAXH;
  const raw = (id: string) =>
    shelf.levels.find((x) => x.id === id)?.zone ?? null;
  const catsLabel = (s: Shelf) =>
    s.cats.length
      ? s.cats.map((c) => catById(c).name).join(', ')
      : 'Aucune catégorie';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Étagères</h1>
          <p className="muted">
            Une étagère par famille de produits. Chacune a ses réglages, son
            score et ses alertes.
          </p>
        </div>
        <button className="btn btn-primary cta" onClick={S.addShelf}>
          <Plus size={22} /> Nouvelle étagère
        </button>
      </div>

      <div className="shelf-cards">
        {S.shelves.map((sh) => {
          const c = computeShelf(sh, S.articles, S.shelves);
          const on = sh.id === shelf.id;
          return (
            <article
              key={sh.id}
              className={'shelf-card' + (on ? ' on' : '')}
              onClick={() => S.setActiveShelf(sh.id)}
            >
              <div className="mini" aria-hidden>
                {[...c.levels].reverse().map((l) => (
                  <div
                    key={l.id}
                    className="mini-level"
                    style={{
                      width: Math.round(sh.width * MSCALE),
                      height: Math.round(l.h * MSCALE),
                      background: ZONES[l.zone].bg,
                    }}
                  >
                    {l.items.map((it) => (
                      <i
                        key={it.uid}
                        style={{
                          width: Math.max(1, Math.round(it.wcm * MSCALE)),
                          height: Math.round(Math.min(it.a.h, l.h) * MSCALE),
                          background: catById(it.a.cat).color,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="shelf-card-info">
                <h3>{sh.name}</h3>
                <p className="muted">{catsLabel(sh)}</p>
                <p className="muted">
                  {MODULES.find((m) => m.w === sh.width)?.label} ·{' '}
                  {sh.levels.length} niveaux · {c.totalH} cm
                </p>
                <p className="row">
                  <ScoreBadge score={c.score} />
                  {c.alerts.length > 0 && (
                    <span className="tag tag-accent">
                      {c.alerts.length} alerte{c.alerts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    S.openPlanogram(sh.id);
                  }}
                >
                  Ouvrir le planogramme →
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    S.duplicateShelf(sh.id);
                  }}
                >
                  <Copy size={16} />
                  Dupliquer
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="settings-grid">
        <div>
          <section>
            <h2 className="h6">Nom de l’étagère</h2>
            <input
              className="input"
              aria-label="Nom de l’étagère"
              maxLength={200}
              value={shelf.name}
              onChange={(e) => upd((s) => ({ ...s, name: e.target.value }))}
              onBlur={() => {
                if (!shelf.name.trim())
                  upd((s) => ({ ...s, name: 'Étagère sans nom' }));
              }}
            />
          </section>
          <section>
            <h2 className="h6">Catégories contenues</h2>
            <div className="pick-grid">
              {CATS.map((c) => {
                const on = shelf.cats.includes(c.id);
                const n = S.articles.filter((a) => a.cat === c.id).length;
                const other = S.shelves
                  .filter((s) => s.id !== shelf.id && s.cats.includes(c.id))
                  .map((s) => s.name);
                return (
                  <button
                    key={c.id}
                    className={'pick check' + (on ? ' on' : '')}
                    aria-pressed={on}
                    onClick={() =>
                      upd((s) => ({
                        ...s,
                        cats: on
                          ? s.cats.filter((x) => x !== c.id)
                          : [...s.cats, c.id],
                      }))
                    }
                  >
                    <span className="box" aria-hidden>
                      {on && '✓'}
                    </span>
                    <span>
                      <b>
                        <i className="dot" style={{ background: c.color }} />
                        {c.name}
                      </b>
                      <small>
                        {n} articles
                        {other.length ? ' · aussi : ' + other.join(', ') : ''}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          <section>
            <h2 className="h6">Module (largeur du meuble)</h2>
            <div className="pick-grid three">
              {MODULES.map((m) => (
                <button
                  key={m.w}
                  className={'pick module' + (shelf.width === m.w ? ' on' : '')}
                  aria-pressed={shelf.width === m.w}
                  onClick={() => upd((s) => ({ ...s, width: m.w }))}
                >
                  <b>{m.label}</b>
                  <small>{m.w} cm de large</small>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2 className="h6">Profondeur utile du meuble</h2>
            <Stepper
              label="profondeur du meuble"
              value={shelf.depth ?? 40}
              min={5}
              max={150}
              step={5}
              display={`${shelf.depth ?? 40} cm`}
              onChange={(depth) => upd((s) => ({ ...s, depth }))}
            />
            <p className="muted">
              Utilisée pour vérifier les produits et calculer la capacité en
              rayon, sans empilement.
            </p>
          </section>
          <section>
            <div className="row between">
              <h2 className="h6">Niveaux</h2>
              <Stepper
                label="nombre de niveaux"
                value={shelf.levels.length}
                min={2}
                max={8}
                onChange={(v) => S.addLevel(v - shelf.levels.length)}
              />
            </div>
            {rev.map((l) => (
              <div className="cfg-level" key={l.id}>
                <div className="cfg-level-top">
                  <div>
                    <b>Niveau {l.num}</b>
                    <small>
                      {l.y0} – {l.y0 + l.h} cm du sol
                    </small>
                  </div>
                  <Stepper
                    label={`hauteur du niveau ${l.num}`}
                    value={l.h}
                    min={15}
                    max={60}
                    step={5}
                    size={44}
                    display={`${l.h} cm`}
                    onChange={(v) => setLevel(l.id, (x) => ({ ...x, h: v }))}
                  />
                </div>
                <div
                  className="segm zones"
                  role="group"
                  aria-label={`Zone du niveau ${l.num}`}
                >
                  {([null, ...ZONE_ORDER] as (Zone | null)[]).map((z) => (
                    <button
                      key={z ?? 'auto'}
                      className={'segm-opt' + (raw(l.id) === z ? ' on' : '')}
                      onClick={() => setLevel(l.id, (x) => ({ ...x, zone: z }))}
                    >
                      {z === null
                        ? `Auto · ${ZONES[l.auto].label}`
                        : ZONES[z].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="gauge">
              <div className="row between">
                <span>Hauteur totale (socle 10 cm compris)</span>
                <b
                  style={{ color: tooTall ? 'var(--color-accent)' : undefined }}
                >
                  {C.totalH} / {MAXH} cm
                </b>
              </div>
              <div className="gauge-bar">
                <i
                  style={{
                    width:
                      Math.min(100, Math.round((C.totalH / MAXH) * 100)) + '%',
                    background: tooTall
                      ? 'var(--color-accent)'
                      : 'var(--color-text)',
                  }}
                />
              </div>
              {tooTall && (
                <p className="warn">
                  Trop haut : le meuble dépasse {MAXH} cm. Réduisez la hauteur
                  d’un niveau.
                </p>
              )}
            </div>
          </section>
          {S.shelves.length > 1 && (
            <button
              className="btn btn-ghost"
              onClick={() =>
                confirm('Supprimer cette étagère ?') && S.deleteShelf(shelf.id)
              }
            >
              <Trash2 size={18} /> Supprimer cette étagère
            </button>
          )}
        </div>

        <aside className="cfg-preview">
          <h2 className="h6">Aperçu à l’échelle</h2>
          <div
            className="cfg-shelf"
            style={{ width: Math.round(shelf.width * cps) + 12 }}
          >
            {rev.map((l) => (
              <div
                key={l.id}
                className="cfg-level-box"
                style={{
                  width: Math.round(shelf.width * cps),
                  height: Math.round(l.h * cps),
                  background: ZONES[l.zone].bg,
                }}
              >
                <small>
                  N{l.num} · {ZONES[l.zone].label}
                </small>
              </div>
            ))}
            <div className="socle small">Socle</div>
          </div>
          <p className="muted">
            {num(shelf.width, 0)} cm de large · {C.totalH} cm de haut
          </p>
          <ul className="zone-legend">
            {ZONE_ORDER.map((z) => (
              <li key={z}>
                <i style={{ background: ZONES[z].bg }} />
                <span>
                  <b>
                    Niveau{' '}
                    {z === 'yeux'
                      ? 'des yeux'
                      : z === 'mains'
                        ? 'des mains'
                        : z}
                  </b>{' '}
                  <small>{ZONES[z].range}</small>
                  <br />
                  <small>{ZONES[z].desc}</small>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
