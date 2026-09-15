// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SpotlightLanding from "./pages/spotlight";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManageEvents from "./pages/ManageEvents";
import ManageUsers from "./pages/ManageUsers";
import AdminReport from "./pages/AdminReport";
import EventRecords from "./pages/EventRecords";
import EventDetails from "./pages/EventDetails";
import StudentReport from "./pages/StudentReport";
import StudentInstructions from "./pages/StudentInstructions";
import AdminInstructions from "./pages/AdminInstructions";
import RegisteredEventHub from "./pages/RegisteredEventHub";
import UserEventDetails from "./pages/UserEventDetails";
import ProtectedRoute from "./components/ProtectedRoute";

// Simple 404 Component
function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white flex flex-col items-center justify-center p-6 text-center">
      <span className="material-symbols-outlined text-7xl text-red-500 mb-4 animate-bounce">error</span>
      <h1 className="text-4xl font-extrabold mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>404 - Page Not Found</h1>
      <p className="text-[#8c909f] text-sm mb-6 max-w-md">The page you are looking for does not exist or has been moved.</p>
      <a href="/login" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm">
        Go Back Home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<SpotlightLanding />} />

        {/* Protected Student Routes */}
        <Route path="/dashboard" element={<ProtectedRoute requiredRole="student"><Dashboard /></ProtectedRoute>} />
        <Route path="/student-report" element={<ProtectedRoute requiredRole="student"><StudentReport /></ProtectedRoute>} />
        <Route path="/student-instructions" element={<ProtectedRoute requiredRole="student"><StudentInstructions /></ProtectedRoute>} />
        <Route path="/my-events/:id" element={<ProtectedRoute requiredRole="student"><RegisteredEventHub /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute requiredRole="student"><UserEventDetails /></ProtectedRoute>} />

        {/* Protected Admin Routes */}
        <Route path="/admin-dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/manage-events" element={<ProtectedRoute requiredRole="admin"><ManageEvents /></ProtectedRoute>} />
        <Route path="/manage-events/:id" element={<ProtectedRoute requiredRole="admin"><EventDetails /></ProtectedRoute>}/>
        <Route path="/manage-users" element={<ProtectedRoute requiredRole="admin"><ManageUsers /></ProtectedRoute>} />
        <Route path="/admin-report" element={<ProtectedRoute requiredRole="admin"><AdminReport /></ProtectedRoute>} />
        <Route path="/admin/event-records" element={<ProtectedRoute requiredRole="admin"><EventRecords /></ProtectedRoute>} />
        <Route path="/admin-instructions" element={<ProtectedRoute requiredRole="admin"><AdminInstructions /></ProtectedRoute>} />

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}