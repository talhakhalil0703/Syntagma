import { Plugin, type PluginManifest } from "./Plugin";
import { useWorkspaceStore } from "../store/workspaceStore";

// The Global App Interface passed into every Plugin
export interface App {
    workspace: {
        openTab: (tabId: string, title?: string) => void;
        registerView: (viewId: string, component: React.FC, icon?: any) => void;
        // ... we will expose more safe wrappers here
    };
    commands: {
        addCommand: (cmd: any) => void;
    };
    // ... more apis
}

export class PluginRegistry {
    private plugins: Map<string, Plugin> = new Map();
    private views: Record<string, { component: React.FC; icon?: any }> = {};
    private app: App;

    constructor() {
        // Bind Zustand capabilities into a safe object for plugins
        this.app = {
            workspace: {
                openTab: (tabId, title = "New Note") => {
                    useWorkspaceStore.getState().openTab({ id: tabId, title });
                },
                registerView: (viewId, component, icon) => {
                    this.views[viewId] = { component, icon };
                }
            },
            commands: {
                addCommand: (cmd) => {
                    // Will inject into settingsStore commands list later
                    console.log(`Registered command ${cmd.name}`);
                }
            }
        };
    }

    getView(viewId: string): { component: React.FC; icon?: any } | undefined {
        return this.views[viewId];
    }

    // Load a single plugin
    async loadPlugin(pluginClass: new (app: App, manifest: PluginManifest) => Plugin, manifest: PluginManifest) {
        if (this.plugins.has(manifest.id)) {
            console.warn(`Plugin ${manifest.id} is already loaded.`);
            return;
        }

        try {
            const instance = new pluginClass(this.app, manifest);
            await instance.onload();
            this.plugins.set(manifest.id, instance);
            console.log(`Successfully loaded plugin: ${manifest.name}`);
        } catch (e) {
            console.error(`Failed to load plugin ${manifest.id}`, e);
        }
    }

    // Unload a single plugin
    async unloadPlugin(pluginId: string) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return;

        try {
            await plugin.onunload();
            this.plugins.delete(pluginId);
            console.log(`Successfully unloaded plugin: ${pluginId}`);
        } catch (e) {
            console.error(`Failed to unload plugin ${pluginId}`, e);
        }
    }

    // Unload all (for app shutdown)
    async unloadAll() {
        for (const pluginId of this.plugins.keys()) {
            await this.unloadPlugin(pluginId);
        }
    }
}

// Global Singleton Registry
export const registry = new PluginRegistry();
