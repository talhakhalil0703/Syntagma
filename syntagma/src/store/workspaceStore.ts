import { create } from "zustand";
import { FileSystemAPI } from "../utils/fs";
import { registry } from "../plugins/PluginRegistry";

export interface PaneItem {
  id: string;
  title: string;
  pluginId: string; // The origin plugin
}

export interface TabItem {
  id: string;
  title: string;
}

interface WorkspaceState {
  vaultPath: string | null;

  // Sidebar State
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftPanes: PaneItem[];
  rightPanes: PaneItem[];

  // Tab State
  openTabs: TabItem[];
  activeTabId: string | null;

  // Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  movePane: (paneId: string, sourceSidebar: "left" | "right", destSidebar: "left" | "right", newIndex: number) => void;

  openTab: (tab: TabItem) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  initWorkspace: () => Promise<void>;
  openVault: () => Promise<void>;
  loadWorkspaceState: () => Promise<void>;
  saveWorkspaceState: () => Promise<void>;
}

const initialLeftPanes: PaneItem[] = [
  {
    id: "pane-file-explorer",
    title: "File Explorer",
    pluginId: "core-file-explorer",
  },
];

const initialRightPanes: PaneItem[] = [
  { id: "pane-calendar", title: "Calendar", pluginId: "core-calendar" },
  { id: "pane-properties", title: "Properties", pluginId: "core-properties" },
];

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  vaultPath: null,

  leftSidebarOpen: true,
  rightSidebarOpen: true,
  leftPanes: initialLeftPanes,
  rightPanes: initialRightPanes,

  openTabs: [{ id: "welcome", title: "Untitled Note.md" }],
  activeTabId: "welcome",

  toggleLeftSidebar: () => {
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen }));
    useWorkspaceStore.getState().saveWorkspaceState();
  },
  toggleRightSidebar: () => {
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen }));
    useWorkspaceStore.getState().saveWorkspaceState();
  },

  movePane: (paneId, source, dest, newIndex) => {
    set((state) => {
      const sourceArray = source === "left" ? state.leftPanes : state.rightPanes;
      const paneIndex = sourceArray.findIndex((p) => p.id === paneId);
      if (paneIndex === -1) return state;

      const pane = sourceArray[paneIndex];
      const newLeft = [...state.leftPanes];
      const newRight = [...state.rightPanes];

      if (source === "left") newLeft.splice(paneIndex, 1);
      else newRight.splice(paneIndex, 1);

      if (dest === "left") newLeft.splice(newIndex, 0, pane);
      else newRight.splice(newIndex, 0, pane);

      return {
        leftPanes: newLeft,
        rightPanes: newRight,
        ...(dest === "left" && !state.leftSidebarOpen ? { leftSidebarOpen: true } : {}),
        ...(dest === "right" && !state.rightSidebarOpen ? { rightSidebarOpen: true } : {}),
      };
    });
    useWorkspaceStore.getState().saveWorkspaceState();
  },

  openTab: (tab) => {
    set((state) => {
      const exists = state.openTabs.find(t => t.id === tab.id);
      if (exists) {
        return { activeTabId: tab.id };
      }
      return {
        openTabs: [...state.openTabs, tab],
        activeTabId: tab.id
      };
    });
    useWorkspaceStore.getState().saveWorkspaceState();
  },

  closeTab: (tabId) => {
    set((state) => {
      const newTabs = state.openTabs.filter(t => t.id !== tabId);
      let newActiveId = state.activeTabId;
      if (state.activeTabId === tabId) {
        newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }
      return {
        openTabs: newTabs,
        activeTabId: newActiveId
      };
    });
    useWorkspaceStore.getState().saveWorkspaceState();
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
    useWorkspaceStore.getState().saveWorkspaceState();
  },

  initWorkspace: async () => {
    let currentVault = localStorage.getItem("syntagma-vault-path");

    // Fallback to the old fixed mock path if nothing was set (for seamless Dev UX)
    if (!currentVault) {
      currentVault = await FileSystemAPI.getVaultPath();
      if (currentVault) {
        localStorage.setItem("syntagma-vault-path", currentVault);
      }
    }

    set({ vaultPath: currentVault });
    await useWorkspaceStore.getState().loadWorkspaceState();
  },

  openVault: async () => {
    const newPath = await FileSystemAPI.selectVaultDirectory();
    if (newPath) {
      localStorage.setItem("syntagma-vault-path", newPath);
      set({ vaultPath: newPath, openTabs: [{ id: "welcome", title: "Untitled Note.md" }], activeTabId: "welcome" });

      // Reload Workspace state for the new vault
      await useWorkspaceStore.getState().loadWorkspaceState();

      // Trigger a refresh/reload on everything that depends on the vault
      (registry as any).getApp().commands.executeCommand("core:file-explorer:refresh");
    }
  },

  loadWorkspaceState: async () => {
    const vaultPath = useWorkspaceStore.getState().vaultPath;
    if (!vaultPath) return;

    const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/workspace.json`);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        set({
          leftSidebarOpen: parsed.leftSidebarOpen ?? true,
          rightSidebarOpen: parsed.rightSidebarOpen ?? true,
          openTabs: parsed.openTabs || [{ id: "welcome", title: "Untitled Note.md" }],
          activeTabId: parsed.activeTabId || "welcome"
        });
      } catch (e) {
        console.error("Failed to parse workspace config", e);
      }
    }
  },

  saveWorkspaceState: async () => {
    const state = useWorkspaceStore.getState();
    const vaultPath = state.vaultPath;
    if (!vaultPath) return;

    const payload = JSON.stringify({
      leftSidebarOpen: state.leftSidebarOpen,
      rightSidebarOpen: state.rightSidebarOpen,
      openTabs: state.openTabs,
      activeTabId: state.activeTabId
    }, null, 2);

    await FileSystemAPI.writeFile(`${vaultPath}/.syntagma/workspace.json`, payload);
  }
}));
