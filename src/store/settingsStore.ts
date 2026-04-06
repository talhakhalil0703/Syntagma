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

/** A single result item for the Quick Open palette (CMD+O) */
export interface QuickOpenResult {
  /** Absolute file path — used as the tab id */
  id: string;
  /** Display path (relative to vault root), plain text */
  title: string;
  /** Filename portion with matched characters wrapped in <mark> tags */
  filenameHtml?: string;
  /** Content excerpt with matched terms wrapped in <mark> tags (HTML) */
  excerptHtml?: string;
  /** True when the file name itself matched the query */
  isNameMatch: boolean;
  /** Combined relevance score (higher = better) */
  score: number;
}

/** Function signature a plugin provides to power Quick Open */
export type QuickOpenProviderFn = (query: string) => Promise<QuickOpenResult[]>;

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
  baseFontSize: number;

  // Modal Visibility
  isCommandPaletteOpen: boolean;
  isQuickOpen: boolean; // Cmd+O mode vs Cmd+P mode
  isSettingsOpen: boolean;

  // Dynamic Plugin integrations
  pluginSettingsTabs: SettingTab[];
  hotkeys: Record<string, string>; // Maps commandId -> Key combo (e.g. "Mod+P")
  commands: Command[];
  /** Registered by the Search plugin to power CMD+O Quick Open */
  quickOpenProvider: QuickOpenProviderFn | null;

  // Actions
  openCommandPalette: (quickOpen?: boolean) => void;
  closeCommandPalette: () => void;

  openSettings: () => void;
  closeSettings: () => void;

  // Settings API
  updateSetting: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;

  registerCommand: (command: Command) => void;
  unregisterCommand: (commandId: string) => void;

  registerSettingTab: (tab: SettingTab) => void;
  unregisterSettingTab: (tabId: string) => void;

  registerQuickOpenProvider: (fn: QuickOpenProviderFn) => void;
  unregisterQuickOpenProvider: () => void;

  setHotkey: (commandId: string, hotkey: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  attachmentFolderPath: "/",
  newFileLocation: "root",
  autoUpdate: true,
  baseFontSize: 16,
  isCommandPaletteOpen: false,
  isQuickOpen: false,
  isSettingsOpen: false,
  pluginSettingsTabs: [],
  hotkeys: {},
  commands: [],
  quickOpenProvider: null,

  openCommandPalette: (quickOpen = false) =>
    set({
      isCommandPaletteOpen: true,
      isQuickOpen: quickOpen,
    }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  registerCommand: (cmd) =>
    set((state) => {
      if (state.commands.some((c) => c.id === cmd.id)) return state;
      // Auto-seed the hotkey from defaultHotkey if the user hasn't overridden it yet
      const hotkeyUpdate =
        cmd.defaultHotkey && !state.hotkeys[cmd.id]
          ? { hotkeys: { ...state.hotkeys, [cmd.id]: cmd.defaultHotkey } }
          : {};
      return { commands: [...state.commands, cmd], ...hotkeyUpdate };
    }),
  unregisterCommand: (cmdId) =>
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== cmdId),
    })),

  registerSettingTab: (tab) =>
    set((state) => {
      if (state.pluginSettingsTabs.some((t) => t.id === tab.id)) return state;
      return { pluginSettingsTabs: [...state.pluginSettingsTabs, tab] };
    }),
  unregisterSettingTab: (tabId) =>
    set((state) => ({
      pluginSettingsTabs: state.pluginSettingsTabs.filter(
        (t) => t.id !== tabId,
      ),
    })),

  registerQuickOpenProvider: (fn) => set({ quickOpenProvider: fn }),
  unregisterQuickOpenProvider: () => set({ quickOpenProvider: null }),

  setHotkey: (commandId, hotkey) => {
    set((state) => ({
      hotkeys: { ...state.hotkeys, [commandId]: hotkey },
    }));
    useSettingsStore.getState().saveSettings();
  },

  updateSetting: (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
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
        set((state) => ({
          attachmentFolderPath: parsed.attachmentFolderPath ?? "/",
          newFileLocation: parsed.newFileLocation ?? "root",
          autoUpdate: parsed.autoUpdate ?? true,
          baseFontSize: parsed.baseFontSize ?? 16,
          // Merge: plugin-seeded defaults stay unless the user explicitly
          // saved an override. User-saved values win (right-hand side).
          hotkeys: { ...state.hotkeys, ...(parsed.hotkeys ?? {}) },
        }));
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

    const payload = JSON.stringify(
      {
        attachmentFolderPath: state.attachmentFolderPath,
        newFileLocation: state.newFileLocation,
        autoUpdate: state.autoUpdate,
        baseFontSize: state.baseFontSize,
        hotkeys: state.hotkeys,
      },
      null,
      2,
    );

    await FileSystemAPI.writeFile(configPath, payload);
  },
}));
