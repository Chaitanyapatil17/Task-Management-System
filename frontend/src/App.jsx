import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";

import Tasks from "./pages/Tasks";
import CreateTask from "./pages/CreateTask";

import AdminDashboard from "./pages/AdminDashboard";
import AdminTasks from "./pages/AdminTasks";

import "./App.css";


function MainLayout() {
  return (
    <div className="app">

      <Navbar />

      <div className="app-body">

        <Sidebar />

        <main className="main-content">
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

        {/* LOGIN */}

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/login"
          element={<Login />}
        />


        {/* PROTECTED APPLICATION */}

        <Route element={<MainLayout />}>

          {/* =====================
              USER
          ===================== */}

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


          {/* =====================
              ADMIN
          ===================== */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tasks"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminTasks />
              </ProtectedRoute>
            }
          />

          {/* ADMIN EDIT TASK */}
          <Route
            path="/admin/edit-task/:id"
            element={
              <ProtectedRoute allowedRole="admin">
                <CreateTask />
              </ProtectedRoute>
            }
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;