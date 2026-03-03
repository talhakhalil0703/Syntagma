import React, { useEffect } from "react";
import { useThemeStore } from "../store/themeStore";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { mode, systemDark, setSystemDark } = useThemeStore();

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);

    // Add listener
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [setSystemDark]);

  // Apply theme to body
  useEffect(() => {
    const isDark = mode === "dark" || (mode === "system" && systemDark);

    if (isDark) {
      document.body.setAttribute("data-theme", "dark");
    } else {
      document.body.removeAttribute("data-theme");
    }
  }, [mode, systemDark]);

  return <>{children}</>;
};
