import { create } from "zustand";

export interface ExplorerSelectionState {
    /** Currently selected file/folder paths */
    selectedPaths: Set<string>;
    /** The last path that was clicked (anchor for shift-select) */
    lastSelectedPath: string | null;
    /** Paths copied via Cmd/Ctrl+C */
    clipboardPaths: string[];
    /** The directory the copy was initiated from */
    clipboardSourceDir: string | null;

    /** Select a single path (clears others) */
    select: (path: string) => void;
    /** Toggle a single path (Cmd/Ctrl+Click) */
    toggle: (path: string) => void;
    /** Range-select from lastSelectedPath to target within a flat list (Shift+Click) */
    rangeSelect: (path: string, flatPaths: string[]) => void;
    /** Select multiple paths (e.g., from marquee) */
    selectMultiple: (paths: string[]) => void;
    /** Clear all selection */
    clearSelection: () => void;
    /** Copy current selection to clipboard */
    copySelection: (sourceDir: string | null) => void;
    /** Check if a path is selected */
    isSelected: (path: string) => boolean;
}

export const useExplorerSelectionStore = create<ExplorerSelectionState>((set, get) => ({
    selectedPaths: new Set<string>(),
    lastSelectedPath: null,
    clipboardPaths: [],
    clipboardSourceDir: null,

    select: (path) => set({
        selectedPaths: new Set([path]),
        lastSelectedPath: path,
    }),

    toggle: (path) => {
        const current = new Set(get().selectedPaths);
        if (current.has(path)) {
            current.delete(path);
        } else {
            current.add(path);
        }
        set({ selectedPaths: current, lastSelectedPath: path });
    },

    rangeSelect: (path, flatPaths) => {
        const { lastSelectedPath } = get();
        if (!lastSelectedPath) {
            set({ selectedPaths: new Set([path]), lastSelectedPath: path });
            return;
        }

        const startIdx = flatPaths.indexOf(lastSelectedPath);
        const endIdx = flatPaths.indexOf(path);

        if (startIdx === -1 || endIdx === -1) {
            set({ selectedPaths: new Set([path]), lastSelectedPath: path });
            return;
        }

        const lo = Math.min(startIdx, endIdx);
        const hi = Math.max(startIdx, endIdx);
        const rangePaths = flatPaths.slice(lo, hi + 1);
        set({ selectedPaths: new Set(rangePaths) });
        // Note: lastSelectedPath stays the same (anchor)
    },

    selectMultiple: (paths) => set({
        selectedPaths: new Set(paths),
        lastSelectedPath: paths.length > 0 ? paths[paths.length - 1] : null,
    }),

    clearSelection: () => set({
        selectedPaths: new Set<string>(),
        lastSelectedPath: null,
    }),

    copySelection: (sourceDir) => {
        const { selectedPaths } = get();
        set({
            clipboardPaths: Array.from(selectedPaths),
            clipboardSourceDir: sourceDir,
        });
    },

    isSelected: (path) => get().selectedPaths.has(path),
}));
