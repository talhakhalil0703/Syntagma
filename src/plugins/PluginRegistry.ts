import { Plugin, type PluginManifest } from "./Plugin";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useSettingsStore, type SettingTab, type Command } from "../store/settingsStore";

// The Global App Interface passed into every Plugin
export interface App {
    workspace: {
        openTab: (tabId: string, title?: string) => void;
        registerView: (viewId: string, component: React.FC, icon?: any) => void;
        registerSettingTab: (tab: SettingTab) => void;
    };
    commands: {
        addCommand: (cmd: Command) => void;
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
                },
                registerSettingTab: (tab) => {
                    useSettingsStore.getState().registerSettingTab(tab);
                }
            },
            commands: {
                addCommand: (cmd) => {
                    useSettingsStore.getState().registerCommand(cmd);
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
            // Silently skip — this happens during React StrictMode double-mount
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
        // In development, React StrictMode unmounts/remounts rapidly.
        // We defer the actual unload so that if a remount happens immediately,
        // we cancel the unload and keep plugins alive.
        if (this._unloadTimer) clearTimeout(this._unloadTimer);
        this._unloadTimer = setTimeout(async () => {
            for (const pluginId of this.plugins.keys()) {
                await this.unloadPlugin(pluginId);
            }
        }, 200) as unknown as number;
    }

    private _unloadTimer: number | null = null;

    // Cancel a pending unload (called before loading)
    cancelPendingUnload() {
        if (this._unloadTimer) {
            clearTimeout(this._unloadTimer);
            this._unloadTimer = null;
        }
    }
}

// Global Singleton Registry
export const registry = new PluginRegistry();
