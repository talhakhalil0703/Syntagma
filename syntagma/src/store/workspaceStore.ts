import { create } from "zustand";
import { FileSystemAPI } from "../utils/fs";
import { registry } from "../plugins/PluginRegistry";

export interface PaneItem {
  id: string;
  title: string;
  type: "plugin" | "note";
  pluginId?: string; // The origin plugin
  noteId?: string;
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
  activeLeftPaneId: string | null;
  activeRightPaneId: string | null;

  // Tab State
  openTabs: TabItem[];
  activeTabId: string | null;
  viewMode: "source" | "live";

  // Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setActiveLeftPane: (id: string) => void;
  setActiveRightPane: (id: string) => void;
  movePane: (paneId: string, sourceSidebar: "left" | "right", destSidebar: "left" | "right", newIndex: number) => void;
  addNoteToSidebar: (noteId: string, title: string, sidebar: "left" | "right") => void;

  openTab: (tab: TabItem) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  toggleViewMode: () => void;

  initWorkspace: () => Promise<void>;
  openVault: () => Promise<void>;
  loadWorkspaceState: () => Promise<void>;
  saveWorkspaceState: () => Promise<void>;
}

const initialLeftPanes: PaneItem[] = [
  {
    id: "pane-file-explorer",
    title: "File Explorer",
    type: "plugin",
    pluginId: "core-file-explorer",
  },
  {
    id: "pane-search",
    title: "Search",
    type: "plugin",
    pluginId: "core-search",
  },
  {
    id: "pane-bookmarks",
    title: "Bookmarks",
    type: "plugin",
    pluginId: "core-bookmarks",
  },
  {
    id: "pane-git",
    title: "Git",
    type: "plugin",
    pluginId: "core-git",
  }
];

const initialRightPanes: PaneItem[] = [
  { id: "pane-calendar", title: "Calendar", type: "plugin", pluginId: "core-calendar" },
  { id: "pane-dataview", title: "Databases", type: "plugin", pluginId: "core-dataview" },
  { id: "pane-tasks", title: "Tasks", type: "plugin", pluginId: "core-tasks" },
  { id: "pane-properties", title: "Properties", type: "plugin", pluginId: "core-properties" },
];

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  vaultPath: null,

  leftSidebarOpen: true,
  rightSidebarOpen: true,
  leftPanes: initialLeftPanes,
  rightPanes: initialRightPanes,
  activeLeftPaneId: initialLeftPanes[0]?.id || null,
  activeRightPaneId: initialRightPanes[0]?.id || null,

  openTabs: [{ id: "welcome", title: "Untitled Note.md" }],
  activeTabId: "welcome",
  viewMode: "live",

  toggleLeftSidebar: () => {
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen }));
    useWorkspaceStore.getState().saveWorkspaceState();
  },
  toggleRightSidebar: () => {
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen }));
    useWorkspaceStore.getState().saveWorkspaceState();
  },
  setActiveLeftPane: (id) => {
    set({ activeLeftPaneId: id });
    useWorkspaceStore.getState().saveWorkspaceState();
  },
  setActiveRightPane: (id) => {
    set({ activeRightPaneId: id });
    useWorkspaceStore.getState().saveWorkspaceState();
  },
  addNoteToSidebar: (noteId, title, sidebar) => {
    set((state) => {
      const newPane: PaneItem = {
        id: `pane-note-${Date.now()}`,
        title,
        type: "note",
        noteId
      };
      if (sidebar === "left") {
        return { leftPanes: [...state.leftPanes, newPane], activeLeftPaneId: newPane.id, leftSidebarOpen: true };
      } else {
        return { rightPanes: [...state.rightPanes, newPane], activeRightPaneId: newPane.id, rightSidebarOpen: true };
      }
    });
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

  toggleViewMode: () => {
    set((state) => ({
      viewMode: state.viewMode === "source" ? "live" : "source"
    }));
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
          leftPanes: parsed.leftPanes || initialLeftPanes,
          rightPanes: parsed.rightPanes || initialRightPanes,
          activeLeftPaneId: parsed.activeLeftPaneId || initialLeftPanes[0]?.id || null,
          activeRightPaneId: parsed.activeRightPaneId || initialRightPanes[0]?.id || null,
          openTabs: parsed.openTabs || [{ id: "welcome", title: "Untitled Note.md" }],
          activeTabId: parsed.activeTabId || "welcome",
          viewMode: parsed.viewMode || "live",
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
      leftPanes: state.leftPanes,
      rightPanes: state.rightPanes,
      activeLeftPaneId: state.activeLeftPaneId,
      activeRightPaneId: state.activeRightPaneId,
      openTabs: state.openTabs,
      activeTabId: state.activeTabId,
      viewMode: state.viewMode,
    }, null, 2);

    await FileSystemAPI.writeFile(`${vaultPath}/.syntagma/workspace.json`, payload);
  }
}));
