import React, { useEffect } from "react";
import { useThemeStore } from "../store/themeStore";
import { useSettingsStore } from "../store/settingsStore";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { mode, systemDark, setSystemDark } = useThemeStore();
  const baseFontSize = useSettingsStore((state) => state.baseFontSize);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);

    // Add listener
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [setSystemDark]);

  // Apply theme and font size to body
  useEffect(() => {
    const isDark = mode === "dark" || (mode === "system" && systemDark);

    if (isDark) {
      document.body.setAttribute("data-theme", "dark");
    } else {
      document.body.removeAttribute("data-theme");
    }

    document.documentElement.style.setProperty('--base-font-size', `${baseFontSize}px`);
  }, [mode, systemDark, baseFontSize]);


  return <>{children}</>;
};
