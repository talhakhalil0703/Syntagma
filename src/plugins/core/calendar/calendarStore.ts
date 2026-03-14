import { create } from "zustand";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useDailyNotesStore } from "../daily/dailyNotesStore";
import { FileSystemAPI } from "../../../utils/fs";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export interface CalendarState {
    currentDate: dayjs.Dayjs; // The month currently being viewed in the UI
    activeDays: Set<string>; // Set of "YYYY-MM-DD" strings that have a daily note
    isLoading: boolean;

    nextMonth: () => void;
    prevMonth: () => void;
    resetToToday: () => void;
    queryActiveDays: () => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
    currentDate: dayjs(),
    activeDays: new Set(),
    isLoading: false,

    nextMonth: () => {
        set((state) => ({ currentDate: state.currentDate.add(1, 'month') }));
        get().queryActiveDays();
    },

    prevMonth: () => {
        set((state) => ({ currentDate: state.currentDate.subtract(1, 'month') }));
        get().queryActiveDays();
    },

    resetToToday: () => {
        set({ currentDate: dayjs() });
        get().queryActiveDays();
    },

    queryActiveDays: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        const { folderPath, dateFormat } = useDailyNotesStore.getState();

        if (!vaultPath) return;

        set({ isLoading: true });

        try {
            // Strip trailing slash if present
            const cleanFolder = folderPath.replace(/\/$/, "");
            const targetPath = cleanFolder ? `${vaultPath}/${cleanFolder}` : vaultPath;

            // Use recursive scan so nested folder structures (e.g. YYYY/MM/YYYY-MM-DD) are found
            const entries = await FileSystemAPI.readDirRecursive(targetPath);
            const newActive = new Set<string>();

            for (const entry of entries) {
                if (!entry.isDirectory && entry.name.endsWith('.md')) {
                    const baseName = entry.name.replace('.md', '');

                    // When dateFormat contains "/" (e.g. "MMMM/YYYY-MM-DD"), the FS splits
                    // those into subdirectories. The filename only contains the last segment,
                    // so we parse using just that portion of the format.
                    const formatParts = dateFormat.split('/');
                    const fileNameFormat = formatParts[formatParts.length - 1];

                    // customParseFormat plugin enables strict format-string parsing
                    const parsed = dayjs(baseName, fileNameFormat, true);

                    if (parsed.isValid()) {
                        newActive.add(parsed.format('YYYY-MM-DD'));
                    }
                }
            }

            set({ activeDays: newActive, isLoading: false });

        } catch (e) {
            // Folder might not exist yet, which is fine
            console.log("Calendar scan info: Could not read daily notes directory. It may not exist yet.");
            set({ activeDays: new Set(), isLoading: false });
        }
    }
}));
