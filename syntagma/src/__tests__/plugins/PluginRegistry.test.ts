import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginRegistry } from '../../plugins/PluginRegistry';
import { Plugin, PluginManifest } from '../../plugins/Plugin';
import { App } from '../../plugins/PluginRegistry';

// Mock a simple plugin for testing
class MockPlugin extends Plugin {
    onloadCalled = false;
    onunloadCalled = false;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
    }

    async onload() {
        this.onloadCalled = true;
    }

    async onunload() {
        this.onunloadCalled = true;
    }
}

const mockManifest: PluginManifest = {
    id: 'mock-plugin',
    name: 'Mock Plugin',
    version: '1.0.0',
    description: 'A mock plugin for testing',
    author: 'Test'
};

describe('PluginRegistry', () => {
    let registry: PluginRegistry;

    beforeEach(() => {
        registry = new PluginRegistry();
    });

    it('should load a plugin successfully', async () => {
        await registry.loadPlugin(MockPlugin, mockManifest);
        const plugins = (registry as any).plugins; // Access private map for testing
        expect(plugins.has(mockManifest.id)).toBe(true);

        const instance = plugins.get(mockManifest.id) as MockPlugin;
        expect(instance.onloadCalled).toBe(true);
        expect(instance.app).toBeDefined();
        expect(instance.manifest).toEqual(mockManifest);
    });

    it('should not load the same plugin twice', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        await registry.loadPlugin(MockPlugin, mockManifest);
        await registry.loadPlugin(MockPlugin, mockManifest);

        expect(consoleWarnSpy).toHaveBeenCalledWith(`Plugin ${mockManifest.id} is already loaded.`);
        consoleWarnSpy.mockRestore();
    });

    it('should unload a loaded plugin', async () => {
        await registry.loadPlugin(MockPlugin, mockManifest);

        const plugins = (registry as any).plugins;
        const instance = plugins.get(mockManifest.id) as MockPlugin;

        await registry.unloadPlugin(mockManifest.id);
        expect(instance.onunloadCalled).toBe(true);
        expect(plugins.has(mockManifest.id)).toBe(false);
    });

    it('should safely ignore unloading unknown plugins', async () => {
        // Should not throw
        await registry.unloadPlugin('unknown-plugin');
    });

    it('should unload all plugins', async () => {
        await registry.loadPlugin(MockPlugin, mockManifest);

        const plugins = (registry as any).plugins;
        const instance = plugins.get(mockManifest.id) as MockPlugin;

        await registry.unloadAll();
        expect(instance.onunloadCalled).toBe(true);
        expect(plugins.size).toBe(0);
    });
});
