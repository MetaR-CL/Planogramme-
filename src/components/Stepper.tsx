import { Minus, Plus } from 'lucide-react';

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, label, unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; unit?: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button className="btn btn-secondary btn-icon big" aria-label={`Diminuer ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}><Minus size={20} /></button>
      <output>{value}{unit}</output>
      <button className="btn btn-secondary btn-icon big" aria-label={`Augmenter ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}><Plus size={20} /></button>
    </div>
  );
}
