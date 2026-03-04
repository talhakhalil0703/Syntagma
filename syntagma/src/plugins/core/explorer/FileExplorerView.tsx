import React, { useEffect, useState } from "react";
import { FileSystemAPI, type DirEntry } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { ChevronRight, ChevronDown, File, FolderOpen } from "lucide-react";
import { useContextMenuStore } from "../../../store/contextMenuStore";

export const FileExplorerView: React.FC = () => {
    const { vaultPath, openVault } = useWorkspaceStore();
    const [entries, setEntries] = useState<DirEntry[]>([]);

    useEffect(() => {
        const loadVault = async () => {
            if (vaultPath) {
                const items = await FileSystemAPI.readDir(vaultPath);
                // Filter out hidden files like .syntagma or .git
                const visible = items.filter(i => !i.name.startsWith('.'));
                // Sort directories first, then alphabetical
                visible.sort((a, b) => {
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                });
                setEntries(visible);
            } else {
                setEntries([]);
            }
        };
        loadVault();
    }, [vaultPath]);

    if (!vaultPath) {
        return (
            <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                <FolderOpen size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                <p>No Vault selected.</p>
                <button
                    onClick={openVault}
                    style={{
                        marginTop: "8px",
                        padding: "6px 12px",
                        backgroundColor: "var(--bg-tertiary)",
                        border: "1px solid var(--bg-border)",
                        borderRadius: "4px",
                        color: "var(--text-primary)",
                        cursor: "pointer"
                    }}
                >
                    Open Folder
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: "0", userSelect: "none" }}>
            {entries.map(entry => (
                <FileTreeItem key={entry.path} entry={entry} depth={0} />
            ))}
        </div>
    );
};

const FileTreeItem: React.FC<{ entry: DirEntry; depth: number }> = ({ entry, depth }) => {
    const [expanded, setExpanded] = useState(false);
    const [children, setChildren] = useState<DirEntry[]>([]);
    const { openTab } = useWorkspaceStore();

    const handleClick = async () => {
        if (entry.isDirectory) {
            if (!expanded && children.length === 0) {
                const items = await FileSystemAPI.readDir(entry.path);
                const visible = items.filter(i => !i.name.startsWith('.')).sort((a, b) => {
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                });
                setChildren(visible);
            }
            setExpanded(!expanded);
        } else {
            // It's a file, replace currently active tab natively in WorkspaceStore's openTab
            if (entry.name.endsWith('.md') || entry.name.endsWith('.excalidraw')) {
                openTab({ id: entry.path, title: entry.name });
            }
        }
    };

    const { openMenu } = useContextMenuStore();
    const { openInNewTab, openToRight } = useWorkspaceStore();

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (entry.isDirectory) return;

        openMenu(e.clientX, e.clientY, [
            { id: "open-tab", label: "Open in new tab", action: () => openInNewTab({ id: entry.path, title: entry.name }), group: 'open' },
            { id: "open-right", label: "Open to the right", action: () => openToRight({ id: entry.path, title: entry.name }), group: 'open' },
            { id: "open-window", label: "Open in new window", action: () => console.log('Open window not implemented'), group: 'open' },

            { id: "new-drawing", label: "New drawing", action: () => console.log('not implemented'), group: 'modify' },

            { id: "duplicate", label: "Duplicate", action: () => console.log('not implemented'), group: 'manage' },
            { id: "move-file", label: "Move file to...", action: () => console.log('not implemented'), group: 'manage' },
            { id: "bookmark", label: "Bookmark...", action: () => console.log('not implemented'), group: 'manage' },

            // Plugins will inject here via target 'explorer'

            { id: "copy-path", label: "Copy path >", action: () => navigator.clipboard.writeText(entry.path), group: 'system' },
            { id: "open-default", label: "Open in default app", action: () => console.log('system open'), group: 'system' },
            { id: "reveal", label: "Reveal in Finder", action: () => console.log('reveal shell'), group: 'system' },

            { id: "rename", label: "Rename...", action: () => console.log('Rename requested'), group: 'danger' },
            { id: "delete", label: "Delete", action: () => console.log('Delete requested'), group: 'danger' },
        ], { path: entry.path }, "explorer");
    };

    const indent = depth * 16 + 12;

    return (
        <div>
            <div
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: `4px 12px 4px ${indent}px`,
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                }}
                className="file-explorer-item"
            >
                {entry.isDirectory ? (
                    expanded ? <ChevronDown size={14} style={{ marginRight: '4px', color: 'var(--text-secondary)' }} /> : <ChevronRight size={14} style={{ marginRight: '4px', color: 'var(--text-secondary)' }} />
                ) : (
                    <File size={14} style={{ marginRight: '4px', visibility: 'hidden' }} /> // Spacer to align text
                )}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.name}
                </span>
            </div>
            {expanded && children.map(child => (
                <FileTreeItem key={child.path} entry={child} depth={depth + 1} />
            ))}
        </div>
    );
};
