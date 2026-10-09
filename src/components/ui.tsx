import type { CSSProperties, ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Article } from '../domain/types';
import { catById } from '../domain/constants';
import { fitBox, guessShape, pc, shapeUrl } from '../domain/shapes';

export const eur = (n: number) =>
  (+n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
export const num = (n: number, d = 1) =>
  (+n || 0).toLocaleString('fr-FR', { maximumFractionDigits: d });
export const parse = (s: string) => {
  const text = String(s ?? '')
    .replace(',', '.')
    .replace(/\s/g, '');
  return text && /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
};
export const str = (n: number | string) => String(n).replace('.', ',');

export function Segmented<T extends string | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segwrap">
      {label && <span className="seglabel">{label}</span>}
      <div className="segm" role="group" aria-label={label}>
        {options.map(([v, l]) => (
          <button
            key={String(v)}
            className={'segm-opt' + (v === value ? ' on' : '')}
            aria-pressed={v === value}
            onClick={() => onChange(v)}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  display,
  size = 52,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  display?: ReactNode;
  size?: number;
}) {
  const s: CSSProperties = { width: size, height: size };
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        className="btn btn-secondary btn-icon"
        style={s}
        aria-label={`Diminuer : ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus size={20} />
      </button>
      <output>{display ?? value}</output>
      <button
        className="btn btn-secondary btn-icon"
        style={s}
        aria-label={`Augmenter : ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <Plus size={20} />
      </button>
    </div>
  );
}

/** Pastille de score colorée (0–100). */
export function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="score-badge" style={{ background: pc(score / 100) }}>
      {score}
    </span>
  );
}

/** Miniature d'un article : photo ou silhouette. */
export function Thumb({
  a,
  box = 44,
  color,
}: {
  a: Article;
  box?: number;
  color?: string;
}) {
  if (a.img)
    return (
      <span
        className="thumb"
        style={{
          width: box,
          height: box,
          backgroundImage: `url("${a.img}")`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
    );
  const { tw, th } = fitBox(a.w, a.h, box);
  return (
    <span
      className="thumb"
      style={{
        width: box,
        height: box,
        display: 'inline-flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          width: tw,
          height: th,
          backgroundImage: shapeUrl(
            guessShape(a),
            color ?? catById(a.cat).color,
          ),
          backgroundSize: '100% 100%',
        }}
      />
    </span>
  );
}
