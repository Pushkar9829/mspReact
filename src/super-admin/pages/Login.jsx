import PortalLogin from "../../shared/components/PortalLogin.jsx";
import { ROLES } from "../../shared/auth.js";

export default function SuperAdminLogin() {
  return (
    <div className="min-h-screen bg-msr-bg">
      <PortalLogin
        title="Super admin sign in"
        subtitle="Manage tenants, users, roles and platform settings."
        expectedRole={ROLES.SUPER_ADMIN}
        demoEmail="admin@msp.local"
        demoPassword="ChangeMe123!"
      />
    </div>
  );
}
