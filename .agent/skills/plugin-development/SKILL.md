---
name: Plugin Development
description: Instructions for creating new plugins, adding settings, and managing storage in the SecondBrainEditor.
---

# Plugin Development Guide

This guide outlines the standard patterns for extending the editor with new features using the plugin system.

## 1. Plugin Structure

Each plugin should reside in its own directory under `src/plugins/core/` (if it's a core feature) or a similar location.

A standard plugin consists of:
- `PluginNamePlugin.ts`: The main plugin class.
- `pluginNameStore.ts`: A Zustand store for settings and state.
- `PluginNameSettingTab.tsx`: The settings UI component.
- `PluginNameView.tsx`: The main UI component (if applicable).
- `PluginName.css`: Styles for the plugin.

## 2. The Plugin Class

Extend the `Plugin` base class and implement `onload`.

```typescript
import { Plugin } from "../../Plugin";
import { usePluginStore } from "./pluginStore";
import PluginSettingTab from "./PluginSettingTab";

export default class MyPlugin extends Plugin {
    id = "my-plugin-id";
    name = "My Plugin Name";
    // ... metadata

    async onload(): Promise<void> {
        // 1. Initialize settings
        await usePluginStore.getState().loadSettings();

        // 2. Register settings tab
        this.addSettingTab({
            name: this.name,
            render: () => React.createElement(PluginSettingTab)
        });

        // 3. Add commands or register views
        this.addCommand({
            id: "my-command",
            name: "Run My Command",
            callback: () => { /* ... */ }
        });
    }
}
```

## 3. Settings and Storage (Zustand)

Use Zustand for persistent settings. Save them to `.syntagma/plugin-id.json` in the vault.

```typescript
import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface MyPluginState {
    enabled: boolean;
    updateSetting: (key: string, value: any) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}

export const useMyPluginStore = create<MyPluginState>((set, get) => ({
    enabled: true,
    updateSetting: (key, value) => {
        set({ [key]: value });
        get().saveSettings();
    },
    loadSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/my-plugin.json`);
        if (data) set(JSON.parse(data));
    },
    saveSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        await FileSystemAPI.writeFile(
            `${vaultPath}/.syntagma/my-plugin.json`,
            JSON.stringify(get(), null, 2)
        );
    }
}));
```

## 4. Settings UI

Use `SettingItem` and `SettingToggle` for a consistent look.

```tsx
import { SettingItem, SettingToggle } from "../../../components/ui/SettingsUI";
import { useMyPluginStore } from "./pluginStore";

export default function MyPluginSettingTab() {
    const { enabled, updateSetting } = useMyPluginStore();
    return (
        <SettingItem
            name="Enable My Feature"
            description="Toggle this feature on or off."
            control={
                <SettingToggle
                    value={enabled}
                    onChange={(v) => updateSetting("enabled", v)}
                />
            }
        />
    );
}
```

## 5. Integrating with CodeMirror

If your plugin interacts with the editor, use CodeMirror extensions. You may need to register them in `Editor.tsx` or `LivePreviewExtension.ts`.
