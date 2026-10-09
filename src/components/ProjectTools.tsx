import { useEffect, useState } from 'react';
import { History, Redo2, Save, Undo2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getSaveStatus, type SaveStatus } from '../store/storage';
import { Modal } from './Modal';
export function ProjectTools() {
  const S = useStore();
  const [open, setOpen] = useState(false),
    [name, setName] = useState(''),
    [error, setError] = useState('');
  const [save, setSave] = useState<SaveStatus>(getSaveStatus);
  useEffect(() => {
    const handler = (e: Event) =>
      setSave((e as CustomEvent<SaveStatus>).detail);
    window.addEventListener('etal-save', handler);
    return () => window.removeEventListener('etal-save', handler);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        el.closest('input,textarea,select,[contenteditable],dialog') ||
        S.screen === 'form'
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? S.redo() : S.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        S.redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [S.undo, S.redo, S.screen]);
  return (
    <>
      <div className="project-tools no-print">
        <span className="project-state">
          <Save size={15} />
          <span role="status">
            {save === 'error'
              ? 'Sauvegarde impossible · exportez vos données'
              : save === 'saving'
                ? 'Enregistrement…'
                : 'Enregistré sur cet appareil'}
          </span>
          <small>{S.activeVersionName}</small>
        </span>
        <div className="actions">
          <button
            className="btn btn-secondary"
            disabled={!S.past.length || S.screen === 'form'}
            title="Annuler (Ctrl / ⌘ Z)"
            onClick={S.undo}
          >
            <Undo2 size={18} />
            <span>Annuler</span>
          </button>
          <button
            className="btn btn-secondary"
            disabled={!S.future.length || S.screen === 'form'}
            title="Rétablir (Ctrl / ⌘ Maj Z)"
            onClick={S.redo}
          >
            <Redo2 size={18} />
            <span>Rétablir</span>
          </button>
          <button className="btn btn-secondary" onClick={() => setOpen(true)}>
            <History size={18} />
            Versions
          </button>
        </div>
      </div>
      {open && (
        <Modal title="Versions du projet" onClose={() => setOpen(false)}>
          <p className="muted">
            Une version conserve le catalogue et tous les meubles. Vous pouvez
            restaurer une proposition, puis annuler cette restauration.
          </p>
          <form
            className="actions"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                S.saveVersion(name);
                setName('');
                setError('');
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Enregistrement impossible.',
                );
              }
            }}
          >
            <input
              className="input grow"
              aria-label="Nom de la version"
              placeholder="Ex. Implantation actuelle"
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="btn btn-primary"
              disabled={!name.trim() || S.versions.length >= 20}
            >
              Conserver cette version
            </button>
          </form>
          {error && (
            <p className="warn" role="alert">
              {error}
            </p>
          )}
          <p className="muted">
            {S.versions.length} / 20 versions · incluses dans l’export de
            sauvegarde.
          </p>
          {!S.versions.length && <p>Aucune version conservée.</p>}
          <ul className="version-list">
            {[...S.versions].reverse().map((v) => (
              <li key={v.id}>
                <div>
                  <b>{v.name}</b>
                  <small>
                    {new Date(v.createdAt).toLocaleString('fr-FR')} ·{' '}
                    {v.data.shelves.length} meubles
                  </small>
                </div>
                <div className="actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      if (
                        confirm(
                          'Restaurer « ' +
                            v.name +
                            ' » ? Le projet actuel restera accessible avec Annuler.',
                        )
                      ) {
                        S.restoreVersion(v.id);
                        setOpen(false);
                      }
                    }}
                  >
                    Restaurer
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() =>
                      confirm('Supprimer cette version conservée ?') &&
                      S.deleteVersion(v.id)
                    }
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  );
}
