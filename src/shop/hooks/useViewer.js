import { useAuth } from "../../shared/context/AuthContext.jsx";
import { ROLES } from "../../shared/auth.js";

/**
 * Who is looking at the shop. `viewer` is the cache scope for query keys: the user id or "guest".
 * `canBuy` = signed in with a role that may check out (buyers; staff can browse but not all can buy).
 */
export function useViewer() {
  const { user, status } = useAuth();
  const signedIn = Boolean(user?.token);
  return {
    user,
    status,
    ready: status !== "loading",
    signedIn,
    isBuyer: signedIn && user.role === ROLES.BUYER,
    viewer: signedIn ? String(user.id) : "guest",
  };
}

export default useViewer;
