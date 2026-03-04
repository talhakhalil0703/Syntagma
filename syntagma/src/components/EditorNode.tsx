import React, { useState, useEffect, useRef } from "react";
import { type SplitNode, useWorkspaceStore } from "../store/workspaceStore";
import { useThemeStore } from "../store/themeStore";
import { PenTool, X, Plus, Pin, Code, Sun, Moon, PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { FileSystemAPI } from "../utils/fs";
import { useVaultIndexStore } from "../store/vaultIndexStore";
import { BrowserView } from "../plugins/core/browser/BrowserView";
import { ExcalidrawView } from "../plugins/core/excalidraw/ExcalidrawView";
import { Editor } from "./Editor";
import { useContextMenuStore } from "../store/contextMenuStore";

interface EditorNodeProps {
    node: SplitNode;
    isTopLeft?: boolean;
    isTopRight?: boolean;
}

export const EditorNode: React.FC<EditorNodeProps> = ({ node, isTopLeft = false, isTopRight = false }) => {
    if (node.type === "split" && node.children) {
        const isHorizontal = node.direction === "horizontal";
        return (
            <div style={{ display: "flex", flexDirection: isHorizontal ? "row" : "column", width: "100%", height: "100%" }}>
                {node.children.map((child: SplitNode, index: number) => {
                    const childIsTopLeft = isTopLeft && index === 0;
                    const childIsTopRight = isTopRight && (isHorizontal ? index === node.children!.length - 1 : index === 0);

                    return (
                        <React.Fragment key={child.id}>
                            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                                <EditorNode node={child} isTopLeft={childIsTopLeft} isTopRight={childIsTopRight} />
                            </div>
                            {index < node.children!.length - 1 && (
                                <div
                                    style={{
                                        [isHorizontal ? "width" : "height"]: "4px",
                                        backgroundColor: "var(--bg-border)",
                                        cursor: isHorizontal ? "col-resize" : "row-resize"
                                    }}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    }

    if (node.type === "leaf" && node.group) {
        return <EditorGroupView group={node.group} isTopLeft={isTopLeft} isTopRight={isTopRight} />;
    }

    return null;
};

const EditorGroupView: React.FC<{ group: any; isTopLeft: boolean; isTopRight: boolean }> = ({ group, isTopLeft, isTopRight }) => {
    const {
        activeGroupId,
        setActiveGroup,
        closeTab,
        openInNewTab,
        addNoteToSidebar,
        toggleViewMode,
        viewMode,
        setActiveTab,
        splitGroup,
        closeOtherTabs,
        closeTabsToRight,
        closeAllTabs,
        renameTab,
        leftSidebarOpen,
        rightSidebarOpen,
        toggleLeftSidebar,
        toggleRightSidebar
    } = useWorkspaceStore();

    const { mode, systemDark, setMode } = useThemeStore();
    const isDark = mode === "dark" || (mode === "system" && systemDark);

    const [fileContent, setFileContent] = useState<string>("");
    const [loadedContentId, setLoadedContentId] = useState<string | null>(null);
    const { openMenu } = useContextMenuStore();

    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const [renameVal, setRenameVal] = useState("");

    const isActiveGroup = activeGroupId === group.id;
    const activeTabId = group.activeTabId;

    // Sync File Content with Active Tab locally for this group
    useEffect(() => {
        let isMounted = true;
        setLoadedContentId(null);

        const loadContent = async () => {
            if (!activeTabId) {
                if (isMounted) {
                    setFileContent("");
                    setLoadedContentId(null);
                }
                return;
            }
            if (activeTabId === "welcome" || activeTabId.startsWith("tab-") || activeTabId.startsWith("browser-")) {
                if (isMounted) {
                    setFileContent(activeTabId === "welcome" ? "# Welcome to Syntagma\n\nYour new local-first, blazing fast markdown editor.\n\nStart typing here..." : "");
                    setLoadedContentId(activeTabId);
                }
                return;
            }
            try {
                const content = await FileSystemAPI.readFile(activeTabId);
                if (isMounted) {
                    setFileContent(content || "");
                    setLoadedContentId(activeTabId);
                }
            } catch (e) {
                if (isMounted) {
                    setFileContent("");
                    setLoadedContentId(activeTabId);
                }
            }
        };
        loadContent();
        return () => { isMounted = false; };
    }, [activeTabId]);

    // We need a ref to the current activeTabId to check if delayed events belong to the visible tab
    const activeTabIdRef = useRef(activeTabId);
    useEffect(() => {
        activeTabIdRef.current = activeTabId;
    }, [activeTabId]);

    const handleEditorChange = (val: string, sourceTabId: string) => {
        // Only update the local UI state if the change came from the currently visible tab
        if (sourceTabId === activeTabIdRef.current) {
            setFileContent(val);
        }

        if (!sourceTabId || sourceTabId === "welcome" || sourceTabId.startsWith("tab-") || sourceTabId.startsWith("browser-")) return;

        // Skip saving to paths that have been renamed away
        const renamedPaths = (window as any).__renamedPaths as Set<string> | undefined;
        if (renamedPaths?.has(sourceTabId)) return;

        if (!(window as any).saveTimeouts) {
            (window as any).saveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
        }

        const saveTimeouts = (window as any).saveTimeouts;

        if (saveTimeouts.has(sourceTabId)) {
            clearTimeout(saveTimeouts.get(sourceTabId));
        }

        const timeoutId = setTimeout(async () => {
            try {
                // Double-check the path hasn't been renamed since the timeout was set
                const rp = (window as any).__renamedPaths as Set<string> | undefined;
                if (rp?.has(sourceTabId)) {
                    saveTimeouts.delete(sourceTabId);
                    return;
                }
                await FileSystemAPI.writeFile(sourceTabId, val);
                saveTimeouts.delete(sourceTabId);
            } catch (e) {
                console.error(`Failed to save ${sourceTabId}:`, e);
            }
        }, 1000);
        saveTimeouts.set(sourceTabId, timeoutId);
    };

    const handleTabContextMenu = (e: React.MouseEvent, tab: any) => {
        e.preventDefault();
        openMenu(e.clientX, e.clientY, [
            { id: "close", label: "Close", action: () => closeTab(tab.id, group.id) },
            { id: "close-others", label: "Close Others", action: () => closeOtherTabs(tab.id, group.id) },
            { id: "close-right", label: "Close to the Right", action: () => closeTabsToRight(tab.id, group.id) },
            { id: "close-all", label: "Close All", action: () => closeAllTabs(group.id) },
            { id: "split-right", label: "Split Right", group: 'split', action: () => splitGroup(group.id, "horizontal") },
            { id: "split-down", label: "Split Down", group: 'split', action: () => splitGroup(group.id, "vertical") },
        ], { tabId: tab.id, groupId: group.id }, "tab");
    };

    const commitRename = async (tab: any) => {
        if (renamingTabId && renameVal.trim()) {
            const oldPath = tab.id;
            let newTitle = renameVal.trim();

            // Enforce the original file extension
            if (tab.title.endsWith('.excalidraw.md') && !newTitle.endsWith('.excalidraw.md')) {
                newTitle += '.excalidraw.md';
            } else if (tab.title.endsWith('.excalidraw') && !newTitle.endsWith('.excalidraw')) {
                newTitle += '.excalidraw';
            } else if (tab.title.endsWith('.md') && !newTitle.endsWith('.md')) {
                newTitle += '.md';
            }

            // Prevent no-op
            if (newTitle === tab.title) {
                setRenamingTabId(null);
                return;
            }

            // Recompute new path by replacing the filename at the end
            const pathParts = oldPath.split('/');
            pathParts[pathParts.length - 1] = newTitle;
            const newPath = pathParts.join('/');

            try {
                // Cancel any pending save for the old path to prevent it from
                // recreating the old file after the rename completes
                const saveTimeouts = (window as any).saveTimeouts as Map<string, ReturnType<typeof setTimeout>> | undefined;
                if (saveTimeouts?.has(oldPath)) {
                    clearTimeout(saveTimeouts.get(oldPath));
                    saveTimeouts.delete(oldPath);
                }

                // Block all future saves to the old path BEFORE the async rename
                // so that any onChange firing during the IPC round-trip is caught
                if (!(window as any).__renamedPaths) {
                    (window as any).__renamedPaths = new Set<string>();
                }
                ((window as any).__renamedPaths as Set<string>).add(oldPath);

                const success = await FileSystemAPI.renameFile(oldPath, newPath);
                if (success) {
                    renameTab(oldPath, newPath, newTitle);

                    // Extract base name assuming standard formatting
                    const oldBaseName = tab.title.replace(/\.md$/, '');
                    const newBaseName = newTitle.replace(/\.md$/, '');

                    if (oldBaseName && newBaseName && oldBaseName !== newBaseName) {
                        await useVaultIndexStore.getState().updateWikilinks(oldBaseName, newBaseName);
                    }
                } else {
                    // Rename failed — unblock saves to the old path
                    ((window as any).__renamedPaths as Set<string>).delete(oldPath);
                }
            } catch (e) {
                console.error("Failed to rename file", e);
            }
        }
        setRenamingTabId(null);
    };

    return (
        <div
            style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", border: isActiveGroup ? "1px solid var(--text-accent)" : "1px solid transparent" }}
            onClick={() => { if (!isActiveGroup) setActiveGroup(group.id); }}
        >
            <header className="header" style={{ paddingLeft: (isTopLeft && !leftSidebarOpen) ? "76px" : "16px", minHeight: "40px", flexShrink: 0, transition: "padding-left 0.2s ease" }}>
                <div className="tab-bar">
                    {isTopLeft && !leftSidebarOpen && (
                        <button
                            className="icon-btn"
                            onClick={toggleLeftSidebar}
                            title="Expand Left Sidebar"
                            style={{ marginRight: "8px", flexShrink: 0 }}
                        >
                            <PanelLeftOpen size={16} />
                        </button>
                    )}
                    {group.tabs.map((tab: any) => (
                        <div
                            key={tab.id}
                            className={`workspace-tab ${activeTabId === tab.id ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id, group.id); }}
                            onContextMenu={(e) => handleTabContextMenu(e, tab)}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (!tab.id.startsWith("tab-") && !tab.id.startsWith("browser-") && tab.id !== "welcome") {
                                    setRenamingTabId(tab.id);
                                    setRenameVal(tab.title.replace(/\.excalidraw\.md$|\.excalidraw$|\.md$/, ''));
                                }
                            }}
                        >
                            <PenTool size={14} color={activeTabId === tab.id ? "var(--text-accent)" : "currentColor"} />
                            {renamingTabId === tab.id ? (
                                <input
                                    autoFocus
                                    value={renameVal}
                                    onChange={e => setRenameVal(e.target.value)}
                                    onBlur={() => commitRename(tab)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') commitRename(tab);
                                        if (e.key === 'Escape') setRenamingTabId(null);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', width: '100px' }}
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                tab.title
                            )}
                            <button
                                className="icon-btn"
                                style={{ padding: '2px', marginLeft: '6px' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id, group.id);
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    <button
                        className="icon-btn"
                        title="New Tab"
                        style={{ alignSelf: 'center', marginLeft: '4px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            openInNewTab({ id: `tab-${Date.now()}`, title: "Untitled Note.md" });
                        }}
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                    {isActiveGroup && activeTabId && !activeTabId.startsWith("tab-") && activeTabId !== "welcome" && (
                        <button
                            className="icon-btn"
                            onClick={() => {
                                const tabTitle = group.tabs.find((t: any) => t.id === activeTabId)?.title || "Attached Note";
                                addNoteToSidebar(activeTabId, tabTitle, "right");
                            }}
                            title="Pin note to Right Sidebar"
                        >
                            <Pin size={18} />
                        </button>
                    )}
                    {isActiveGroup && (
                        <>
                            <button
                                className="icon-btn"
                                onClick={toggleViewMode}
                                title={viewMode === "source" ? "Switch to Live Preview" : "Switch to Source Mode"}
                            >
                                {viewMode === "source" ? <PenTool size={18} /> : <Code size={18} />}
                            </button>
                            <button
                                className="icon-btn"
                                onClick={() => setMode(isDark ? "light" : "dark")}
                                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        </>
                    )}
                    {isTopRight && !rightSidebarOpen && (
                        <button
                            className="icon-btn"
                            onClick={toggleRightSidebar}
                            title="Expand Right Sidebar"
                        >
                            <PanelRightOpen size={16} />
                        </button>
                    )}
                </div>
            </header>

            {/* Path Breadcrumb */}
            {activeTabId && !activeTabId.startsWith("tab-") && !activeTabId.startsWith("browser-") && activeTabId !== "welcome" && (
                <div style={{
                    padding: "4px 16px", fontSize: "11px", color: "var(--text-secondary)",
                    borderBottom: "1px solid var(--bg-border)", backgroundColor: "var(--bg-primary)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0
                }}>
                    {activeTabId}
                </div>
            )}

            {/* Editor Content */}
            <div style={{ flexGrow: 1, width: "100%", height: "100%", overflow: "auto" }}>
                {loadedContentId !== activeTabId && activeTabId ? (
                    <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading content...</div>
                ) : activeTabId?.startsWith("browser-") ? (
                    <BrowserView /> // Note: browser view uses global activeTabId usually, might need adjustment later
                ) : (activeTabId?.endsWith(".excalidraw") || activeTabId?.endsWith(".excalidraw.md")) ? (
                    <ExcalidrawView key={activeTabId} fileId={activeTabId} fileContent={fileContent} onChange={(val) => handleEditorChange(val, activeTabId)} />
                ) : (
                    <Editor
                        value={fileContent}
                        onChange={(val) => handleEditorChange(val, activeTabId!)}
                    />
                )}
            </div>
        </div>
    );
};
