import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireAuth({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user?.token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
