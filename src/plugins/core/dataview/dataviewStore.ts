import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface DatabaseRow {
    filePath: string;
    fileName: string;
    [frontmatterKey: string]: any; // Dynamic YAML keys
}

export interface DataviewState {
    parseFrontmatter: boolean;

    updateSetting: <K extends keyof DataviewState>(key: K, value: DataviewState[K]) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;

    queryVault: (query?: string) => Promise<DatabaseRow[]>;
}

/**
 * Basic RegExp parser to extract YAML frontmatter from a markdown string.
 * Looks for `---` at the very beginning of the string, and the next `---`.
 */
function extractFrontmatter(markdownContent: string): Record<string, any> {
    const match = markdownContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};

    const yamlBlock = match[1];
    const lines = yamlBlock.split(/\r?\n/);
    const parsed: Record<string, any> = {};

    let currentArrayKey: string | null = null;

    for (const line of lines) {
        // Handle list items
        if (line.trim().startsWith('- ') && currentArrayKey) {
            const val = line.trim().substring(2).trim();
            parsed[currentArrayKey].push(val);
            continue;
        }

        // Handle key-value pairs
        const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
        if (kvMatch) {
            const key = kvMatch[1].trim();
            const value = kvMatch[2].trim();

            if (value === '') {
                // Initialize an array
                currentArrayKey = key;
                parsed[key] = [];
            } else {
                currentArrayKey = null;
                // Basic type coercion
                if (value.toLowerCase() === 'true') parsed[key] = true;
                else if (value.toLowerCase() === 'false') parsed[key] = false;
                else if (!isNaN(Number(value)) && value !== '') parsed[key] = Number(value);
                else {
                    // Remove quotes if present
                    parsed[key] = value.replace(/^["'](.*)["']$/, '$1');
                }
            }
        }
    }

    return parsed;
}

export const useDataviewStore = create<DataviewState>((set, get) => ({
    parseFrontmatter: true,

    queryVault: async (query?: string) => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return [];

        const { parseFrontmatter } = get();
        const results: DatabaseRow[] = [];

        try {
            // First, scan the vault configuration
            // Note: FileSystemAPI currently only has readDir which is not recursive.
            // Using readDirRecursive from the proposed architecture. We need to implement it in fs.ts first, 
            // but for now let's assume FileSystemAPI.readDirRecursive exists or we invoke an IPC.
            // Wait, FileSystemAPI.readDirRecursive does not exist natively yet in this project codebase.
            // Let's implement a recursive scan natively here acting as the engine.
            const allFiles: string[] = [];

            async function scanDir(targetPath: string) {
                const entries = await (window as any).electron.invoke('fs:readDir', targetPath);
                for (const entry of entries) {
                    if (entry.name.startsWith('.')) continue; // skip hidden

                    const fullPath = `${targetPath}/${entry.name}`;
                    if (entry.isDirectory) {
                        await scanDir(fullPath);
                    } else if (entry.name.endsWith('.md')) {
                        allFiles.push(fullPath);
                    }
                }
            }

            await scanDir(vaultPath);

            // Now parse each file
            for (const filePath of allFiles) {
                let includeFile = true;
                const fileTokens = filePath.toLowerCase();
                const qTokens = (query || "").toLowerCase();

                // Simple query filtering: if query contains "folder:", filter by path
                // "tag:#project" filter by frontmatter tags? We will just do a generic text search on the path for now
                if (qTokens) {
                    if (qTokens.startsWith('folder:')) {
                        const folderTarget = qTokens.replace('folder:', '').trim();
                        if (!fileTokens.includes(`/${folderTarget}/`) && !fileTokens.includes(`/${folderTarget}`)) {
                            includeFile = false;
                        }
                    } else if (qTokens.startsWith('name:')) {
                        const nameTarget = qTokens.replace('name:', '').trim();
                        if (!fileTokens.includes(nameTarget)) {
                            includeFile = false;
                        }
                    } else {
                        // Generic path substring search
                        if (!fileTokens.includes(qTokens)) {
                            includeFile = false;
                        }
                    }
                }

                if (includeFile) {
                    const content = await FileSystemAPI.readFile(filePath) || "";
                    let frontmatter: Record<string, any> = {};
                    if (parseFrontmatter) {
                        frontmatter = extractFrontmatter(content);
                    }

                    // To support tag searches specifically inside YAML
                    if (qTokens.startsWith('tag:') && parseFrontmatter) {
                        const targetTag = qTokens.replace('tag:', '').trim().replace(/^#/, '');
                        const fileTags = frontmatter['tags'] || frontmatter['tag'] || [];
                        const normalizedTags = Array.isArray(fileTags) ? fileTags : [fileTags];

                        const hasTag = normalizedTags.some(t => String(t).toLowerCase() === targetTag);
                        if (!hasTag) continue; // Skip if tag query doesn't match
                    }

                    results.push({
                        filePath,
                        fileName: filePath.split('/').pop() || "",
                        ...frontmatter
                    });
                }
            }

        } catch (e) {
            console.error("Dataview vault query failed:", e);
        }

        return results;
    },

    updateSetting: (key, value) => {
        set({ [key]: value } as any);
        useDataviewStore.getState().saveSettings();
    },

    loadSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/dataview.json`);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                set({
                    parseFrontmatter: parsed.parseFrontmatter ?? get().parseFrontmatter,
                });
            } catch (e) {
                console.error("Failed to parse dataview settings", e);
            }
        }
    },

    saveSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const { parseFrontmatter } = get();
        await FileSystemAPI.writeFile(
            `${vaultPath}/.syntagma/dataview.json`,
            JSON.stringify({ parseFrontmatter }, null, 2)
        );
    }
}));
