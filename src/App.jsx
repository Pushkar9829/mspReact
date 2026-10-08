import { lazy, Suspense, useLayoutEffect } from "react";
import { Tooltip } from "radix-ui";
import { Navigate, Outlet, Route, RouterProvider, createBrowserRouter, createRoutesFromElements, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./shared/api/queryClient.js";
import { AuthProvider, useAuth } from "./shared/context/AuthContext.jsx";
import { ThemeProvider } from "./shared/theme/ThemeProvider.jsx";
import { Toaster } from "./shared/ui/Toaster.jsx";
import { Spinner } from "./shared/ui/Spinner.jsx";
import { ErrorBoundary } from "./shared/ui/ErrorBoundary.jsx";
import ScrollToTop from "./shared/components/ScrollToTop.jsx";
import RequireAuth from "./shared/components/RequireAuth.jsx";
import { lazyEl } from "./shared/layout/routing.jsx";
import { EmailVerificationBanner } from "./shared/auth/EmailVerification.jsx";
import { shopRoutes } from "./shop/routes.jsx";
import ShopAuthLayout from "./shop/layouts/ShopAuthLayout.jsx";
import { tenantRoutes } from "./tenant/routes.jsx";
import { superAdminRoutes } from "./super-admin/routes.jsx";

const SignInPage = lazy(() => import("./shared/auth/SignInPage.jsx"));
const VerifyEmailPage = lazy(() => import("./shared/auth/VerifyEmailPage.jsx"));
const SessionEndedScreen = lazy(() => import("./shared/layout/StatusPages.jsx").then((m) => ({ default: m.SessionEndedScreen })));
const ForgotPassword = lazy(() => import("./shop/pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./shop/pages/ResetPassword.jsx"));
const InvoiceView = lazy(() => import("./shared/components/InvoiceView.jsx"));

const SHOW_EXPIRED_ON = /^\/(tenant|super-admin|account|checkout)/;

function Root() {
  const { status, endedReason } = useAuth();
  const { pathname } = useLocation();
  // Default title for storefront routes (panels and pages set their own).
  useLayoutEffect(() => {
    if (!/^\/(tenant|super-admin)/.test(pathname)) document.title = "MS₹ Market Server Price";
  }, [pathname]);
  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center bg-msr-bg text-msr-muted">
        <Spinner className="size-6" label="Loading" />
      </div>
    );
  }
  const showEnded = endedReason && (endedReason !== "SESSION_EXPIRED" || SHOW_EXPIRED_ON.test(pathname));
  return (
    <>
      <ScrollToTop />
      <EmailVerificationBanner />
      <ErrorBoundary resetKey={pathname}>
        <Outlet />
      </ErrorBoundary>
      {showEnded ? (
        <Suspense fallback={null}>
          <SessionEndedScreen />
        </Suspense>
      ) : null}
    </>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Root />}>
      <Route path="/login" element={lazyEl(SignInPage)} />
      <Route path="/forgot-password" element={<ShopAuthLayout>{lazyEl(ForgotPassword)}</ShopAuthLayout>} />
      <Route path="/reset-password" element={<ShopAuthLayout>{lazyEl(ResetPassword)}</ShopAuthLayout>} />
      <Route path="/verify-email" element={lazyEl(VerifyEmailPage)} />
      <Route path="/invoice/:id" element={<RequireAuth>{lazyEl(InvoiceView)}</RequireAuth>} />
      {shopRoutes()}
      {tenantRoutes()}
      {superAdminRoutes()}
      <Route path="/tenant/login" element={<Navigate to="/login" state={{ from: "/tenant", panel: true }} replace />} />
      <Route path="/super-admin/login" element={<Navigate to="/login" state={{ from: "/super-admin", panel: true }} replace />} />
      <Route path="/orders" element={<Navigate to="/account/orders" replace />} />
      <Route path="/wishlist" element={<Navigate to="/account/wishlist" replace />} />
      <Route path="/admin" element={<Navigate to="/tenant" replace />} />
      <Route path="/seller" element={<Navigate to="/tenant" replace />} />
    </Route>
  )
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Tooltip.Provider delayDuration={300}>
            <RouterProvider router={router} />
            <Toaster />
          </Tooltip.Provider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
