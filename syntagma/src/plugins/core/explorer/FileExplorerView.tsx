import React, { useEffect, useState, useCallback } from "react";
import { FileSystemAPI, type DirEntry } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import {
    ChevronRight, ChevronDown, FolderPlus,
    FileEdit, Maximize, ArrowDownUp, ChevronsDownUp,
    FileText, FolderOpen
} from "lucide-react";
import { useContextMenuStore } from "../../../store/contextMenuStore";
import './FileExplorer.css';

export const FileExplorerView: React.FC = () => {
    const { vaultPath, openVault, openTab } = useWorkspaceStore();
    const [entries, setEntries] = useState<DirEntry[]>([]);

    const loadVault = useCallback(async () => {
        if (vaultPath) {
            const items = await FileSystemAPI.readDir(vaultPath);
            const visible = items.filter(i => !i.name.startsWith('.'));
            visible.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
            setEntries(visible);
        } else {
            setEntries([]);
        }
    }, [vaultPath]);

    useEffect(() => {
        loadVault();
        const handleFsChange = () => loadVault();
        window.addEventListener('filesystem-changed', handleFsChange);
        return () => window.removeEventListener('filesystem-changed', handleFsChange);
    }, [loadVault]);

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

    const handleNewNote = async () => {
        let name = prompt("Enter new note name (e.g., 'My Note' or 'My Note.md'):");
        if (!name) return;
        name = name.trim();
        if (!name) return;
        if (!name.endsWith('.md')) name += '.md';

        await FileSystemAPI.writeFile(`${vaultPath}/${name}`, "");
        openTab({ id: `${vaultPath}/${name}`, title: name });
    };

    const handleNewFolder = async () => {
        let name = prompt("Enter new folder name:");
        if (!name) return;
        name = name.trim();
        if (!name) return;

        await FileSystemAPI.mkdir(`${vaultPath}/${name}`);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", userSelect: "none" }}>
            <div className="explorer-top-bar">
                <button className="icon-btn" onClick={handleNewNote} title="New Note">
                    <FileEdit size={16} />
                </button>
                <button className="icon-btn" onClick={handleNewFolder} title="New Folder">
                    <FolderPlus size={16} />
                </button>
                <button className="icon-btn" title="Change sort order (Not implemented)">
                    <ArrowDownUp size={16} />
                </button>
                <div style={{ flex: 1 }} />
                <button className="icon-btn" title="Expand active file (Not implemented)">
                    <Maximize size={16} />
                </button>
                <button className="icon-btn" onClick={() => window.dispatchEvent(new CustomEvent('collapse-all-explorer'))} title="Collapse all">
                    <ChevronsDownUp size={16} />
                </button>
            </div>
            <div style={{ padding: "8px 0", flex: 1, overflowY: "auto" }}>
                {entries.map(entry => (
                    <FileTreeItem key={entry.path} entry={entry} depth={0} />
                ))}
            </div>
        </div>
    );
};

const FileTreeItem: React.FC<{ entry: DirEntry; depth: number }> = ({ entry, depth }) => {
    const [expanded, setExpanded] = useState(false);
    const [children, setChildren] = useState<DirEntry[]>([]);
    const { openTab } = useWorkspaceStore();

    const loadChildren = useCallback(async () => {
        if (entry.isDirectory) {
            const items = await FileSystemAPI.readDir(entry.path);
            const visible = items.filter(i => !i.name.startsWith('.')).sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
            setChildren(visible);
        }
    }, [entry]);

    useEffect(() => {
        if (expanded) loadChildren();
    }, [expanded, loadChildren]);

    useEffect(() => {
        const handleCollapse = () => setExpanded(false);
        const handleFsChange = () => { if (expanded) loadChildren(); };
        window.addEventListener('collapse-all-explorer', handleCollapse);
        window.addEventListener('filesystem-changed', handleFsChange);
        return () => {
            window.removeEventListener('collapse-all-explorer', handleCollapse);
            window.removeEventListener('filesystem-changed', handleFsChange);
        };
    }, [expanded, loadChildren]);

    const [isRenaming, setIsRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState(entry.name);

    const initiateRename = () => {
        setRenameVal(entry.name.replace(/\.excalidraw\.md$|\.excalidraw$|\.md$/, ''));
        setIsRenaming(true);
    };

    const commitRename = async () => {
        setIsRenaming(false);
        if (renameVal && renameVal.trim()) {
            let newName = renameVal.trim();

            // Enforce extension
            if (entry.name.endsWith('.excalidraw.md') && !newName.endsWith('.excalidraw.md')) {
                newName += '.excalidraw.md';
            } else if (entry.name.endsWith('.excalidraw') && !newName.endsWith('.excalidraw')) {
                newName += '.excalidraw';
            } else if (entry.name.endsWith('.md') && !newName.endsWith('.md')) {
                newName += '.md';
            }

            // Prevent no-op
            if (newName === entry.name) return;

            // Get base path
            const parts = entry.path.split('/');
            parts.pop();
            const dir = parts.join('/');
            const newPath = `${dir}/${newName}`;

            if (entry.isDirectory) {
                alert("Renaming directories is currently not supported via UI.");
            } else {
                const success = await FileSystemAPI.renameFile(entry.path, newPath);
                if (success) {
                    useWorkspaceStore.getState().renameTab(entry.path, newPath, newName);
                }
            }
        }
    };

    const handleClick = async () => {
        if (isRenaming) return;
        if (entry.isDirectory) {
            setExpanded(!expanded);
        } else {
            // It's a file, replace currently active tab natively in WorkspaceStore's openTab
            if (entry.name.endsWith('.md') || entry.name.endsWith('.excalidraw') || entry.name.endsWith('.excalidraw.md')) {
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

            {
                id: "rename",
                label: "Rename...",
                action: initiateRename,
                group: 'danger'
            },
            {
                id: "delete",
                label: "Delete",
                action: async () => {
                    if (confirm(`Are you sure you want to permanently delete ${entry.name}?`)) {
                        if (entry.isDirectory) {
                            alert("Deleting directories is currently not supported via UI.");
                        } else {
                            await FileSystemAPI.deleteFile(entry.path);
                        }
                    }
                },
                group: 'danger'
            },
        ], { path: entry.path }, "explorer");
    };

    const indent = depth * 16 + 12;

    return (
        <div>
            <div
                onClick={handleClick}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!entry.isDirectory) {
                        initiateRename();
                    }
                }}
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
                <div style={{ marginRight: "6px", display: "flex", alignItems: "center", color: "var(--text-secondary)" }}>
                    {entry.isDirectory ? (
                        expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : (
                        <FileText size={14} />
                    )}
                </div>
                {isRenaming ? (
                    <input
                        autoFocus
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') setIsRenaming(false);
                        }}
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'inherit', outline: 'none', width: '100%', padding: '2px 4px', fontSize: 'inherit' }}
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {entry.name}
                    </div>
                )}
            </div>
            {expanded && children.map(child => (
                <FileTreeItem key={child.path} entry={child} depth={depth + 1} />
            ))}
        </div>
    );
};
