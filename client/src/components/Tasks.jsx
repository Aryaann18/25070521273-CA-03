import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const FILTERS = ['all', 'active', 'done', 'overdue'];
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const SORTS = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  due: 'Due date',
  priority: 'Priority',
  alpha: 'A → Z',
};

const parseTags = (s) =>
  [...new Set(s.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 8);

const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

// Due dates are stored as calendar dates (UTC midnight). Compare as plain YYYY-MM-DD strings
// so results don't shift with the viewer's timezone.
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayNumber = (ymd) => Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86400000);

const isOverdue = (t) => !t.done && t.dueDate && toInputDate(t.dueDate) < localToday();

function formatDue(d) {
  const date = new Date(d);
  const diff = dayNumber(toInputDate(d)) - dayNumber(localToday());
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff === -1) return 'Due yesterday';
  if (diff < 0) return `Overdue by ${-diff} days`;
  if (diff < 7) return `Due in ${diff} days`;
  return `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
}

export default function Tasks({ notify }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');

  const [form, setForm] = useState({ title: '', notes: '', priority: 'medium', dueDate: '', tags: '' });
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    api
      .listTasks()
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fail = (err) => {
    setError(err.message);
    notify?.(err.message, 'error');
  };

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      const t = await api.createTask({
        title: form.title,
        notes: form.notes,
        priority: form.priority,
        dueDate: form.dueDate || null,
        tags: parseTags(form.tags),
      });
      setTasks([t, ...tasks]);
      setForm({ title: '', notes: '', priority: 'medium', dueDate: '', tags: '' });
      setError('');
      notify?.('Task added', 'success');
    } catch (err) {
      fail(err);
    }
  };

  const replace = (updated) => setTasks((ts) => ts.map((t) => (t._id === updated._id ? updated : t)));

  const toggle = async (task) => {
    try {
      replace(await api.updateTask(task._id, { done: !task.done }));
    } catch (err) {
      fail(err);
    }
  };

  const remove = async (task) => {
    try {
      await api.deleteTask(task._id);
      setTasks((ts) => ts.filter((t) => t._id !== task._id));
      notify?.('Task deleted');
    } catch (err) {
      fail(err);
    }
  };

  const startEdit = (task) => {
    setEditingId(task._id);
    setDraft({
      title: task.title,
      notes: task.notes || '',
      priority: task.priority,
      dueDate: toInputDate(task.dueDate),
      tags: (task.tags || []).join(', '),
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    try {
      replace(
        await api.updateTask(editingId, {
          title: draft.title,
          notes: draft.notes,
          priority: draft.priority,
          dueDate: draft.dueDate || null,
          tags: parseTags(draft.tags),
        })
      );
      setEditingId(null);
      notify?.('Task updated', 'success');
    } catch (err) {
      fail(err);
    }
  };

  const clearCompleted = async () => {
    if (!window.confirm('Delete all completed tasks?')) return;
    try {
      const { deleted } = await api.clearCompleted();
      setTasks((ts) => ts.filter((t) => !t.done));
      notify?.(`Removed ${deleted} completed task${deleted === 1 ? '' : 's'}`);
    } catch (err) {
      fail(err);
    }
  };

  const allTags = useMemo(() => [...new Set(tasks.flatMap((t) => t.tags || []))].sort(), [tasks]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (filter === 'active' && t.done) return false;
      if (filter === 'done' && !t.done) return false;
      if (filter === 'overdue' && !isOverdue(t)) return false;
      if (tagFilter && !(t.tags || []).includes(tagFilter)) return false;
      if (q && !`${t.title} ${t.notes} ${(t.tags || []).join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const byDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    list = [...list].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      switch (sort) {
        case 'oldest':
          return -byDate(a, b);
        case 'due':
          if (!a.dueDate && !b.dueDate) return byDate(a, b);
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'priority':
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDate(a, b);
        case 'alpha':
          return a.title.localeCompare(b.title);
        default:
          return byDate(a, b);
      }
    });
    return list;
  }, [tasks, filter, tagFilter, query, sort]);

  const doneCount = tasks.filter((t) => t.done).length;
  const overdueCount = tasks.filter(isOverdue).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="tasks">
      <div className="stats">
        <div className="stat">
          <b>{tasks.length}</b>
          <span>Total</span>
        </div>
        <div className="stat">
          <b>{tasks.length - doneCount}</b>
          <span>Active</span>
        </div>
        <div className="stat">
          <b>{doneCount}</b>
          <span>Done</span>
        </div>
        <div className={`stat ${overdueCount ? 'warn' : ''}`}>
          <b>{overdueCount}</b>
          <span>Overdue</span>
        </div>
      </div>

      <div className="progress" title={`${pct}% complete`}>
        <div className="bar" style={{ width: `${pct}%` }} />
      </div>

      <form className="card add" onSubmit={add}>
        <input placeholder="What needs to be done?" value={form.title} onChange={setF('title')} maxLength={200} />
        <textarea placeholder="Notes (optional)" value={form.notes} onChange={setF('notes')} rows={2} maxLength={2000} />
        <div className="row">
          <select value={form.priority} onChange={setF('priority')} aria-label="Priority">
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <input type="date" value={form.dueDate} onChange={setF('dueDate')} aria-label="Due date" />
        </div>
        <div className="row">
          <input placeholder="Tags, comma separated (e.g. work, urgent)" value={form.tags} onChange={setF('tags')} />
          <button className="btn primary" disabled={!form.title.trim()}>
            Add task
          </button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      <div className="toolbar">
        <input className="search" type="search" placeholder="Search tasks…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tasks">
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="filters">
        {FILTERS.map((f) => (
          <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        {doneCount > 0 && (
          <button className="chip clear" onClick={clearCompleted}>
            Clear completed
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="filters tags-row">
          {allTags.map((t) => (
            <button key={t} className={`chip tag-chip ${tagFilter === t ? 'active' : ''}`} onClick={() => setTagFilter(tagFilter === t ? '' : t)}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="muted center">Loading tasks…</p>
      ) : visible.length === 0 ? (
        <p className="muted center empty">{tasks.length ? 'No tasks match your filters.' : 'No tasks yet — add your first one above.'}</p>
      ) : (
        <ul className="list">
          {visible.map((t) =>
            editingId === t._id ? (
              <li key={t._id} className="item editing">
                <form className="edit-form" onSubmit={saveEdit}>
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={200} autoFocus />
                  <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} maxLength={2000} />
                  <div className="row">
                    <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
                  </div>
                  <input placeholder="Tags, comma separated" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
                  <div className="row end">
                    <button type="button" className="btn ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                    <button className="btn primary" disabled={!draft.title.trim()}>
                      Save
                    </button>
                  </div>
                </form>
              </li>
            ) : (
              <li key={t._id} className={`item ${t.done ? 'done' : ''}`}>
                <input type="checkbox" checked={t.done} onChange={() => toggle(t)} aria-label="Mark done" />
                <div className="body">
                  <div className="title">{t.title}</div>
                  {t.notes && <div className="notes">{t.notes}</div>}
                  <div className="meta">
                    {t.dueDate && <span className={`due ${isOverdue(t) ? 'overdue' : ''}`}>📅 {formatDue(t.dueDate)}</span>}
                    {(t.tags || []).map((tag) => (
                      <button key={tag} className="hash" onClick={() => setTagFilter(tag)}>
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
                <span className={`tag ${t.priority}`}>{t.priority}</span>
                <button className="icon-btn" onClick={() => startEdit(t)} aria-label="Edit task" title="Edit">
                  ✎
                </button>
                <button className="icon-btn del" onClick={() => remove(t)} aria-label="Delete task" title="Delete">
                  ✕
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
