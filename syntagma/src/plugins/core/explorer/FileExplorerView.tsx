import React, { useEffect, useState, useCallback, useRef } from "react";
import { FileSystemAPI, type DirEntry } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import {
    ChevronRight, ChevronDown, FolderPlus,
    FileEdit, Maximize, ArrowDownUp, ChevronsDownUp,
    FileText, FolderOpen
} from "lucide-react";
import { useContextMenuStore } from "../../../store/contextMenuStore";
import { useExplorerSelectionStore } from "./explorerSelectionStore";
import { getUniqueName } from "./explorerUtils";
import { updateBacklinks } from "../../../utils/backlinks";
import './FileExplorer.css';

const DRAG_THRESHOLD = 5; // pixels before a mousedown becomes a marquee drag

/* ------------------------------------------------------------------ */
/*  Helper: collect all visible paths in tree order (for shift-select) */
/* ------------------------------------------------------------------ */
function collectVisiblePaths(entries: DirEntry[], expandedSet: Set<string>, childrenMap: Map<string, DirEntry[]>): string[] {
    const paths: string[] = [];
    for (const entry of entries) {
        paths.push(entry.path);
        if (entry.isDirectory && expandedSet.has(entry.path)) {
            const kids = childrenMap.get(entry.path) || [];
            paths.push(...collectVisiblePaths(kids, expandedSet, childrenMap));
        }
    }
    return paths;
}

/* ------------------------------------------------------------------ */
/*  Top-level explorer component                                       */
/* ------------------------------------------------------------------ */
export const FileExplorerView: React.FC = () => {
    const { vaultPath, openVault, openTab } = useWorkspaceStore();
    const [entries, setEntries] = useState<DirEntry[]>([]);
    const { clearSelection, selectedPaths, copySelection, clipboardPaths } = useExplorerSelectionStore();

    // Track expanded folders + their children for shift-select ordering
    const expandedSetRef = useRef<Set<string>>(new Set());
    const childrenMapRef = useRef<Map<string, DirEntry[]>>(new Map());

    const registerExpanded = useCallback((path: string, children: DirEntry[]) => {
        expandedSetRef.current.add(path);
        childrenMapRef.current.set(path, children);
    }, []);

    const unregisterExpanded = useCallback((path: string) => {
        expandedSetRef.current.delete(path);
        childrenMapRef.current.delete(path);
    }, []);

    const getFlatPaths = useCallback(() => {
        return collectVisiblePaths(entries, expandedSetRef.current, childrenMapRef.current);
    }, [entries]);

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

    /* ---- Marquee selection box ---- */
    const containerRef = useRef<HTMLDivElement>(null);
    const [marquee, setMarquee] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null);
    const marqueeRef = useRef(marquee);
    marqueeRef.current = marquee;

    // We use a "pending drag" pattern: mousedown records the origin,
    // and only when the mouse moves beyond DRAG_THRESHOLD do we enter marquee mode.
    const pendingDragRef = useRef<{ originX: number; originY: number; scrollX: number; scrollY: number; button: number } | null>(null);

    const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        // Don't start marquee from input fields, buttons, or file items
        // File items have their own click/drag handling
        if ((e.target as HTMLElement).closest('input, textarea, button, .file-explorer-item')) return;

        const rect = containerRef.current!.getBoundingClientRect();
        const scrollTop = containerRef.current!.scrollTop;
        pendingDragRef.current = {
            originX: e.clientX,
            originY: e.clientY,
            scrollX: e.clientX - rect.left,
            scrollY: e.clientY - rect.top + scrollTop,
            button: e.button,
        };

        // Attach temporary global listeners for this drag gesture
        const onMouseMove = (me: MouseEvent) => {
            const pending = pendingDragRef.current;
            if (pending && !marqueeRef.current) {
                const dx = Math.abs(me.clientX - pending.originX);
                const dy = Math.abs(me.clientY - pending.originY);
                if (dx >= DRAG_THRESHOLD || dy >= DRAG_THRESHOLD) {
                    if (!containerRef.current) return;
                    const r = containerRef.current.getBoundingClientRect();
                    const st = containerRef.current.scrollTop;
                    const x = me.clientX - r.left;
                    const y = me.clientY - r.top + st;
                    setMarquee({ startX: pending.scrollX, startY: pending.scrollY, x, y });
                    pendingDragRef.current = null;
                }
                return;
            }
            if (marqueeRef.current && containerRef.current) {
                const r = containerRef.current.getBoundingClientRect();
                const st = containerRef.current.scrollTop;
                const x = me.clientX - r.left;
                const y = me.clientY - r.top + st;
                setMarquee(prev => prev ? { ...prev, x, y } : null);
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            pendingDragRef.current = null;

            const m = marqueeRef.current;
            if (m && containerRef.current) {
                const st = containerRef.current.scrollTop;
                const containerRect = containerRef.current.getBoundingClientRect();
                const boxLeft = Math.min(m.startX, m.x);
                const boxRight = Math.max(m.startX, m.x);
                const boxTop = Math.min(m.startY, m.y) - st;
                const boxBottom = Math.max(m.startY, m.y) - st;

                const items = containerRef.current.querySelectorAll('[data-path]');
                const selected: string[] = [];
                items.forEach(item => {
                    const itemRect = item.getBoundingClientRect();
                    const relTop = itemRect.top - containerRect.top;
                    const relBottom = itemRect.bottom - containerRect.top;
                    const relLeft = itemRect.left - containerRect.left;
                    const relRight = itemRect.right - containerRect.left;

                    if (relRight >= boxLeft && relLeft <= boxRight &&
                        relBottom >= boxTop && relTop <= boxBottom) {
                        const p = item.getAttribute('data-path');
                        if (p) selected.push(p);
                    }
                });

                if (selected.length > 0) {
                    useExplorerSelectionStore.getState().selectMultiple(selected);
                } else {
                    useExplorerSelectionStore.getState().clearSelection();
                }
            }
            setMarquee(null);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, []);



    /* ---- Keyboard shortcuts (Cmd/Ctrl+C, Cmd/Ctrl+V, Delete/Backspace) ---- */
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            const isMod = e.metaKey || e.ctrlKey;

            // Copy
            if (isMod && e.key === 'c' && selectedPaths.size > 0) {
                if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
                e.preventDefault();
                copySelection(vaultPath);
            }

            // Paste
            if (isMod && e.key === 'v' && clipboardPaths.length > 0) {
                if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
                e.preventDefault();
                await pasteFiles();
            }

            // Delete/Backspace
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPaths.size > 0) {
                if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
                e.preventDefault();
                const paths = Array.from(selectedPaths);
                const msg = paths.length === 1
                    ? `Are you sure you want to permanently delete "${paths[0].split('/').pop()}"?`
                    : `Are you sure you want to permanently delete ${paths.length} items?`;
                if (confirm(msg)) {
                    for (const p of paths) {
                        // Check if directory before deleting (stat fails after delete)
                        const stat = await FileSystemAPI.stat(p).catch(() => null);
                        const isDir = stat?.isDirectory;
                        await FileSystemAPI.deleteFile(p);
                        if (isDir) {
                            useWorkspaceStore.getState().closeTabsMatchingPrefix(p + '/');
                        } else {
                            useWorkspaceStore.getState().closeTabById(p);
                        }
                    }
                    clearSelection();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPaths, clipboardPaths, vaultPath, copySelection, clearSelection]);

    const pasteFiles = useCallback(async () => {
        const { clipboardPaths: paths } = useExplorerSelectionStore.getState();
        if (paths.length === 0) return;

        // Determine target directory
        const selected = Array.from(useExplorerSelectionStore.getState().selectedPaths);
        let targetDir = vaultPath || '';

        if (selected.length === 1) {
            const stat = await FileSystemAPI.stat(selected[0]);
            if (stat?.isDirectory) {
                targetDir = selected[0];
            } else {
                const parts = selected[0].split('/');
                parts.pop();
                targetDir = parts.join('/');
            }
        }

        // Get existing names in target directory
        const existing = await FileSystemAPI.readDir(targetDir);
        const existingNames = new Set(existing.map(e => e.name));

        for (const sourcePath of paths) {
            const originalName = sourcePath.split('/').pop() || '';
            const uniqueName = getUniqueName(originalName, existingNames);
            const destPath = `${targetDir}/${uniqueName}`;
            await FileSystemAPI.copyFile(sourcePath, destPath);
            existingNames.add(uniqueName);
        }
    }, [vaultPath]);

    /* ---- Drag-and-drop: move files into folders ---- */
    const handleDragOver = useCallback((e: React.DragEvent) => {
        // Allow drop on the explorer container (vault root)
        if (e.dataTransfer.types.includes('application/x-explorer-paths')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        // Dropping on the container background = move to vault root
        if ((e.target as HTMLElement).closest('.file-explorer-item')) return; // handled by folder item
        const raw = e.dataTransfer.getData('application/x-explorer-paths');
        if (!raw || !vaultPath) return;
        const paths: string[] = JSON.parse(raw);
        await movePathsToDir(paths, vaultPath);
    }, [vaultPath]);

    /* ---- Inline creation state ---- */
    const [creating, setCreating] = useState<{ type: 'note' | 'folder'; parentDir: string } | null>(null);
    const [creatingName, setCreatingName] = useState('');

    const handleNewNote = () => {
        setCreating({ type: 'note', parentDir: vaultPath || '' });
        setCreatingName('');
    };

    const handleNewFolder = () => {
        setCreating({ type: 'folder', parentDir: vaultPath || '' });
        setCreatingName('');
    };

    const handleNewNoteInFolder = (folderPath: string) => {
        setCreating({ type: 'note', parentDir: folderPath });
        setCreatingName('');
    };

    const handleNewFolderInFolder = (folderPath: string) => {
        setCreating({ type: 'folder', parentDir: folderPath });
        setCreatingName('');
    };

    const commitCreate = async () => {
        if (!creating) return;
        const raw = creatingName.trim();
        if (!raw) {
            setCreating(null);
            return;
        }
        if (creating.type === 'note') {
            let name = raw;
            if (!name.endsWith('.md')) name += '.md';
            const fullPath = `${creating.parentDir}/${name}`;
            await FileSystemAPI.writeFile(fullPath, '');
            openTab({ id: fullPath, title: name });
        } else {
            await FileSystemAPI.mkdir(`${creating.parentDir}/${raw}`);
        }
        setCreating(null);
    };

    const cancelCreate = () => setCreating(null);

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

    /* ---- Compute marquee rect ---- */
    const marqueeStyle = marquee ? {
        left: Math.min(marquee.startX, marquee.x),
        top: Math.min(marquee.startY, marquee.y),
        width: Math.abs(marquee.x - marquee.startX),
        height: Math.abs(marquee.y - marquee.startY),
    } : null;

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
            <div
                ref={containerRef}
                className="explorer-file-list"
                style={{ padding: "8px 0", flex: 1, overflowY: "auto", position: "relative" }}
                onMouseDown={handleContainerMouseDown}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={(e) => {
                    // Click on empty space clears selection (only if not ending a marquee)
                    if (!(e.target as HTMLElement).closest('.file-explorer-item') && !marqueeRef.current) {
                        clearSelection();
                    }
                }}
            >
                {creating && creating.parentDir === vaultPath && (
                    <div className="file-explorer-item" style={{ display: 'flex', alignItems: 'center', padding: '4px 12px 4px 12px' }}>
                        <div style={{ marginRight: '6px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                            {creating.type === 'folder' ? <FolderOpen size={14} /> : <FileText size={14} />}
                        </div>
                        <input
                            autoFocus
                            placeholder={creating.type === 'note' ? 'New note name...' : 'New folder name...'}
                            value={creatingName}
                            onChange={e => setCreatingName(e.target.value)}
                            onBlur={commitCreate}
                            onKeyDown={e => {
                                if (e.key === 'Enter') commitCreate();
                                if (e.key === 'Escape') cancelCreate();
                            }}
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'inherit', outline: 'none', width: '100%', padding: '2px 4px', fontSize: '13px' }}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                )}
                {entries.map(entry => (
                    <FileTreeItem
                        key={entry.path}
                        entry={entry}
                        depth={0}
                        getFlatPaths={getFlatPaths}
                        registerExpanded={registerExpanded}
                        unregisterExpanded={unregisterExpanded}
                        onNewNoteInFolder={handleNewNoteInFolder}
                        onNewFolderInFolder={handleNewFolderInFolder}
                        creatingState={creating}
                        creatingName={creatingName}
                        setCreatingName={setCreatingName}
                        commitCreate={commitCreate}
                        cancelCreate={cancelCreate}
                    />
                ))}
                {marqueeStyle && (
                    <div className="selection-box" style={marqueeStyle} />
                )}
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Helper: move file paths into a target directory                    */
/* ------------------------------------------------------------------ */
async function movePathsToDir(paths: string[], targetDir: string) {
    // Get existing names in target directory for conflict resolution
    const existing = await FileSystemAPI.readDir(targetDir);
    const existingNames = new Set(existing.map(e => e.name));
    const vaultPath = useWorkspaceStore.getState().vaultPath;

    for (const sourcePath of paths) {
        const name = sourcePath.split('/').pop() || '';
        // Don't move into self or already in target
        const sourceDir = sourcePath.split('/').slice(0, -1).join('/');
        if (sourceDir === targetDir) continue;
        // Don't move a folder into itself or its own subtree
        if (targetDir.startsWith(sourcePath + '/') || targetDir === sourcePath) continue;

        const uniqueName = getUniqueName(name, existingNames);
        const destPath = `${targetDir}/${uniqueName}`;
        const success = await FileSystemAPI.renameFile(sourcePath, destPath);
        if (success) {
            existingNames.add(uniqueName);
            // Update tabs if it was a file
            useWorkspaceStore.getState().renameTab(sourcePath, destPath, uniqueName);
            // Update backlinks if vaultPath is known and it's a rename
            if (vaultPath) {
                await updateBacklinks(vaultPath, name, uniqueName);
            }
        }
    }
    useExplorerSelectionStore.getState().clearSelection();
}

/* ------------------------------------------------------------------ */
/*  Individual file/folder tree item                                   */
/* ------------------------------------------------------------------ */
interface FileTreeItemProps {
    entry: DirEntry;
    depth: number;
    getFlatPaths: () => string[];
    registerExpanded: (path: string, children: DirEntry[]) => void;
    unregisterExpanded: (path: string) => void;
    onNewNoteInFolder: (folderPath: string) => void;
    onNewFolderInFolder: (folderPath: string) => void;
    creatingState: { type: 'note' | 'folder'; parentDir: string } | null;
    creatingName: string;
    setCreatingName: (val: string) => void;
    commitCreate: () => void;
    cancelCreate: () => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ entry, depth, getFlatPaths, registerExpanded, unregisterExpanded, onNewNoteInFolder, onNewFolderInFolder, creatingState, creatingName, setCreatingName, commitCreate, cancelCreate }) => {
    const [expanded, setExpanded] = useState(false);
    const [children, setChildren] = useState<DirEntry[]>([]);
    const [dropHover, setDropHover] = useState(false);
    const { openTab, vaultPath } = useWorkspaceStore();
    const isSelected = useExplorerSelectionStore(s => s.selectedPaths.has(entry.path));

    const loadChildren = useCallback(async () => {
        if (entry.isDirectory) {
            const items = await FileSystemAPI.readDir(entry.path);
            const visible = items.filter(i => !i.name.startsWith('.')).sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
            setChildren(visible);
            if (expanded) registerExpanded(entry.path, visible);
        }
    }, [entry, expanded, registerExpanded]);

    useEffect(() => {
        if (expanded) {
            loadChildren();
        } else {
            unregisterExpanded(entry.path);
        }
    }, [expanded, loadChildren, unregisterExpanded, entry.path]);

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
        if (entry.isDirectory) {
            setRenameVal(entry.name);
        } else {
            setRenameVal(entry.name.replace(/\.excalidraw\.md$|\.excalidraw$|\.md$/, ''));
        }
        setIsRenaming(true);
    };

    const commitRename = async () => {
        setIsRenaming(false);
        if (renameVal && renameVal.trim()) {
            let newName = renameVal.trim();

            if (!entry.isDirectory) {
                if (entry.name.endsWith('.excalidraw.md') && !newName.endsWith('.excalidraw.md')) {
                    newName += '.excalidraw.md';
                } else if (entry.name.endsWith('.excalidraw') && !newName.endsWith('.excalidraw')) {
                    newName += '.excalidraw';
                } else if (entry.name.endsWith('.md') && !newName.endsWith('.md')) {
                    newName += '.md';
                }
            }

            if (newName === entry.name) return;

            const parts = entry.path.split('/');
            parts.pop();
            const dir = parts.join('/');
            const newPath = `${dir}/${newName}`;

            const success = await FileSystemAPI.renameFile(entry.path, newPath);
            if (success && !entry.isDirectory) {
                useWorkspaceStore.getState().renameTab(entry.path, newPath, newName);
                if (vaultPath) {
                    await updateBacklinks(vaultPath, entry.name, newName);
                }
            }
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isRenaming) return;

        const isMod = e.metaKey || e.ctrlKey;
        const isShift = e.shiftKey;

        if (isMod) {
            useExplorerSelectionStore.getState().toggle(entry.path);
            return;
        }
        if (isShift) {
            useExplorerSelectionStore.getState().rangeSelect(entry.path, getFlatPaths());
            return;
        }

        // Normal click
        useExplorerSelectionStore.getState().select(entry.path);

        if (entry.isDirectory) {
            setExpanded(!expanded);
        } else {
            if (entry.name.endsWith('.md') || entry.name.endsWith('.excalidraw') || entry.name.endsWith('.excalidraw.md')) {
                openTab({ id: entry.path, title: entry.name });
            }
        }
    };

    /* ---- Drag-and-drop ---- */
    const handleDragStart = (e: React.DragEvent) => {
        // If this item is selected, drag all selected items; otherwise just this one
        const { selectedPaths } = useExplorerSelectionStore.getState();
        let pathsToDrag: string[];
        if (selectedPaths.has(entry.path)) {
            pathsToDrag = Array.from(selectedPaths);
        } else {
            pathsToDrag = [entry.path];
            useExplorerSelectionStore.getState().select(entry.path);
        }
        e.dataTransfer.setData('application/x-explorer-paths', JSON.stringify(pathsToDrag));
        e.dataTransfer.effectAllowed = 'move';

        // Custom drag image showing count
        if (pathsToDrag.length > 1) {
            const badge = document.createElement('div');
            badge.textContent = `${pathsToDrag.length} items`;
            badge.style.cssText = 'position:absolute;top:-9999px;padding:4px 10px;background:var(--bg-tertiary,#333);color:var(--text-primary,#fff);border-radius:4px;font-size:12px;white-space:nowrap;';
            document.body.appendChild(badge);
            e.dataTransfer.setDragImage(badge, 0, 0);
            setTimeout(() => document.body.removeChild(badge), 0);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!entry.isDirectory) return;
        if (!e.dataTransfer.types.includes('application/x-explorer-paths')) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setDropHover(true);
    };

    const handleDragLeave = () => {
        setDropHover(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDropHover(false);
        if (!entry.isDirectory) return;
        const raw = e.dataTransfer.getData('application/x-explorer-paths');
        if (!raw) return;
        const paths: string[] = JSON.parse(raw);
        await movePathsToDir(paths, entry.path);
    };

    const { openMenu } = useContextMenuStore();
    const { openInNewTab, openToRight } = useWorkspaceStore();
    const { selectedPaths, clearSelection, copySelection } = useExplorerSelectionStore();

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // If right-clicking on an unselected item, select it
        if (!selectedPaths.has(entry.path)) {
            useExplorerSelectionStore.getState().select(entry.path);
        }

        const currentSelected = useExplorerSelectionStore.getState().selectedPaths;
        const multiSelected = currentSelected.size > 1;

        if (multiSelected) {
            const count = currentSelected.size;
            const paths = Array.from(currentSelected);
            openMenu(e.clientX, e.clientY, [
                {
                    id: "copy-multi",
                    label: `Copy ${count} items`,
                    action: () => copySelection(vaultPath),
                    group: 'manage'
                },
                {
                    id: "delete-multi",
                    label: `Delete ${count} items`,
                    action: async () => {
                        if (confirm(`Are you sure you want to permanently delete ${count} items?`)) {
                            for (const p of paths) {
                                // Close tabs before deleting (stat may fail after delete)
                                const stat = await FileSystemAPI.stat(p).catch(() => null);
                                const isDir = stat?.isDirectory;
                                await FileSystemAPI.deleteFile(p);
                                if (isDir) {
                                    useWorkspaceStore.getState().closeTabsMatchingPrefix(p + '/');
                                } else {
                                    useWorkspaceStore.getState().closeTabById(p);
                                }
                            }
                            clearSelection();
                        }
                    },
                    group: 'danger'
                },
            ], { paths }, "explorer");
        } else if (entry.isDirectory) {
            openMenu(e.clientX, e.clientY, [
                {
                    id: "new-note-in",
                    label: "New note",
                    action: () => {
                        setExpanded(true);
                        onNewNoteInFolder(entry.path);
                    },
                    group: 'modify'
                },
                {
                    id: "new-folder-in",
                    label: "New folder",
                    action: () => {
                        setExpanded(true);
                        onNewFolderInFolder(entry.path);
                    },
                    group: 'modify'
                },
                { id: "copy-folder", label: "Copy", action: () => copySelection(vaultPath), group: 'manage' },
                { id: "copy-path", label: "Copy path", action: () => navigator.clipboard.writeText(entry.path), group: 'system' },
                {
                    id: "rename-folder",
                    label: "Rename...",
                    action: initiateRename,
                    group: 'danger'
                },
                {
                    id: "delete-folder",
                    label: "Delete",
                    action: async () => {
                        if (confirm(`Are you sure you want to permanently delete the folder "${entry.name}" and all its contents?`)) {
                            useWorkspaceStore.getState().closeTabsMatchingPrefix(entry.path + '/');
                            await FileSystemAPI.deleteFile(entry.path);
                            clearSelection();
                        }
                    },
                    group: 'danger'
                },
            ], { path: entry.path }, "explorer");
        } else {
            openMenu(e.clientX, e.clientY, [
                { id: "open-tab", label: "Open in new tab", action: () => openInNewTab({ id: entry.path, title: entry.name }), group: 'open' },
                { id: "open-right", label: "Open to the right", action: () => openToRight({ id: entry.path, title: entry.name }), group: 'open' },
                { id: "open-window", label: "Open in new window", action: () => console.log('Open window not implemented'), group: 'open' },

                { id: "copy-file", label: "Copy", action: () => copySelection(vaultPath), group: 'manage' },
                { id: "duplicate", label: "Duplicate", action: () => console.log('not implemented'), group: 'manage' },
                { id: "move-file", label: "Move file to...", action: () => console.log('not implemented'), group: 'manage' },
                { id: "bookmark", label: "Bookmark...", action: () => console.log('not implemented'), group: 'manage' },

                { id: "copy-path", label: "Copy path", action: () => navigator.clipboard.writeText(entry.path), group: 'system' },
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
                            useWorkspaceStore.getState().closeTabById(entry.path);
                            await FileSystemAPI.deleteFile(entry.path);
                            clearSelection();
                        }
                    },
                    group: 'danger'
                },
            ], { path: entry.path }, "explorer");
        }
    };

    const indent = depth * 16 + 12;

    return (
        <div>
            <div
                data-path={entry.path}
                draggable={!isRenaming && isSelected}
                onClick={handleClick}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    initiateRename();
                }}
                onContextMenu={handleContextMenu}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: `4px 12px 4px ${indent}px`,
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                }}
                className={`file-explorer-item${isSelected ? ' selected' : ''}${dropHover ? ' drop-target' : ''}`}
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
            {expanded && (
                <>
                    {creatingState && creatingState.parentDir === entry.path && (
                        <div className="file-explorer-item" style={{ display: 'flex', alignItems: 'center', padding: `4px 12px 4px ${(depth + 1) * 16 + 12}px` }}>
                            <div style={{ marginRight: '6px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                                {creatingState.type === 'folder' ? <FolderOpen size={14} /> : <FileText size={14} />}
                            </div>
                            <input
                                autoFocus
                                placeholder={creatingState.type === 'note' ? 'New note name...' : 'New folder name...'}
                                value={creatingName}
                                onChange={e => setCreatingName(e.target.value)}
                                onBlur={commitCreate}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') commitCreate();
                                    if (e.key === 'Escape') cancelCreate();
                                }}
                                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'inherit', outline: 'none', width: '100%', padding: '2px 4px', fontSize: '13px' }}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    )}
                    {children.map(child => (
                        <FileTreeItem
                            key={child.path}
                            entry={child}
                            depth={depth + 1}
                            getFlatPaths={getFlatPaths}
                            registerExpanded={registerExpanded}
                            unregisterExpanded={unregisterExpanded}
                            onNewNoteInFolder={onNewNoteInFolder}
                            onNewFolderInFolder={onNewFolderInFolder}
                            creatingState={creatingState}
                            creatingName={creatingName}
                            setCreatingName={setCreatingName}
                            commitCreate={commitCreate}
                            cancelCreate={cancelCreate}
                        />
                    ))}
                </>
            )}
        </div>
    );
};
