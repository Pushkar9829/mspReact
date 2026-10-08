import { Toaster as Sonner, toast } from "sonner";
import { useTheme } from "../theme/ThemeProvider.jsx";

export { toast };

/** Mounted once at the app root (shop and both panels). Use `toast.success("Saved")` anywhere. */
export function Toaster() {
  const { resolved, panelActive } = useTheme();
  return (
    <Sonner
      theme={panelActive ? resolved : "light"}
      position="bottom-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{ className: "font-sans text-ui-sm" }}
    />
  );
}

export default Toaster;
