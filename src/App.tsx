import React, { useState, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  type DragOverEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable,
  useSensor,
  useSensors,
  useDndContext,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useWorkspaceStore } from "./store/workspaceStore";

import {
  PanelLeftClose,
  Settings,
  Database,
  GitBranch,
  PanelRightClose,
} from "lucide-react";
import { CommandPalette } from "./components/CommandPalette";
import { SettingsModal } from "./components/SettingsModal";
import { SidebarContainer } from "./components/SidebarContainer";
import { EditorNode } from "./components/EditorNode";
import { ContextMenu } from "./components/ContextMenu";
import { useSettingsStore } from "./store/settingsStore";
import { registry } from "./plugins/PluginRegistry";
import FileExplorerPlugin from "./plugins/core/explorer/FileExplorerPlugin";
import SearchPlugin from "./plugins/core/search/SearchPlugin";
import BookmarksPlugin from "./plugins/core/bookmarks/BookmarksPlugin";
import GitPlugin from "./plugins/core/git/GitPlugin";
import DailyNotesPlugin from "./plugins/core/daily/DailyNotesPlugin";
import TemplatesPlugin from "./plugins/core/templates/TemplatesPlugin";
import DataviewPlugin from "./plugins/core/dataview/DataviewPlugin";
import TasksPlugin from "./plugins/core/tasks/TasksPlugin";
import CalendarPlugin from "./plugins/core/calendar/CalendarPlugin";
import HtmlExportPlugin from "./plugins/core/export-html/HtmlExportPlugin";
import PdfExportPlugin from "./plugins/core/export-pdf/PdfExportPlugin";
import BrowserPlugin from "./plugins/core/browser/BrowserPlugin";
import ExcalidrawPlugin from "./plugins/core/excalidraw/ExcalidrawPlugin";
import MermaidPlugin from "./plugins/core/mermaid/MermaidPlugin";
import ImageEditPlugin from "./plugins/core/image-edit/ImageEditPlugin";
import { TemplateSelectorModal } from "./plugins/core/templates/TemplateSelectorModal";
import { useVaultIndexStore } from "./store/vaultIndexStore";
import "./styles/layout.css";

function App() {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    leftPanes,
    rightPaneGroups,
    rootSplit,
    toggleLeftSidebar,
    toggleRightSidebar,
    movePane,
    initWorkspace,
    openVault,
    vaultPath
  } = useWorkspaceStore();

  const { openSettings, loadSettings } = useSettingsStore();

  // Sidebar Resizing State
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const leftSidebarRef = useRef<HTMLElement>(null);
  const rightSidebarRef = useRef<HTMLElement>(null);
  const leftWidthRef = useRef(leftSidebarWidth);
  const rightWidthRef = useRef(rightSidebarWidth);

  // Sync refs when Zustand store changes from outside
  useEffect(() => { leftWidthRef.current = leftSidebarWidth; }, [leftSidebarWidth]);
  useEffect(() => { rightWidthRef.current = rightSidebarWidth; }, [rightSidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        let newWidth = e.clientX;
        if (newWidth < 150) {
          useWorkspaceStore.setState({ leftSidebarOpen: false });
          setIsResizingLeft(false);
        } else {
          leftWidthRef.current = newWidth;
          if (leftSidebarRef.current) leftSidebarRef.current.style.width = `${newWidth}px`;
        }
      } else if (isResizingRight) {
        let newWidth = document.body.clientWidth - e.clientX;
        if (newWidth < 150) {
          useWorkspaceStore.setState({ rightSidebarOpen: false });
          setIsResizingRight(false);
        } else {
          rightWidthRef.current = newWidth;
          if (rightSidebarRef.current) rightSidebarRef.current.style.width = `${newWidth}px`;
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizingLeft) {
        setLeftSidebarWidth(leftWidthRef.current);
      }
      if (isResizingRight) {
        setRightSidebarWidth(rightWidthRef.current);
      }
      if (isResizingLeft || isResizingRight) {
        useWorkspaceStore.getState().saveWorkspaceState();
      }
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.body.classList.add("is-resizing");
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.classList.remove("is-resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.body.classList.remove("is-resizing");
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingLeft, isResizingRight, setLeftSidebarWidth, setRightSidebarWidth]);


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
                e.preventDefault();
                useSettingsStore.getState().openCommandPalette(false);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);

        // Bootstrap Local Configs
        initWorkspace();
    loadSettings();

    // Register Native Commands
    useSettingsStore.getState().registerCommand({
      id: "split-right",
      name: "Split Right",
      callback: () => {
        const ag = useWorkspaceStore.getState().activeGroupId;
        if (ag) useWorkspaceStore.getState().splitGroup(ag, "horizontal");
      }
    });

    useSettingsStore.getState().registerCommand({
      id: "split-down",
      name: "Split Down",
      callback: () => {
        const ag = useWorkspaceStore.getState().activeGroupId;
        if (ag) useWorkspaceStore.getState().splitGroup(ag, "vertical");
      }
    });

    useSettingsStore.getState().registerCommand({
      id: "toggle-left-sidebar",
      name: "Toggle Left Sidebar",
      callback: () => {
        useWorkspaceStore.getState().toggleLeftSidebar();
      }
    });

    useSettingsStore.getState().registerCommand({
      id: "toggle-right-sidebar",
      name: "Toggle Right Sidebar",
      callback: () => {
        useWorkspaceStore.getState().toggleRightSidebar();
      }
    });

    // Cancel any pending unloads from React StrictMode dev cycles
    registry.cancelPendingUnload();

    // We pass the class constructor and its static manifest
    // The registry instantiates them with the `app` instance.
    registry.loadPlugin(FileExplorerPlugin, {
      id: "core-file-explorer",
      name: "File Explorer",
      version: "1.0.0",
      description: "Browse folders and files in your vault.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(SearchPlugin, {
      id: "core-search",
      name: "Global Search",
      version: "1.0.0",
      description: "Search across all files in your vault.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(BookmarksPlugin, {
      id: "core-bookmarks",
      name: "Bookmarks",
      version: "1.0.0",
      description: "Pin your favorite files to quickly access them.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(GitPlugin, {
      id: "core-git",
      name: "Git Version Control",
      version: "1.0.0",
      description: "Automate backing up and syncing your Vault to Git.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(DailyNotesPlugin, {
      id: "core-daily-notes",
      name: "Daily Notes",
      version: "1.0.0",
      description: "Create and jump to today's daily journal/note.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(TemplatesPlugin, {
      id: "core-templates",
      name: "Templates",
      version: "1.0.0",
      description: "Insert template snippets with dynamic date and title variables.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(DataviewPlugin, {
      id: "core-dataview",
      name: "Databases (Dataview)",
      version: "1.0.0",
      description: "Query your vault's Markdown frontmatter into dynamic tables.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(TasksPlugin, {
      id: "core-tasks",
      name: "Tasks",
      version: "1.0.0",
      description: "Aggregate and interact with markdown checkboxes across your vault.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(CalendarPlugin, {
      id: "core-calendar",
      name: "Calendar",
      version: "1.0.0",
      description: "Visualize daily notes and timelines on a monthly grid.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(HtmlExportPlugin, {
      id: "core-export-html",
      name: "Export as HTML",
      version: "1.0.0",
      description: "Export the current Markdown document as a standalone styled HTML file.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(PdfExportPlugin, {
      id: "core-export-pdf",
      name: "Export as PDF",
      version: "1.0.0",
      description: "Export the current document as an A4 PDF styled with the active software theme.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(BrowserPlugin, {
      id: "core-browser",
      name: "Web Browser",
      version: "1.0.0",
      description: "Opens a native embedded Web Browser tab inside your workspace for quick internet research without context switching.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(ExcalidrawPlugin, {
      id: "core-excalidraw",
      name: "Excalidraw",
      version: "1.0.0",
      description: "Provides native integration for interactive vector drawing boards saved as JSON text.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(MermaidPlugin, {
      id: "core-mermaid",
      name: "Mermaid",
      version: "1.0.0",
      description: "Provides native rendering for mermaid diagrams in code blocks.",
      author: "Syntagma Core"
    });

    registry.loadPlugin(ImageEditPlugin, {
      id: "core-image-edit",
      name: "Image Editor",
      version: "1.0.0",
      description: "Provides a ShareX-like image editor for annotating and editing images.",
      author: "Syntagma Core"
    });

    useSettingsStore.getState().registerCommand({
      id: "command-palette",
      name: "Open Command Palette",
      callback: () => useSettingsStore.getState().openCommandPalette(false)
    });

    return () => {
      registry.unloadAll();
    };
  }, []);

  // Global Hotkey Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const state = useSettingsStore.getState();
      const hotkeys = state.hotkeys;

      // Ensure we don't trigger native inputs if the user is typing
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA" || activeEl?.hasAttribute("contenteditable");

      // Build key combo representation (e.g. "Mod+Shift+P")
      const keys = [];
      if (e.metaKey || e.ctrlKey) keys.push("Mod");
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");
      if (e.key && !['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      }
      const combo = keys.join("+");

      if (keys.length > 0) {
        // Find matching command based on hotkey mappings
        for (const [cmdId, hotkeyCmd] of Object.entries(hotkeys)) {
          if (hotkeyCmd === combo) {
            const command = state.commands.find(c => c.id === cmdId);
            if (command) {
              if (isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
                // If the user just pressed "P" in an input, do not run "P" hotkey.
                continue;
              }
              e.preventDefault();
              e.stopPropagation();
              command.callback();
              return;
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true });
    };
  }, []);

  // Sync Vault Index Core
  useEffect(() => {
    if (vaultPath) {
      useVaultIndexStore.getState().buildIndex(vaultPath);
    }
  }, [vaultPath]);

  const handleDragStart = () => {
    // handled implicitly via CustomDragOverlay reading context
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Handling smooth crossing between lists can be complex with dnd-kit.
    // For this minimal setup, we handle the move explicitly on drag end.
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // 1. Find source container ID
    let sourceId: string | null = null;
    if (leftPanes.some(p => p.id === activeId)) sourceId = "left";
    else {
      const g = rightPaneGroups.find(g => g.panes.some(p => p.id === activeId));
      if (g) sourceId = g.id;
    }
    if (!sourceId) return;

    // 2. Find dest container ID
    let destId: string | null = null;
    if (overId === "left") destId = "left";
    else if (overId === "new-right-group") destId = "new-right-group";
    else if (rightPaneGroups.some(g => g.id === overId)) destId = overId;
    else {
      if (leftPanes.some(p => p.id === overId)) destId = "left";
      else {
        const g = rightPaneGroups.find(g => g.panes.some(p => p.id === overId));
        if (g) destId = g.id;
      }
    }
    if (!destId) return;

    // 3. Find dest index
    let targetIndex = -1;
    if (overId !== destId && overId !== "new-right-group") {
      if (destId === "left") {
        targetIndex = leftPanes.findIndex(p => p.id === overId);
      } else {
        const g = rightPaneGroups.find(g => g.id === destId);
        targetIndex = g ? g.panes.findIndex(p => p.id === overId) : -1;
      }
    } else {
      if (destId === "left") targetIndex = leftPanes.length;
      else if (destId === "new-right-group") targetIndex = 0;
      else {
        const g = rightPaneGroups.find(g => g.id === destId);
        targetIndex = g ? g.panes.length : 0;
      }
    }

    if (sourceId === destId && activeId === overId) return;

    movePane(activeId, sourceId, destId, targetIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="app-root">
        <div className="app-main">
          <div className="app-container">
            {/* Left Sidebar */}
            {leftSidebarOpen && (
              <>
                <aside ref={leftSidebarRef} className="sidebar left" style={{ width: leftSidebarWidth }}>
                  {/* Draggable Sidebar Content (Contains merged Header) */}
                  <SidebarContainer
                    id="left"
                    panes={leftPanes}
                    headerEnd={
                      <button
                        className="icon-btn"
                        onClick={toggleLeftSidebar}
                        title="Collapse Left Sidebar"
                      >
                        <PanelLeftClose size={18} />
                      </button>
                    }
                  />

                  {/* Left Sidebar Footer for Settings/Vault */}
                  <div className="sidebar-footer">
                    <button className="icon-btn" title="Open Vault" onClick={openVault}><Database size={18} /></button>
                    <button className="icon-btn" title="Settings" onClick={openSettings}><Settings size={18} /></button>
                  </div>
                </aside>
                <div
                  className={`sidebar-resizer ${isResizingLeft ? 'active' : ''}`}
                  onMouseDown={() => setIsResizingLeft(true)}
                />
              </>
            )}

            {/* Main Content Workspace */}
            <main className="workspace-content" style={{ display: "flex", flexDirection: "column", padding: 0, margin: 0 }}>
              <EditorNode node={rootSplit} isTopLeft={true} isTopRight={true} />
            </main>

            {/* Right Sidebar */}
            {rightSidebarOpen && (
              <>
                <div
                  className={`sidebar-resizer ${isResizingRight ? 'active' : ''}`}
                  onMouseDown={() => setIsResizingRight(true)}
                />
                <aside ref={rightSidebarRef} className="sidebar right" style={{ width: rightSidebarWidth, display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div className="header">
                    <span style={{ fontWeight: 600 }}>Tools</span>
                    <button
                      className="icon-btn"
                      onClick={toggleRightSidebar}
                      title="Collapse Right Sidebar"
                    >
                      <PanelRightClose size={18} />
                    </button>
                  </div>
                  {/* Draggable Sidebar Content Groups */}
                  <div style={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    {rightPaneGroups.map((group, index) => (
                      <React.Fragment key={group.id}>
                        {index > 0 && (
                          <div
                            className="right-group-resizer"
                            style={{
                              height: "4px",
                              cursor: "row-resize",
                              backgroundColor: "var(--bg-border)",
                              flexShrink: 0,
                            }}
                            onMouseDown={(e) => {
                              document.body.classList.add("is-resizing");
                              document.body.style.cursor = "row-resize";
                              document.body.style.userSelect = "none";
                              const startY = e.clientY;
                              const startHeight = group.height || 200;
                              let newHeight = startHeight;
                              const onMouseMove = (moveEvent: MouseEvent) => {
                                const diff = moveEvent.clientY - startY;
                                newHeight = Math.max(100, startHeight - diff);
                                const el = document.getElementById(`right-group-wrap-${group.id}`);
                                if (el) {
                                  el.style.height = `${newHeight}px`;
                                  el.style.flexGrow = '0';
                                }
                              };
                              const onMouseUp = () => {
                                document.removeEventListener("mousemove", onMouseMove);
                                document.removeEventListener("mouseup", onMouseUp);
                                document.body.classList.remove("is-resizing");
                                document.body.style.cursor = "";
                                document.body.style.userSelect = "";
                                useWorkspaceStore.getState().setRightGroupHeight(group.id, newHeight);
                              };
                              document.addEventListener("mousemove", onMouseMove);
                              document.addEventListener("mouseup", onMouseUp);
                            }}
                          />
                        )}
                        <div id={`right-group-wrap-${group.id}`} style={{ display: "flex", flexDirection: "column", height: group.height ? `${group.height}px` : "auto", flexGrow: group.height ? 0 : 1, minHeight: "200px" }}>
                          <SidebarContainer
                            id={group.id}
                            panes={group.panes}
                          />
                        </div>
                      </React.Fragment>
                    ))}
                    <EmptyRightDropZone />
                  </div>
                </aside>
              </>
            )}
          </div>
        </div>

        {/* Bottom Status Bar */}
        <footer className="status-bar">
          <div className="status-bar-group">
            {/* Status counts moved to Editor locally, or keep a global active tab counter if needed */}
            <span>Ready</span>
          </div>
          <div className="status-bar-group">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '12px' }}>
              <GitBranch size={12} /> master
            </span>
          </div>
        </footer>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: "0.4" } },
            }),
          }}
        >
          <CustomDragOverlay />
        </DragOverlay>

        {/* Global Modals */}
        <CommandPalette />
        <SettingsModal />
        <TemplateSelectorModal />
        <ContextMenu />
      </div>
    </DndContext>
  );
}

export default App;

const CustomDragOverlay = () => {
  const { active } = useDndContext();
  if (!active) return null;

  const { leftPanes, rightPaneGroups } = useWorkspaceStore.getState();
  const allRightPanes = rightPaneGroups.flatMap(g => g.panes);
  const pane = [...leftPanes, ...allRightPanes].find((p) => p.id === active.id);

  if (!pane) return null;

  return (
    <div
      style={{
        border: "1px solid var(--text-accent)",
        borderRadius: "4px",
        backgroundColor: "var(--bg-primary)",
        padding: "8px",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <span style={{ fontSize: "13px", fontWeight: 500 }}>
        {pane.title}
      </span>
    </div>
  );
};

const EmptyRightDropZone = () => {
  const { setNodeRef, isOver } = useDroppable({ id: "new-right-group" });
  return (
    <div
      ref={setNodeRef}
      style={{
        padding: isOver ? "16px" : 0,
        minHeight: isOver ? "100px" : "20px",
        flexGrow: isOver ? 0 : 1,
        border: isOver ? "2px dashed var(--bg-border)" : "none",
        margin: "0 8px 8px 8px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-secondary)",
        transition: "all 0.2s ease",
        opacity: isOver ? 1 : 0,
        backgroundColor: isOver ? "var(--bg-tertiary)" : "transparent"
      }}
    >
      {isOver && "Release to create a new split"}
    </div>
  );
};
