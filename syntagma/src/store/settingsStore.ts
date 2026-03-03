import { create } from "zustand";
import { FileSystemAPI } from "../utils/fs";
import { useWorkspaceStore } from "./workspaceStore";

export interface Command {
    id: string;
    name: string;
    callback: () => void;
    // which plugin registered this?
    pluginId?: string;
}

export interface SettingsState {
    // User Persistence Settings
    attachmentFolderPath: string;
    autoUpdate: boolean;

    // Modal Visibility
    isCommandPaletteOpen: boolean;
    isQuickOpen: boolean; // Cmd+O mode vs Cmd+P mode
    isSettingsOpen: boolean;

    // Registered Commands
    commands: Command[];

    // Actions
    openCommandPalette: (quickOpen?: boolean) => void;
    closeCommandPalette: () => void;

    openSettings: () => void;
    closeSettings: () => void;

    // Settings API
    updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;

    registerCommand: (command: Command) => void;
    unregisterCommand: (commandId: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    attachmentFolderPath: "/",
    autoUpdate: true,
    isCommandPaletteOpen: false,
    isQuickOpen: false,
    isSettingsOpen: false,
    commands: [],

    openCommandPalette: (quickOpen = false) => set({
        isCommandPaletteOpen: true,
        isQuickOpen: quickOpen
    }),
    closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

    openSettings: () => set({ isSettingsOpen: true }),
    closeSettings: () => set({ isSettingsOpen: false }),

    registerCommand: (cmd) => set((state) => ({ commands: [...state.commands, cmd] })),
    unregisterCommand: (cmdId) => set((state) => ({ commands: state.commands.filter(c => c.id !== cmdId) })),

    updateSetting: (key, value) => {
        set({ [key]: value } as any);
        // Auto-save on discrete changes
        useSettingsStore.getState().saveSettings();
    },

    loadSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const configPath = `${vaultPath}/.syntagma/settings.json`;
        const data = await FileSystemAPI.readFile(configPath);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                set({
                    attachmentFolderPath: parsed.attachmentFolderPath ?? "/",
                    autoUpdate: parsed.autoUpdate ?? true
                });
            } catch (e) {
                console.error("Failed to parse settings.json", e);
            }
        }
    },

    saveSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const state = useSettingsStore.getState();
        const configPath = `${vaultPath}/.syntagma/settings.json`;

        const payload = JSON.stringify({
            attachmentFolderPath: state.attachmentFolderPath,
            autoUpdate: state.autoUpdate
        }, null, 2);

        await FileSystemAPI.writeFile(configPath, payload);
    }
}));
