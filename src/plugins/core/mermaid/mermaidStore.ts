import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface MermaidState {
    renderInViewMode: boolean;

    updateSetting: <K extends keyof MermaidState>(key: K, value: MermaidState[K]) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}

export const useMermaidStore = create<MermaidState>((set, get) => ({
    renderInViewMode: true,

    updateSetting: (key, value) => {
        set({ [key]: value } as any);
        get().saveSettings();
    },

    loadSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/mermaid.json`);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                set({
                    renderInViewMode: parsed.renderInViewMode ?? get().renderInViewMode,
                });
            } catch (e) {
                console.error("Failed to parse mermaid settings", e);
            }
        }
    },

    saveSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const { renderInViewMode } = get();
        await FileSystemAPI.writeFile(
            `${vaultPath}/.syntagma/mermaid.json`,
            JSON.stringify({ renderInViewMode }, null, 2)
        );
    }
}));
