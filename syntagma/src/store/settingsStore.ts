import { create } from "zustand";
import { FileSystemAPI } from "../utils/fs";
import { useWorkspaceStore } from "./workspaceStore";

export interface Command {
    id: string;
    name: string;
    callback: () => void;
    defaultHotkey?: string;
    // which plugin registered this?
    pluginId?: string;
}

export interface SettingTab {
    id: string;
    name: string;
    pluginId: string;
    render: () => React.ReactNode;
}

export interface SettingsState {
    // User Persistence Settings
    attachmentFolderPath: string;
    newFileLocation: "root" | "current";
    autoUpdate: boolean;

    // Modal Visibility
    isCommandPaletteOpen: boolean;
    isQuickOpen: boolean; // Cmd+O mode vs Cmd+P mode
    isSettingsOpen: boolean;

    // Dynamic Plugin integrations
    pluginSettingsTabs: SettingTab[];
    hotkeys: Record<string, string>; // Maps commandId -> Key combo (e.g. "Mod+P")
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

    registerSettingTab: (tab: SettingTab) => void;
    unregisterSettingTab: (tabId: string) => void;

    setHotkey: (commandId: string, hotkey: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    attachmentFolderPath: "/",
    newFileLocation: "root",
    autoUpdate: true,
    isCommandPaletteOpen: false,
    isQuickOpen: false,
    isSettingsOpen: false,
    pluginSettingsTabs: [],
    hotkeys: {},
    commands: [],

    openCommandPalette: (quickOpen = false) => set({
        isCommandPaletteOpen: true,
        isQuickOpen: quickOpen
    }),
    closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

    openSettings: () => set({ isSettingsOpen: true }),
    closeSettings: () => set({ isSettingsOpen: false }),

    registerCommand: (cmd) => set((state) => {
        if (state.commands.some(c => c.id === cmd.id)) return state;
        return { commands: [...state.commands, cmd] };
    }),
    unregisterCommand: (cmdId) => set((state) => ({ commands: state.commands.filter(c => c.id !== cmdId) })),

    registerSettingTab: (tab) => set((state) => {
        if (state.pluginSettingsTabs.some(t => t.id === tab.id)) return state;
        return { pluginSettingsTabs: [...state.pluginSettingsTabs, tab] };
    }),
    unregisterSettingTab: (tabId) => set((state) => ({ pluginSettingsTabs: state.pluginSettingsTabs.filter(t => t.id !== tabId) })),

    setHotkey: (commandId, hotkey) => {
        set((state) => ({
            hotkeys: { ...state.hotkeys, [commandId]: hotkey }
        }));
        useSettingsStore.getState().saveSettings();
    },

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
                    newFileLocation: parsed.newFileLocation ?? "root",
                    autoUpdate: parsed.autoUpdate ?? true,
                    hotkeys: parsed.hotkeys ?? {}
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
            newFileLocation: state.newFileLocation,
            autoUpdate: state.autoUpdate,
            hotkeys: state.hotkeys
        }, null, 2);

        await FileSystemAPI.writeFile(configPath, payload);
    }
}));
