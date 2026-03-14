import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { marked } from "marked";

export interface PdfExportState {
    exportCurrentFileAsPDF: () => Promise<void>;
}

export const usePdfExportStore = create<PdfExportState>(() => ({
    exportCurrentFileAsPDF: async () => {
        const workspaceStore = useWorkspaceStore.getState();

        let activeFileId = null;
        if (workspaceStore.activeGroupId) {
            // Quick recursive search for the active group
            const findGroup = (node: any): any => {
                if (node.type === "leaf" && node.group?.id === workspaceStore.activeGroupId) return node.group;
                if (node.children) {
                    for (const child of node.children) {
                        const found = findGroup(child);
                        if (found) return found;
                    }
                }
                return null;
            };
            const group = findGroup(workspaceStore.rootSplit);
            if (group) activeFileId = group.activeTabId;
        }

        if (!activeFileId) {
            console.warn("No active file to export as PDF.");
            return;
        }

        const content = await FileSystemAPI.readFile(activeFileId);
        if (content === null) {
            console.error("Failed to read the active document for PDF export.");
            return;
        }

        const fileNameMatch = activeFileId.match(/([^\/]+)(?=\.\w+$)/);
        const baseName = fileNameMatch ? fileNameMatch[0] : "Document";

        const saveDialog = await FileSystemAPI.showSaveDialog({
            title: 'Export as PDF',
            defaultPath: `${baseName}.pdf`,
            filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
        });

        if (saveDialog.canceled || !saveDialog.filePath) {
            return;
        }

        // Compile Markdown to HTML
        const htmlContent = marked.parse(content);

        // Fetch active theme CSS Variables
        const computedStyle = getComputedStyle(document.body);
        const bgPrimary = computedStyle.getPropertyValue('--bg-primary').trim() || '#FFFFFF';
        const textPrimary = computedStyle.getPropertyValue('--text-primary').trim() || '#000000';
        const bgSecondary = computedStyle.getPropertyValue('--bg-secondary').trim() || '#F5F5F5';
        const textAccent = computedStyle.getPropertyValue('--text-accent').trim() || '#007AFF';
        const fontSans = computedStyle.getPropertyValue('--font-sans').trim() || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

        // Same HTML skeleton as the HTML exporter but tuned for print layout
        const finalHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${baseName}</title>
    <style>
        :root {
            --bg-primary: ${bgPrimary};
            --text-primary: ${textPrimary};
            --bg-secondary: ${bgSecondary};
            --text-accent: ${textAccent};
            --font-sans: ${fontSans};
        }
        body {
            font-family: var(--font-sans);
            background-color: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            margin: 0;
            padding: 40px;
        }
        a { color: var(--text-accent); text-decoration: none; }
        code {
            background-color: var(--bg-secondary);
            padding: 2px 4px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: var(--bg-secondary);
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            page-break-inside: avoid;
        }
        blockquote {
            border-left: 4px solid var(--bg-secondary);
            margin: 0;
            padding-left: 16px;
            color: var(--text-primary);
            opacity: 0.8;
            page-break-inside: avoid;
        }
        table { border-collapse: collapse; width: 100%; page-break-inside: avoid; }
        th, td { border: 1px solid var(--bg-secondary); padding: 8px; text-align: left; }
        th { background-color: var(--bg-secondary); }
        img { max-width: 100%; border-radius: 8px; page-break-inside: avoid; }
        h1, h2, h3 { page-break-after: avoid; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;

        const success = await FileSystemAPI.printToPDF(finalHtml.trim(), saveDialog.filePath);
        if (success) {
            console.log(`Successfully exported PDF to ${saveDialog.filePath}`);
        } else {
            console.error("Failed to export PDF.");
        }
    }
}));
