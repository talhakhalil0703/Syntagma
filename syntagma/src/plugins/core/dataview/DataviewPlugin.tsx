import { Plugin } from "../../Plugin";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useDataviewStore } from "./dataviewStore";
import { Database } from "lucide-react";
import { DataviewPane } from "./DataviewPane";

export default class DataviewPlugin extends Plugin {
    id = "core-dataview";
    name = "Databases (Dataview)";
    version = "1.0.0";
    description = "Query your vault's Markdown frontmatter into dynamic tables.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        // Whenever a new vault is opened, synchronize our store settings
        useWorkspaceStore.subscribe((state, prevState) => {
            if (state.vaultPath !== prevState.vaultPath && state.vaultPath) {
                useDataviewStore.getState().loadSettings();
            }
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
