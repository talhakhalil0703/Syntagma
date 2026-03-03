import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  systemDark: boolean;
  activeSnippets: Set<string>; // IDs of active CSS snippets
  setMode: (mode: ThemeMode) => void;
  setSystemDark: (isDark: boolean) => void;
  toggleSnippet: (snippetId: string) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "system",
  systemDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  activeSnippets: new Set(),

  setMode: (mode) => set({ mode }),

  setSystemDark: (isDark) => set({ systemDark: isDark }),

  toggleSnippet: (snippetId) =>
    set((state) => {
      const newSet = new Set(state.activeSnippets);
      if (newSet.has(snippetId)) {
        newSet.delete(snippetId);
      } else {
        newSet.add(snippetId);
      }
      return { activeSnippets: newSet };
    }),
}));
