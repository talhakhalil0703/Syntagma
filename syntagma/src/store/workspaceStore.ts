import { create } from "zustand";

export interface PaneItem {
  id: string;
  title: string;
  pluginId: string; // The origin plugin
}

interface WorkspaceState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftPanes: PaneItem[];
  rightPanes: PaneItem[];

  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;

  movePane: (
    paneId: string,
    sourceSidebar: "left" | "right",
    destSidebar: "left" | "right",
    newIndex: number,
  ) => void;

  // Later we'll hook these up to serialize/deserialize to the vault
  loadWorkspaceState: (state: string) => void;
}

// Initial mock state for UI dev
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
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  leftPanes: initialLeftPanes,
  rightPanes: initialRightPanes,

  toggleLeftSidebar: () =>
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () =>
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),

  movePane: (paneId, source, dest, newIndex) =>
    set((state) => {
      const sourceArray =
        source === "left" ? state.leftPanes : state.rightPanes;
      const paneIndex = sourceArray.findIndex((p) => p.id === paneId);
      if (paneIndex === -1) return state; // Invalid pane

      const pane = sourceArray[paneIndex];

      // Copy arrays
      const newLeft = [...state.leftPanes];
      const newRight = [...state.rightPanes];

      // Remove from source
      if (source === "left") newLeft.splice(paneIndex, 1);
      else newRight.splice(paneIndex, 1);

      // Insert into dest
      if (dest === "left") newLeft.splice(newIndex, 0, pane);
      else newRight.splice(newIndex, 0, pane);

      return {
        leftPanes: newLeft,
        rightPanes: newRight,
        // If dropping into a closed sidebar, auto-open it
        ...(dest === "left" && !state.leftSidebarOpen
          ? { leftSidebarOpen: true }
          : {}),
        ...(dest === "right" && !state.rightSidebarOpen
          ? { rightSidebarOpen: true }
          : {}),
      };
    }),

  loadWorkspaceState: () => {
    /* Will implement real file loading later */
  },
}));
