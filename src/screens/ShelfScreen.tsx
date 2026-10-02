import { useEffect, useRef, useState } from 'react';
import { Plus, Printer, Settings, TriangleAlert, Trash2, Undo2, Wand2 } from 'lucide-react';
import { catById } from '../domain/constants';
import { useActiveShelf, useStore } from '../store/useStore';
import { DragGhost, ShelfView } from '../components/ShelfView';
import { Thumb } from '../components/ProductBlock';
import { Stepper } from '../components/Stepper';
import { PrintSheet } from '../components/PrintSheet';
import { ShelfSettings } from '../components/ShelfSettings';
import { useShelfDrag } from '../components/useShelfDrag';
import { rent } from '../domain/metrics';

const LABEL_W = 76;

export function ShelfScreen() {
  const S = useStore();
  const { shelf, computed } = useActiveShelf();
  const [showSettings, setShowSettings] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => setWidth(Math.round(es[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.max(1.4, Math.min(3.6, (width - LABEL_W - 24) / shelf.width));

  const widthOf = (aid: string) => S.articles.find((a) => a.id === aid)?.w ?? 0;
  const { drag, start } = useShelfDrag({
    scale,
    shelf,
    widthOf,
    onTap: (src) => (src.kind === 'placed' ? S.select(S.selectedUid === src.uid ? null : src.uid) : S.setPending(S.pendingAid === src.aid ? null : src.aid)),
    onDrop: (src, t) => ('unplace' in t ? src.kind === 'placed' && S.removeItem(src.uid) : S.moveTo(src, t.levelId, t.idx)),
  });

  const sel = computed.levels.flatMap((l) => l.items.map((it) => ({ ...it, level: l }))).find((it) => it.uid === S.selectedUid);
  const dragging = drag?.src.kind === 'placed';

  const onAlert = (al: (typeof computed.alerts)[number]) => {
    if (al.uid) S.select(al.uid);
    else if (al.aid) S.setPending(al.aid);
    else setShowSettings(true);
  };

  return (
    <>
      <div className="no-print">
        <div className="shelf-tabs" role="tablist">
          {S.shelves.map((sh) => (
            <button key={sh.id} role="tab" aria-selected={sh.id === shelf.id} className={'shelf-tab' + (sh.id === shelf.id ? ' on' : '')} onClick={() => S.setActiveShelf(sh.id)}>{sh.name}</button>
          ))}
          <button className="shelf-tab add" aria-label="Nouvelle étagère" onClick={() => { S.addShelf(); setShowSettings(true); }}><Plus size={20} /> Nouvelle</button>
        </div>

        <div className="head-row">
          <div>
            <h1>{shelf.name}</h1>
            <p className="muted">Meuble de {shelf.width / 100} m · {shelf.levels.length} niveaux · {shelf.cats.map((c) => catById(c).name).join(', ') || 'aucune famille'}</p>
          </div>
          <div className="actions">
            <button className="btn btn-primary big" onClick={S.runAuto}><Wand2 size={22} /> Ranger pour moi</button>
            <button className="btn btn-secondary big" onClick={() => setShowSettings(true)}><Settings size={20} /> Réglages</button>
            <button className="btn btn-secondary big" onClick={() => window.print()}><Printer size={20} /> Imprimer</button>
          </div>
        </div>

        {S.autoUndo && S.autoUndo.shelfId === shelf.id && (
          <div className="banner" role="status">
            <span>Rangement fait selon la rentabilité des produits.</span>
            <button className="btn btn-secondary" onClick={S.undoAuto}><Undo2 size={18} /> Annuler</button>
            <button className="btn btn-ghost" onClick={S.dismissAuto}>OK</button>
          </div>
        )}

        <div className="planogram">
          <aside className={'unplaced' + (dragging ? ' drop' : '')} data-unplace>
            <h2 className="h6">À placer · {computed.unplaced.length}</h2>
            {dragging ? (
              <p className="drop-text">Déposez ici pour retirer de l’étagère</p>
            ) : computed.unplaced.length === 0 ? (
              <p className="muted">Tout est en rayon.</p>
            ) : (
              <>
                <p className="muted">Touchez un article, puis touchez le niveau où le poser. Ou glissez-le.</p>
                {computed.unplaced.map((a) => (
                  <div key={a.id} className={'unplaced-item' + (S.pendingAid === a.id ? ' on' : '')} style={{ borderLeftColor: catById(a.cat).color }} onPointerDown={(e) => start(e, { kind: 'new', aid: a.id })} role="button" aria-label={`Placer ${a.name}`}>
                    <Thumb a={a} />
                    <div><b>{a.name}</b><small>{a.w} × {a.h} cm</small></div>
                  </div>
                ))}
              </>
            )}
          </aside>

          <div className="shelf-wrap" ref={wrap} style={{ ['--label-w' as string]: LABEL_W + 'px' }}>
            <ShelfView shelf={shelf} computed={computed} scale={scale} selectedUid={S.selectedUid} pending={!!S.pendingAid} drag={drag} onStart={start} onLevelTap={(id) => S.moveTo({ kind: 'new', aid: S.pendingAid! }, id, null)} />
          </div>

          <aside className="side">
            {sel ? (
              <div className="panel">
                <h2 className="h6">Article choisi</h2>
                <h3>{sel.a.name}</h3>
                <p className="muted">Niveau {sel.level.num} · rapporte {rent(sel.a).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} par semaine</p>
                <label className="h6">Côte à côte</label>
                <Stepper label="nombre côte à côte" value={sel.f} min={1} max={24} onChange={(v) => S.changeF(sel.uid, v - sel.f)} />
                <p className="muted">Largeur occupée : {sel.wcm.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} cm</p>
                <button className="btn btn-secondary big" onClick={() => S.removeItem(sel.uid)}><Trash2 size={18} /> Retirer de l’étagère</button>
              </div>
            ) : (
              <p className="hint">Touchez un article pour régler combien en mettre côte à côte. Maintenez et glissez pour le déplacer.</p>
            )}
            <h2 className="h6" style={{ marginTop: 24 }}>À vérifier · {computed.alerts.length}</h2>
            {computed.alerts.length === 0 && <p className="muted">Rien à signaler, l’étagère est bien rangée.</p>}
            {computed.alerts.map((al, i) => (
              <button key={i} className={'alert sev' + al.sev} onClick={() => onAlert(al)}>
                <TriangleAlert size={20} aria-hidden />
                <span><b>{al.title}</b><small>{al.detail}</small></span>
              </button>
            ))}
          </aside>
        </div>
      </div>

      {drag && <DragGhost drag={drag} articles={S.articles} />}
      {showSettings && <ShelfSettings shelf={shelf} onClose={() => setShowSettings(false)} />}
      <PrintSheet shelf={shelf} computed={computed} />
    </>
  );
}
