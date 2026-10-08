import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider.jsx";
import { IconButton } from "../ui/Button.jsx";
import { DropdownMenu, MenuLabel, MenuRadioGroup } from "../ui/overlays.jsx";

export const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const Icon = theme === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  return (
    <DropdownMenu trigger={<IconButton icon={Icon} label={`Theme: ${theme}`} />}>
      <MenuLabel>Theme</MenuLabel>
      <MenuRadioGroup value={theme} onValueChange={setTheme} options={THEME_OPTIONS} />
    </DropdownMenu>
  );
}

export default ThemeToggle;
