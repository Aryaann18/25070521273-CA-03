import { useState } from 'react';
import { api } from '../api.js';

export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = mode === 'login' ? await api.login(form) : await api.register(form);
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card auth" onSubmit={submit}>
      <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="muted">
        {mode === 'login' ? 'Log in to manage your tasks.' : 'Start organizing your work in seconds.'}
      </p>
      {mode === 'register' && (
        <label>
          Name
          <input value={form.name} onChange={set('name')} required autoFocus />
        </label>
      )}
      <label>
        Email
        <input type="email" value={form.email} onChange={set('email')} required />
      </label>
      <label>
        Password
        <input type="password" value={form.password} onChange={set('password')} required minLength={6} />
      </label>
      {error && <div className="error">{error}</div>}
      <button className="btn primary" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
      </button>
      <p className="muted switch">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setError('');
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          {mode === 'login' ? 'Sign up' : 'Log in'}
        </a>
      </p>
    </form>
  );
}
