import { Plugin } from "../../Plugin";
import { useHtmlExportStore } from "./htmlExportStore";

export default class HtmlExportPlugin extends Plugin {
    id = "core-export-html";
    name = "Export as HTML";
    version = "1.0.0";
    description = "Export the current Markdown document as a standalone styled HTML file.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        // Register the "Export: Current file as HTML" command
        this.addCommand({
            id: 'export-html-current',
            name: 'Export: Current file as HTML',
            callback: () => {
                useHtmlExportStore.getState().exportCurrentFile();
            }
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
