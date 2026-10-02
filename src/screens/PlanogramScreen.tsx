import { useState } from 'react';
import { Trash2, TriangleAlert, Undo2, Wand2 } from 'lucide-react';
import { CATS, catById } from '../domain/constants';
import { computeShelf, rent } from '../domain/metrics';
import { pc } from '../domain/shapes';
import { useActiveShelf, useStore } from '../store/useStore';
import { DragGhost, ShelfView, colorFor } from '../components/ShelfView';
import { useShelfDrag } from '../components/useShelfDrag';
import { ScoreBadge, Segmented, Stepper, Thumb, eur, num } from '../components/ui';
import { useDevice } from '../hooks';

export function PlanogramScreen() {
  const S = useStore();
  const { shelf, computed: C } = useActiveShelf();
  const { w, phone, tablet, desktop } = useDevice();
  const [hint, setHint] = useState(true);

  const mainPadH = phone ? 16 : 24;
  const shelfPadH = phone ? 20 : 76;
  const labW = phone ? 46 : 76;
  const sideCols = desktop ? 210 + 16 + 300 + 16 : tablet && w >= 1000 ? 316 : 0;
  const scale = Math.max(1.4, Math.min(3.6, (Math.min(w, 1440) - mainPadH * 2 - shelfPadH - labW - 12 - sideCols) / shelf.width));

  const { drag, start } = useShelfDrag({
    scale,
    shelf,
    widthOf: (aid) => S.articles.find((a) => a.id === aid)?.w ?? 0,
    onTap: (src) => (src.kind === 'placed' ? S.set({ selectedUid: S.selectedUid === src.uid ? null : src.uid, pendingAid: null }) : S.set({ pendingAid: S.pendingAid === src.aid ? null : src.aid, selectedUid: null })),
    onDrop: (src, t) => ('unplace' in t ? src.kind === 'placed' && S.removeItem(src.uid) : S.moveTo(src, t.levelId, t.idx)),
  });

  const byUid = Object.fromEntries(C.levels.flatMap((l) => l.items.map((it) => [it.uid, { it, l }])));
  const sel = S.selectedUid ? byUid[S.selectedUid] : undefined;
  const dragging = drag?.src.kind === 'placed';
  const undo = S.autoUndo && S.autoUndo.shelfId === shelf.id ? S.autoUndo : null;
  const label = C.score >= 75 ? 'Bon' : C.score >= 50 ? 'À améliorer' : 'Faible';
  const catsLabel = shelf.cats.map((c) => catById(c).name).join(', ') || 'Aucune catégorie';
  const module = shelf.width === 100 ? '1 m' : shelf.width === 125 ? '1,25 m' : '1,33 m';

  const onAlert = (al: (typeof C.alerts)[number]) => {
    if (al.uid) S.set({ selectedUid: al.uid, pendingAid: null });
    else if (al.aid) S.set({ pendingAid: al.aid, selectedUid: null });
    else if (al.kind === 'hmax' || al.kind === 'nocat') S.go('shelves');
  };

  const legend = S.colorMode === 'rent'
    ? [{ label: 'Faible', color: pc(0) }, { label: 'Moyenne', color: pc(0.5) }, { label: 'Forte', color: pc(1) }]
    : CATS.filter((c) => shelf.cats.includes(c.id)).map((c) => ({ label: c.name, color: c.color }));

  return (
    <>
      <div className="shelf-tabs" role="tablist">
        {S.shelves.map((sh) => {
          const c = computeShelf(sh, S.articles, S.shelves);
          const on = sh.id === shelf.id;
          return (
            <button key={sh.id} role="tab" aria-selected={on} className={'shelf-tab' + (on ? ' on' : '')} onClick={() => S.setActiveShelf(sh.id)}>
              <span><b>{sh.name}</b><small>{sh.cats.map((x) => catById(x).name).join(', ') || 'Aucune catégorie'}</small></span>
              <ScoreBadge score={c.score} />
              {c.alerts.length > 0 && <span className="tag tag-accent">{c.alerts.length} !</span>}
            </button>
          );
        })}
      </div>

      <div className="plano-head">
        <div>
          <h1>{shelf.name}</h1>
          <p className="muted">Module {module} · {shelf.levels.length} niveaux · {catsLabel}</p>
        </div>
        <div className="plano-opts">
          <Segmented label="Couleur des blocs" value={S.colorMode} options={[['cat', 'Catégorie'], ['rent', 'Rentabilité']]} onChange={(v) => S.set({ colorMode: v })} />
          <Segmented label="Articles" value={S.visual} options={[['blocs', 'Blocs'], ['silhouettes', 'Silhouettes'], ['photos', 'Photos']]} onChange={(v) => S.set({ visual: v })} />
          <Segmented label="Vue" value={S.view} options={[['face', 'Face'], ['relief', 'Relief 3D']]} onChange={(v) => S.set({ view: v })} />
        </div>
      </div>
      <button className="btn btn-primary auto-btn" onClick={S.runAuto}><Wand2 size={22} /><span>Rangement auto<small>par rentabilité</small></span></button>

      {undo && (
        <div className="banner" role="status">
          <span>Rangement automatique appliqué · score {undo.before} → {undo.after}</span>
          <button className="btn btn-secondary" onClick={S.undoAuto}><Undo2 size={18} /> Annuler</button>
          <button className="btn btn-ghost" onClick={() => S.set({ autoUndo: null })}>OK</button>
        </div>
      )}

      <div className="plano">
        <aside className={'unplaced' + (dragging ? ' drop' : '')} data-unplace style={{ background: dragging && drag?.target && 'unplace' in drag.target ? 'var(--color-accent-200)' : undefined }}>
          <h2 className="h6">À placer · {C.unplaced.length}</h2>
          {dragging ? (
            <p className="drop-text">Déposez ici pour retirer de l’étagère</p>
          ) : C.unplaced.length === 0 ? (
            <p className="muted">Tout est en rayon.</p>
          ) : (
            <>
              <p className="muted">Articles de cette étagère sans place. Glissez-les sur un niveau, ou touchez puis touchez le niveau.</p>
              <div className="unplaced-list">
                {C.unplaced.map((a) => {
                  const col = colorFor(a, C.tOf(a), S.colorMode);
                  return (
                    <div key={a.id} className="unplaced-item" role="button" aria-label={`Placer ${a.name}`} style={{ borderLeftColor: col, outline: S.pendingAid === a.id ? '3px solid var(--color-accent)' : 'none' }} onPointerDown={(e) => start(e, { kind: 'new', aid: a.id })}>
                      <Thumb a={a} box={34} color={col} />
                      <span><b>{a.name}</b><small>{num(a.w)} × {num(a.h)} cm · {eur(rent(a))} / sem.</small></span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </aside>

        <div className="shelf-wrap" style={{ padding: phone ? '20px 8px 12px 12px' : 'var(--space-6) 64px var(--space-4) var(--space-3)' }}>
          <ShelfView shelf={shelf} computed={C} scale={scale} mode={S.colorMode} visual={S.visual} view={S.view} phone={phone} selectedUid={S.selectedUid} pending={!!S.pendingAid} drag={drag} onStart={start} onLevelTap={(id) => S.moveTo({ kind: 'new', aid: S.pendingAid! }, id, null)} />
          <ul className="legend">{legend.map((l) => <li key={l.label}><i style={{ background: l.color }} />{l.label}</li>)}</ul>
        </div>

        <aside className="side">
          <div className="score" style={{ borderTopColor: pc(C.score / 100, 0.62, 0.17) }}>
            <h2 className="h6">Score de l’étagère</h2>
            <div className="score-main">
              <b className="score-num">{C.score}</b><span className="muted">/ 100</span>
              <span className="pill" style={{ background: pc(C.score / 100) }}>{label}</span>
            </div>
            <dl className="kv">
              <dt>Rentabilité bien exposée</dt><dd>{Math.round(C.match * 100)} %</dd>
              <dt>Remplissage</dt><dd>{Math.round(C.fill * 100)} %</dd>
              <dt>Pénalités (alertes)</dt><dd>{C.pen ? '− ' + C.pen : '0'}</dd>
            </dl>
          </div>

          {sel ? (
            <div className="panel">
              <h2 className="h6">Article sélectionné</h2>
              <h3>{sel.it.a.name}</h3>
              <p className="muted">{catById(sel.it.a.cat).name} · {num(sel.it.a.w)} × {num(sel.it.a.h)} cm</p>
              <span className="seglabel">Facings</span>
              <Stepper label="facings" size={56} value={sel.it.f} min={1} max={24} onChange={(v) => S.changeF(sel.it.uid, v - sel.it.f)} />
              <p className="muted">{num(sel.it.wcm)} cm de large</p>
              <p><span className="pill" style={{ background: pc(sel.it.t) }}>{eur(rent(sel.it.a))}</span> par semaine</p>
              <p className="muted">Niveau {sel.l.num} · {sel.l.zone === 'yeux' ? 'yeux' : sel.l.zone}</p>
              <button className="btn btn-secondary" onClick={() => S.removeItem(sel.it.uid)}><Trash2 size={18} /> Retirer de l’étagère</button>
            </div>
          ) : (
            hint && (
              <div className="hint" onClick={() => setHint(false)}>
                <p>Touchez un article pour régler ses facings.</p>
                <p>Maintenez et glissez pour le déplacer.</p>
              </div>
            )
          )}

          <h2 className="h6 alerts-title">Alertes de cette étagère · {C.alerts.length}</h2>
          {C.alerts.length === 0 && <p className="muted">Aucune alerte.</p>}
          {C.alerts.map((al, i) => (
            <button key={i} className={'alert sev' + al.sev} onClick={() => onAlert(al)}>
              <TriangleAlert size={20} aria-hidden />
              <span><b>{al.title}</b><small>{al.detail}</small></span>
            </button>
          ))}
        </aside>
      </div>
      {drag && <DragGhost drag={drag} articles={S.articles} computed={C} mode={S.colorMode} />}
    </>
  );
}
