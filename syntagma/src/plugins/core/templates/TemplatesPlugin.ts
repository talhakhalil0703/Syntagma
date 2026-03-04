import React from 'react';
import { Plugin } from "../../Plugin";
import { useTemplatesStore } from "./templatesStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { TemplatesSettingTab } from "./TemplatesSettingTab";

export default class TemplatesPlugin extends Plugin {
    id = "core-templates";
    name = "Templates";
    version = "1.0.0";
    description = "Insert template snippets with dynamic date and title variables.";
    author = "Syntagma Core";

    async onload() {
        console.log(`Loading plugin: ${this.manifest.name}`);

        await useTemplatesStore.getState().loadSettings();

        // Register Settings UI
        this.addSettingTab({
            name: "Templates",
            render: () => React.createElement(TemplatesSettingTab)
        });

        // Register the global Command Palette action
        this.addCommand({
            id: "templates:insert",
            name: "Templates: Insert Template",
            callback: () => {
                useTemplatesStore.getState().openSelector();
            }
        });

        // Whenever a new vault is opened, synchronize our store settings
        useWorkspaceStore.subscribe((state, prevState) => {
            if (state.vaultPath !== prevState.vaultPath && state.vaultPath) {
                useTemplatesStore.getState().loadSettings();
            }
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
