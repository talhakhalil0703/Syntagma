import React from "react";
import { Plugin } from "../../Plugin";
import MermaidSettingTab from "./MermaidSettingTab";
import { useMermaidStore } from "./mermaidStore";

export default class MermaidPlugin extends Plugin {
    id = "core-mermaid";
    name = "Mermaid";
    version = "1.0.0";
    description = "Provides native rendering for mermaid diagrams in code blocks.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        // Load settings
        await useMermaidStore.getState().loadSettings();

        // Register setting tab
        this.addSettingTab({
            name: "Mermaid",
            render: () => React.createElement(MermaidSettingTab)
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
