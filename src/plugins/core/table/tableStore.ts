import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface TableState {
    renderInViewMode: boolean;

    updateSetting: <K extends keyof TableState>(key: K, value: TableState[K]) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}

export const useTableStore = create<TableState>((set, get) => ({
    renderInViewMode: true,

    updateSetting: (key, value) => {
        set({ [key]: value } as any);
        get().saveSettings();
    },

    loadSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/table.json`);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                set({
                    renderInViewMode: parsed.renderInViewMode ?? get().renderInViewMode,
                });
            } catch (e) {
                console.error("Failed to parse table settings", e);
            }
        }
    },

    saveSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const { renderInViewMode } = get();
        await FileSystemAPI.writeFile(
            `${vaultPath}/.syntagma/table.json`,
            JSON.stringify({ renderInViewMode }, null, 2)
        );
    }
}));
