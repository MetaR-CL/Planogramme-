import { X } from 'lucide-react';
import { CATS, MAXH, MODULES, SOCLE } from '../domain/constants';
import { useStore } from '../store/useStore';
import { Stepper } from './Stepper';
import type { Shelf } from '../domain/types';

export function ShelfSettings({ shelf, onClose }: { shelf: Shelf; onClose: () => void }) {
  const { updateShelf, deleteShelf, shelves } = useStore();
  const upd = (fn: (s: Shelf) => Shelf) => updateShelf(shelf.id, fn);
  const total = SOCLE + shelf.levels.reduce((s, l) => s + l.h, 0);
  const count = (id: string) => useStore.getState().articles.filter((a) => a.cat === id).length;

  const setLevels = (n: number) =>
    upd((s) => {
      const levels = [...s.levels];
      const place = { ...s.place };
      while (levels.length < n) { const id = 'L' + Math.random().toString(36).slice(2, 8); levels.push({ id, h: 30 }); place[id] = []; }
      while (levels.length > n) { const g = levels.pop()!; delete place[g.id]; }
      return { ...s, levels, place };
    });

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog wide" role="dialog" aria-label="Réglages de l’étagère" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2 className="dialog-title">Réglages de l’étagère</h2>
          <button className="btn btn-ghost btn-icon big" aria-label="Fermer" onClick={onClose}><X /></button>
        </div>
        <div className="field">
          <label htmlFor="sh-name">Nom</label>
          <input id="sh-name" className="input big" value={shelf.name} onChange={(e) => upd((s) => ({ ...s, name: e.target.value }))} />
        </div>
        <h3 className="h6">Ce que contient l’étagère</h3>
        <div className="tiles">
          {CATS.map((c) => {
            const on = shelf.cats.includes(c.id);
            return (
              <button key={c.id} className={'tile' + (on ? ' on' : '')} aria-pressed={on} onClick={() => upd((s) => ({ ...s, cats: on ? s.cats.filter((x) => x !== c.id) : [...s.cats, c.id] }))}>
                <i className="dot" style={{ background: c.color }} /> {c.name} <small>{count(c.id)}</small>
              </button>
            );
          })}
        </div>
        <h3 className="h6">Largeur du meuble</h3>
        <div className="tiles">
          {MODULES.map((m) => (
            <button key={m.w} className={'tile' + (shelf.width === m.w ? ' on' : '')} aria-pressed={shelf.width === m.w} onClick={() => upd((s) => ({ ...s, width: m.w }))}>{m.label}</button>
          ))}
        </div>
        <h3 className="h6">Nombre de niveaux</h3>
        <Stepper label="niveaux" value={shelf.levels.length} min={2} max={8} onChange={setLevels} />
        <h3 className="h6">Hauteur de chaque niveau</h3>
        {shelf.levels.map((l, i) => (
          <div className="row between" key={l.id}>
            <span>Niveau {i + 1}{i === 0 ? ' (en bas)' : ''}</span>
            <Stepper label={`hauteur du niveau ${i + 1}`} value={l.h} min={15} max={60} step={5} unit=" cm" onChange={(v) => upd((s) => ({ ...s, levels: s.levels.map((x) => (x.id === l.id ? { ...x, h: v } : x)) }))} />
          </div>
        ))}
        <p className={total > MAXH ? 'warn' : 'muted'}>Hauteur totale : {total} cm sur {MAXH} cm maximum{total > MAXH ? ' — c’est trop haut.' : '.'}</p>
        <div className="dialog-actions">
          {shelves.length > 1 && <button className="btn btn-secondary big" onClick={() => { if (confirm('Supprimer cette étagère ?')) { deleteShelf(shelf.id); onClose(); } }}>Supprimer l’étagère</button>}
          <button className="btn btn-primary big" onClick={onClose}>Terminé</button>
        </div>
      </div>
    </div>
  );
}
