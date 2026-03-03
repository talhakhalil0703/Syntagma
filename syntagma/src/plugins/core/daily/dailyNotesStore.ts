import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface DailyNotesState {
    folderPath: string; // e.g. "Daily Notes/" (relative to Vault root)
    dateFormat: string; // e.g. "YYYY-MM-DD"
    templatePath: string; // e.g. "Templates/Daily.md" (relative to Vault root)

    updateSetting: <K extends keyof DailyNotesState>(key: K, value: DailyNotesState[K]) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;

    openDailyNote: (targetDate?: Date) => Promise<void>;
}

/**
 * Returns a formatted date string similar to moment.js / day.js
 * Supported tokens: YYYY, MM, DD
 */
function formatDate(format: string, date: Date): string {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return format
        .replace("YYYY", year)
        .replace("MM", month)
        .replace("DD", day);
}

export const useDailyNotesStore = create<DailyNotesState>((set, get) => ({
    folderPath: "Daily/",
    dateFormat: "YYYY-MM-DD",
    templatePath: "",

    openDailyNote: async (targetDate?: Date) => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const { folderPath, dateFormat, templatePath } = get();
        const dateStr = formatDate(dateFormat, targetDate || new Date());

        // Normalize paths
        const normalizedFolder = folderPath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
        const fullDirName = `${vaultPath}${normalizedFolder ? '/' + normalizedFolder : ''}`;
        const fileName = `${dateStr}.md`;
        const fullPath = `${fullDirName}/${fileName}`;

        // 1. Check if the note already exists
        const stat = await FileSystemAPI.stat(fullPath);

        if (!stat) {
            // Note doesn't exist. We need to create it.
            let initialContent = "";

            // Evaluate template
            if (templatePath.trim()) {
                const normalizedTemplate = templatePath.trim().replace(/^\/+/, '');
                const fullTemplatePath = `${vaultPath}/${normalizedTemplate}`;
                const templateStat = await FileSystemAPI.stat(fullTemplatePath);

                if (templateStat && !templateStat.isDirectory) {
                    const templateContent = await FileSystemAPI.readFile(fullTemplatePath);
                    if (templateContent !== null) {
                        // We could run template replacements here if we build out the Templates plugin later
                        initialContent = templateContent.replace(/{{date}}/g, dateStr);
                    }
                }
            }

            // Create Directory if it doesn't exist
            if (normalizedFolder) {
                const dirStat = await FileSystemAPI.stat(fullDirName);
                if (!dirStat) {
                    await FileSystemAPI.mkdir(fullDirName);
                }
            }

            // Write the file
            await FileSystemAPI.writeFile(fullPath, initialContent);
        }

        // 2. Open it in a new tab
        useWorkspaceStore.getState().openTab({
            id: fullPath,
            title: fileName
        });
    },

    updateSetting: (key, value) => {
        set({ [key]: value } as any);
        useDailyNotesStore.getState().saveSettings();
    },

    loadSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/daily.json`);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                set({
                    folderPath: parsed.folderPath ?? get().folderPath,
                    dateFormat: parsed.dateFormat ?? get().dateFormat,
                    templatePath: parsed.templatePath ?? get().templatePath
                });
            } catch (e) {
                console.error("Failed to parse daily notes settings", e);
            }
        }
    },

    saveSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const { folderPath, dateFormat, templatePath } = get();
        await FileSystemAPI.writeFile(
            `${vaultPath}/.syntagma/daily.json`,
            JSON.stringify({ folderPath, dateFormat, templatePath }, null, 2)
        );
    }
}));
