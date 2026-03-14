import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface BookmarkItem {
    id: string; // The file path
    title: string; // The display name
}

interface BookmarksState {
    bookmarks: BookmarkItem[];
    addBookmark: (path: string, name: string) => void;
    removeBookmark: (path: string) => void;
    isBookmarked: (path: string) => boolean;
    loadBookmarks: () => Promise<void>;
    saveBookmarks: () => Promise<void>;
}

export const useBookmarksStore = create<BookmarksState>((set, get) => ({
    bookmarks: [],

    addBookmark: (path, title) => {
        const { bookmarks, saveBookmarks } = get();
        if (!bookmarks.find(b => b.id === path)) {
            set({ bookmarks: [...bookmarks, { id: path, title }] });
            saveBookmarks();
        }
    },

    removeBookmark: (path) => {
        const { bookmarks, saveBookmarks } = get();
        set({ bookmarks: bookmarks.filter(b => b.id !== path) });
        saveBookmarks();
    },

    isBookmarked: (path) => {
        return !!get().bookmarks.find(b => b.id === path);
    },

    loadBookmarks: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/bookmarks.json`);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    set({ bookmarks: parsed });
                }
            } catch (e) {
                console.error("Failed to parse bookmarks logic", e);
            }
        } else {
            set({ bookmarks: [] });
        }
    },

    saveBookmarks: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const bookmarks = get().bookmarks;
        await FileSystemAPI.writeFile(
            `${vaultPath}/.syntagma/bookmarks.json`,
            JSON.stringify(bookmarks, null, 2)
        );
    }
}));
