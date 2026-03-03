import { Plugin } from "../../Plugin";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useCalendarStore } from "./calendarStore";
import { CalendarPane } from "./CalendarPane";
import { Calendar } from "lucide-react";

export default class CalendarPlugin extends Plugin {
    id = "core-calendar";
    name = "Calendar";
    version = "1.0.0";
    description = "Visualize daily notes and timelines on a monthly grid.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        // Register the UI View
        this.app.workspace.registerView(this.manifest.id, CalendarPane, Calendar);

        // Whenever a new vault is opened, synchronize our store settings
        useWorkspaceStore.subscribe((state, prevState) => {
            if (state.vaultPath !== prevState.vaultPath && state.vaultPath) {
                useCalendarStore.getState().queryActiveDays();
            }
        });

        // Listen for active file saves/modifications so we can refresh the calendar days
        window.addEventListener('syntagma:reload-active-file', () => {
            useCalendarStore.getState().queryActiveDays();
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
