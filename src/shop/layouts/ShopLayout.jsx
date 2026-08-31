import { Outlet } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import MobileNav from "../components/MobileNav.jsx";
import AccountDrawer from "../components/AccountDrawer.jsx";
import { AccountDrawerProvider } from "../../shared/context/AccountDrawerContext.jsx";

export default function ShopLayout() {
  return (
    <AccountDrawerProvider>
      <div className="min-h-screen bg-msr-bg pb-16 md:pb-0">
        <Header />
        <main>
          <Outlet />
        </main>
        <Footer />
        <MobileNav />
        <AccountDrawer />
      </div>
    </AccountDrawerProvider>
  );
}
