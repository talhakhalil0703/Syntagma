import { Plugin } from "../../Plugin";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export default class BrowserPlugin extends Plugin {
    id = "core-browser";
    name = "Web Browser";
    version = "1.0.0";
    description = "Opens a native embedded Web Browser tab inside your workspace for quick internet research without context switching.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        this.addCommand({
            id: 'open-web-browser',
            name: 'Web Browser: Open New Tab',
            callback: () => {
                useWorkspaceStore.getState().openTab({
                    id: `browser-${Date.now()}`,
                    title: "DuckDuckGo"
                });
            }
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
