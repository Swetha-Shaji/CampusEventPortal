import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function ProtectedRoute({ children, requiredRole }) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        return navigate(requiredRole === "admin" ? "/admin-login" : "/login");
      }

      try {
        const response = await axios.get(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userRole = response.data.role;

        if (requiredRole && userRole !== requiredRole) {
          // Redirect to appropriate dashboard based on actual role
          return navigate(userRole === "admin" ? "/admin-dashboard" : "/dashboard");
        }

        setIsAuthorized(true);
      } catch (err) {
        sessionStorage.removeItem("token");
        navigate(requiredRole === "admin" ? "/admin-login" : "/login");
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, [navigate, requiredRole]);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center text-red-400 font-bold">Verifying security...</div>;
  }

  return isAuthorized ? children : null;
}