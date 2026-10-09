import type { CSSProperties } from 'react';
import type {
  Article,
  ComputedItem,
  ComputedLevel,
  ComputedShelf,
  Shelf,
} from '../domain/types';
import { ZONES, catById } from '../domain/constants';
import { EXTRUDE, guessShape, pc, shapeUrl, stripes } from '../domain/shapes';
import { num } from './ui';
import type { ColorMode, View, Visual } from '../store/useStore';
import type { DragSrc, DragState } from './useShelfDrag';

interface Props {
  shelf: Shelf;
  computed: ComputedShelf;
  scale: number;
  mode: ColorMode;
  visual: Visual;
  view: View;
  phone: boolean;
  selectedUid: string | null;
  pending: boolean;
  drag: DragState | null;
  onStart: (e: React.PointerEvent, src: DragSrc) => void;
  onLevelTap: (levelId: string) => void;
  onSelect: (uid: string) => void;
  onKeyboardMove: (uid: string, key: string) => void;
}

export const colorFor = (a: Article, t: number, mode: ColorMode) =>
  mode === 'rent' ? pc(t) : catById(a.cat).color;

export function ShelfView({
  shelf,
  computed,
  scale,
  mode,
  visual,
  view,
  phone,
  selectedUid,
  pending,
  drag,
  onStart,
  onLevelTap,
  onSelect,
  onKeyboardMove,
}: Props) {
  const relief = view === 'relief';
  const dragUid = drag?.src.kind === 'placed' ? drag.src.uid : null;
  const target = drag?.target && 'levelId' in drag.target ? drag.target : null;
  const labW = phone ? 46 : 76;
  const rows = [...computed.levels].reverse();

  return (
    <div className="shelf" style={{ ['--label-w' as string]: labW + 'px' }}>
      <div className="shelf-body">
        <div className="shelf-labels">
          {rows.map((l) => (
            <div
              key={l.id}
              className="level-label"
              style={{ height: Math.round(l.h * scale) + 6 }}
            >
              <b>Niv. {l.num}</b>
              <span
                className="zone-chip"
                style={{ background: ZONES[l.zone].bg }}
              >
                {ZONES[l.zone].label}
              </span>
              {!phone && (
                <small>
                  {num(l.used, 0)} / {shelf.width} cm
                </small>
              )}
            </div>
          ))}
        </div>
        <div
          className="shelf-frame"
          style={{ width: Math.round(shelf.width * scale) + 12 }}
        >
          {rows.map((l) => (
            <LevelBox
              key={l.id}
              l={l}
              shelf={shelf}
              scale={scale}
              mode={mode}
              visual={visual}
              relief={relief}
              selectedUid={selectedUid}
              pending={pending}
              dragUid={dragUid}
              target={target}
              onStart={onStart}
              onLevelTap={onLevelTap}
              onSelect={onSelect}
              onKeyboardMove={onKeyboardMove}
            />
          ))}
          <div className="socle">Socle 10 cm</div>
        </div>
      </div>
      <p className="shelf-width">
        <span>← {shelf.width} cm →</span>
      </p>
    </div>
  );
}

function LevelBox({
  l,
  shelf,
  scale,
  mode,
  visual,
  relief,
  selectedUid,
  pending,
  dragUid,
  target,
  onStart,
  onLevelTap,
  onSelect,
  onKeyboardMove,
}: {
  l: ComputedLevel;
  shelf: Shelf;
  scale: number;
  mode: ColorMode;
  visual: Visual;
  relief: boolean;
  selectedUid: string | null;
  pending: boolean;
  dragUid: string | null;
  target: { levelId: string; markerCm: number } | null;
  onStart: Props['onStart'];
  onLevelTap: Props['onLevelTap'];
  onSelect: Props['onSelect'];
  onKeyboardMove: Props['onKeyboardMove'];
}) {
  const isTarget = target?.levelId === l.id;
  const base = isTarget ? 'var(--color-accent-100)' : ZONES[l.zone].bg;
  const lvH = Math.round(l.h * scale) + 6;
  const style: CSSProperties = {
    width: Math.round(shelf.width * scale),
    height: lvH,
    background: relief
      ? `linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,0) 34%), linear-gradient(0deg, rgba(0,0,0,.10), rgba(0,0,0,0) 18%), ${base}`
      : base,
    outline: l.sat
      ? '3px solid var(--color-accent)'
      : pending
        ? '2px dashed var(--color-accent)'
        : 'none',
    outlineOffset: -3,
  };
  return (
    <div
      className="level"
      data-level={l.id}
      style={style}
      role={pending ? 'button' : undefined}
      tabIndex={pending ? 0 : undefined}
      aria-label={pending ? `Placer sur le niveau ${l.num}` : undefined}
      onKeyDown={(e) => {
        if (
          pending &&
          e.currentTarget === e.target &&
          (e.key === 'Enter' || e.key === ' ')
        ) {
          e.preventDefault();
          onLevelTap(l.id);
        }
      }}
      onClick={() => pending && onLevelTap(l.id)}
    >
      {pending && <span className="level-hint">Toucher pour placer ici</span>}
      {l.sat && (
        <span className="sat-tag">Saturé +{num(l.used - shelf.width)} cm</span>
      )}
      <div className="level-items">
        {l.items.map((it, i) => (
          <Block
            key={it.uid}
            it={it}
            position={`${l.num}.${i + 1}`}
            levelH={l.h}
            lvH={lvH}
            scale={scale}
            mode={mode}
            visual={visual}
            relief={relief}
            selected={selectedUid === it.uid}
            ghost={dragUid === it.uid}
            onDown={(e) =>
              onStart(e, { kind: 'placed', uid: it.uid, aid: it.aid })
            }
            onSelect={() => onSelect(it.uid)}
            onKeyboardMove={(key) => onKeyboardMove(it.uid, key)}
          />
        ))}
      </div>
      {isTarget && (
        <div
          className="drop-marker"
          style={{ left: Math.round(target!.markerCm * scale) }}
        />
      )}
    </div>
  );
}

function Block({
  it,
  position,
  levelH,
  lvH,
  scale,
  mode,
  visual,
  relief,
  selected,
  ghost,
  onDown,
  onSelect,
  onKeyboardMove,
}: {
  it: ComputedItem;
  levelH: number;
  lvH: number;
  scale: number;
  mode: ColorMode;
  visual: Visual;
  relief: boolean;
  selected: boolean;
  ghost: boolean;
  onDown: (e: React.PointerEvent) => void;
  position: string;
  onSelect: () => void;
  onKeyboardMove: (key: string) => void;
}) {
  const a = it.a;
  const fpx = a.w * scale;
  const hpx = Math.round(Math.min(a.h, levelH) * scale);
  const wpx = Math.round(it.wcm * scale);
  const horiz = wpx >= 56;
  const bg = colorFor(a, it.t, mode);
  const useImg = visual === 'photos' && !!a.img;
  const isBloc = visual === 'blocs';
  const dpx = Math.max(
    0,
    Math.round(Math.min((a.d || 6) * scale * 0.32, lvH - 6 - hpx - 2, 18)),
  );

  const look: CSSProperties = isBloc
    ? {
        background: `${stripes(fpx)}, ${bg}`,
        boxShadow: 'inset 0 0 0 1px var(--color-text)',
      }
    : {
        backgroundColor: useImg ? '#fff' : 'transparent',
        backgroundImage: useImg
          ? `url("${a.img}")`
          : shapeUrl(guessShape(a), bg),
        backgroundSize: `${fpx.toFixed(2)}px 100%`,
        backgroundRepeat: 'repeat-x',
        boxShadow: useImg ? 'inset 0 0 0 1px var(--color-divider)' : 'none',
        filter: relief ? EXTRUDE : 'none',
      };
  const outline = selected
    ? '3px solid var(--color-accent)'
    : a.h > levelH
      ? '2px dashed var(--color-accent)'
      : 'none';

  return (
    <div
      className="block"
      data-block
      data-uid={it.uid}
      role="button"
      tabIndex={0}
      aria-label={`${a.name}, ${it.f} côte à côte`}
      aria-pressed={selected}
      title={`${a.name} · ${it.f} facings${it.locked ? ' · Verrouillé' : ''}`}
      style={{
        width: wpx,
        height: hpx,
        opacity: ghost ? 0.35 : 1,
        outline,
        outlineOffset: selected ? 0 : -2,
        zIndex: selected ? 2 : 1,
      }}
      onPointerDown={(e) => {
        e.currentTarget.focus();
        onDown(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect();
        } else if (e.key.startsWith('Arrow')) {
          e.preventDefault();
          e.stopPropagation();
          onKeyboardMove(e.key);
        }
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {relief && isBloc && dpx > 0 && (
        <>
          <span
            className="face-top"
            style={{
              width: wpx + dpx,
              height: dpx,
              background: `color-mix(in srgb, ${bg} 62%, white)`,
              clipPath: `polygon(0 100%, ${dpx}px 0, 100% 0, calc(100% - ${dpx}px) 100%)`,
            }}
          />
          <span
            className="face-side"
            style={{
              left: wpx,
              top: -dpx,
              width: dpx,
              height: hpx + dpx,
              background: `color-mix(in srgb, ${bg} 72%, black)`,
              clipPath: `polygon(0 ${dpx}px, 100% 0, 100% calc(100% - ${dpx}px), 0 100%)`,
            }}
          />
        </>
      )}
      <span className="block-look" style={look} />
      <span className="facing-badge">
        {position} · ×{it.f}
        {it.locked ? ' 🔒' : ''}
      </span>
      {horiz ? (
        <span
          className="block-name"
          style={{
            background: isBloc ? 'transparent' : 'rgba(255,255,255,.88)',
          }}
        >
          {a.name}
        </span>
      ) : (
        <span
          className="block-name compact"
          style={{
            background: isBloc ? 'transparent' : 'rgba(255,255,255,.88)',
          }}
        >
          {position}
        </span>
      )}
    </div>
  );
}

export function DragGhost({
  drag,
  articles,
  computed,
  mode,
}: {
  drag: DragState;
  articles: Article[];
  computed: ComputedShelf;
  mode: ColorMode;
}) {
  const a = articles.find((x) => x.id === drag.src.aid);
  if (!a) return null;
  const t = computed.tOf(a);
  return (
    <div
      className="ghost"
      style={{ left: drag.x, top: drag.y, background: colorFor(a, t, mode) }}
    >
      {a.name}
    </div>
  );
}
