import { useEffect, useRef, useState } from 'react';
import {
  Hand,
  Lock,
  Maximize,
  Minus,
  Plus,
  Search,
  Trash2,
  Unlock,
  Wand2,
  X,
} from 'lucide-react';
import { CATS, catById } from '../domain/constants';
import { computeShelf, rent } from '../domain/metrics';
import { autoArrange, type ArrangeMode } from '../domain/autoArrange';
import { placementIssues } from '../domain/placement';
import { pc } from '../domain/shapes';
import {
  useActiveShelf,
  useStore,
  uid,
  type MoveSource,
} from '../store/useStore';
import { DragGhost, ShelfView, colorFor } from '../components/ShelfView';
import { useShelfDrag } from '../components/useShelfDrag';
import {
  ScoreBadge,
  Segmented,
  Stepper,
  Thumb,
  eur,
  num,
} from '../components/ui';
import { Modal } from '../components/Modal';
import { useDevice } from '../hooks';
import type { Shelf } from '../domain/types';

export function PlanogramScreen() {
  const S = useStore();
  const { shelf, computed: C } = useActiveShelf();
  const { phone } = useDevice();
  const [query, setQuery] = useState(''),
    [library, setLibrary] = useState<'unplaced' | 'all'>('unplaced');
  const [zoom, setZoom] = useState(1),
    [canvasWidth, setCanvasWidth] = useState(500),
    [pan, setPan] = useState(false);
  const viewport = useRef<HTMLDivElement>(null),
    panStart = useRef<{
      x: number;
      y: number;
      left: number;
      top: number;
    } | null>(null);
  const [override, setOverride] = useState<{
    issues: string[];
    apply: () => void;
  } | null>(null);
  const [autoOpen, setAutoOpen] = useState(false),
    [mode, setMode] = useState<ArrangeMode>('margin'),
    [proposal, setProposal] = useState<Shelf['place'] | null>(null);
  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setCanvasWidth(entry.contentRect.width),
    );
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setProposal(null);
  }, [shelf, S.articles, mode]);
  const fitScale = Math.max(
    0.4,
    Math.min(4, (canvasWidth - (phone ? 100 : 170)) / shelf.width),
  );
  const scale = fitScale * zoom;
  const byUid = Object.fromEntries(
    C.levels.flatMap((l) => l.items.map((it) => [it.uid, { it, l }])),
  );
  const sel = S.selectedUid ? byUid[S.selectedUid] : undefined;
  const attempt = (action: () => void, issues: string[]) =>
    issues.length ? setOverride({ issues, apply: action }) : action();
  const move = (src: MoveSource, levelId: string, index: number | null) => {
    const placed = src.kind === 'placed' ? byUid[src.uid]?.it : undefined;
    const aid = src.kind === 'new' ? src.aid : placed?.aid;
    if (!aid) return;
    attempt(
      () => S.moveTo(src, levelId, index),
      placementIssues(
        shelf,
        S.articles,
        aid,
        levelId,
        placed?.f ?? 2,
        placed?.uid,
      ),
    );
  };
  const { drag, start } = useShelfDrag({
    scale,
    shelf,
    widthOf: (aid) => S.articles.find((a) => a.id === aid)?.w ?? 0,
    onTap: (src) =>
      src.kind === 'placed'
        ? S.set({
            selectedUid: S.selectedUid === src.uid ? null : src.uid,
            pendingAid: null,
          })
        : S.set({
            pendingAid: S.pendingAid === src.aid ? null : src.aid,
            selectedUid: null,
          }),
    onDrop: (src, t) =>
      'unplace' in t
        ? src.kind === 'placed' && S.removeItem(src.uid)
        : move(src, t.levelId, t.idx),
  });
  const keyboardMove = (u: string, key: string) => {
    const selected = byUid[u];
    if (!selected) return;
    const { l } = selected,
      idx = l.items.findIndex((p) => p.uid === u),
      levelIndex = C.levels.findIndex((x) => x.id === l.id);
    if (key === 'ArrowLeft' && idx > 0)
      move({ kind: 'placed', uid: u }, l.id, idx - 1);
    if (key === 'ArrowRight' && idx < l.items.length - 1)
      move({ kind: 'placed', uid: u }, l.id, idx + 1);
    if (key === 'ArrowUp' && levelIndex < C.levels.length - 1)
      move({ kind: 'placed', uid: u }, C.levels[levelIndex + 1].id, null);
    if (key === 'ArrowDown' && levelIndex > 0)
      move({ kind: 'placed', uid: u }, C.levels[levelIndex - 1].id, null);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(`[data-uid="${CSS.escape(u)}"]`)
        ?.focus(),
    );
  };
  const all = S.articles.filter((a) => shelf.cats.includes(a.cat));
  const list = (library === 'unplaced' ? C.unplaced : all).filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      !!a.ean?.includes(query),
  );
  const legend =
    S.colorMode === 'rent'
      ? [
          { label: 'Faible', color: pc(0) },
          { label: 'Moyenne', color: pc(0.5) },
          { label: 'Forte', color: pc(1) },
        ]
      : CATS.filter((c) => shelf.cats.includes(c.id)).map((c) => ({
          label: c.name,
          color: c.color,
        }));
  const target = drag?.target && 'levelId' in drag.target ? drag.target : null;
  const draggingItem =
    drag?.src.kind === 'placed' ? byUid[drag.src.uid]?.it : undefined;
  const dragArticle = drag
    ? S.articles.find((a) => a.id === drag.src.aid)
    : undefined;
  const targetLevel = target
    ? C.levels.find((l) => l.id === target.levelId)
    : undefined;
  const remaining =
    targetLevel && dragArticle
      ? shelf.width -
        targetLevel.used +
        (draggingItem &&
        targetLevel.items.some((p) => p.uid === draggingItem.uid)
          ? draggingItem.wcm
          : 0) -
        dragArticle.w * (draggingItem?.f ?? 2)
      : null;
  const issues =
    target && dragArticle
      ? placementIssues(
          shelf,
          S.articles,
          dragArticle.id,
          target.levelId,
          draggingItem?.f ?? 2,
          draggingItem?.uid,
        )
      : [];
  const next = proposal
    ? computeShelf(
        { ...shelf, place: proposal },
        S.articles,
        S.shelves.map((sh) =>
          sh.id === shelf.id ? { ...sh, place: proposal } : sh,
        ),
      )
    : null;
  const changed = proposal
    ? C.levels.reduce(
        (count, l) =>
          count +
          l.items.filter((it, i) => {
            const next = proposal[l.id]?.[i];
            return !next || next.aid !== it.aid || next.f !== it.f;
          }).length,
        0,
      )
    : 0;

  return (
    <>
      <div className="shelf-tabs" role="tablist" aria-label="Choisir un meuble">
        {S.shelves.map((sh) => (
          <button
            key={sh.id}
            role="tab"
            aria-selected={sh.id === shelf.id}
            className={'shelf-tab' + (sh.id === shelf.id ? ' on' : '')}
            onClick={() => S.setActiveShelf(sh.id)}
          >
            <span>
              <b>{sh.name}</b>
              <small>
                {sh.levels.length} niveaux · {sh.depth ?? 40} cm de profondeur
              </small>
            </span>
            <ScoreBadge score={computeShelf(sh, S.articles, S.shelves).score} />
          </button>
        ))}
      </div>
      <div className="plano-head">
        <div>
          <h1>{shelf.name}</h1>
          <p className="muted">
            {shelf.width} cm de large · {shelf.depth ?? 40} cm de profondeur ·{' '}
            {shelf.levels.length} niveaux
          </p>
        </div>
      </div>
      <div className="editor-toolbar">
        <Segmented
          label="Couleurs"
          value={S.colorMode}
          options={[
            ['cat', 'Catégorie'],
            ['rent', 'Marge'],
          ]}
          onChange={(v) => S.set({ colorMode: v })}
        />
        <Segmented
          label="Produits"
          value={S.visual}
          options={[
            ['blocs', 'Blocs'],
            ['silhouettes', 'Silhouettes'],
            ['photos', 'Photos'],
          ]}
          onChange={(v) => S.set({ visual: v })}
        />
        <Segmented
          label="Vue"
          value={S.view}
          options={[
            ['face', 'Face'],
            ['relief', 'Relief'],
          ]}
          onChange={(v) => S.set({ view: v })}
        />
        <div className="zoom-controls">
          <button
            className="btn btn-secondary"
            aria-label="Réduire le zoom"
            disabled={zoom <= 0.5}
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          >
            <Minus size={18} />
          </button>
          <output aria-label="Zoom">{Math.round(zoom * 100)} %</output>
          <button
            className="btn btn-secondary"
            aria-label="Augmenter le zoom"
            disabled={zoom >= 3}
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          >
            <Plus size={18} />
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setZoom(1);
              viewport.current?.scrollTo(0, 0);
            }}
            title="Ajuster à la largeur"
          >
            <Maximize size={18} />
            <span>Ajuster</span>
          </button>
          <button
            className={'btn btn-secondary' + (pan ? ' on' : '')}
            aria-pressed={pan}
            title="Déplacer la vue"
            onClick={() => setPan(!pan)}
          >
            <Hand size={18} />
          </button>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setProposal(null);
            setAutoOpen(true);
          }}
        >
          <Wand2 size={18} />
          Proposer un rangement
        </button>
      </div>
      <div className="editor-layout">
        <aside
          className={'library' + (drag?.src.kind === 'placed' ? ' drop' : '')}
          data-unplace
        >
          <h2 className="h6">Bibliothèque</h2>
          <Segmented
            value={library}
            options={[
              ['unplaced', `À placer (${C.unplaced.length})`],
              ['all', 'Tous'],
            ]}
            onChange={setLibrary}
          />
          <div className="search">
            <Search size={18} />
            <input
              className="input"
              aria-label="Rechercher dans le meuble"
              placeholder="Nom ou EAN"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="muted">
            Glissez un article ou sélectionnez-le puis choisissez un niveau. «
            Tous » permet de répéter une référence.
          </p>
          {drag?.src.kind === 'placed' && (
            <p className="drop-text">Déposez ici pour retirer du meuble</p>
          )}
          <div className="unplaced-list">
            {list.map((a) => {
              const color = colorFor(a, C.tOf(a), S.colorMode);
              return (
                <div
                  key={a.id}
                  className={
                    'unplaced-item' + (S.pendingAid === a.id ? ' selected' : '')
                  }
                  role="button"
                  tabIndex={0}
                  aria-label={`Placer ${a.name}`}
                  style={{ borderLeftColor: color }}
                  onPointerDown={(e) => start(e, { kind: 'new', aid: a.id })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      S.set({ pendingAid: a.id, selectedUid: null });
                    }
                  }}
                >
                  <Thumb a={a} box={34} color={color} />
                  <span>
                    <b>{a.name}</b>
                    <small>
                      {num(a.w)} × {num(a.h)} × {num(a.d)} cm
                    </small>
                    <small>
                      {eur(rent(a))} / sem.{a.promo ? ' · Promo' : ''}
                    </small>
                  </span>
                </div>
              );
            })}
          </div>
          {!list.length && (
            <p className="muted">
              {query
                ? 'Aucun résultat.'
                : 'Tous les articles sont placés dans ce meuble.'}
            </p>
          )}
          {S.pendingAid && (
            <>
              <label className="seglabel" htmlFor="pending-level">
                Placer sur un niveau
              </label>
              <select
                id="pending-level"
                className="input"
                value=""
                onChange={(e) =>
                  e.target.value &&
                  move(
                    { kind: 'new', aid: S.pendingAid! },
                    e.target.value,
                    null,
                  )
                }
              >
                <option value="">Choisir…</option>
                {C.levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    Niveau {l.num} · {num(shelf.width - l.used)} cm libres
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                onClick={() => S.set({ pendingAid: null })}
              >
                Annuler la sélection
              </button>
            </>
          )}
        </aside>
        <div className="canvas-column">
          <div
            className={'canvas-viewport' + (pan ? ' panning' : '')}
            ref={viewport}
            onPointerDown={(e) => {
              if (!pan) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              panStart.current = {
                x: e.clientX,
                y: e.clientY,
                left: e.currentTarget.scrollLeft,
                top: e.currentTarget.scrollTop,
              };
            }}
            onPointerMove={(e) => {
              const p = panStart.current;
              if (p) {
                e.currentTarget.scrollLeft = p.left - (e.clientX - p.x);
                e.currentTarget.scrollTop = p.top - (e.clientY - p.y);
              }
            }}
            onPointerUp={() => {
              panStart.current = null;
            }}
            onPointerCancel={() => {
              panStart.current = null;
            }}
          >
            <div
              className="canvas-content"
              style={{ pointerEvents: pan ? 'none' : undefined }}
            >
              <ShelfView
                shelf={shelf}
                computed={C}
                scale={scale}
                mode={S.colorMode}
                visual={S.visual}
                view={S.view}
                phone={phone}
                selectedUid={S.selectedUid}
                pending={!!S.pendingAid}
                drag={drag}
                onStart={start}
                onLevelTap={(id) =>
                  move({ kind: 'new', aid: S.pendingAid! }, id, null)
                }
                onSelect={(id) => S.set({ selectedUid: id, pendingAid: null })}
                onKeyboardMove={keyboardMove}
              />
            </div>
          </div>
          <div className="canvas-footer">
            <ul className="legend">
              {legend.map((l) => (
                <li key={l.label}>
                  <i style={{ background: l.color }} />
                  {l.label}
                </li>
              ))}
            </ul>
            <p className="muted" role="status">
              {remaining !== null
                ? `${remaining >= 0 ? 'Espace restant' : 'Dépassement'} : ${num(Math.abs(remaining))} cm${issues.length ? ' · ' + issues.join(' ') : ''}`
                : 'Sélection : Entrée · déplacement : flèches · annuler : Ctrl / ⌘ Z'}
            </p>
          </div>
        </div>
        <aside className="editor-side">
          <div className="score">
            <h2 className="h6">Indicateur de placement</h2>
            <div className="score-main">
              <b className="score-num">{C.score}</b>
              <span>/ 100</span>
            </div>
            <dl className="kv">
              <dt>Adéquation zone / marge</dt>
              <dd>{Math.round(C.match * 100)} %</dd>
              <dt>Remplissage</dt>
              <dd>{Math.round(C.fill * 100)} %</dd>
              <dt>Pénalités</dt>
              <dd>−{C.pen}</dd>
            </dl>
            <p className="muted">
              Cet indicateur compare les placements ; il ne prédit pas un gain
              de ventes.
            </p>
          </div>
          {sel && (
            <section
              className={'panel inspector' + (phone ? ' mobile-inspector' : '')}
              aria-label="Propriétés de l’article sélectionné"
            >
              <div className="row between">
                <h2 className="h6">Article sélectionné</h2>
                <button
                  className="btn btn-ghost"
                  aria-label="Fermer les propriétés"
                  onClick={() => S.set({ selectedUid: null })}
                >
                  <X size={20} />
                </button>
              </div>
              <h3>{sel.it.a.name}</h3>
              <p className="muted">
                {catById(sel.it.a.cat).name}
                {sel.it.a.ean ? ' · ' + sel.it.a.ean : ''}
              </p>
              <span className="seglabel">Facings · {num(sel.it.wcm)} cm</span>
              <Stepper
                label="facings"
                size={44}
                value={sel.it.f}
                min={1}
                max={24}
                onChange={(f) =>
                  attempt(
                    () => S.changeF(sel.it.uid, f - sel.it.f),
                    placementIssues(
                      shelf,
                      S.articles,
                      sel.it.aid,
                      sel.l.id,
                      f,
                      sel.it.uid,
                    ),
                  )
                }
              />
              <dl className="kv">
                <dt>Capacité maximale</dt>
                <dd>{sel.it.capacity} unités</dd>
                <dt>Autonomie estimée</dt>
                <dd>
                  {sel.it.days === null
                    ? 'Sans ventes'
                    : num(sel.it.days) + ' jours'}
                </dd>
                <dt>Marge / semaine</dt>
                <dd>{eur(rent(sel.it.a))}</dd>
              </dl>
              <p className="muted">
                À rayon plein, sans empilement, au rythme des ventes renseigné.
                Si la référence est répétée, cumulez ses capacités.
              </p>
              <label htmlFor="selected-level" className="seglabel">
                Déplacer vers
              </label>
              <select
                id="selected-level"
                className="input"
                value={sel.l.id}
                onChange={(e) =>
                  move(
                    { kind: 'placed', uid: sel.it.uid },
                    e.target.value,
                    null,
                  )
                }
              >
                {C.levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    Niveau {l.num}
                  </option>
                ))}
              </select>
              <div className="actions">
                <button
                  className="btn btn-secondary"
                  disabled={sel.l.items[0]?.uid === sel.it.uid}
                  onClick={() => keyboardMove(sel.it.uid, 'ArrowLeft')}
                >
                  ← Gauche
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={
                    sel.l.items[sel.l.items.length - 1]?.uid === sel.it.uid
                  }
                  onClick={() => keyboardMove(sel.it.uid, 'ArrowRight')}
                >
                  Droite →
                </button>
              </div>
              <button
                className="btn btn-secondary"
                aria-pressed={!!sel.it.locked}
                onClick={() => S.toggleLock(sel.it.uid)}
              >
                {sel.it.locked ? <Lock size={18} /> : <Unlock size={18} />}{' '}
                {sel.it.locked
                  ? 'Déverrouiller'
                  : 'Verrouiller pour le rangement auto'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => S.removeItem(sel.it.uid)}
              >
                <Trash2 size={18} />
                Retirer du meuble
              </button>
            </section>
          )}
          <h2 className="h6 alerts-title">Alertes · {C.alerts.length}</h2>
          {!C.alerts.length && <p className="muted">Aucune alerte.</p>}
          {C.alerts.map((al, i) => (
            <button
              key={i}
              className={'alert sev' + al.sev}
              onClick={() =>
                al.uid
                  ? S.set({ selectedUid: al.uid, pendingAid: null })
                  : al.aid
                    ? S.set({ pendingAid: al.aid, selectedUid: null })
                    : S.go('shelves')
              }
            >
              <span>
                <b>{al.title}</b>
                <small>{al.detail}</small>
              </span>
            </button>
          ))}
        </aside>
      </div>
      {drag && (
        <DragGhost
          drag={drag}
          articles={S.articles}
          computed={C}
          mode={S.colorMode}
        />
      )}
      {override && (
        <Modal title="Placement à vérifier" onClose={() => setOverride(null)}>
          <ul>
            {override.issues.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p>
            Vous pouvez conserver ce dépassement dans votre brouillon. Une
            alerte restera visible sur le meuble.
          </p>
          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                override.apply();
                setOverride(null);
              }}
            >
              Accepter dans le brouillon
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setOverride(null)}
            >
              Revenir au placement
            </button>
          </div>
        </Modal>
      )}
      {autoOpen && (
        <Modal
          title="Proposition de rangement"
          onClose={() => setAutoOpen(false)}
        >
          <label htmlFor="arrange-mode" className="seglabel">
            Objectif
          </label>
          <select
            id="arrange-mode"
            className="input"
            value={mode}
            onChange={(e) => setMode(e.target.value as ArrangeMode)}
          >
            <option value="margin">Privilégier la marge</option>
            <option value="restock">Réduire le réassort</option>
            <option value="category">Regrouper les familles</option>
            <option value="promo">Mettre en avant les promotions</option>
          </select>
          <p className="muted">
            Les niveaux contenant un article verrouillé sont conservés
            intégralement. Les propositions respectent la largeur, la hauteur et
            la profondeur disponibles.
          </p>
          <button
            className="btn btn-secondary"
            onClick={() =>
              setProposal(autoArrange(shelf, S.articles, S.shelves, uid, mode))
            }
          >
            Calculer la proposition
          </button>
          {next && (
            <>
              <div className="proposal-stats">
                <div>
                  <small>Placement</small>
                  <b>
                    {C.score} → {next.score}
                  </b>
                </div>
                <div>
                  <small>Alertes</small>
                  <b>
                    {C.alerts.length} → {next.alerts.length}
                  </b>
                </div>
                <div>
                  <small>Remplissage</small>
                  <b>
                    {Math.round(C.fill * 100)} → {Math.round(next.fill * 100)} %
                  </b>
                </div>
              </div>
              <p>
                {changed} placements existants modifiés · {next.unplaced.length}{' '}
                références sans place.
              </p>
              <div className="proposal-preview">
                <ShelfView
                  shelf={{ ...shelf, place: proposal! }}
                  computed={next}
                  scale={1.5}
                  mode={S.colorMode}
                  visual={S.visual}
                  view="face"
                  phone={false}
                  selectedUid={null}
                  pending={false}
                  drag={null}
                  onStart={() => {}}
                  onLevelTap={() => {}}
                  onSelect={() => {}}
                  onKeyboardMove={() => {}}
                />
              </div>
              {next.unplaced.length > 0 && (
                <p className="warn">
                  Sans place : {next.unplaced.map((a) => a.name).join(', ')}.
                </p>
              )}
              <button
                className="btn btn-primary"
                onClick={() => {
                  S.applyArrangement(proposal!);
                  setAutoOpen(false);
                }}
              >
                Appliquer cette proposition
              </button>
            </>
          )}
          {!proposal && (
            <p className="muted">
              Calculez un aperçu. Si tous les niveaux sont verrouillés ou
              qu’aucun article n’est éligible, aucune proposition ne sera
              produite.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
