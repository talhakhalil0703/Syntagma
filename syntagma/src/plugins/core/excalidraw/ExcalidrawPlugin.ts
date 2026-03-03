import { Plugin } from "../../Plugin";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export default class ExcalidrawPlugin extends Plugin {
    id = "core-excalidraw";
    name = "Excalidraw";
    version = "1.0.0";
    description = "Provides native integration for interactive vector drawing boards saved as JSON text.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        this.app.commands.addCommand({
            id: 'excalidraw-new',
            name: 'Excalidraw: Create new drawing',
            callback: () => {
                const vaultPath = useWorkspaceStore.getState().vaultPath;
                if (!vaultPath) return;

                const name = `Drawing ${Date.now()}.excalidraw`;
                useWorkspaceStore.getState().openTab({
                    id: `${vaultPath}/${name}`,
                    title: name
                });
            }
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
