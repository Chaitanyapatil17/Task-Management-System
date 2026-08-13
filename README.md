# Task Management System (TMS)

A modern, full-stack Task Management System built with React, Node.js, Express, and MongoDB. Featuring role-based access control, real-time notifications, file attachments, task analytics, and admin dashboard.

## 🎯 Features

### User Features
- **User Registration** - Self-signup with email and password (auto-assigned as "user" role)
- **User Dashboard** - Personalized task overview with statistics:
  - Total tasks count
  - Pending, In Progress, and Completed task counts
  - Overdue task tracking
  - Completion rate percentage
  - Recent 5 tasks quick view
- **Task Management**
  - View assigned tasks
  - Update task status (Pending → In Progress → Done)
  - Set priorities (Low, Medium, High, Critical)
  - Due date management
  - File attachments (via Cloudinary)
  - Task comments for collaboration
  - Real-time notifications
- **Task Details Page** - View full task information with attachments and comments

### Admin Features
- **Admin Dashboard** - System-wide analytics:
  - Overall task status breakdown
  - Tasks created per day (last 30 days)
  - Completion trends
  - Per-user task breakdown (top 10)
- **Manage Users**
  - View all users with their roles
  - Create regular users
  - **Create Admin accounts** (admin-only)
  - Delete users (except self)
- **Manage Tasks**
  - Create and assign tasks to users
  - Update task status and details
  - View all system tasks with filters
  - Search and pagination support
- **Create Admin** - Secure admin account creation with role enforcement
- **Analytics Page** - Detailed charts and statistics on task performance

### Security Features
- **JWT Authentication** - Secure token-based authentication (1-day expiry)
- **Role-Based Access Control** - Separate routes and permissions for users and admins
- **Password Hashing** - Bcrypt encryption (10 salt rounds)
- **Protected Routes** - Frontend route protection with ProtectedRoute component
- **Admin Middleware** - Backend protection with `protect` and `adminOnly` middleware
- **Duplicate Email Prevention** - Unique email validation on registration and user creation

### Additional Features
- **Dark Mode Support** - Theme toggle for comfortable usage
- **Responsive Design** - Mobile-friendly UI
- **File Attachments** - Upload files to Cloudinary, store URLs in MongoDB
- **Email Notifications** - Task assignment and completion emails
- **Google OAuth** - One-click sign-in with Google (optional)
- **Sidebar Collapse** - Toggle sidebar for better space utilization
- **Task Comments** - Collaborate on tasks with threaded comments
- **Real-time Notifications** - In-app notification system

---

## 📋 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: Bcrypt
- **File Storage**: Cloudinary (cloud image/file hosting)
- **Email**: Nodemailer
- **Environment**: dotenv

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Router**: React Router v6
- **HTTP Client**: Axios
- **Styling**: CSS3 (custom, no frameworks)
- **Google Auth**: @react-oauth/google
- **Icons**: SVG inline

### DevOps
- **Version Control**: Git & GitHub
- **Environment Management**: .env files
- **API Base URL**: Configurable via Axios instance

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **MongoDB** (local or MongoDB Atlas cloud)
- **Cloudinary Account** (for file uploads) - [Sign up free](https://cloudinary.com)
- **Google OAuth Credentials** (optional) - [Create credentials](https://console.cloud.google.com)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/simple-task-management-system.git
cd simple-task-management-system
```

#### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/tms
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tms

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@taskmanagementsystem.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id

# Server
PORT=5000
NODE_ENV=development
```

Start the backend server:
```bash
npm start
```

You should see: `Server running on port 5000`

#### 3. Frontend Setup

```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```

You should see: `Local: http://localhost:5173`

#### 4. Access the Application
Open your browser and navigate to: `http://localhost:5173`

---

## 📁 Project Structure

```
simple-task-management-system/
├── backend/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   ├── cloudinary.js         # Cloudinary configuration
│   │   └── multer.js             # File upload configuration
│   ├── controllers/
│   │   ├── authController.js     # Auth logic (register, login, create admin/user)
│   │   └── taskController.js     # Task logic (CRUD, analytics, dashboard)
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification & admin check
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Task.js               # Task schema with attachments
│   │   ├── Notification.js       # In-app notifications
│   │   └── Comment.js            # Task comments
│   ├── routes/
│   │   ├── authRoutes.js         # Auth endpoints
│   │   └── taskRoutes.js         # Task endpoints
│   ├── services/
│   │   └── emailService.js       # Email notifications
│   ├── server.js                 # Express server setup
│   ├── package.json
│   ├── .env                      # Environment variables (create manually)
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Top navigation bar
│   │   │   ├── Sidebar.jsx       # Collapsible sidebar menu
│   │   │   ├── ProtectedRoute.jsx # Role-based route protection
│   │   │   ├── TaskForm.jsx      # Reusable task form
│   │   │   ├── TaskItem.jsx      # Task card component
│   │   │   └── TaskList.jsx      # Task list display
│   │   ├── pages/
│   │   │   ├── Login.jsx         # Login page
│   │   │   ├── Register.jsx      # User registration
│   │   │   ├── Tasks.jsx         # User task list
│   │   │   ├── CreateTask.jsx    # User create/edit task
│   │   │   ├── UserDashboard.jsx # User dashboard with stats
│   │   │   ├── AdminDashboard.jsx # Admin dashboard with analytics
│   │   │   ├── AdminTasks.jsx    # Admin task management
│   │   │   ├── AdminCreateTask.jsx # Admin assign task
│   │   │   ├── AdminUsers.jsx    # Manage users
│   │   │   ├── CreateUser.jsx    # Create user
│   │   │   ├── CreateAdmin.jsx   # Create admin (NEW)
│   │   │   ├── AdminAnalytics.jsx # Detailed analytics
│   │   │   └── TaskDetail.jsx    # Task detail page
│   │   ├── services/
│   │   │   └── taskApi.js        # Axios API client
│   │   ├── App.jsx               # Main app component
│   │   ├── App.css               # Global styles
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── .gitignore
│
├── README.md                     # This file
└── .gitignore
```

---

## 🔐 Authentication Flow

### User Registration
1. User enters name, email, password
2. Frontend validates all fields
3. POST to `/api/auth/register` - always creates with `role: "user"`
4. Backend hashes password with bcrypt
5. JWT token returned - user auto-logged in
6. Redirects to user dashboard

### User Login
1. User enters email and password
2. POST to `/api/auth/login`
3. Backend verifies credentials with bcrypt
4. JWT token returned with user role
5. Token stored in localStorage
6. Redirects to dashboard based on role (user or admin)

### Admin Creation (Admin-Only)
1. Admin navigates to Manage Users → "Create Admin" button
2. Admin fills name, email, password for new admin
3. Frontend validates all fields
4. POST to `/api/auth/admins` with JWT token
5. Backend checks `adminOnly` middleware - only admin can proceed
6. Backend forces `role: "admin"` - frontend cannot override
7. Password hashed with bcrypt
8. New admin account created and shown in user list

---

## 📊 API Endpoints

### Authentication Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | User self-registration | No |
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/google` | Google OAuth | No |
| GET | `/api/auth/users` | Get all users | JWT + Admin |
| POST | `/api/auth/users` | Create regular user | JWT + Admin |
| POST | `/api/auth/admins` | Create admin user | JWT + Admin |
| DELETE | `/api/auth/users/:id` | Delete user | JWT + Admin |

### Task Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/tasks` | Get user's tasks / all tasks | JWT |
| POST | `/api/tasks` | Create task | JWT |
| GET | `/api/tasks/:id` | Get task by ID | JWT |
| PUT | `/api/tasks/:id` | Update task | JWT |
| DELETE | `/api/tasks/:id` | Delete task | JWT |
| GET | `/api/tasks/dashboard/stats` | Get dashboard statistics | JWT |
| GET | `/api/tasks/analytics` | Get analytics data | JWT + Admin |
| DELETE | `/api/tasks/:id/attachments/:attachmentId` | Delete attachment | JWT |

---

## 🧪 Testing the Features

### Test User Registration
1. Go to http://localhost:5173/register
2. Enter name, email, password
3. Click "Create Account"
4. Should redirect to login
5. Login with the new credentials

### Test User Dashboard
1. Login as a user
2. Click "Dashboard" in sidebar
3. Should show task statistics and recent tasks

### Test Task Creation (User)
1. Login as user
2. Click "Create Task"
3. Fill in task details
4. Submit - task appears in your task list

### Test Admin Features
1. Login as admin (or create one first)
2. Navigate to "Manage Users" in Admin menu
3. Click "+ Create Admin" button
4. Fill in admin details and submit
5. New admin appears in user list with "admin" role badge
6. New admin can login and access admin features

### Test Task Assignment (Admin)
1. Login as admin
2. Click "Assign Task"
3. Fill task details
4. Select a user to assign to
5. Submit - user receives notification
6. User can see task in their task list

### Test Admin Analytics
1. Login as admin
2. Click "Analytics"
3. See overall task statistics and trends

---

## 🔒 Security Considerations

### Password Security
- All passwords hashed with bcrypt (10 salt rounds)
- Never stored in plaintext
- Never transmitted over HTTP (only HTTPS in production)

### JWT Security
- Token expires after 1 day
- Stored in localStorage (consider sessionStorage for higher security)
- Verified on every protected API call
- Contains user ID and role

### Role-Based Access
- Users cannot access `/admin/*` routes (ProtectedRoute component)
- Admins cannot be created via public registration endpoint
- Admin role enforced server-side (`adminOnly` middleware)
- Frontend cannot override role assignment

### Validation
- Email uniqueness checked at database level
- Input validation on both frontend and backend
- Password confirmation validation on frontend
- All required fields validated before API calls

---

## 🚢 Deployment

### Backend Deployment (Heroku example)
1. Create Heroku account and install CLI
2. Create new Heroku app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set JWT_SECRET=xxx`
4. Push code: `git push heroku main`

### Frontend Deployment (Vercel example)
1. Build: `npm run build`
2. Connect GitHub repo to Vercel
3. Set API base URL environment variable
4. Deploy automatically on push

### MongoDB Atlas (Cloud Database)
1. Create MongoDB Atlas account
2. Create cluster and database
3. Get connection string
4. Add to `.env` as `MONGODB_URI`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🆘 Troubleshooting

### Frontend shows blank page
- Clear browser cache (Ctrl+Shift+R)
- Check browser console (F12) for errors
- Verify backend is running on port 5000

### "No routes matched" error
- Restart frontend dev server
- Clear Vite cache: `rm -rf .vite` and `rm -rf dist`
- Hard refresh browser (Ctrl+Shift+R)

### Database connection error
- Verify MongoDB is running locally or check MongoDB Atlas connection string
- Check `MONGODB_URI` in `.env`
- Verify network access in MongoDB Atlas if using cloud

### File upload not working
- Check Cloudinary credentials in `.env`
- Verify file size < 10 MB
- Check Cloudinary dashboard for upload errors

### Email notifications not sending
- Verify email credentials in `.env`
- For Gmail: use App Password (not regular password)
- Enable "Less secure app access" if using Gmail

---

## 📞 Support

For issues, questions, or suggestions, please [open an issue](https://github.com/yourusername/simple-task-management-system/issues) on GitHub.

---

## 🎉 Acknowledgments

- React.js for the amazing UI library
- Express.js for the robust backend framework
- MongoDB for flexible data storage
- Cloudinary for cloud file hosting
- All open-source contributors

---

**Last Updated**: August 2026  
**Version**: 1.0.0
