import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import AuthForm from './components/AuthForm.jsx';
import Tasks from './components/Tasks.jsx';
import Settings from './components/Settings.jsx';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('taskflow_theme');
      if (saved) return saved;
    } catch {}
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('taskflow_theme', theme);
    } catch {}
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const [view, setView] = useState('tasks');
  const [theme, toggleTheme] = useTheme();
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = ({ token, user }) => {
    setToken(token);
    setUser(user);
    setView('tasks');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  if (loading) return <div className="center muted">Loading…</div>;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">✓</span> TaskFlow
        </div>
        <div className="user">
          {user && (
            <nav className="nav">
              <button className={`chip ${view === 'tasks' ? 'active' : ''}`} onClick={() => setView('tasks')}>
                Tasks
              </button>
              <button className={`chip ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
                {user.name}
              </button>
            </nav>
          )}
          <button className="btn ghost" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user && (
            <button className="btn ghost" onClick={logout}>
              Log out
            </button>
          )}
        </div>
      </header>
      <main className="container">
        {!user ? (
          <AuthForm onAuth={handleAuth} />
        ) : view === 'tasks' ? (
          <Tasks notify={notify} />
        ) : (
          <Settings user={user} onUser={setUser} onLogout={logout} notify={notify} />
        )}
      </main>
      {toast && (
        <div className={`toast ${toast.type}`} role="status" key={toast.id}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
