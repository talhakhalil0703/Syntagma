import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface SearchPluginState {
  /**
   * Whether the Search plugin is enabled.
   * When disabled, CMD+O (Quick Open) will not work.
   */
  enabled: boolean;

  updateSetting: <K extends keyof SearchPluginState>(
    key: K,
    value: SearchPluginState[K],
  ) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const useSearchStore = create<SearchPluginState>((set, get) => ({
  enabled: true,

  updateSetting: (key, value) => {
    set({ [key]: value } as Partial<SearchPluginState>);
    get().saveSettings();
  },

  loadSettings: async () => {
    const vaultPath = useWorkspaceStore.getState().vaultPath;
    if (!vaultPath) return;

    const data = await FileSystemAPI.readFile(
      `${vaultPath}/.syntagma/search.json`,
    );
    if (data) {
      try {
        const parsed = JSON.parse(data);
        set({
          enabled: parsed.enabled ?? true,
        });
      } catch (e) {
        console.error("Failed to parse search plugin settings", e);
      }
    }
  },

  saveSettings: async () => {
    const vaultPath = useWorkspaceStore.getState().vaultPath;
    if (!vaultPath) return;

    const { enabled } = get();
    await FileSystemAPI.writeFile(
      `${vaultPath}/.syntagma/search.json`,
      JSON.stringify({ enabled }, null, 2),
    );
  },
}));
