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

export interface PaneGroup {
  id: string;
  panes: PaneItem[];
  activeTabId: string | null;
}

export interface TabItem {
  id: string;
  title: string;
}

interface WorkspaceState {
  vaultPath: string | null;

  // Sidebar State
  leftSidebarOpen: boolean;
  leftSidebarWidth: number;
  rightSidebarOpen: boolean;
  rightSidebarWidth: number;
  leftPanes: PaneItem[];
  rightPaneGroups: PaneGroup[];
  activeLeftPaneId: string | null;

  // Tab State
  openTabs: TabItem[];
  activeTabId: string | null;
  viewMode: "source" | "live";

  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setActiveLeftPane: (id: string) => void;
  setActiveRightPane: (groupId: string, paneId: string) => void;
  movePane: (paneId: string, sourceId: string, destId: string, newIndex: number) => void;
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
  leftSidebarWidth: 280,
  rightSidebarOpen: true,
  rightSidebarWidth: 280,
  leftPanes: initialLeftPanes,
  rightPaneGroups: [{
    id: "right-group-1",
    panes: initialRightPanes,
    activeTabId: initialRightPanes[0]?.id || null
  }],
  activeLeftPaneId: initialLeftPanes[0]?.id || null,

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
  setLeftSidebarWidth: (width) => {
    set({ leftSidebarWidth: width });
  },
  setRightSidebarWidth: (width) => {
    set({ rightSidebarWidth: width });
  },
  setActiveLeftPane: (id) => {
    set({ activeLeftPaneId: id });
    useWorkspaceStore.getState().saveWorkspaceState();
  },
  setActiveRightPane: (groupId, paneId) => {
    set((state) => {
      const newGroups = state.rightPaneGroups.map(g => {
        if (g.id === groupId) {
          return { ...g, activeTabId: paneId };
        }
        return g;
      });
      return { rightPaneGroups: newGroups };
    });
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
        const groups = [...state.rightPaneGroups];
        if (groups.length === 0) {
          groups.push({ id: `right-group-${Date.now()}`, panes: [newPane], activeTabId: newPane.id });
        } else {
          groups[0] = { ...groups[0], panes: [...groups[0].panes, newPane], activeTabId: newPane.id };
        }
        return { rightPaneGroups: groups, rightSidebarOpen: true };
      }
    });
    useWorkspaceStore.getState().saveWorkspaceState();
  },

  movePane: (paneId, sourceId, destId, newIndex) => {
    set((state) => {
      let sourcePane: PaneItem | null = null;
      let newLeftPanes = [...state.leftPanes];
      let newRightGroups = state.rightPaneGroups.map(g => ({ ...g, panes: [...g.panes] }));

      // 1. Find and Extract
      if (sourceId === "left") {
        const idx = newLeftPanes.findIndex(p => p.id === paneId);
        if (idx !== -1) {
          sourcePane = newLeftPanes[idx];
          newLeftPanes.splice(idx, 1);
        }
      } else {
        const groupIdx = newRightGroups.findIndex(g => g.id === sourceId);
        if (groupIdx !== -1) {
          const idx = newRightGroups[groupIdx].panes.findIndex(p => p.id === paneId);
          if (idx !== -1) {
            sourcePane = newRightGroups[groupIdx].panes[idx];
            newRightGroups[groupIdx].panes.splice(idx, 1);
            if (newRightGroups[groupIdx].panes.length === 0) {
              newRightGroups.splice(groupIdx, 1);
            }
          }
        }
      }

      if (!sourcePane) return state;

      // 2. Insert into Dest
      const destIsLeft = destId === "left";
      if (destIsLeft) {
        newLeftPanes.splice(newIndex, 0, sourcePane);
      } else if (destId === "new-right-group") {
        newRightGroups.push({
          id: `right-group-${Date.now()}`,
          panes: [sourcePane],
          activeTabId: sourcePane.id
        });
      } else {
        const destGroupIdx = newRightGroups.findIndex(g => g.id === destId);
        if (destGroupIdx !== -1) {
          newRightGroups[destGroupIdx].panes.splice(newIndex, 0, sourcePane);
          newRightGroups[destGroupIdx].activeTabId = sourcePane.id;
        } else {
          newRightGroups.push({
            id: destId,
            panes: [sourcePane],
            activeTabId: sourcePane.id
          });
        }
      }

      return {
        leftPanes: newLeftPanes,
        rightPaneGroups: newRightGroups,
        ...(destIsLeft && !state.leftSidebarOpen ? { leftSidebarOpen: true } : {}),
        ...(!destIsLeft && !state.rightSidebarOpen ? { rightSidebarOpen: true } : {}),
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

        let loadedRightGroups = parsed.rightPaneGroups;
        if (!loadedRightGroups && parsed.rightPanes) {
          loadedRightGroups = [{ id: "right-group-1", panes: parsed.rightPanes, activeTabId: parsed.activeRightPaneId || null }];
        }

        set({
          leftSidebarOpen: parsed.leftSidebarOpen ?? true,
          rightSidebarOpen: parsed.rightSidebarOpen ?? true,
          leftSidebarWidth: parsed.leftSidebarWidth,
          rightSidebarWidth: parsed.rightSidebarWidth,
          leftPanes: parsed.leftPanes || initialLeftPanes,
          rightPaneGroups: loadedRightGroups || [{ id: "right-group-1", panes: initialRightPanes, activeTabId: initialRightPanes[0]?.id || null }],
          activeLeftPaneId: parsed.activeLeftPaneId || initialLeftPanes[0]?.id || null,
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
      leftSidebarWidth: state.leftSidebarWidth,
      rightSidebarWidth: state.rightSidebarWidth,
      leftPanes: state.leftPanes,
      rightPaneGroups: state.rightPaneGroups,
      activeLeftPaneId: state.activeLeftPaneId,
      openTabs: state.openTabs,
      activeTabId: state.activeTabId,
      viewMode: state.viewMode,
    }, null, 2);

    await FileSystemAPI.writeFile(`${vaultPath}/.syntagma/workspace.json`, payload);
  }
}));
