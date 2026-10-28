# TaskFlow

A full-stack task manager with user accounts.

- **Frontend:** React 18 + Vite
- **Backend:** Node.js + Express (JWT auth, bcrypt password hashing)
- **Database:** MongoDB via Mongoose

## Features

- Sign up / log in (JWT, 7-day sessions, rate-limited auth routes)
- Create, edit, complete and delete tasks
- Priorities (low / medium / high), due dates with overdue highlighting, tags
- Search, sort (newest, oldest, due date, priority, A to Z), filters (all, active, done, overdue), tag filters
- Progress bar and stats, "Clear completed" bulk action
- Dark mode (follows your system, toggle in the header)
- Settings page: change name, change password, delete account
- Toast notifications and a mobile-friendly layout

## Run it (2 commands)

Requires Node.js 18+ (20+ recommended).

```bash
npm install
npm start
```

Open **http://localhost:5000**, sign up, and start adding tasks.

No MongoDB install needed: if `MONGODB_URI` is empty (the default in `server/.env`), the app starts an
embedded MongoDB automatically and keeps data in `server/.mongo-data`. The first run downloads the MongoDB
binary once, so it needs internet access.

## Development mode (hot reload)

```bash
npm install
npm run dev
```

Frontend at http://localhost:5173 (proxies `/api` to the backend on port 5000).

## Using your own MongoDB

Edit `server/.env`:

```
MONGODB_URI=mongodb://localhost:27017/taskflow
```

Or run `docker compose up -d` for a local MongoDB and use the URI above. Atlas URIs work too.
Change `JWT_SECRET` before deploying anywhere public.

## API

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| GET / PATCH / DELETE | `/api/auth/me` | Get / rename / delete current user |
| POST | `/api/auth/change-password` | Change password |
| GET / POST | `/api/tasks` | List / create tasks |
| GET | `/api/tasks/stats` | Totals, overdue, completed this week |
| PATCH / DELETE | `/api/tasks/:id` | Update / delete a task |
| DELETE | `/api/tasks/completed` | Delete all completed tasks |
| GET | `/api/health` | Health check |

Task fields: `title`, `notes`, `priority`, `dueDate`, `tags`, `done`.

## Structure

```
client/   React + Vite app
server/   Express API, Mongoose models
```
