import { useState } from 'react';
import { api } from '../api.js';

export default function Settings({ user, onUser, onLogout, notify }) {
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');

  const saveName = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const d = await api.updateProfile({ name });
      onUser(d.user);
      notify('Profile updated', 'success');
    } catch (err) {
      setError(err.message);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.changePassword(pw);
      setPw({ currentPassword: '', newPassword: '' });
      notify('Password changed', 'success');
    } catch (err) {
      setError(err.message);
    }
  };

  const removeAccount = async () => {
    if (!window.confirm('Delete your account and all your tasks? This cannot be undone.')) return;
    try {
      await api.deleteAccount();
      onLogout();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="settings">
      {error && <div className="error">{error}</div>}

      <form className="card" onSubmit={saveName}>
        <h2>Profile</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input value={user.email} disabled />
        </label>
        <button className="btn primary">Save</button>
      </form>

      <form className="card" onSubmit={savePassword}>
        <h2>Change password</h2>
        <label>
          Current password
          <input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
        </label>
        <label>
          New password
          <input type="password" minLength={6} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
        </label>
        <button className="btn primary">Update password</button>
      </form>

      <div className="card danger-zone">
        <h2>Danger zone</h2>
        <p className="muted">Permanently delete your account and every task in it.</p>
        <button className="btn danger" onClick={removeAccount}>
          Delete account
        </button>
      </div>
    </div>
  );
}
