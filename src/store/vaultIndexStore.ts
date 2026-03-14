import { create } from "zustand";
import { FileSystemAPI, type DirEntry } from "../utils/fs";

interface VaultIndexState {
    files: DirEntry[];
    fileMap: Map<string, string[]>;
    isIndexing: boolean;
    buildIndex: (vaultPath: string) => Promise<void>;
    resolveShortestPath: (linkText: string) => string | null;
    updateWikilinks: (oldName: string, newName: string) => Promise<void>;
}

export const useVaultIndexStore = create<VaultIndexState>((set, get) => ({
    files: [],
    fileMap: new Map(),
    isIndexing: false,

    buildIndex: async (vaultPath: string) => {
        if (!vaultPath) return;
        set({ isIndexing: true });

        try {
            const allFiles = await FileSystemAPI.readDirRecursive(vaultPath);
            // Filter out hidden files (e.g. .git, .syntagma, .DS_Store)
            const visibleFiles = allFiles.filter(f => !f.name.startsWith('.'));

            // Build an O(1) lookup map of lowercased filename -> array of matching absolute paths
            const map = new Map<string, string[]>();
            for (const f of visibleFiles) {
                const lowerName = f.name.toLowerCase();
                if (!map.has(lowerName)) {
                    map.set(lowerName, []);
                }
                map.get(lowerName)!.push(f.path);
            }

            set({ files: visibleFiles, fileMap: map, isIndexing: false });
        } catch (error) {
            console.error("Failed to build vault index:", error);
            set({ isIndexing: false });
        }
    },

    resolveShortestPath: (linkText: string): string | null => {
        const { files, fileMap } = get();
        if (!linkText || fileMap.size === 0) return null;

        // 1. Exact match (linkText is already a full relative path)
        const exactMatch = files.find(f => f.path === linkText || f.path === `${linkText}.md`);
        if (exactMatch) return exactMatch.path;

        // 2. Filename match anywhere in the vault (O(1) via Map)
        const targetName = linkText.toLowerCase();
        const targetNameMd = `${targetName}.md`;

        const exactMatches = fileMap.get(targetName) || [];
        const mdMatches = fileMap.get(targetNameMd) || [];
        
        const allMatches = [...exactMatches, ...mdMatches];

        if (allMatches.length === 0) return null;

        // If multiple files have the same name, Obsidian uses the one with the shortest path
        if (allMatches.length > 1) {
            allMatches.sort((a, b) => a.length - b.length);
        }

        return allMatches[0];
    },

    updateWikilinks: async (oldName: string, newName: string) => {
        const { files } = get();
        const mdFiles = files.filter(f => !f.isDirectory && f.name.endsWith('.md'));

        // Escape for regex, avoiding issues with special chars
        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const oldEscaped = escapeRegExp(oldName);

        // Match exact `[[oldName]]` or `[[oldName|alias]]`
        const linkRegex = new RegExp(`\\[\\[${oldEscaped}(\\|.*?)?\\]\\]`, 'g');

        const updates = mdFiles.map(async file => {
            try {
                const content = await FileSystemAPI.readFile(file.path);
                if (content && linkRegex.test(content)) {
                    // Do string replacement
                    const newContent = content.replace(linkRegex, `[[${newName}$1]]`);
                    await FileSystemAPI.writeFile(file.path, newContent);
                    return true;
                }
            } catch (e) {
                console.error(`Failed to update wikilink in ${file.path}`, e);
            }
            return false;
        });

        await Promise.all(updates);
    }
}));
