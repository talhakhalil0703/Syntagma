import { Plugin } from "../../Plugin";
import { usePdfExportStore } from "./pdfExportStore";

export default class PdfExportPlugin extends Plugin {
    id = "core-export-pdf";
    name = "Export as PDF";
    version = "1.0.0";
    description = "Export the current document as an A4 PDF styled with the active software theme.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        this.addCommand({
            id: 'export-pdf-current',
            name: 'Export: Current file as PDF',
            callback: () => {
                usePdfExportStore.getState().exportCurrentFileAsPDF();
            }
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
