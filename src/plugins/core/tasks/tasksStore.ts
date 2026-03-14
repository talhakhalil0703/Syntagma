import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface TaskItem {
    id: string; // Unique identifier (typically filePath + lineNumber)
    filePath: string;
    fileName: string;
    lineNumber: number; // 0-indexed line number in the original file
    content: string; // The text of the task itself
    completed: boolean;
    dueDate?: string; // Optional extracted e.g. YYYY-MM-DD
}

export interface TasksState {
    showCompleted: boolean;
    groupByFile: boolean;

    tasks: TaskItem[];
    isLoading: boolean;

    updateSetting: <K extends keyof TasksState>(key: K, value: TasksState[K]) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;

    queryTasks: () => Promise<void>;
    toggleTask: (task: TaskItem) => Promise<void>;
}

// Regex to match markdown tasks.
// Matches optional whitespace, a dash or asterisk, optional whitespace, [ ] or [x], and the rest of the line.
// Group 1: Leading whitespace and bullet (e.g. "  - ")
// Group 2: The checkbox char (" " or "x" or "X")
// Group 3: The task text
const TASK_REGEX = /^(\s*[-*]\s+)\[([ xX])\]\s+(.*)/;

export const useTasksStore = create<TasksState>((set, get) => ({
    showCompleted: false,
    groupByFile: true,
    tasks: [],
    isLoading: false,

    queryTasks: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        set({ isLoading: true });
        const allTasks: TaskItem[] = [];

        try {
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

            for (const filePath of allFiles) {
                const content = await FileSystemAPI.readFile(filePath);
                if (!content) continue;

                const lines = content.split(/\r?\n/);
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const match = line.match(TASK_REGEX);

                    if (match) {
                        const isCompleted = match[2].toLowerCase() === 'x';
                        const text = match[3];

                        // Attempt to extract due dates (e.g., due:2023-11-05 or @due(2023-11-05))
                        let dueDate: string | undefined = undefined;
                        const dueMatch = text.match(/(?:due:|@due\()(\d{4}-\d{2}-\d{2})\)?/i);
                        if (dueMatch) {
                            dueDate = dueMatch[1];
                        }

                        allTasks.push({
                            id: `${filePath}:${i}`,
                            filePath,
                            fileName: filePath.split('/').pop() || "",
                            lineNumber: i,
                            content: text,
                            completed: isCompleted,
                            dueDate
                        });
                    }
                }
            }

            set({ tasks: allTasks, isLoading: false });

        } catch (e) {
            console.error("Task extraction failed:", e);
            set({ isLoading: false });
        }
    },

    toggleTask: async (task: TaskItem) => {
        try {
            const content = await FileSystemAPI.readFile(task.filePath);
            if (!content) return;

            const lines = content.split(/\r?\n/);
            if (task.lineNumber >= lines.length) return; // safety check

            const line = lines[task.lineNumber];
            const match = line.match(TASK_REGEX);

            if (match) {
                const prefix = match[1];
                const newBox = task.completed ? "[ ]" : "[x]";
                const text = match[3];

                // Reconstruct the line
                lines[task.lineNumber] = `${prefix}${newBox} ${text}`;

                // Write back to disk
                await FileSystemAPI.writeFile(task.filePath, lines.join('\n'));

                // Note: To be completely robust, we should handle if the activeEditor is currently editing this line.
                // For this implementation, writing to disk acts as the source of truth.
                // If the user has it open, they might overwrite it, but we can dispatch a reload event.
                window.dispatchEvent(new CustomEvent('syntagma:reload-active-file'));

                // Optimistically update local store state
                const currentTasks = get().tasks;
                const updatedTasks = currentTasks.map(t =>
                    t.id === task.id ? { ...t, completed: !task.completed } : t
                );

                set({ tasks: updatedTasks });
            }
        } catch (e) {
            console.error("Failed to toggle task on disk", e);
        }
    },

    updateSetting: (key, value) => {
        set({ [key]: value } as any);
        useTasksStore.getState().saveSettings();
    },

    loadSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/tasks.json`);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                set({
                    showCompleted: parsed.showCompleted ?? get().showCompleted,
                    groupByFile: parsed.groupByFile ?? get().groupByFile,
                });
            } catch (e) {
                console.error("Failed to parse tasks settings", e);
            }
        }
    },

    saveSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const { showCompleted, groupByFile } = get();
        await FileSystemAPI.writeFile(
            `${vaultPath}/.syntagma/tasks.json`,
            JSON.stringify({ showCompleted, groupByFile }, null, 2)
        );
    }
}));
