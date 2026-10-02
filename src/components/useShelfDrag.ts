import { useCallback, useEffect, useRef, useState } from 'react';
import type { Shelf } from '../domain/types';

export type DragSrc = { kind: 'placed'; uid: string; aid: string } | { kind: 'new'; aid: string };
export type DragTarget = { unplace: true } | { levelId: string; idx: number; markerCm: number } | null;
export interface DragState { x: number; y: number; src: DragSrc; target: DragTarget }

interface Opts {
  scale: number;
  shelf: Shelf;
  widthOf: (aid: string) => number;
  onTap: (src: DragSrc) => void;
  onDrop: (src: DragSrc, target: Exclude<DragTarget, null>) => void;
}

/** Glisser-déposer natif (Pointer Events) : fonctionne au doigt et à la souris. */
export function useShelfDrag(opts: Opts) {
  const o = useRef(opts);
  o.current = opts;
  const info = useRef<{ src: DragSrc; sx: number; sy: number; moved: boolean; target: DragTarget } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const hit = (x: number, y: number, src: DragSrc): DragTarget => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    if (src.kind === 'placed' && el.closest('[data-unplace]')) return { unplace: true };
    const lv = el.closest('[data-level]');
    if (!lv) return null;
    const levelId = lv.getAttribute('data-level')!;
    const cm = (x - lv.getBoundingClientRect().left) / o.current.scale;
    const items = (o.current.shelf.place[levelId] ?? []).filter((it) => src.kind !== 'placed' || it.uid !== src.uid);
    let cum = 0;
    let idx = items.length;
    for (let i = 0; i < items.length; i++) {
      const w = o.current.widthOf(items[i].aid) * items[i].f;
      if (cm < cum + w / 2) { idx = i; break; }
      cum += w;
    }
    return { levelId, idx, markerCm: cum };
  };

  const onMove = useCallback((e: PointerEvent) => {
    const d = info.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
    d.moved = true;
    d.target = hit(e.clientX, e.clientY, d.src);
    setDrag({ x: e.clientX, y: e.clientY, src: d.src, target: d.target });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUp = useCallback(() => {
    const d = info.current;
    info.current = null;
    stop();
    setDrag(null);
    if (!d) return;
    if (!d.moved) o.current.onTap(d.src);
    else if (d.target) o.current.onDrop(d.src, d.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCancel = useCallback(() => {
    info.current = null;
    stop();
    setDrag(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => stop, [stop]);

  const start = (e: React.PointerEvent, src: DragSrc) => {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    stop();
    info.current = { src, sx: e.clientX, sy: e.clientY, moved: false, target: null };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  return { drag, start };
}
