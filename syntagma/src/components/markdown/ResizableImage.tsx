import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useContextMenuStore } from '../../store/contextMenuStore';
import { FileSystemAPI } from '../../utils/fs';
import { updateBacklinks } from '../../utils/backlinks';

interface ResizableImageProps {
    src: string;
    alt?: string;
    originalSrc: string; // The raw relative string found in the markdown, e.g., "Pasted image.png"
    defaultWidth?: number | string;
}

export const ResizableImage: React.FC<ResizableImageProps> = ({ src, alt, originalSrc, defaultWidth, ...props }) => {
    const { activeGroupId, rootSplit, vaultPath } = useWorkspaceStore();
    const { openMenu } = useContextMenuStore();
    // Default max width is 100%, but we want to allow explicit widths
    const [width, setWidth] = useState<number | string | undefined>(defaultWidth);
    const [resizing, setResizing] = useState(false);
    
    // We update local state immediately so drag is responsive
    const doResize = (newWidth: number) => {
        setWidth(newWidth);
    };

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (defaultWidth) setWidth(defaultWidth);
    }, [defaultWidth]);

    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setResizing(true);
        const startX = e.clientX;
        // Current width starts at whatever the element currently is
        const startWidth = containerRef.current?.getBoundingClientRect().width || 0;

        const onMouseMove = (me: MouseEvent) => {
            const dx = me.clientX - startX;
            const newW = Math.max(50, startWidth + dx); // min 50px
            doResize(newW);
        };

        const onMouseUp = async (me: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            setResizing(false);
            
            // Calculate final width and update markdown source
            const dx = me.clientX - startX;
            const finalW = Math.floor(Math.max(50, startWidth + dx));
            await updateMarkdownSourceWidth(finalW);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Replace the |width syntax in the current active active file
    const updateMarkdownSourceWidth = async (newWidth: number) => {
        if (!vaultPath) return;

        // Find active tab
        const findActiveTab = (node: any, groupId: string | null): any => {
            if (node.type === 'leaf' && node.group?.id === groupId) {
                return node.group.tabs.find((t: any) => t.id === node.group.activeTabId);
            }
            if (node.children) {
                for (const child of node.children) {
                    const found = findActiveTab(child, groupId);
                    if (found) return found;
                }
            }
            return null;
        };

        const activeTab = findActiveTab(rootSplit, activeGroupId);
        if (!activeTab || !activeTab.id.endsWith('.md')) return;

        const content = await FileSystemAPI.readFile(activeTab.id);
        if (!content) return;

        // Try to find the image syntax. originalSrc comes from remark
        // E.g. ![[originalSrc]] or ![[originalSrc|oldWidth]]
        // Also standard markdown ![alt](originalSrc)
        const escapedSrc = originalSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // This is a rough search and replace. For wiki links:
        // Match ![[originalSrc]] and ![[originalSrc|...]]
        let searchRegex = new RegExp(`!\\[\\[${escapedSrc}(?:\\|[^\\]]+)?\\]\\]`, 'g');
        let newContent = content.replace(searchRegex, `![[${originalSrc}|${newWidth}]]`);
        
        if (newContent === content) {
            // Also try to match `![...](originalSrc)` in standard markdown
            // Not perfectly addressing all edge cases, but covers the prompt requirements
            searchRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedSrc}\\)`, 'g');
            newContent = content.replace(searchRegex, `![${newWidth}](${originalSrc})`);
        }

        if (newContent !== content) {
            await FileSystemAPI.writeFile(activeTab.id, newContent);
            // This normally triggers an event if the editor listens, but Syntagma EditorNode listens to 'filesystem-changed'
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        openMenu(e.clientX, e.clientY, [
            {
                id: "copy-image",
                label: "Copy to clipboard",
                action: async () => {
                   // Clean original path
                    let cleanPath = originalSrc;
                    if (cleanPath.includes('|')) cleanPath = cleanPath.split('|')[0];
                    if (cleanPath.startsWith('http') || cleanPath.startsWith('data:')) {
                        console.log('Copying remote imagery not supported yet');
                        return;
                    }
                    cleanPath = decodeURIComponent(cleanPath).replace(/\+/g, ' ');
                    
                    // Let's use FileSystemAPI to read base64 if supported, or we could copy file path.
                    // Actually, the app has copySelection which works on paths.
                    navigator.clipboard.writeText(`![[${cleanPath}]]`); // Fallback behavior for simple copy
                },
                group: 'manage'
            },
            {
                id: "rename-image",
                label: "Rename image...",
                action: () => triggerRenameFlow(),
                group: 'danger'
            }
        ], { context: 'image' }, "image");
    };

    const triggerRenameFlow = async () => {
        if (!vaultPath) return;

        let cleanPath = originalSrc;
        if (cleanPath.includes('|')) cleanPath = cleanPath.split('|')[0];
        if (cleanPath.startsWith('http') || cleanPath.startsWith('data:')) return;
        
        // Original filename
        const oldName = decodeURIComponent(cleanPath).replace(/\+/g, ' ');
        // Ext portion
        const ext = oldName.substring(oldName.lastIndexOf('.'));
        const nameWithoutExt = oldName.substring(0, oldName.lastIndexOf('.'));

        const newNameRaw = prompt("Rename image to:", nameWithoutExt);
        if (!newNameRaw || newNameRaw === nameWithoutExt) return;

        const newName = newNameRaw + ext;

        // Path calculation (assuming relative to vault root right now as is typical for wiki links)
        const oldPath = `${vaultPath}/${oldName}`;
        const newPath = `${vaultPath}/${newName}`;

        // Perform Rename
        const success = await FileSystemAPI.renameFile(oldPath, newPath);
        if (success) {
            // Update backlinks
            await updateBacklinks(vaultPath, oldName, newName);
            // Update tabs
            useWorkspaceStore.getState().renameTab(oldPath, newPath, newName);
        }
    };

    return (
        <div ref={containerRef} style={{ display: 'inline-block', position: 'relative', maxWidth: '100%', margin: '16px 0' }}>
            <img 
                {...props} 
                src={src} 
                alt={alt} 
                style={{ 
                    ...((props as any).style || {}),
                    width: width ? `${width}px` : 'auto', 
                    maxWidth: '100%',
                    display: 'block',
                    borderRadius: '8px',
                    margin: 0
                }} 
                onContextMenu={handleContextMenu}
                draggable={false} // Prevent default drag so our custom drag handler works nicely
            />
            <div 
                onMouseDown={handleDragStart}
                style={{
                    position: 'absolute',
                    right: '-4px',
                    top: '0',
                    bottom: '0',
                    width: '8px',
                    cursor: 'ew-resize',
                    zIndex: 10,
                }}
                className="image-resize-handle"
                title="Drag to resize"
            >
                {/* Visual indicator on hover, implement via CSS usually, or just invisible handle */}
                <div style={{
                    width: '4px', height: '24px', background: 'var(--bg-tertiary, #aaa)', position: 'absolute', top: '50%', transform: 'translateY(-50%)', borderRadius: '2px', opacity: resizing ? 1 : 0.5
                }}/>
            </div>
        </div>
    );
};
