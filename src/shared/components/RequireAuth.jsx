import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Spinner } from "../ui/Spinner.jsx";

/** Waits for the session bootstrap, then requires a signed-in user (optionally of given panel roles). */
export default function RequireAuth({ roles, children }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-fg-subtle">
        <Spinner className="size-6" label="Restoring your session" />
      </div>
    );
  }
  if (!user?.token) {
    return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}` }} replace />;
  }
  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/login" state={{ from: location.pathname, wrongRole: true }} replace />;
  }
  return children;
}
