import { Printer } from 'lucide-react';
import { useActiveShelf, useStore } from '../store/useStore';
import { computeShelf } from '../domain/metrics';
import { PrintSheet } from '../components/PrintSheet';
import { ScoreBadge, Segmented } from '../components/ui';
import { useDevice } from '../hooks';
import { catById } from '../domain/constants';

export function PrintScreen() {
  const S = useStore();
  const { shelf, computed } = useActiveShelf();
  const { w, phone } = useDevice();
  const zoom = Math.min(1, (w - (phone ? 16 : 24) * 2 - (phone ? 24 : 64)) / 1120);
  return (
    <>
      <div className="no-print">
        <div className="shelf-tabs" role="tablist">
          {S.shelves.map((sh) => (
            <button key={sh.id} role="tab" aria-selected={sh.id === shelf.id} className={'shelf-tab' + (sh.id === shelf.id ? ' on' : '')} onClick={() => S.setActiveShelf(sh.id)}>
              <span><b>{sh.name}</b><small>{sh.cats.map((x) => catById(x).name).join(', ') || 'Aucune catégorie'}</small></span>
              <ScoreBadge score={computeShelf(sh, S.articles, S.shelves).score} />
            </button>
          ))}
        </div>
        <div className="page-head">
          <div><h1>Impression</h1><p className="muted">Fiche de mise en rayon, format A4 paysage.</p></div>
        </div>
        <div className="print-opts">
          <Segmented value={S.printColor} options={[[true, 'Couleur'], [false, 'Noir et blanc']]} onChange={(v) => S.set({ printColor: v })} />
          <button className={'chip' + (S.printList ? ' on' : '')} aria-pressed={S.printList} onClick={() => S.set({ printList: !S.printList })}><span className="box" aria-hidden>{S.printList && '✓'}</span> Liste des articles</button>
          <button className="btn btn-primary cta" onClick={() => window.print()}><Printer size={22} /> Imprimer</button>
        </div>
      </div>
      <div className="sheet-stage">
        <div className="sheet-zoom" style={{ zoom }}>
          <PrintSheet shelf={shelf} computed={computed} color={S.printColor} showList={S.printList} />
        </div>
      </div>
    </>
  );
}
