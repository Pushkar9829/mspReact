import { Link } from "react-router-dom";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { homeFor, ROLES } from "../../shared/auth.js";

export default function Account() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-[#1a1c3d]">Account</h1>
        <p className="mt-2 text-msr-muted">Sign in to manage orders, addresses and saved items.</p>
        <Link to="/login" state={{ from: "/account" }} className="mt-6 inline-flex rounded-xl bg-[#0b1460] px-5 py-3 font-semibold text-white">
          Sign in
        </Link>
        <Link to="/register" className="mt-3 block text-sm font-semibold text-[#0b1460]">
          Create an account
        </Link>
      </div>
    );
  }

  return (
    <div className="msr-gutter py-8 md:py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1a1c3d]">Profile</h1>
      <p className="mt-1 text-sm text-[#8b8ea3]">Your account details</p>
      <div className="mt-6 max-w-xl rounded-2xl border border-[#eceef4] bg-white p-5">
        <p className="text-xl font-extrabold text-[#1a1c3d]">{user.name}</p>
        <p className="mt-1 text-sm text-[#6b7280]">{user.email}</p>
        <p className="mt-1 text-[12px] uppercase tracking-wide text-[#8b8ea3]">{String(user.role || "").replace("_", " ")}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {user.role !== ROLES.BUYER ? (
            <Link to={homeFor(user.role)} className="rounded-md bg-[#0b1460] px-4 py-2.5 text-center text-sm font-semibold text-white">
              Open {user.role === ROLES.SUPER_ADMIN ? "company" : "tenant"} panel
            </Link>
          ) : null}
          <Link to="/orders" className="rounded-md border border-[#eceef4] px-4 py-2.5 text-center text-sm font-semibold">
            View orders
          </Link>
          <button type="button" onClick={logout} className="rounded-md border border-[#eceef4] px-4 py-2.5 text-sm font-semibold text-msr-danger">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
