import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import dayjs from "dayjs";

export interface DailyNotesState {
    folderPath: string; // e.g. "Daily Notes/" (relative to Vault root)
    dateFormat: string; // e.g. "YYYY-MM-DD"
    templatePath: string; // e.g. "Templates/Daily.md" (relative to Vault root)

    updateSetting: <K extends keyof DailyNotesState>(key: K, value: DailyNotesState[K]) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;

    openDailyNote: (targetDate?: Date) => Promise<void>;
}



export const useDailyNotesStore = create<DailyNotesState>((set, get) => ({
    folderPath: "Daily/",
    dateFormat: "YYYY-MM-DD",
    templatePath: "",

    openDailyNote: async (targetDate?: Date) => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const { folderPath, dateFormat, templatePath } = get();
        // Use dayjs formatter — dateFormat uses dayjs-style tokens (YYYY-MM-DD)
        const dateStr = dayjs(targetDate || new Date()).format(dateFormat);

        // Normalize paths
        const normalizedFolder = folderPath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
        const baseDir = `${vaultPath}${normalizedFolder ? '/' + normalizedFolder : ''}`;

        // Handle dates with slashes (subdirectories)
        const dateParts = dateStr.split("/");
        const fileName = `${dateParts.pop()}.md`;

        const fullDirName = dateParts.length > 0 ? `${baseDir}/${dateParts.join("/")}` : baseDir;
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
            if (fullDirName !== vaultPath) {
                const dirStat = await FileSystemAPI.stat(fullDirName);
                if (!dirStat) {
                    await FileSystemAPI.mkdir(fullDirName);
                }
            }

            // Write the file
            await FileSystemAPI.writeFile(fullPath, initialContent);

            // Notify calendar to refresh its active days
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('syntagma:reload-active-file'));
            }
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
