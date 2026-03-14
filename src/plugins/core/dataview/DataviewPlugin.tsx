import { Plugin } from "../../Plugin";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useDataviewStore } from "./dataviewStore";
import { DataviewPane } from "./DataviewPane";
import { DataviewSettingTab } from "./DataviewSettingTab";
import { Database } from "lucide-react";

export default class DataviewPlugin extends Plugin {
    id = "core-dataview";
    name = "Databases (Dataview)";
    version = "1.0.0";
    description = "Query your vault's Markdown frontmatter into dynamic tables.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name} `);

        await useDataviewStore.getState().loadSettings();

        // Register Settings UI
        this.addSettingTab({
            name: "Dataview",
            render: () => <DataviewSettingTab />
        });

        // Register the UI View
        this.app.workspace.registerView(this.manifest.id, DataviewPane, Database);

        // Whenever a new vault is opened, synchronize our store settings
        useWorkspaceStore.subscribe((state, prevState) => {
            if (state.vaultPath !== prevState.vaultPath && state.vaultPath) {
                useDataviewStore.getState().loadSettings();
            }
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name} `);
    }
}
