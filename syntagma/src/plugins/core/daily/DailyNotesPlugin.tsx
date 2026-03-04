import React from 'react';
import { Plugin } from "../../Plugin";
import { format } from "date-fns";
import { useDailyNotesStore } from "./dailyNotesStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { DailyNotesSettingTab } from "./DailyNotesSettingTab";

export default class DailyNotesPlugin extends Plugin {
    id = "core-daily-notes";
    name = "Daily Notes";
    version = "1.0.0";
    description = "Create and jump to today's daily journal/note.";
    author = "Syntagma Core";

    async onload() {
        console.log(`Loading plugin: ${this.manifest.name} `);

        await useDailyNotesStore.getState().loadSettings();

        // Register Settings UI
        this.addSettingTab({
            name: "Daily Notes",
            render: () => React.createElement(DailyNotesSettingTab)
        });

        // Register the global Command Palette action
        this.addCommand({
            id: "daily:open-today",
            name: "Daily Notes: Open today's note",
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
        console.log(`Unloading plugin: ${this.manifest.name} `);
    }
}
