import type { Article, ComputedShelf, Shelf } from '../domain/types';
import { ZONES, catById } from '../domain/constants';
import { ProductBlock } from './ProductBlock';
import type { DragSrc, DragState } from './useShelfDrag';

interface Props {
  shelf: Shelf;
  computed: ComputedShelf;
  scale: number;
  selectedUid: string | null;
  pending: boolean;
  drag: DragState | null;
  onStart: (e: React.PointerEvent, src: DragSrc) => void;
  onLevelTap: (levelId: string) => void;
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

export function ShelfView({ shelf, computed, scale, selectedUid, pending, drag, onStart, onLevelTap }: Props) {
  const dragUid = drag?.src.kind === 'placed' ? drag.src.uid : null;
  const target = drag?.target && 'levelId' in drag.target ? drag.target : null;
  const rows = [...computed.levels].reverse();

  return (
    <div className="shelf">
      {rows.map((l) => {
        return (
          <div className="level-row" key={l.id}>
            <div className="level-label">
              <b>Niv. {l.num}</b>
              <span className="zone-chip" style={{ background: ZONES[l.zone].bg }}>{ZONES[l.zone].label}</span>
              <small>{fmt(l.used)} / {shelf.width} cm</small>
            </div>
            <div
              className={'level' + (l.sat ? ' sat' : '')}
              data-level={l.id}
              style={{ width: shelf.width * scale, height: l.h * scale, background: target?.levelId === l.id ? 'var(--color-accent-100)' : ZONES[l.zone].bg }}
              onClick={() => pending && onLevelTap(l.id)}
            >
              {pending && <span className="level-hint">Touchez pour placer ici</span>}
              {l.sat && <span className="sat-tag">Trop plein +{fmt(l.used - shelf.width)} cm</span>}
              <div className="level-items">
                {l.items.map((it) => (
                  <Item key={it.uid} a={it.a} f={it.f} scale={scale} tooTall={it.a.h > l.h} selected={selectedUid === it.uid} ghost={dragUid === it.uid} onDown={(e) => onStart(e, { kind: 'placed', uid: it.uid, aid: it.aid })} />
                ))}
              </div>
              {target?.levelId === l.id && <div className="drop-marker" style={{ left: target.markerCm * scale }} />}
            </div>
          </div>
        );
      })}
      <div className="socle" style={{ width: shelf.width * scale, marginLeft: 'var(--label-w)' }}>Socle 10 cm</div>
    </div>
  );
}

function Item({ a, f, scale, tooTall, selected, ghost, onDown }: { a: Article; f: number; scale: number; tooTall: boolean; selected: boolean; ghost: boolean; onDown: (e: React.PointerEvent) => void }) {
  const w = a.w * f * scale;
  return (
    <div
      className={'item' + (selected ? ' selected' : '') + (tooTall ? ' too-tall' : '')}
      style={{ width: w, opacity: ghost ? 0.35 : 1 }}
      onPointerDown={onDown}
      onClick={(e) => e.stopPropagation()}
      role="button"
      aria-label={`${a.name}, ${f} côte à côte`}
    >
      <span className="facing-badge">×{f}</span>
      <ProductBlock a={a} f={f} scale={scale} />
      {w >= 56 && <span className="item-name">{a.name}</span>}
    </div>
  );
}

export function DragGhost({ drag, articles }: { drag: DragState; articles: Article[] }) {
  const a = articles.find((x) => x.id === drag.src.aid);
  if (!a) return null;
  return (
    <div className="ghost" style={{ left: drag.x, top: drag.y, background: catById(a.cat).color }}>
      {a.name}
    </div>
  );
}
