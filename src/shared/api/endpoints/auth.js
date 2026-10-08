import { request, downloadFile } from "../client.js";

const A = "/api/v1/auth";

export const authApi = {
  login: (body) => request(`${A}/login`, { method: "POST", body }),
  /** `tenantSlug` is optional: the storefront passes the store the buyer signs up through. */
  register: (body) => request(`${A}/register`, { method: "POST", body }),
  refresh: () => request(`${A}/refresh`, { method: "POST", body: {} }),
  logout: () => request(`${A}/logout`, { method: "POST", body: {}, auth: false }),
  logoutAll: () => request(`${A}/logout-all`, { method: "POST", body: {} }),
  verifyEmail: (token) => request(`${A}/verify-email`, { method: "POST", body: { token } }),
  resendVerification: (email) => request(`${A}/resend-verification`, { method: "POST", body: email ? { email } : {} }),
  me: () => request(`${A}/me`),
  updateMe: (body) => request(`${A}/me`, { method: "PATCH", body }),
  exportMe: () => downloadFile(`${A}/me/export`, "msp-account-export.json"),
  deleteMe: (password) => request(`${A}/me`, { method: "DELETE", body: { password } }),
  forgotPassword: (email) => request(`${A}/forgot-password`, { method: "POST", body: { email } }),
  resetPassword: (body) => request(`${A}/reset-password`, { method: "POST", body }),
  /** Returns { accessToken }. Prefer AuthContext.changePassword(), which stores the new token. */
  changePassword: (body) => request(`${A}/change-password`, { method: "POST", body }),
};
