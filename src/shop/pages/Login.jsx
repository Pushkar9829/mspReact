import PortalLogin from "../../shared/components/PortalLogin.jsx";
import { ROLES } from "../../shared/auth.js";

export default function ShopLogin() {
  return (
    <PortalLogin
      title="Shopper sign in"
      subtitle="Buy products, track orders and manage your account."
      expectedRole={ROLES.BUYER}
      demoEmail="buyer@acme.local"
      demoPassword="Buyer123!"
      registerTo="/register"
    />
  );
}
