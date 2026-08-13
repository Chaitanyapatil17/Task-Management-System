# TMS — Task Management System

> Last updated: August 2026

---

## What the Project Does

A full-stack role-based task management web application. An **Admin** creates tasks and assigns them to **Users**. Users view and update their assigned tasks. Both roles get in-app notifications and email alerts. The app includes file attachments, task comments and activity feeds, priority levels, due dates, analytics charts, and Google OAuth sign-in alongside standard email/password login.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router v7 |
| Styling | Plain CSS with CSS variables (no framework) |
| HTTP client | Axios |
| Charts | Recharts 2 (installed but replaced with CSS charts) |
| Auth (OAuth) | @react-oauth/google 0.12.1 |
| Backend | Node.js, Express 5 |
| Database | MongoDB via Mongoose 9 |
| Authentication | JWT (jsonwebtoken), bcryptjs |
| Email | Brevo SMTP HTTP API (node-fetch), nodemailer installed but not used |
| File uploads | Multer (disk storage, `backend/uploads/`) |
| Google OAuth | google-auth-library 9 |
| Dev tooling | Nodemon |

---

## Project Structure

```
Simple Task Management System/
├── backend/
│   ├── server.js              — Express app entry point
│   ├── .env                   — Environment variables
│   ├── config/
│   │   ├── db.js              — Mongoose connection
│   │   └── multer.js          — File upload config (10MB, 5 files, uploads/)
│   ├── models/
│   │   ├── User.js            — User schema
│   │   ├── Task.js            — Task schema
│   │   ├── Notification.js    — In-app notification schema
│   │   └── Comment.js         — Task comments + activity log schema
│   ├── controllers/
│   │   ├── authController.js  — Register, login, Google login, user CRUD
│   │   └── taskController.js  — Task CRUD, pagination, search, analytics
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── commentRoutes.js
│   ├── middleware/
│   │   └── authMiddleware.js  — JWT protect + adminOnly
│   └── services/
│       └── emailService.js    — Brevo HTTP API email sender
└── frontend/
    ├── src/
    │   ├── main.jsx           — App entry, wraps with GoogleOAuthProvider
    │   ├── App.jsx            — Router, MainLayout (sidebar collapse state)
    │   ├── App.css            — All styles (single file, CSS variables)
    │   ├── services/
    │   │   └── taskApi.js     — Axios instance + all API helper functions
    │   ├── components/
    │   │   ├── Navbar.jsx     — Top bar, dark mode toggle, bell notifications
    │   │   ├── Sidebar.jsx    — Collapsible nav, SVG icons, role-based links
    │   │   ├── TaskItem.jsx   — Task card with priority, due date, attachments
    │   │   ├── TaskList.jsx   — Renders list of TaskItem cards
    │   │   └── ProtectedRoute.jsx — JWT + role guard
    │   └── pages/
    │       ├── Login.jsx           — Email/password + Google OAuth login
    │       ├── Tasks.jsx           — User task list
    │       ├── CreateTask.jsx      — Create/edit task (user + admin edit)
    │       ├── TaskDetail.jsx      — Task detail + comments/activity feed
    │       ├── AdminDashboard.jsx  — Stats cards, progress bar, recent tasks
    │       ├── AdminTasks.jsx      — Full task table, search, filter, pagination
    │       ├── AdminCreateTask.jsx — Admin assign task form
    │       ├── AdminUsers.jsx      — User management table
    │       ├── AdminAnalytics.jsx  — CSS charts: donut, bar, area, user table
    │       └── CreateUser.jsx      — Admin create user form
    └── .env                   — VITE_GOOGLE_CLIENT_ID
```

---

## Database Models

### User
| Field | Type | Notes |
|---|---|---|
| name | String | required |
| email | String | required, unique, lowercase |
| password | String | nullable — Google users have no password |
| role | String | `"user"` or `"admin"`, default `"user"` |
| googleId | String | nullable, sparse index |
| avatar | String | Google profile picture URL |

### Task
| Field | Type | Notes |
|---|---|---|
| title | String | required |
| description | String | default `""` |
| status | String | `Pending` / `In Progress` / `Done` |
| assignedTo | ObjectId | ref User, required |
| priority | String | `Low` / `Medium` / `High` / `Critical`, default `Medium` |
| dueDate | Date | nullable |
| attachments | Array | filename, storedName, mimetype, size, uploadedAt |

### Notification
| Field | Type | Notes |
|---|---|---|
| recipient | ObjectId | ref User |
| type | String | `task_assigned` / `task_completed` |
| message | String | |
| task | ObjectId | ref Task |
| read | Boolean | default false |

### Comment
| Field | Type | Notes |
|---|---|---|
| task | ObjectId | ref Task, indexed |
| author | ObjectId | ref User |
| type | String | `comment` / `status_change` / `assignment` / `attachment` |
| text | String | user text or auto-generated log |
| meta | Mixed | e.g. `{ from: "Pending", to: "Done" }` for status changes |

---

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Email/password login → JWT |
| POST | `/google` | Public | Google ID token → JWT |
| GET | `/users` | Admin | List all users |
| POST | `/users` | Admin | Create user |
| DELETE | `/users/:id` | Admin | Delete user |

### Tasks — `/api/tasks`
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | Admin: paginated+filtered list + stats. User: own tasks |
| GET | `/analytics` | Auth | MongoDB aggregation stats + time-series data |
| GET | `/:id` | Auth | Single task |
| POST | `/` | Auth | Create task (multipart, up to 5 files) |
| PUT | `/:id` | Auth | Update task (multipart) |
| DELETE | `/:id` | Auth | Delete task |

**Query params for `GET /api/tasks` (admin only):**
`?page=1&limit=10&search=<string>&status=<status>&assignedTo=<userId>`

### Comments — `/api/tasks/:taskId/comments`
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | All comments + activity for a task |
| POST | `/` | Auth | Post a comment |
| DELETE | `/:commentId` | Auth | Delete own comment (admin can delete any) |

### Notifications — `/api/notifications`
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | Fetch notifications for current user |
| PUT | `/mark-all-read` | Auth | Mark all as read |
| PUT | `/:id/read` | Auth | Mark one as read |

---

## Completed Features

- [x] Email/password registration and login with JWT
- [x] Google OAuth sign-in (verifies ID token server-side with google-auth-library)
- [x] Role-based access control (admin / user) on all routes and UI
- [x] Protected routes — wrong role redirects to correct dashboard
- [x] Admin: assign tasks to users, edit, delete
- [x] Admin: manage users (create, delete)
- [x] User: view own tasks, create personal tasks, edit own tasks
- [x] Task status: Pending / In Progress / Done
- [x] Task priority: Low / Medium / High / Critical
- [x] Task due dates with overdue detection (card gets red left border)
- [x] File attachments on tasks (up to 5 files, 10MB each, served from `/uploads`)
- [x] In-app notifications (bell icon, unread badge, 30s polling, mark as read)
- [x] Email notifications via Brevo HTTP API — user on assignment, admin on completion
- [x] Task comments + activity feed (auto-logs status changes and assignments)
- [x] Admin task table: search (title / user name / email), status filter, user filter, pagination
- [x] Admin dashboard: stats from MongoDB aggregation (always reflects all tasks)
- [x] Analytics page: donut chart, stacked user bars, daily bar charts, user table — all pure CSS/SVG
- [x] Dark mode toggle (persisted to localStorage, applied via `data-theme="dark"` on `<html>`)
- [x] Collapsible sidebar (persisted to localStorage, smooth CSS transition)
- [x] Responsive layout (sidebar collapses to icon rail on ≤768px)

---

## How Key Features Work

### Authentication Flow
1. User posts credentials to `/api/auth/login` or Google token to `/api/auth/google`
2. Backend verifies, returns `{ token, user }` — token is a signed JWT (HS256)
3. Frontend stores both in `localStorage`
4. Axios request interceptor in `taskApi.js` attaches `Authorization: Bearer <token>` to every request
5. `protect` middleware on backend verifies and decodes the JWT on every protected route

### Email Notifications
- Uses Brevo HTTP API (HTTPS port 443) — not SMTP, so it works even when port 587 is blocked
- `sendTaskAssignedEmail` fires when admin creates a task (non-blocking, errors are caught and logged)
- `sendTaskCompletedEmail` fires when a non-admin user sets status to Done (sent to all admin accounts)
- Credentials: `BREVO_API_KEY` and `EMAIL_FROM` in `backend/.env`

### File Uploads
- Multer saves files to `backend/uploads/` with a unique timestamped filename
- Task model stores original filename, stored filename, mimetype, size
- Files served statically from `/uploads` in `server.js`
- Frontend uses `createTaskWithFiles` / `updateTaskWithFiles` helpers that build `FormData`

### Search + Filter + Pagination
- All done on the backend — frontend sends query params, never downloads all tasks to filter client-side
- Search resolves against the `User` collection first (name/email regex), then builds a `$or` on Task title + matched user IDs
- Stats (`total`, `pending`, `inProgress`, `done`) come from a separate `$group` aggregation over all tasks, independent of the current filter/page

### Task Comments & Activity Feed
- Comments and auto-generated activity entries share one `Comment` model, distinguished by `type`
- `createTask` auto-creates a `type: "assignment"` entry
- `updateTask` auto-creates a `type: "status_change"` entry whenever status actually changes
- `TaskDetail` page renders comments with avatar/delete and activity entries with icon chips
- `Enter` submits, `Shift+Enter` adds a newline; textarea auto-resizes

### Sidebar Collapse
- `collapsed` state lives in `MainLayout` in `App.jsx`, persisted to `localStorage` as `tms-sidebar`
- Passed as props to `Sidebar` and applied as `main-content--collapsed` class on the `<main>` element
- Both sidebar width change and content shift use `transition: width .22s ease`

---

## Known Issues / Bugs

1. **`Tasks.jsx` has no search or filter** — the user task list page (`/tasks`) fetches all tasks with no filtering UI. Fine for small datasets but will need pagination if a user has many tasks.

2. **Hardcoded `localhost` URLs** — `http://localhost:5000` appears in `TaskItem.jsx` (attachment links), `TaskDetail.jsx` (attachment links), and email templates in `emailService.js`. These will break in any non-local environment.

3. **`recharts` is installed but unused** — `AdminAnalytics.jsx` was rewritten to use pure CSS/SVG charts after recharts failed to render due to container height issues. The package is still in `package.json` and adds ~300KB to the bundle.

4. **No cascade delete** — deleting a Task does not delete its associated `Comment` documents or `Notification` documents. Orphaned records accumulate in MongoDB over time.

5. **`RoleSelection.jsx` is dead code** — the file exists in `src/pages/` but is not imported or routed anywhere in `App.jsx`.

6. **`TaskForm.jsx` is dead code** — exists in `src/components/` but is not used anywhere; the app uses `CreateTask.jsx` page instead.

7. **`emailService.js` — nodemailer is imported but not used** — `nodemailer` is in `package.json` but `emailService.js` uses `node-fetch` + Brevo API only.

8. **`VITE_GOOGLE_CLIENT_ID` must match `GOOGLE_CLIENT_ID`** — if the two `.env` files have different or placeholder values, Google login silently fails with `invalid_client`.

9. **User task list has no pagination** — `Tasks.jsx` calls `GET /api/tasks` without `limit` or `page`, which for non-admin returns all tasks with no limit.

10. **Comment delete does not refetch; uses local state filter** — works correctly but if the server returns an error the UI is not re-synced.

---

## In Progress / Incomplete

- Google OAuth consent screen may still be in "Testing" mode — only whitelisted Google accounts can sign in until the app is published in Google Cloud Console
- Email delivery depends on Brevo SMTP key being valid — key may expire and must be regenerated

---

## What Remains To Be Done

From the planned feature list discussed during development:

- [ ] **Export to CSV/PDF** — admin exports filtered task list
- [ ] **Weekly email digest** — cron job sends admins a summary report
- [ ] **Task labels / tags** — free-form tags with filter support
- [ ] **Reassign tasks** — admin moves a task from one user to another after creation
- [ ] **User profile page** — change name/password, view personal stats
- [ ] **Audit log** — admin page showing who did what and when
- [ ] **Recurring tasks** — daily/weekly/monthly auto-creation
- [ ] **Bulk actions** — select multiple tasks for bulk status change, delete, reassign
- [ ] **Cascade delete** — clean up comments and notifications when a task is deleted
- [ ] **Pagination on user task list** — `Tasks.jsx` currently loads all tasks at once
- [ ] **Production-ready URLs** — replace hardcoded `localhost:5000` with env variable

---

## Environment Variables

### `backend/.env`
```
PORT=5000
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<secret key>
BREVO_API_KEY=<Brevo API key>
EMAIL_FROM=<Brevo sender email>
GOOGLE_CLIENT_ID=<Google OAuth client ID>
```

### `frontend/.env`
```
VITE_GOOGLE_CLIENT_ID=<Google OAuth client ID — must match backend>
```

---

## Running the Project

```bash
# Backend (run in a plain terminal, NOT inside Kiro)
cd backend
node server.js
# or: npm run dev   (uses nodemon for auto-restart)

# Frontend (separate terminal)
cd frontend
npm run dev
# Runs on http://localhost:5173
```

> **Important:** Both servers must be started in a regular Windows terminal (cmd/PowerShell), not inside the Kiro IDE terminal. The Kiro terminal injects a TLS proxy that blocks Node.js outbound network connections (SMTP, HTTP API calls).

---

## Notes for Future Development

- All styles are in a single `App.css` file using CSS custom properties (`--accent`, `--bg`, `--surface`, etc.). Dark mode works by switching `data-theme="dark"` on `<html>` — all overrides are at the bottom of `App.css`.
- The `taskApi.js` service file is the single source of truth for all API calls. Add any new endpoint helpers here.
- The `Comment` model handles both user comments and system activity logs via the `type` field — do not create a separate model for activity logs.
- `dotenv.config()` must be the first line in `server.js` before any other `require()` calls that read `process.env`. This was a previously fixed bug — do not move it.
- `recharts` package should be removed from `frontend/package.json` to reduce bundle size since it is not used.
