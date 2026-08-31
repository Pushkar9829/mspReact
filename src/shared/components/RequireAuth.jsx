import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { loginFor } from "../auth.js";

export default function RequireAuth({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user?.token) {
    return <Navigate to={loginFor(roles[0])} state={{ from: location.pathname }} replace />;
  }
  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={loginFor(roles[0])} state={{ from: location.pathname }} replace />;
  }
  return children;
}
