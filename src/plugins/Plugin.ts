import type { App } from "./PluginRegistry";

export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
}

export abstract class Plugin {
    manifest: PluginManifest;

    // App APIs injected by the Registry
    app: App;

    constructor(app: App, manifest: PluginManifest) {
        this.app = app;
        this.manifest = manifest;
    }

    // Lifecycle Methods
    async onload(): Promise<void> {
        // Override in plugins
    }

    async onunload(): Promise<void> {
        // Override in plugins
    }

    // Helper APIs for Plugins
    addCommand(command: { id: string, name: string, defaultHotkey?: string, callback: () => void }) {
        this.app.commands.addCommand({
            ...command,
            pluginId: this.manifest.id
        });
    }

    addSettingTab(tab: { name: string, render: () => React.ReactNode }) {
        this.app.workspace.registerSettingTab({
            id: `tab-${this.manifest.id}`,
            name: tab.name,
            pluginId: this.manifest.id,
            render: tab.render
        });
    }

    addRibbonIcon(_iconId: string, _title: string, _callback: () => void) {
        // Interface to add icon to the Left Activity Ribbon
    }

    registerView(_viewId: string, _viewCreator: () => any, _icon?: any) {
        // Interface to register custom React Components for Sidebars or Editors
    }
}
