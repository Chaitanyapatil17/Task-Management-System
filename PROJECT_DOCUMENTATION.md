# Task Management System - Complete Technical Documentation

**Project**: Simple Task Management System (TMS)  
**Version**: 2.0  
**Date**: August 2026  
**Tech Stack**: React 19 + Node.js/Express + MongoDB + Socket.io

---

## 📋 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Models](#3-database-models)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [API Endpoints](#5-api-endpoints)
6. [Core Features](#6-core-features)
7. [Real-Time Features](#7-real-time-features)
8. [Email & Notifications](#8-email--notifications)
9. [File Management](#9-file-management)
10. [Frontend Pages](#10-frontend-pages)

---

## 1. Architecture Overview

### System Design
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Vite)                    │
│  Pages: Dashboard, Tasks, Kanban, Calendar, Admin, Notifications│
│  Components: Navbar, Sidebar, TaskForm, Comments, FileViewer   │
│  Services: Axios HTTP client, Socket.io listener                │
└──────────────────┬──────────────────────────────────────────────┘
                   │ HTTPS + JWT Auth
┌──────────────────▼──────────────────────────────────────────────┐
│                   BACKEND (Express/Node.js)                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Controllers: Auth, Task, Notification, Comment, AI          ││
│  │ Middleware: JWT verification, Admin check                   ││
│  │ Services: Email (Nodemailer), AI (Google GenAI), Reminders  ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ Socket.io: Real-time task updates, comments, notifications      │
├─────────────────────────────────────────────────────────────────┤
│ Routes: /api/auth, /api/tasks, /api/comments, /api/notifications│
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┐
        │          │          │          │
    MongoDB    Cloudinary  Gmail SMTP   Google OAuth
    (Database) (Files)     (Email)      (OAuth)
```

### Directory Structure
```
backend/
├── config/          (Database, Cloudinary, Multer setup)
├── controllers/     (Business logic)
├── middleware/      (JWT auth, admin checks)
├── models/          (Mongoose schemas)
├── routes/          (Express routes)
├── services/        (Email, AI, reminders)
├── utils/           (Socket.io setup)
├── server.js        (Express app)
└── .env             (Environment variables)

frontend/
├── src/
│   ├── pages/       (Dashboard, Tasks, Admin, Kanban, Calendar)
│   ├── components/  (Navbar, Sidebar, TaskForm, Comments)
│   ├── services/    (Axios API client)
│   ├── context/     (Socket provider)
│   ├── App.jsx      (Router setup)
│   └── index.css    (Global styles)
└── package.json
```

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19.2.8 | UI framework |
| | Vite 8.2.0 | Build tool & dev server |
| | React Router 7.18.2 | Client-side routing |
| | Axios 1.19.0 | HTTP requests |
| | Socket.io-client 4.8.3 | Real-time communication |
| | Recharts 2.12.7 | Analytics charts |
| | GSAP 3.15.0 | Animations |
| **Backend** | Node.js + Express 5.2.1 | API server |
| | MongoDB + Mongoose 9.9.1 | Database |
| | JWT (9.0.3) | Authentication |
| | Socket.io 4.8.3 | Real-time events |
| | Bcryptjs 3.0.3 | Password hashing |
| | Nodemailer 9.0.5 | Email sending |
| | Multer + Cloudinary | File uploads |
| | Google Generative AI 0.24.1 | AI chatbot |
| **Infrastructure** | MongoDB Atlas | Cloud database |
| | Cloudinary | File storage |
| | Gmail SMTP | Email service |
| | Google OAuth | Third-party auth |

---

## 3. Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (bcrypt hashed),
  role: "user" | "admin",
  googleId: String,
  avatar: String,
  notificationPreferences: {
    emailAssignments, emailMentions, emailDueSoon, 
    emailOverdue, emailStatusChange, emailWeeklyDigest,
    inAppAssignments, inAppMentions, inAppDueSoon,
    inAppOverdue, inAppStatusChange
  },
  createdAt, updatedAt
}
```

### Task Model
```javascript
{
  title: String,
  description: String,
  status: "Pending" | "In Progress" | "Done",
  priority: "Low" | "Medium" | "High" | "Critical",
  assignedTo: ObjectId → User,
  dueDate: Date,
  startDate: Date,
  
  // Task Dependencies
  prerequisites: [ObjectId → Task],
  
  // Attachments (with versioning)
  attachments: [{
    filename, url, publicId, size, mimetype,
    uploadedAt, uploadedBy,
    version, versionHistory: [...]
  }],
  
  // Subtasks
  subtasks: [{
    title, completed, completedAt, assignedTo
  }],
  
  // Metadata
  tags: [String],
  customFields: [{key, value}],
  templateName: String,
  isArchived: Boolean,
  
  // Reminder tracking
  reminderSent: {
    dueSoon: Boolean,
    overdue: Boolean,
    lastDueSoonAt: Date,
    lastOverdueAt: Date
  },
  
  createdAt, updatedAt
}
```

### Comment Model
```javascript
{
  task: ObjectId → Task,
  author: ObjectId → User,
  type: "comment" | "reply" | "status_change" | "assignment" |
        "attachment" | "priority_change" | "due_date_change",
  text: String,
  mentions: [ObjectId → User],
  reactions: [{emoji: String, users: [ObjectId]}],
  parentComment: ObjectId → Comment (for replies),
  isEdited: Boolean,
  meta: {old: Any, new: Any} (for activity logs),
  createdAt, updatedAt
}
```

### Notification Model
```javascript
{
  recipient: ObjectId → User,
  sender: ObjectId → User,
  type: "task_assigned" | "task_completed" | "mention" | 
        "comment_reply" | "file_uploaded" | "due_soon" |
        "overdue" | "weekly_digest",
  message: String,
  task: ObjectId → Task,
  comment: ObjectId → Comment,
  metadata: Mixed,
  read: Boolean,
  createdAt, updatedAt
}
```

### Relationships
- Task `assignedTo` → User (many-to-one)
- Task `prerequisites` → Task (many-to-many, self-referential)
- Comment `mentions` → User (many-to-many)
- Comment `parentComment` → Comment (self-referential for threads)
- Notification `recipient`, `sender` → User (foreign keys)

---

## 4. Authentication & Authorization

### Registration Flow
1. User fills: name, email, password
2. Backend validates (no duplicates, strong password)
3. Password hashed with bcryptjs (salt rounds: 10)
4. User created in MongoDB with role: "user"
5. JWT signed (payload: `{id, role}`, expiry: 1 day)
6. Token returned → localStorage → axios default header

### Login Flow
```
Email + Password
      ↓
Find User by Email
      ↓
Compare Password (bcrypt.compare)
      ↓
Generate JWT Token
      ↓
Return Token + User Info
```

### Google OAuth Flow
```
Google Sign-In Button (frontend)
      ↓
Receive ID Token
      ↓
POST /api/auth/google with token
      ↓
Backend: Verify with OAuth2Client
      ↓
Extract: email, googleId, name, picture
      ↓
Find or Create User
      ↓
Generate JWT + Return
```

### Role-Based Access

**User Routes** (require `role === "user"`)
- View/create own tasks
- View assigned tasks
- Create comments
- Update profile

**Admin Routes** (require `role === "admin"`)
- Create/assign tasks to any user
- Manage all users (create, delete)
- Create other admin accounts
- View analytics and all tasks
- Set task prerequisites

### Middleware Protection

**Frontend:** `ProtectedRoute` component
```jsx
<ProtectedRoute requiredRole="admin">
  <AdminDashboard />
</ProtectedRoute>
```

**Backend:** Middleware chain
```javascript
router.post(path, protect, adminOnly, controller)
// protect: validates JWT from Authorization header
// adminOnly: checks req.user.role === "admin"
```

---

## 5. API Endpoints

### Authentication
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/auth/register` | User self-signup | ❌ |
| POST | `/api/auth/login` | Email/password login | ❌ |
| POST | `/api/auth/google` | Google OAuth login | ❌ |
| GET | `/api/auth/users` | List all users | ✅ Admin |
| POST | `/api/auth/users` | Create user (admin) | ✅ Admin |
| POST | `/api/auth/admins` | Create admin (admin) | ✅ Admin |
| DELETE | `/api/auth/users/:id` | Delete user | ✅ Admin |

### Tasks
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/tasks` | Get tasks (user or all) | ✅ |
| POST | `/api/tasks` | Create task | ✅ |
| GET | `/api/tasks/:id` | Get task details | ✅ |
| PUT | `/api/tasks/:id` | Update task | ✅ |
| DELETE | `/api/tasks/:id` | Delete task | ✅ |
| GET | `/api/tasks/dashboard/stats` | Dashboard stats | ✅ |
| GET | `/api/tasks/analytics` | System analytics | ✅ Admin |
| POST | `/api/tasks/:id/archive` | Archive task | ✅ Admin |
| POST | `/api/tasks/:id/restore` | Restore task | ✅ Admin |

### Task Dependencies
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/tasks/:id/prerequisites` | Add dependencies | ✅ Admin |
| DELETE | `/api/tasks/:id/prerequisites/:prereqId` | Remove dependency | ✅ Admin |

### Attachments
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| DELETE | `/api/tasks/:id/attachments/:attId` | Delete file | ✅ |
| POST | `/api/tasks/:id/attachments/:attId/version` | Upload new version | ✅ |
| GET | `/api/tasks/:id/attachments/:attId/versions` | Version history | ✅ |

### Comments
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/tasks/:taskId/comments` | Get comments & activity | ✅ |
| POST | `/api/tasks/:taskId/comments` | Add comment with @mentions | ✅ |
| PUT | `/api/tasks/:taskId/comments/:commentId` | Edit comment | ✅ |
| DELETE | `/api/tasks/:taskId/comments/:commentId` | Delete comment | ✅ |
| POST | `/api/tasks/:taskId/comments/:commentId/reactions` | Add emoji reaction | ✅ |

### Notifications
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/notifications` | Get notifications with filters | ✅ |
| PUT | `/api/notifications/mark-all-read` | Mark all as read | ✅ |
| DELETE | `/api/notifications/:id` | Delete notification | ✅ |
| GET | `/api/notifications/preferences` | Get preferences | ✅ |
| PUT | `/api/notifications/preferences` | Update preferences | ✅ |

### AI
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/ai/chat` | Chat with AI assistant | ✅ |
| GET | `/api/ai/greeting` | Get AI greeting & suggestions | ✅ |
| POST | `/api/ai/generate-subtasks` | Generate subtasks from AI | ✅ |

---

## 6. Core Features

### Task Management
- ✅ **CRUD Operations** - Create, read, update, delete tasks
- ✅ **Status Tracking** - Pending → In Progress → Done
- ✅ **Priority Levels** - Low, Medium, High, Critical
- ✅ **Due Dates** - Set and track deadlines
- ✅ **Task Assignment** - Assign tasks to users
- ✅ **Tags** - Categorize tasks with labels

### Task Dependencies (NEW!)
- ✅ **Add Prerequisites** - Set tasks that must be completed first
- ✅ **Blocking Logic** - Cannot move to In Progress/Done if prerequisites incomplete
- ✅ **Circular Dependency Prevention** - DFS algorithm detects and prevents loops
- ✅ **Visual Status** - See all prerequisites with completion status
- ✅ **Error Messages** - Clear feedback when dependencies incomplete

### Collaboration
- ✅ **Comments** - Leave notes on tasks
- ✅ **@Mentions** - Tag users and trigger notifications
- ✅ **Threaded Replies** - Nested comment conversations
- ✅ **Emoji Reactions** - React to comments (👍, ❤️, 🎉, etc.)
- ✅ **Activity Feed** - Auto-logged status changes, assignments, attachments

### File Management
- ✅ **Attachments** - Upload files to Cloudinary or local storage
- ✅ **Version Control** - Track and rollback file versions
- ✅ **File Preview** - In-app viewer for documents
- ✅ **10MB Limit** - Per-file upload size restriction
- ✅ **Multiple Formats** - jpg, png, pdf, docx, xlsx, txt, zip, mp4, mp3

### Views & Analytics
- ✅ **Dashboard** - Personal statistics and recent tasks
- ✅ **Kanban Board** - Drag-and-drop task organization by status
- ✅ **Calendar View** - Visual task scheduling by due date
- ✅ **Admin Analytics** - System-wide charts and trends (30-day)
- ✅ **Search & Filter** - Find tasks by title, assignee, status, priority

### AI Assistant
- ✅ **AI Chatbot** - Powered by Google Generative AI
- ✅ **Task Breakdown** - Generate subtasks from AI suggestions
- ✅ **Workload Analysis** - AI insights on productivity
- ✅ **Conversation History** - Stateful context across messages

### Notifications
- ✅ **Multi-Channel** - In-app + Email notifications
- ✅ **Task Assigned** - Notify user when assigned new task
- ✅ **Task Completed** - Notify admin when task marked Done
- ✅ **@Mentions** - Alert tagged users with email
- ✅ **Due Soon** - 24-hour deadline reminders
- ✅ **Overdue** - Past deadline alerts
- ✅ **Weekly Digest** - Productivity summary email
- ✅ **Preferences** - User controls per notification type

---

## 7. Real-Time Features

### Socket.io Implementation
- **Server Port**: 5000 (same as API)
- **Authentication**: JWT verification on connection
- **Rooms**: Per-task (`task:{id}`), per-user (`user:{userId}`), general broadcast

### Real-Time Events

**Task Updates**
```javascript
socket.emit("task:join", taskId)        // Join room for live updates
socket.on("task:updated", handleUpdate) // Receive live changes
socket.emit("task:leave", taskId)       // Stop listening
```

**Comments**
```javascript
socket.on("comment:created", newComment)        // New comment posted
socket.on("comment:reaction_updated", reaction) // Emoji reaction added
socket.on("task:typing", {userId, typing})      // Typing indicator
```

**Notifications**
```javascript
socket.on("notification:new", notif) // Instant notification
socket.on("presence:update", users)  // Online users list
```

### Online Presence Tracking
- Real-time user online/offline status
- Last seen timestamp on disconnect
- Broadcast to all connected clients
- Endpoint: `GET /api/auth/presence` to fetch list

---

## 8. Email & Notifications

### Email Service (Nodemailer)
```
Transport: Gmail SMTP
From: process.env.EMAIL_USER
Auth: Gmail app password (process.env.EMAIL_PASSWORD)
Format: Styled HTML with gradients and task cards
```

### Email Types

1. **Task Assigned** → User
   - When: Admin creates task for user
   - Content: Task title, description, assignee, due date

2. **Task Completed** → Admin
   - When: User marks task Done
   - Content: Task summary, completion time

3. **@Mention** → Mentioned User
   - When: Tagged in comment
   - Content: Comment text with context

4. **Due Soon** → User (24 hours before)
   - When: Scheduled check every 15 minutes
   - Content: Task details, remaining time

5. **Overdue** → User (past deadline)
   - When: Scheduled check every 15 minutes
   - Content: Task details, overdue duration

6. **Weekly Digest** → All Users (optional)
   - When: Manual trigger or scheduled
   - Content: Stats (completed, pending, in-progress, overdue)

### Notification Preferences
Each user can control:
- `emailAssignments` - Task assignment emails
- `emailMentions` - @mention alerts
- `emailDueSoon` - Upcoming deadline emails
- `emailOverdue` - Overdue task alerts
- `emailWeeklyDigest` - Weekly summary email
- Similar controls for in-app notifications

### Notification Center Frontend
**Filters:**
- All, Unread, Mentions, Deadlines, Assignments, Comments, System

**Features:**
- Search notifications by text
- Group by date (Today, Yesterday, This Week, Older)
- Group by task
- Mark as read (individual or all)
- Delete notifications
- See count per category

---

## 9. File Management

### Upload Flow
```
User selects file
   ↓
Validate: size < 10MB, type in whitelist
   ↓
Multer processes upload
   ↓
Store: Cloudinary (if configured) OR local disk
   ↓
Save attachment metadata to Task.attachments array
   ↓
Create activity comment: "Uploaded {filename}"
   ↓
Emit socket event: file:uploaded
```

### Version Tracking
```
User uploads new version
   ↓
Current attachment moved to versionHistory array
   ↓
Version number incremented
   ↓
New file becomes current attachment
   ↓
Optional note stored with version
   ↓
Full history available for rollback
```

### Storage Options
1. **Cloudinary** (recommended)
   - Cloud storage, auto-optimization
   - Delete: `cloudinary.uploader.destroy(publicId)`

2. **Local Disk** (fallback)
   - Directory: `/backend/uploads`
   - Delete: File auto-cleanup

### File Deletion
- Remove from current attachments
- Delete from storage (Cloudinary or disk)
- Create activity comment: "Deleted {filename}"

---

## 10. Frontend Pages

### Public Pages
- **Landing** - Intro, login/register links, features overview
- **Login** - Email/password form + Google OAuth button
- **Register** - Signup form (auto role = "user")

### User Pages
| Page | Purpose | Key Components |
|------|---------|-----------------|
| Dashboard | Stats, recent tasks, charts | Stats cards, task list, graphs |
| Tasks | Task list with search/filter | Task cards, pagination, filters |
| Create Task | New task form | Form, attachment upload, dependencies |
| Task Detail | Full task info & comments | Comments, attachments, activity, prerequisites |
| Kanban Board | Visual task organization | Cards, drag-drop, status columns |
| Calendar | Task scheduling view | Calendar grid, task dots, detail popup |
| Notifications | Notification center | Filters, grouping, preferences |

### Admin Pages
| Page | Purpose | Key Components |
|------|---------|-----------------|
| Admin Dashboard | System overview, charts | Charts, stats, user breakdown |
| Manage Tasks | Create/edit all tasks | Task list, filters, search, admin controls |
| Manage Users | User management | User list, create, delete, role badges |
| Create Admin | Create admin account | Form with name, email, password |
| Analytics | Detailed system metrics | Charts, trends, completion rates |
| Kanban Board | All tasks by status | Drag-drop, per-column views |
| Calendar | All tasks calendar | Full system view |

### Key Components
- **Navbar** - Header with profile, notifications bell, logout
- **Sidebar** - Navigation menu (collapsible)
- **ProtectedRoute** - Route guard checking token + role
- **TaskForm** - Reusable create/edit form
- **Comments** - Comment section with replies, reactions
- **FileViewer** - Modal for file preview with version history
- **PrerequisitesPicker** - Dropdown to add task dependencies
- **AIChatBot** - Floating AI assistant

---

## 🔄 Complete Request Flow Example

### Creating a Task with Dependencies (Admin)

```
FRONTEND:
1. Admin fills TaskForm
   - Title: "Implementation"
   - Assignee: "John (user)"
   - Prerequisites: ["Design", "Requirements"] (task names)
   - Due date, priority, description

2. Click Submit
   - Validate form fields
   - Convert task names → ObjectIds
   - POST /api/tasks with prerequisites array

BACKEND:
3. POST /api/tasks handler
   - Check: req.user.role === "admin" ✅
   - Validate: assignee exists, tasks exist
   - Check circular dependency (hasCircularDependency function)
   - Save task to MongoDB
   - Create Comment record (activity log)
   - Emit socket.io event: task:created

4. Emit to all connected clients
   - Room: task:{id}
   - Event: task:updated
   - Payload: full task object with populated prerequisites

5. Create notifications
   - Notify assignee: "You assigned Implementation to John"
   - Check preferences: send email if emailAssignments = true

FRONTEND:
6. Socket listener receives task:created
   - Add to task list in real-time
   - Show toast: "Task created successfully"

7. When John views Task Details
   - See prerequisites section
   - Status: 🔴 "Design - Pending"
   - Status: 🔴 "Requirements - Pending"
   - Button to start task is disabled (prerequisites incomplete)
```

### User Completing Task

```
USER CLICKS "Mark as Done":

FRONTEND:
1. Validate: All prerequisites completed?
   - If not: Show error modal with incomplete prerequisites
   - If yes: Continue to step 2

2. PUT /api/tasks/{id}
   - Set status: "Done"
   - Include completedAt: Date.now()

BACKEND:
3. Update Task
   - Verify prerequisites are all "Done" ✅
   - Update status, completedAt
   - Create Comment: "marked this task Done" (activity log)
   - Emit socket.io: task:updated

4. Check if admins need notification
   - For each admin: Create notification "Task Completed"
   - Send email if preferences allow

FRONTEND:
5. Socket listener updates task card
   - Status badge changes to green "Done"
   - Move to "Done" column on Kanban

6. Show toast: "Task marked complete!"
```

---

## 🔒 Security Features

| Feature | Implementation |
|---------|-----------------|
| **Password Hashing** | Bcryptjs with 10 salt rounds |
| **JWT Tokens** | Signed with JWT_SECRET, 1-day expiry |
| **Role Enforcement** | Backend middleware checks role on every admin request |
| **Circular Dependencies** | DFS traversal detects loops before saving |
| **Email Uniqueness** | Mongoose unique constraint on User.email |
| **File Upload Validation** | Whitelist MIME types, 10MB size limit |
| **XSS Protection** | React sanitizes rendered comments |
| **SQL Injection** | Not vulnerable (using MongoDB with parameterized queries) |
| **HTTPS Ready** | Code supports HTTPS (configure in production) |

---

## 📊 Performance Notes

- **Database Indexing** - Recommended: User.email, Task.assignedTo, Task.dueDate
- **Pagination** - All lists support skip/limit parameters
- **Real-Time Limits** - Socket.io rooms auto-cleanup on disconnect
- **Email Queue** - Async operations don't block API responses
- **File Size** - 10MB per file, multiple files supported per task

---

## 🚀 Deployment Checklist

- [ ] Set environment variables (JWT_SECRET, MONGODB_URI, etc.)
- [ ] Configure Cloudinary credentials
- [ ] Set up Gmail app password for email service
- [ ] Install SSL certificate (HTTPS)
- [ ] Build frontend: `npm run build`
- [ ] Start backend: `npm start` (with PORT=5000)
- [ ] Test: POST to /api/auth/login
- [ ] Monitor: Check email service, Socket.io connections

---

## 📚 API Response Examples

### Create Task Response
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Implementation",
  "status": "Pending",
  "priority": "High",
  "assignedTo": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "John",
    "email": "john@example.com"
  },
  "prerequisites": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "title": "Design",
      "status": "Pending"
    }
  ],
  "dueDate": "2026-08-20T00:00:00Z",
  "attachments": [],
  "subtasks": [],
  "tags": ["backend"],
  "createdAt": "2026-08-11T10:30:00Z"
}
```

### Comment with Mentions Response
```json
{
  "_id": "607f1f77bcf86cd799439001",
  "task": "507f1f77bcf86cd799439011",
  "author": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Admin User"
  },
  "text": "Great progress! @john when can you review?",
  "mentions": ["507f1f77bcf86cd799439014"],
  "reactions": [
    { "emoji": "👍", "users": ["507f1f77bcf86cd799439015"] }
  ],
  "type": "comment",
  "createdAt": "2026-08-11T11:00:00Z"
}
```

### Notification Response
```json
{
  "_id": "707f1f77bcf86cd799439002",
  "recipient": "507f1f77bcf86cd799439012",
  "sender": "507f1f77bcf86cd799439013",
  "type": "task_assigned",
  "message": "You were assigned to task: Implementation",
  "task": "507f1f77bcf86cd799439011",
  "read": false,
  "createdAt": "2026-08-11T10:30:00Z"
}
```

---

## 🎯 Key Takeaways

1. **Full-Stack Architecture** - React frontend communicates with Express API via REST + Socket.io
2. **Database Design** - Normalized with relationships (Task ← Prerequisites → Task, Comment mentions, etc.)
3. **Authentication** - JWT-based with role checking middleware
4. **Real-Time Sync** - Socket.io ensures all connected users see updates instantly
5. **Email Notifications** - Multi-channel (in-app + email) with user preferences
6. **File Versioning** - Track attachment history with rollback capability
7. **Task Dependencies** - Circular dependency prevention via DFS algorithm
8. **AI Integration** - Google GenAI powers chatbot and task breakdown
9. **Scalability** - Designed for horizontal scaling (stateless API, no shared session storage)
10. **Security** - JWT auth, role enforcement, bcrypt hashing, input validation

---

**Last Updated:** August 2026  
**Documentation Version:** 2.0  
**Status:** Complete & Ready for Deployment
