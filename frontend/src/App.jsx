import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Tasks from "./pages/Tasks";
import CreateTask from "./pages/CreateTask";

import AdminDashboard from "./pages/AdminDashboard";
import AdminTasks from "./pages/AdminTasks";
import AdminCreateTask from "./pages/AdminCreateTask";

import AdminUsers from "./pages/AdminUsers";
import CreateUser from "./pages/CreateUser";
import CreateAdmin from "./pages/CreateAdmin";
import AdminAnalytics from "./pages/AdminAnalytics";
import TaskDetail from "./pages/TaskDetail";
import UserDashboard from "./pages/UserDashboard";
import KanbanBoard from "./pages/KanbanBoard";
import CalendarView from "./pages/CalendarView";

import "./App.css";


function MainLayout() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("tms-sidebar") === "collapsed"
  );

  useEffect(() => {
    localStorage.setItem("tms-sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  return (
    <div className="app">
      <Navbar />
      <div className="app-body">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className={`main-content${collapsed ? " main-content--collapsed" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}


function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =================================
            LOGIN
        ================================= */}

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* =================================
            PROTECTED APPLICATION
        ================================= */}

        <Route element={<MainLayout />}>


          {/* =================================
              USER ROUTES
          ================================= */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRole="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks"
            element={
              <ProtectedRoute allowedRole="user">
                <Tasks />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-task"
            element={
              <ProtectedRoute allowedRole="user">
                <CreateTask />
              </ProtectedRoute>
            }
          />

          <Route
            path="/edit-task/:id"
            element={
              <ProtectedRoute allowedRole="user">
                <CreateTask />
              </ProtectedRoute>
            }
          />


          {/* =================================
              ADMIN DASHBOARD
          ================================= */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />


          {/* =================================
               ADMIN TASKS
          ================================= */}

          <Route
            path="/admin/tasks"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminTasks />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/kanban"
            element={
              <ProtectedRoute allowedRole="admin">
                <KanbanBoard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/calendar"
            element={
              <ProtectedRoute allowedRole="admin">
                <CalendarView />
              </ProtectedRoute>
            }
          />


          {/* =================================
              ADMIN CREATE USER
          ================================= */}

          <Route
            path="/admin/create-user"
            element={
              <ProtectedRoute allowedRole="admin">
                <CreateUser />
              </ProtectedRoute>
            }
          />

          {/* =================================
              ADMIN CREATE ADMIN
          ================================= */}

          <Route
            path="/admin/create-admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <CreateAdmin />
              </ProtectedRoute>
            }
          />

          {/* =================================
              ADMIN CREATE TASK
          ================================= */}

          <Route
            path="/admin/create-task"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminCreateTask />
              </ProtectedRoute>
            }
          />

          {/* =================================
              ADMIN EDIT TASK
          ================================= */}

          <Route
            path="/admin/edit-task/:id"
            element={
              <ProtectedRoute allowedRole="admin">
                <CreateTask />
              </ProtectedRoute>
            }
          />


          {/* =================================
              ADMIN USERS
          ================================= */}

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          {/* =================================
              ADMIN ANALYTICS
          ================================= */}

          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />

          {/* Task detail — accessible by both roles */}
          <Route
            path="/tasks/:id/detail"
            element={
              <ProtectedRoute allowedRole="user">
                <TaskDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tasks/:id/detail"
            element={
              <ProtectedRoute allowedRole="admin">
                <TaskDetail />
              </ProtectedRoute>
            }
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;