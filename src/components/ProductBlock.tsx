import type { CSSProperties } from 'react';
import type { Article } from '../domain/types';
import { catById } from '../domain/constants';
import { guessShape, shapeUrl } from '../domain/shapes';

/** Silhouette d'un article, répétée une fois par facing. */
export function ProductBlock({ a, f, scale, style }: { a: Article; f: number; scale: number; style?: CSSProperties }) {
  const w = a.w * scale;
  return (
    <div
      style={{
        width: w * f,
        height: a.h * scale,
        backgroundImage: shapeUrl(guessShape(a), catById(a.cat).color),
        backgroundSize: `${w}px 100%`,
        backgroundRepeat: 'repeat-x',
        ...style,
      }}
    />
  );
}

export function Thumb({ a, box = 44 }: { a: Article; box?: number }) {
  const s = box / Math.max(a.w, a.h, 1);
  return (
    <div style={{ width: box, height: box, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <ProductBlock a={a} f={1} scale={s} />
    </div>
  );
}
