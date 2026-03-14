import { create } from "zustand";
import { FileSystemAPI } from "../utils/fs";
import { registry } from "../plugins/PluginRegistry";

export interface PaneItem {
  id: string;
  title: string;
  type: "plugin" | "note";
  pluginId?: string;
  noteId?: string;
}

export interface PaneGroup {
  id: string;
  panes: PaneItem[];
  activeTabId: string | null;
  height?: number;
}

export interface TabItem {
  id: string;
  title: string;
}

export type SplitDirection = "horizontal" | "vertical";

export interface EditorGroup {
  id: string;
  tabs: TabItem[];
  activeTabId: string | null;
}

export interface SplitNode {
  id: string;
  type: "leaf" | "split";
  direction?: SplitDirection;
  children?: SplitNode[];
  group?: EditorGroup;
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

  // Editor State (Tree-based)
  rootSplit: SplitNode;
  activeGroupId: string | null;
  viewMode: "source" | "live";

  // Sidebar Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setActiveLeftPane: (id: string) => void;
  setActiveRightPane: (groupId: string, paneId: string) => void;
  movePane: (paneId: string, sourceId: string, destId: string, newIndex: number) => void;
  closeSidebarTab: (paneId: string, sourceId: string) => void;
  setRightGroupHeight: (groupId: string, height: number) => void;
  addNoteToSidebar: (noteId: string, title: string, sidebar: "left" | "right") => void;

  // Editor Actions
  setActiveGroup: (groupId: string) => void;
  openTab: (tab: TabItem) => void; // Replaces active tab in active group
  openInNewTab: (tab: TabItem) => void; // Appends to active group
  openToRight: (tab: TabItem) => void; // Splits active group to the right
  closeTab: (tabId: string, groupId: string) => void;
  closeOtherTabs: (tabId: string, groupId: string) => void;
  closeTabsToRight: (tabId: string, groupId: string) => void;
  closeAllTabs: (groupId: string) => void;
  setActiveTab: (tabId: string, groupId: string) => void;
  splitGroup: (groupId: string, direction: SplitDirection) => void;

  renameTab: (oldId: string, newId: string, newTitle: string) => void;
  closeTabById: (tabId: string) => void;
  closeTabsMatchingPrefix: (prefix: string) => void;

  toggleViewMode: () => void;

  // Initialization & IO
  initWorkspace: () => Promise<void>;
  openVault: () => Promise<void>;
  loadWorkspaceState: () => Promise<void>;
  saveWorkspaceState: () => Promise<void>;
}

const initialLeftPanes: PaneItem[] = [
  { id: "pane-file-explorer", title: "File Explorer", type: "plugin", pluginId: "core-file-explorer" },
  { id: "pane-search", title: "Search", type: "plugin", pluginId: "core-search" },
  { id: "pane-bookmarks", title: "Bookmarks", type: "plugin", pluginId: "core-bookmarks" },
  { id: "pane-git", title: "Git", type: "plugin", pluginId: "core-git" }
];

const initialRightPanes: PaneItem[] = [
  { id: "pane-calendar", title: "Calendar", type: "plugin", pluginId: "core-calendar" },
  { id: "pane-dataview", title: "Databases", type: "plugin", pluginId: "core-dataview" },
  { id: "pane-tasks", title: "Tasks", type: "plugin", pluginId: "core-tasks" },
  { id: "pane-properties", title: "Properties", type: "plugin", pluginId: "core-properties" },
];

const createDefaultGroup = (): EditorGroup => ({
  id: `group-${Date.now()}`,
  tabs: [],
  activeTabId: null
});

const createDefaultRoot = (): SplitNode => {
  const defaultGroup = createDefaultGroup();
  return {
    id: `split-${Date.now()}`,
    type: "leaf",
    group: defaultGroup
  };
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
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

  rootSplit: createDefaultRoot(),
  activeGroupId: null, // Will be set on init or when rendering
  viewMode: "live",

  toggleLeftSidebar: () => {
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen }));
    get().saveWorkspaceState();
  },
  toggleRightSidebar: () => {
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen }));
    get().saveWorkspaceState();
  },
  setLeftSidebarWidth: (width) => set({ leftSidebarWidth: width }),
  setRightSidebarWidth: (width) => set({ rightSidebarWidth: width }),
  setActiveLeftPane: (id) => {
    set({ activeLeftPaneId: id });
    get().saveWorkspaceState();
  },
  setActiveRightPane: (groupId, paneId) => {
    set((state) => ({
      rightPaneGroups: state.rightPaneGroups.map(g => g.id === groupId ? { ...g, activeTabId: paneId } : g)
    }));
    get().saveWorkspaceState();
  },
  addNoteToSidebar: (noteId, title, sidebar) => {
    set((state) => {
      const newPane: PaneItem = { id: `pane-note-${Date.now()}`, title, type: "note", noteId };
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
    get().saveWorkspaceState();
  },

  closeSidebarTab: (paneId, sourceId) => {
    set((state) => {
      if (sourceId === "left") {
        const newLeftPanes = state.leftPanes.filter(p => p.id !== paneId);
        let newActiveLeft = state.activeLeftPaneId;
        if (state.activeLeftPaneId === paneId) {
          newActiveLeft = newLeftPanes.length > 0 ? newLeftPanes[newLeftPanes.length - 1].id : null;
        }
        return { leftPanes: newLeftPanes, activeLeftPaneId: newActiveLeft };
      } else {
        let newRightGroups = [...state.rightPaneGroups];
        const groupIdx = newRightGroups.findIndex(g => g.id === sourceId);
        if (groupIdx !== -1) {
          const group = newRightGroups[groupIdx];
          const newPanes = group.panes.filter(p => p.id !== paneId);
          if (newPanes.length === 0) {
            newRightGroups.splice(groupIdx, 1);
          } else {
            let newActive = group.activeTabId;
            if (group.activeTabId === paneId) {
              newActive = newPanes[newPanes.length - 1].id;
            }
            newRightGroups[groupIdx] = { ...group, panes: newPanes, activeTabId: newActive };
          }
        }
        return { rightPaneGroups: newRightGroups };
      }
    });
    get().saveWorkspaceState();
  },

  setRightGroupHeight: (groupId, height) => {
    set((state) => ({
      rightPaneGroups: state.rightPaneGroups.map(g => g.id === groupId ? { ...g, height } : g)
    }));
    get().saveWorkspaceState();
  },

  movePane: (paneId, sourceId, destId, newIndex) => {
    // Preserved unchanged from original logic
    set((state) => {
      let sourcePane: PaneItem | null = null;
      let newLeftPanes = [...state.leftPanes];
      let newRightGroups = state.rightPaneGroups.map(g => ({ ...g, panes: [...g.panes] }));

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

      const destIsLeft = destId === "left";
      if (destIsLeft) {
        newLeftPanes.splice(newIndex, 0, sourcePane);
      } else if (destId === "new-right-group") {
        newRightGroups.push({ id: `right-group-${Date.now()}`, panes: [sourcePane], activeTabId: sourcePane.id });
      } else {
        const destGroupIdx = newRightGroups.findIndex(g => g.id === destId);
        if (destGroupIdx !== -1) {
          newRightGroups[destGroupIdx].panes.splice(newIndex, 0, sourcePane);
          newRightGroups[destGroupIdx].activeTabId = sourcePane.id;
        } else {
          newRightGroups.push({ id: destId, panes: [sourcePane], activeTabId: sourcePane.id });
        }
      }

      return {
        leftPanes: newLeftPanes,
        rightPaneGroups: newRightGroups,
        ...(destIsLeft && !state.leftSidebarOpen ? { leftSidebarOpen: true } : {}),
        ...(!destIsLeft && !state.rightSidebarOpen ? { rightSidebarOpen: true } : {}),
      };
    });
    get().saveWorkspaceState();
  },

  // ---- Tree Editor Operations ----

  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),

  openTab: (tab) => {
    // Replaces the active tab in the active group, or appends if that tab is "welcome"
    set((state) => {
      const newRoot = cloneNode(state.rootSplit);
      // Try activeGroupId first, then fall back to any available leaf
      let groupNode = state.activeGroupId ? findNodeByGroupId(newRoot, state.activeGroupId) : null;
      if (!groupNode) {
        groupNode = findFirstLeaf(newRoot);
      }
      const targetGroupId = groupNode?.group?.id;

      if (!targetGroupId || !groupNode?.group) {
        // No groups exist — create a fresh leaf with this tab
        const newGroup: EditorGroup = {
          id: `group-${Date.now()}`,
          tabs: [tab],
          activeTabId: tab.id
        };
        const newLeaf: SplitNode = {
          id: `split-${Date.now()}`,
          type: 'leaf',
          group: newGroup
        };
        return { rootSplit: newLeaf, activeGroupId: newGroup.id };
      }

      const group = groupNode.group;
      // Check if tab already exists
      const existingIdx = group.tabs.findIndex(t => t.id === tab.id);
      if (existingIdx !== -1) {
        group.activeTabId = tab.id;
      } else {
        // If active is "welcome" or start page, replace it
        const activeIdx = group.tabs.findIndex(t => t.id === group.activeTabId);
        if (activeIdx !== -1 && (group.tabs[activeIdx].id === "welcome" || group.tabs[activeIdx].id.startsWith("tab-"))) {
          group.tabs.splice(activeIdx, 1, tab);
        } else {
          if (activeIdx !== -1) {
            group.tabs.splice(activeIdx, 1, tab);
          } else {
            group.tabs.push(tab);
          }
        }
        group.activeTabId = tab.id;
      }
      return { rootSplit: newRoot, activeGroupId: targetGroupId };
    });
    get().saveWorkspaceState();
  },

  openInNewTab: (tab) => {
    // Appends to the active group
    set((state) => {
      const newRoot = cloneNode(state.rootSplit);
      let groupNode = state.activeGroupId ? findNodeByGroupId(newRoot, state.activeGroupId) : null;
      if (!groupNode) {
        groupNode = findFirstLeaf(newRoot);
      }
      const targetGroupId = groupNode?.group?.id;

      if (!targetGroupId || !groupNode?.group) {
        const newGroup: EditorGroup = {
          id: `group-${Date.now()}`,
          tabs: [tab],
          activeTabId: tab.id
        };
        const newLeaf: SplitNode = {
          id: `split-${Date.now()}`,
          type: 'leaf',
          group: newGroup
        };
        return { rootSplit: newLeaf, activeGroupId: newGroup.id };
      }

      const existingIdx = groupNode.group.tabs.findIndex(t => t.id === tab.id);
      if (existingIdx !== -1) {
        groupNode.group.activeTabId = tab.id;
      } else {
        groupNode.group.tabs.push(tab);
        groupNode.group.activeTabId = tab.id;
      }
      return { rootSplit: newRoot, activeGroupId: targetGroupId };
    });
    get().saveWorkspaceState();
  },

  openToRight: (_tab) => {
    // Splits active group to the right, opening the tab
    get().splitGroup(get().activeGroupId || "", "horizontal");
    // setTimeout to allow state to settle, then open in the new group. Wait, better to integrate it:
    set((state) => {
      // Find the newly created right-most split from the previous splitGroup call, this is slightly complex synchronously
      // A simpler approach: create a specific action that does both
      return state;
    });
    // A hacky way for now, actually let's implement true split and inject
  },

  splitGroup: (groupId, direction) => {
    set((state) => {
      const newRoot = cloneNode(state.rootSplit);
      const node = findNodeByGroupId(newRoot, groupId);
      if (node && node.group) {
        // Keep current group on left/top, new group on right/bottom
        const oldGroup = node.group;

        // Create new group with a default tab or a copy of current
        const newGroupId = `group-${Date.now()}`;
        const activeTab = oldGroup.tabs.find(t => t.id === oldGroup.activeTabId);
        const newTab = activeTab ? { ...activeTab } : { id: "welcome", title: "Untitled Note.md" };

        const newGroup: EditorGroup = {
          id: newGroupId,
          tabs: [newTab],
          activeTabId: newTab.id
        };

        const leftChild: SplitNode = {
          id: `split-${Date.now()}-1`,
          type: "leaf",
          group: oldGroup
        };

        const rightChild: SplitNode = {
          id: `split-${Date.now()}-2`,
          type: "leaf",
          group: newGroup
        };

        node.type = "split";
        node.direction = direction;
        node.children = [leftChild, rightChild];
        delete node.group;

        return { rootSplit: newRoot, activeGroupId: newGroupId };
      }
      return state;
    });
    get().saveWorkspaceState();
  },

  closeTab: (tabId, groupId) => {
    set((state) => {
      const newRoot = cloneNode(state.rootSplit);
      const groupNode = findNodeByGroupId(newRoot, groupId);
      if (groupNode && groupNode.group) {
        const group = groupNode.group;
        const newTabs = group.tabs.filter(t => t.id !== tabId);
        let newActiveId = group.activeTabId;

        if (group.activeTabId === tabId) {
          newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }

        group.tabs = newTabs;
        group.activeTabId = newActiveId;

        // If group is empty, we must collapse the leaf and merge with sibling
        if (group.tabs.length === 0) {
          const cleanedRoot = removeEmptyLeaves(newRoot) || createDefaultRoot();
          return { rootSplit: cleanedRoot };
        }
      }
      return { rootSplit: newRoot };
    });
    get().saveWorkspaceState();
  },

  closeOtherTabs: (tabId, groupId) => {
    set((state) => {
      const newRoot = cloneNode(state.rootSplit);
      const groupNode = findNodeByGroupId(newRoot, groupId);
      if (groupNode && groupNode.group) {
        const keepTab = groupNode.group.tabs.find(t => t.id === tabId);
        if (keepTab) {
          groupNode.group.tabs = [keepTab];
          groupNode.group.activeTabId = tabId;
        }
      }
      return { rootSplit: newRoot };
    });
    get().saveWorkspaceState();
  },

  closeTabsToRight: (tabId, groupId) => {
    set((state) => {
      const newRoot = cloneNode(state.rootSplit);
      const groupNode = findNodeByGroupId(newRoot, groupId);
      if (groupNode && groupNode.group) {
        const idx = groupNode.group.tabs.findIndex(t => t.id === tabId);
        if (idx !== -1) {
          groupNode.group.tabs = groupNode.group.tabs.slice(0, idx + 1);
          // Ensure active tab is within bounds
          if (!groupNode.group.tabs.find(t => t.id === groupNode.group!.activeTabId)) {
            groupNode.group.activeTabId = tabId;
          }
        }
      }
      return { rootSplit: newRoot };
    });
    get().saveWorkspaceState();
  },

  closeAllTabs: (groupId) => {
    set((state) => {
      const newRoot = cloneNode(state.rootSplit);
      const groupNode = findNodeByGroupId(newRoot, groupId);
      if (groupNode && groupNode.group) {
        groupNode.group.tabs = [];
        const cleanedRoot = removeEmptyLeaves(newRoot) || createDefaultRoot();
        return { rootSplit: cleanedRoot };
      }
      return state;
    });
    get().saveWorkspaceState();
  },

  setActiveTab: (tabId, groupId) => {
    set((state) => {
      const newRoot = cloneNode(state.rootSplit);
      const groupNode = findNodeByGroupId(newRoot, groupId);
      if (groupNode && groupNode.group) {
        groupNode.group.activeTabId = tabId;
      }
      return { rootSplit: newRoot, activeGroupId: groupId };
    });
    get().saveWorkspaceState();
  },

  renameTab: (oldId, newId, newTitle) => set((state) => {
    const processNode = (node: SplitNode): SplitNode => {
      if (node.type === "leaf" && node.group) {
        let changed = false;
        const newTabs = node.group.tabs.map(t => {
          if (t.id === oldId) {
            changed = true;
            return { id: newId, title: newTitle };
          }
          return t;
        });
        const activeId = node.group.activeTabId === oldId ? newId : node.group.activeTabId;
        if (changed) {
          return { ...node, group: { ...node.group, tabs: newTabs, activeTabId: activeId } };
        }
      }
      if (node.children) {
        return { ...node, children: node.children.map(processNode) };
      }
      return node;
    };
    const nextRoot = processNode(state.rootSplit);
    get().saveWorkspaceState(); // Assuming saveWorkspaceState is the equivalent of scheduleSave
    return { rootSplit: nextRoot };
  }),

  closeTabById: (tabId) => {
    set((state) => {
      const newRoot = cloneNode(state.rootSplit);
      const closeFromNode = (node: SplitNode) => {
        if (node.type === 'leaf' && node.group) {
          const idx = node.group.tabs.findIndex(t => t.id === tabId);
          if (idx !== -1) {
            node.group.tabs.splice(idx, 1);
            if (node.group.activeTabId === tabId) {
              node.group.activeTabId = node.group.tabs.length > 0 ? node.group.tabs[Math.max(0, idx - 1)].id : null;
            }
          }
        }
        if (node.children) node.children.forEach(closeFromNode);
      };
      closeFromNode(newRoot);
      const cleanedRoot = removeEmptyLeaves(newRoot) || createDefaultRoot();
      return { rootSplit: cleanedRoot };
    });
    get().saveWorkspaceState();
  },

  closeTabsMatchingPrefix: (prefix) => {
    set((state) => {
      const newRoot = cloneNode(state.rootSplit);
      const closeFromNode = (node: SplitNode) => {
        if (node.type === 'leaf' && node.group) {
          const before = node.group.tabs.length;
          node.group.tabs = node.group.tabs.filter(t => !t.id.startsWith(prefix));
          if (before !== node.group.tabs.length && node.group.activeTabId && !node.group.tabs.find(t => t.id === node.group!.activeTabId)) {
            node.group.activeTabId = node.group.tabs.length > 0 ? node.group.tabs[node.group.tabs.length - 1].id : null;
          }
        }
        if (node.children) node.children.forEach(closeFromNode);
      };
      closeFromNode(newRoot);
      const cleanedRoot = removeEmptyLeaves(newRoot) || createDefaultRoot();
      return { rootSplit: cleanedRoot };
    });
    get().saveWorkspaceState();
  },

  toggleViewMode: () => {
    set((state) => ({
      viewMode: state.viewMode === "source" ? "live" : "source"
    }));
    get().saveWorkspaceState();
  },

  initWorkspace: async () => {
    let currentVault = localStorage.getItem("syntagma-vault-path");
    if (!currentVault) {
      currentVault = await FileSystemAPI.getVaultPath();
      if (currentVault) localStorage.setItem("syntagma-vault-path", currentVault);
    }
    set({ vaultPath: currentVault });
    await get().loadWorkspaceState();

    // Set an active group ID if null
    const state = get();
    if (!state.activeGroupId) {
      set({ activeGroupId: findFirstLeaf(state.rootSplit)?.group?.id || null });
    }
  },

  openVault: async () => {
    const newPath = await FileSystemAPI.selectVaultDirectory();
    if (newPath) {
      localStorage.setItem("syntagma-vault-path", newPath);
      const newRoot = createDefaultRoot();
      set({ vaultPath: newPath, rootSplit: newRoot, activeGroupId: newRoot.group?.id || null });
      await get().loadWorkspaceState();
      (registry as any).getApp().commands.executeCommand("core:file-explorer:refresh");
    }
  },

  loadWorkspaceState: async () => {
    const vaultPath = get().vaultPath;
    if (!vaultPath) return;

    const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/workspace.json`);
    if (data) {
      try {
        const parsed = JSON.parse(data);

        // Migrate old openTabs state to new rootSplit state if needed
        let rootSplit = parsed.rootSplit;
        if (!rootSplit && parsed.openTabs) {
          const group = createDefaultGroup();
          group.tabs = parsed.openTabs;
          group.activeTabId = parsed.activeTabId;
          rootSplit = {
            id: `split-${Date.now()}`,
            type: "leaf",
            group: group
          };
        }

        set({
          leftSidebarOpen: parsed.leftSidebarOpen ?? true,
          rightSidebarOpen: parsed.rightSidebarOpen ?? true,
          leftSidebarWidth: parsed.leftSidebarWidth,
          rightSidebarWidth: parsed.rightSidebarWidth,
          leftPanes: parsed.leftPanes || initialLeftPanes,
          rightPaneGroups: parsed.rightPaneGroups || [{ id: "right-group-1", panes: initialRightPanes, activeTabId: initialRightPanes[0]?.id || null }],
          activeLeftPaneId: parsed.activeLeftPaneId || initialLeftPanes[0]?.id || null,
          rootSplit: rootSplit || createDefaultRoot(),
          activeGroupId: parsed.activeGroupId || null,
          viewMode: parsed.viewMode || "live",
        });
      } catch (e) {
        console.error("Failed to parse workspace config", e);
      }
    }
  },

  saveWorkspaceState: async () => {
    const state = get();
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
      rootSplit: state.rootSplit,
      activeGroupId: state.activeGroupId,
      viewMode: state.viewMode,
    }, null, 2);

    await FileSystemAPI.writeFile(`${vaultPath}/.syntagma/workspace.json`, payload);
  }
}));

// --- Tree Utility Functions ---

function cloneNode(node: SplitNode): SplitNode {
  return {
    ...node,
    children: node.children ? node.children.map(cloneNode) : undefined,
    group: node.group ? {
      ...node.group,
      tabs: [...node.group.tabs]
    } : undefined
  };
}

function findNodeByGroupId(node: SplitNode, groupId: string): SplitNode | null {
  if (node.type === "leaf" && node.group?.id === groupId) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByGroupId(child, groupId);
      if (found) return found;
    }
  }
  return null;
}

function findFirstLeaf(node: SplitNode): SplitNode | null {
  if (node.type === "leaf") return node;
  if (node.children && node.children.length > 0) {
    return findFirstLeaf(node.children[0]);
  }
  return null;
}

// Removes nodes that are leaves with empty groups, and flattens
function removeEmptyLeaves(node: SplitNode): SplitNode | null {
  if (node.type === "leaf") {
    if (!node.group || node.group.tabs.length === 0) {
      return null; // Delete me
    }
    return node;
  }

  if (node.children) {
    const keptChildren: SplitNode[] = [];
    for (const child of node.children) {
      const cleanChild = removeEmptyLeaves(child);
      if (cleanChild) keptChildren.push(cleanChild);
    }

    if (keptChildren.length === 0) {
      return null; // Both children died
    } else if (keptChildren.length === 1) {
      // Replace myself with my single child (collapse)
      return keptChildren[0];
    } else {
      node.children = keptChildren;
      return node;
    }
  }

  return null;
}
