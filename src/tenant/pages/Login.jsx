import PortalLogin from "../../shared/components/PortalLogin.jsx";
import { ROLES } from "../../shared/auth.js";

export default function TenantLogin() {
  return (
    <div className="min-h-screen bg-msr-bg">
      <PortalLogin
        title="Tenant sign in"
        subtitle="Manage your catalog, inventory, orders and offers."
        expectedRole={ROLES.TENANT}
        demoEmail="vendor@acme.local"
        demoPassword="Vendor123!"
      />
    </div>
  );
}
