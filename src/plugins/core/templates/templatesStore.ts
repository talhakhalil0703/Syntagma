import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface TemplatesState {
    templateFolderPath: string; // e.g. "Templates/" (relative to Vault root)
    isSelectorOpen: boolean; // Controls UI visibility

    updateSetting: <K extends keyof TemplatesState>(key: K, value: TemplatesState[K]) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;

    getTemplates: () => Promise<string[]>; // Returns list of template file names
    applyTemplateAndInsert: (templateName: string) => Promise<void>; // Compiles template and inserts into active editor

    openSelector: () => void;
    closeSelector: () => void;
}

/**
 * Basic formatting utility for timestamps
 */
function formatDate(format: string, date: Date): string {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return format
        .replace("YYYY", year)
        .replace("MM", month)
        .replace("DD", day)
        .replace("HH", hours)
        .replace("mm", minutes)
        .replace("ss", seconds);
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
    templateFolderPath: "Templates/",
    isSelectorOpen: false,

    openSelector: () => set({ isSelectorOpen: true }),
    closeSelector: () => set({ isSelectorOpen: false }),

    getTemplates: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return [];

        const folderPath = get().templateFolderPath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
        const fullDirName = `${vaultPath}${folderPath ? '/' + folderPath : ''}`;

        try {
            const files = await FileSystemAPI.readDir(fullDirName);
            // Return only Markdown files
            return files.filter(f => !f.isDirectory && f.name.endsWith('.md')).map(f => f.name);
        } catch (e) {
            console.error("Failed to read templates directory", e);
            return [];
        }
    },

    applyTemplateAndInsert: async (templateName: string) => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        const workspaceStore = useWorkspaceStore.getState();
        let activeTabId = null;
        if (workspaceStore.activeGroupId) {
            const findGroup = (node: any): any => {
                if (node.type === "leaf" && node.group?.id === workspaceStore.activeGroupId) return node.group;
                if (node.children) {
                    for (const child of node.children) {
                        const found = findGroup(child);
                        if (found) return found;
                    }
                }
                return null;
            };
            const group = findGroup(workspaceStore.rootSplit);
            if (group) activeTabId = group.activeTabId;
        }

        if (!vaultPath || !activeTabId || activeTabId === "welcome" || activeTabId.startsWith("tab-")) {
            console.warn("No valid active file to insert template into.");
            return;
        }

        const folderPath = get().templateFolderPath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
        const fullTemplatePath = `${vaultPath}${folderPath ? '/' + folderPath : ''}/${templateName}`;

        try {
            let templateContent = await FileSystemAPI.readFile(fullTemplatePath);
            if (templateContent === null) return;

            const now = new Date();
            const dateStr = formatDate("YYYY-MM-DD", now);
            const timeStr = formatDate("HH:mm", now);

            // Extract the title of the current file from activeTabId (which is the full path)
            const activeFileName = activeTabId.split('/').pop() || "";
            const titleStr = activeFileName.replace(/\.md$/, "");

            // Apply variable replacements
            templateContent = templateContent
                .replace(/{{date}}/g, dateStr)
                .replace(/{{time}}/g, timeStr)
                .replace(/{{title}}/g, titleStr);

            // Read the current file content
            const currentContent = await FileSystemAPI.readFile(activeTabId) || "";

            // Insert template at the bottom (or we could prepend, let's append for now if the file isn't empty)
            const newContent = currentContent.trim()
                ? `${currentContent}\n\n${templateContent}`
                : templateContent;

            // Write back to the current file
            await FileSystemAPI.writeFile(activeTabId, newContent);

            // Note: The UI Editor binds to FileSystemAPI polling/load, but wait, 
            // App.tsx relies on activeTabId change to refresh, it doesn't poll.
            // Oh, wait, the user is currently editing. If we overwrite the file, the App's `fileContent` state won't update immediately unless we signal it.
            // To be completely safe and avoid race conditions with App.tsx's 1000ms debounce save,
            // we should ideally update the file on disk and force a reload, but wait. App.tsx watches activeTabId.
            // Let's just update the file on disk and let the user switch tabs to refresh for now if needed, or we can dispatch a custom event.
            // Actually, we can dispatch a 'file-modified-externally' event, but let's stick to the disk write for the prototype.
            // A better way would be to expose a way to mutate the active editor content, but writing to disk works for now.
            // The user will see it when they reopen the file. Wait, that's poor UX.
            // Let's dispatch a custom window event that App.tsx can listen to.
            window.dispatchEvent(new CustomEvent('syntagma:reload-active-file'));

        } catch (e) {
            console.error("Failed to apply template", e);
        }
    },

    updateSetting: (key, value) => {
        set({ [key]: value } as any);
        useTemplatesStore.getState().saveSettings();
    },

    loadSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/templates.json`);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                set({
                    templateFolderPath: parsed.templateFolderPath ?? get().templateFolderPath,
                });
            } catch (e) {
                console.error("Failed to parse templates settings", e);
            }
        }
    },

    saveSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const { templateFolderPath } = get();
        await FileSystemAPI.writeFile(
            `${vaultPath}/.syntagma/templates.json`,
            JSON.stringify({ templateFolderPath }, null, 2)
        );
    }
}));
