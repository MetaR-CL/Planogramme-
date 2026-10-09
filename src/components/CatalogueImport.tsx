import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import {
  catalogueTemplate,
  parseCatalogue,
  parseCSV,
  type CataloguePreview,
} from '../domain/catalogue';
import { useStore, uid } from '../store/useStore';
import { catById } from '../domain/constants';
import { eur, num } from './ui';
import { Modal } from './Modal';
export function downloadFile(
  contents: string,
  name: string,
  type = 'application/json',
) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function CatalogueImport() {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CataloguePreview | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const articles = useStore((s) => s.articles),
    importArticles = useStore((s) => s.importArticles);
  async function load(file?: File) {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      if (file.size > 20000000) throw new Error('Le fichier dépasse 20 Mo.');
      let rows: unknown[][];
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser');
        rows = await readSheet(file, 1);
      } else if (/\.(csv|tsv)$/i.test(file.name))
        rows = parseCSV(await file.text());
      else throw new Error('Choisissez un fichier CSV, TSV ou Excel .xlsx.');
      setPreview(parseCatalogue(rows, () => 'a' + uid()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lecture impossible.');
    } finally {
      setBusy(false);
    }
  }
  const updates =
    preview?.articles.filter(
      (a) => a.ean && articles.some((x) => x.ean === a.ean),
    ).length ?? 0;
  return (
    <>
      <button
        className="btn btn-secondary"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Upload size={18} />
        {busy ? 'Lecture…' : 'Importer Excel / CSV'}
      </button>
      <button
        className="btn btn-ghost"
        onClick={() =>
          downloadFile(
            '\uFEFF' + catalogueTemplate,
            'etal-modele-catalogue.csv',
            'text/csv;charset=utf-8',
          )
        }
      >
        <Download size={18} />
        Modèle CSV
      </button>
      <input
        ref={input}
        type="file"
        accept=".csv,.tsv,.xlsx"
        hidden
        onChange={(e) => {
          void load(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <Modal title="Vérifier le catalogue" onClose={() => setPreview(null)}>
          <p>
            {preview.total} lignes · {updates} mises à jour par EAN ·{' '}
            {preview.articles.length - updates} nouveaux articles.
          </p>
          <p className="muted">
            Les références existantes sont mises à jour uniquement si l’EAN
            correspond. Prix HT. Conservez les EAN comme texte dans Excel pour
            garder leurs zéros initiaux.
          </p>
          {preview.errors.length > 0 && (
            <div className="validation-errors" role="alert">
              <b>{preview.errors.length} lignes à corriger avant l’import</b>
              <ul>
                {preview.errors.slice(0, 20).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>EAN</th>
                  <th>Catégorie</th>
                  <th>Dimensions</th>
                  <th>Vente HT</th>
                </tr>
              </thead>
              <tbody>
                {preview.articles.slice(0, 20).map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.ean || '—'}</td>
                    <td>{catById(a.cat).name}</td>
                    <td>
                      {num(a.w)} × {num(a.h)} × {num(a.d)}
                    </td>
                    <td>{eur(a.sell)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.articles.length > 20 && (
            <p className="muted">Aperçu des 20 premières références valides.</p>
          )}
          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={preview.errors.length > 0 || !preview.articles.length}
              onClick={() => {
                try {
                  importArticles(preview.articles);
                  setPreview(null);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : 'Import impossible.',
                  );
                }
              }}
            >
              Confirmer l’import
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setPreview(null)}
            >
              Annuler
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
