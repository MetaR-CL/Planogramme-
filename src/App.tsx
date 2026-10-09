import { Layers, List, Printer, LayoutGrid } from 'lucide-react';
import { useStore, type Screen } from './store/useStore';
import { ArticlesScreen } from './screens/ArticlesScreen';
import { ArticleForm } from './screens/ArticleForm';
import { ShelvesScreen } from './screens/ShelvesScreen';
import { PlanogramScreen } from './screens/PlanogramScreen';
import { PrintScreen } from './screens/PrintScreen';
import { useDevice } from './hooks';
import { useEffect, useState } from 'react';
import { ProjectTools } from './components/ProjectTools';

const TABS: { id: Screen; n: string; label: string; Icon: typeof List }[] = [
  { id: 'articles', n: '01', label: 'Articles', Icon: List },
  { id: 'shelves', n: '02', label: 'Étagères', Icon: Layers },
  { id: 'planogram', n: '03', label: 'Planogramme', Icon: LayoutGrid },
  { id: 'print', n: '04', label: 'Impression', Icon: Printer },
];

export function App() {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  useEffect(() => {
    const off = useStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useStore.persist.hasHydrated());
    return off;
  }, []);
  const screen = useStore((s) => s.screen);
  const go = useStore((s) => s.go);
  const editing = useStore((s) => s.editing);
  const { phone } = useDevice();
  const current = screen === 'form' ? 'articles' : screen;

  return (
    <div className={'app' + (phone ? ' phone' : '')}>
      <header className="topbar no-print">
        <div className="brand">
          <strong>Étal</strong>
          <span>Épicerie du Marché · planogrammes</span>
        </div>
        {!phone && (
          <nav className="tabs" aria-label="Navigation">
            {TABS.map(({ id, n, label }) => (
              <button
                key={id}
                className="tab"
                aria-current={current === id ? 'page' : undefined}
                onClick={() => go(id)}
              >
                <small>{n}</small> {label}
              </button>
            ))}
          </nav>
        )}
      </header>
      <main className="main">
        {!hydrated ? (
          <p role="status">Chargement de votre projet…</p>
        ) : (
          <>
            <ProjectTools />
            {screen === 'form' ? (
              <ArticleForm key={editing?.id ?? 'new'} />
            ) : screen === 'articles' ? (
              <ArticlesScreen />
            ) : screen === 'shelves' ? (
              <ShelvesScreen />
            ) : screen === 'planogram' ? (
              <PlanogramScreen />
            ) : (
              <PrintScreen />
            )}
          </>
        )}
      </main>
      {phone && (
        <nav className="bottom-nav no-print" aria-label="Navigation">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-current={current === id ? 'page' : undefined}
              onClick={() => go(id)}
            >
              <Icon size={22} aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
