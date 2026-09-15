import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./shared/context/AuthContext.jsx";
import ScrollToTop from "./shared/components/ScrollToTop.jsx";
import Login from "./shop/pages/Login.jsx";
import { shopRoutes } from "./shop/routes.jsx";
import { tenantRoutes } from "./tenant/routes.jsx";
import { superAdminRoutes } from "./super-admin/routes.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<Login />} />
          {shopRoutes()}
          {tenantRoutes()}
          {superAdminRoutes()}
          <Route path="/tenant/login" element={<Navigate to="/login" replace />} />
          <Route path="/super-admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/orders" element={<Navigate to="/account/orders" replace />} />
          <Route path="/wishlist" element={<Navigate to="/account/wishlist" replace />} />
          <Route path="/admin" element={<Navigate to="/tenant" replace />} />
          <Route path="/seller" element={<Navigate to="/tenant" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
