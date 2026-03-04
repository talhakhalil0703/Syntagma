import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";
// We will use a lightweight markdown parser if available, or just fallback to basic raw text wrapper
import { marked } from "marked";

export interface HtmlExportState {
    exportCurrentFile: () => Promise<void>;
}

export const useHtmlExportStore = create<HtmlExportState>(() => ({
    exportCurrentFile: async () => {
        const workspaceStore = useWorkspaceStore.getState();
        let activeFileId = null;
        if (workspaceStore.activeGroupId) {
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
            console.warn("No active file to export.");
            return;
        }

        // Get file content
        const content = await FileSystemAPI.readFile(activeFileId);
        if (content === null) {
            console.error("Failed to read the active document for export.");
            return;
        }

        // Extract filename for default save name
        const fileNameMatch = activeFileId.match(/([^\/]+)(?=\.\w+$)/);
        const baseName = fileNameMatch ? fileNameMatch[0] : "Document";

        // Prompt user for save destination
        const saveDialog = await FileSystemAPI.showSaveDialog({
            title: 'Export as HTML',
            defaultPath: `${baseName}.html`,
            filters: [{ name: 'HTML Document', extensions: ['html'] }]
        });

        if (saveDialog.canceled || !saveDialog.filePath) {
            return;
        }

        // Compile Markdown to HTML
        const htmlContent = marked.parse(content);

        // Fetch active theme CSS Variables roughly from document.body to bake in the theme
        const computedStyle = getComputedStyle(document.body);
        const bgPrimary = computedStyle.getPropertyValue('--bg-primary').trim() || '#FFFFFF';
        const textPrimary = computedStyle.getPropertyValue('--text-primary').trim() || '#000000';
        const bgSecondary = computedStyle.getPropertyValue('--bg-secondary').trim() || '#F5F5F5';
        const textAccent = computedStyle.getPropertyValue('--text-accent').trim() || '#007AFF';
        const fontSans = computedStyle.getPropertyValue('--font-sans').trim() || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

        // Skeleton
        const finalHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${baseName} - Syntagma</title>
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
            display: flex;
            justify-content: center;
        }
        .markdown-container {
            max-width: 800px;
            width: 100%;
        }
        a {
            color: var(--text-accent);
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
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
        }
        blockquote {
            border-left: 4px solid var(--bg-secondary);
            margin: 0;
            padding-left: 16px;
            color: var(--text-primary);
            opacity: 0.8;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid var(--bg-secondary);
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: var(--bg-secondary);
        }
    </style>
</head>
<body>
    <div class="markdown-container">
        ${htmlContent}
    </div>
</body>
</html>`;

        await FileSystemAPI.writeFile(saveDialog.filePath, finalHtml.trim());
        console.log(`Successfully exported HTML to ${saveDialog.filePath}`);
    }
}));
