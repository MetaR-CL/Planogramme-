import { Layers, List } from 'lucide-react';
import { useStore, type Screen } from './store/useStore';
import { ArticlesScreen } from './screens/ArticlesScreen';
import { ArticleForm } from './screens/ArticleForm';
import { ShelfScreen } from './screens/ShelfScreen';

const TABS: { id: Screen; label: string; Icon: typeof List }[] = [
  { id: 'shelf', label: 'Mon étagère', Icon: Layers },
  { id: 'articles', label: 'Mes articles', Icon: List },
];

export function App() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const editing = useStore((s) => s.editing);

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <strong>Étal</strong>
          <span>Épicerie du Marché · planogrammes</span>
        </div>
        <nav className="tabs" aria-label="Navigation">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className="tab" aria-current={screen === id ? 'page' : undefined} onClick={() => setScreen(id)}>
              <Icon size={22} aria-hidden /> {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="main">
        {editing ? <ArticleForm /> : screen === 'articles' ? <ArticlesScreen /> : <ShelfScreen />}
      </main>
    </div>
  );
}
