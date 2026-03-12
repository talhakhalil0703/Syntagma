import { FileSystemAPI } from './fs';

/**
 * Recursively updates all links to a file globally across the vault.
 * Handles:
 * - [[oldName]]
 * - [[oldName|alias]]
 * - ![[oldName]]
 * - ![[oldName|size]]
 * - [alias](oldName)
 * - ![alt](oldName)
 */
export const updateBacklinks = async (vaultPath: string, oldNameRaw: string, newNameRaw: string) => {
    // Decode and ensure no leading slashes
    const oldName = decodeURIComponent(oldNameRaw).replace(/\+/g, ' ').replace(/^[/]/, '');
    const newName = decodeURIComponent(newNameRaw).replace(/\+/g, ' ').replace(/^[/]/, '');

    // Get all files
    const allItems = await FileSystemAPI.readDirRecursive(vaultPath);
    const mdFiles = allItems.filter(i => !i.isDirectory && i.name.endsWith('.md'));

    // Patterns
    const escapedOldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 1. Wiki links [[oldName]] or [[oldName|alias]]
    const wikiRegex = new RegExp(`\\[\\[${escapedOldName}(\\|[^\\]]+)?\\]\\]`, 'g');
    
    // 2. Embeds ![[oldName]] or ![[oldName|size]]
    const embedRegex = new RegExp(`!\\[\\[${escapedOldName}(\\|[^\\]]+)?\\]\\]`, 'g');

    // 3. Standard links [alias](oldName)
    const stdLinkRegex = new RegExp(`\\[([^\\]]*)\\]\\(${escapedOldName}\\)`, 'g');

    // 4. Standard embeds ![alt](oldName)
    const stdEmbedRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedOldName}\\)`, 'g');

    let updatedCount = 0;

    for (const file of mdFiles) {
        const content = await FileSystemAPI.readFile(file.path);
        if (!content) continue;

        let newContent = content;

        newContent = newContent.replace(wikiRegex, (_, suffix) => {
            return `[[${newName}${suffix || ''}]]`;
        });

        newContent = newContent.replace(embedRegex, (_, suffix) => {
            return `![[${newName}${suffix || ''}]]`;
        });

        newContent = newContent.replace(stdLinkRegex, (_, alias) => {
            return `[${alias}](${newName})`;
        });

        newContent = newContent.replace(stdEmbedRegex, (_, alt) => {
            return `![${alt}](${newName})`;
        });

        if (newContent !== content) {
            await FileSystemAPI.writeFile(file.path, newContent);
            updatedCount++;
            
            // Check if this file is open in the workspace and needs immediate re-render?
            // Editor nodes currently listen to 'filesystem-changed' global event to reload if needed,
            // or they depend on standard FileSystemAPI emits. FileSystemAPI.writeFile emits 'filesystem-changed',
            // which the Workspace and active editors observe.
        }
    }

    console.log(`Updated backlinks in ${updatedCount} files.`);
};
