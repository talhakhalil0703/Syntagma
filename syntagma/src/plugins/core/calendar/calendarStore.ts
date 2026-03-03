import { create } from "zustand";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useDailyNotesStore } from "../daily/dailyNotesStore";
import dayjs from "dayjs";

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

            const entries = await (window as any).electron.invoke('fs:readDir', targetPath);
            const newActive = new Set<string>();

            for (const entry of entries) {
                if (!entry.isDirectory && entry.name.endsWith('.md')) {
                    const baseName = entry.name.replace('.md', '');

                    // Attempt to parse the filename back into a standard YYYY-MM-DD
                    // dayjs handles many formats natively if it matches what DailyNotes output
                    const parsed = dayjs(baseName, dateFormat);

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
