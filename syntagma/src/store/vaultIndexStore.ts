import { create } from "zustand";
import { FileSystemAPI, type DirEntry } from "../utils/fs";

interface VaultIndexState {
    files: DirEntry[];
    isIndexing: boolean;
    buildIndex: (vaultPath: string) => Promise<void>;
    resolveShortestPath: (linkText: string) => string | null;
}

export const useVaultIndexStore = create<VaultIndexState>((set, get) => ({
    files: [],
    isIndexing: false,

    buildIndex: async (vaultPath: string) => {
        if (!vaultPath) return;
        set({ isIndexing: true });

        try {
            const allFiles = await FileSystemAPI.readDirRecursive(vaultPath);
            // Filter out hidden files (e.g. .git, .syntagma, .DS_Store)
            const visibleFiles = allFiles.filter(f => !f.name.startsWith('.'));

            set({ files: visibleFiles, isIndexing: false });
        } catch (error) {
            console.error("Failed to build vault index:", error);
            set({ isIndexing: false });
        }
    },

    resolveShortestPath: (linkText: string): string | null => {
        const { files } = get();
        if (!linkText || files.length === 0) return null;

        // 1. Exact match (linkText is already a full relative path)
        const exactMatch = files.find(f => f.path === linkText || f.path === `${linkText}.md`);
        if (exactMatch) return exactMatch.path;

        // 2. Filename match anywhere in the vault
        // To match Obsidian, we look for notes ending in .md or exact name if it's an attachment
        const targetName = linkText.toLowerCase();
        const targetNameMd = `${targetName}.md`;

        // Find all files that match the requested name (either exactly or with .md appended)
        const matches = files.filter(f => {
            const fileNameLower = f.name.toLowerCase();
            return fileNameLower === targetName || fileNameLower === targetNameMd;
        });

        if (matches.length === 0) return null;

        // If multiple files have the same name, Obsidian uses the one with the shortest path
        if (matches.length > 1) {
            matches.sort((a, b) => a.path.length - b.path.length);
        }

        return matches[0].path;
    }
}));
