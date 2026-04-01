import React from "react";
import { Plugin } from "../../Plugin";
import { useTableStore } from "./tableStore";
import TableSettingTab from "./TableSettingTab";

export default class TablePlugin extends Plugin {
    id = "core-table";
    name = "Table";
    version = "1.0.0";
    description = "Provides interactive tables with sorting, filtering, and row/column manipulation.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        // Load settings
        await useTableStore.getState().loadSettings();

        // Register setting tab
        this.addSettingTab({
            name: "Table",
            render: () => React.createElement(TableSettingTab)
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
