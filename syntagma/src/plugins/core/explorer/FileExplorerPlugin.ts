import { Plugin, type PluginManifest } from "../../Plugin";
import type { App } from "../../PluginRegistry";
import { FileExplorerView } from "./FileExplorerView";
import { Files } from "lucide-react";

const EXPLORER_MANIFEST: PluginManifest = {
    id: "core-file-explorer",
    name: "File Explorer",
    version: "1.0.0",
    description: "Browse folders and files in your vault.",
    author: "Syntagma Core"
};

export default class FileExplorerPlugin extends Plugin {
    constructor(app: App, _manifest: PluginManifest) {
        super(app, EXPLORER_MANIFEST);
    }

    async onload() {
        console.log(`Loading plugin: ${this.manifest.name}`);

        // Test: Register a global command palette shortcut
        this.app.commands.addCommand({
            id: "file-explorer:new-file",
            name: "Create new note",
            pluginId: this.manifest.id,
            callback: () => {
                console.log("File Explorer: creating new file...");
                this.app.workspace.openTab(`note-${Date.now()}`, "Untitled Note.md");
            }
        });

        // Test: Add an icon to the Activity Ribbon (will mock this for now)
        console.log("File Explorer: Registered Ribbon Icon");

        // Register the React View that renders the sidebar tree
        this.app.workspace.registerView(this.manifest.id, FileExplorerView, Files);
        console.log("File Explorer: Registered pane view");
    }

    async onunload() {
        console.log(`Unloading plugin: ${this.manifest.name}`);
        // Cleanup commands, views, event listeners
    }
}
