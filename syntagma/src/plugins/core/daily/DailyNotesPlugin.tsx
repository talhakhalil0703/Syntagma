import { Plugin } from "../../Plugin";
import { useDailyNotesStore } from "./dailyNotesStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export default class DailyNotesPlugin extends Plugin {
    id = "core-daily-notes";
    name = "Daily Notes";
    version = "1.0.0";
    description = "Create and jump to today's daily journal/note.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        // Register the global Command Palette action
        this.app.commands.addCommand({
            id: "daily-notes:open",
            name: "Daily Notes: Open today's note",
            pluginId: this.manifest.id,
            callback: () => {
                useDailyNotesStore.getState().openDailyNote();
            }
        });

        // Whenever a new vault is opened, synchronize our store settings
        useWorkspaceStore.subscribe((state, prevState) => {
            if (state.vaultPath !== prevState.vaultPath && state.vaultPath) {
                useDailyNotesStore.getState().loadSettings();
            }
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
