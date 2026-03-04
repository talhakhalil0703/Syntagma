import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useWorkspaceStore, type PaneItem } from "./store/workspaceStore";
import { useThemeStore } from "./store/themeStore";
import {
  PanelLeftClose,
  PanelRightClose,
  PanelLeftOpen,
  PanelRightOpen,
  PenTool,
  Moon,
  Sun,
  Settings,
  Database,
  Plus,
  Pin,
  Code,
  X,
  GitBranch
} from "lucide-react";
import { CommandPalette } from "./components/CommandPalette";
import { SettingsModal } from "./components/SettingsModal";
import { SidebarContainer } from "./components/SidebarContainer";
import { Editor } from "./components/Editor";
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
import { BrowserView } from "./plugins/core/browser/BrowserView";
import { ExcalidrawView } from "./plugins/core/excalidraw/ExcalidrawView";
import { TemplateSelectorModal } from "./plugins/core/templates/TemplateSelectorModal";
import { FileSystemAPI } from "./utils/fs";
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
    openTabs,
    activeTabId,
    toggleLeftSidebar,
    toggleRightSidebar,
    movePane,
    setActiveTab,
    closeTab,
    openTab,
    initWorkspace,
    openVault,
    viewMode,
    toggleViewMode,
    addNoteToSidebar,
    vaultPath
  } = useWorkspaceStore();

  const { openSettings, loadSettings } = useSettingsStore();

  const { mode, systemDark, setMode } = useThemeStore();
  const isDark = mode === "dark" || (mode === "system" && systemDark);

  const [activePane, setActivePane] = useState<PaneItem | null>(null);

  // Sidebar Resizing State
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        let newWidth = e.clientX;
        if (newWidth < 150) {
          useWorkspaceStore.setState({ leftSidebarOpen: false });
          setIsResizingLeft(false);
        } else {
          setLeftSidebarWidth(newWidth);
        }
      } else if (isResizingRight) {
        let newWidth = document.body.clientWidth - e.clientX;
        if (newWidth < 150) {
          useWorkspaceStore.setState({ rightSidebarOpen: false });
          setIsResizingRight(false);
        } else {
          setRightSidebarWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizingLeft || isResizingRight) {
        useWorkspaceStore.getState().saveWorkspaceState();
      }
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingLeft, isResizingRight, setLeftSidebarWidth, setRightSidebarWidth]);

  // File Content State
  const [fileContent, setFileContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Initialize Core Plugins on Mount
  useEffect(() => {
    // Bootstrap Local Configs
    initWorkspace();
    loadSettings();

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

    return () => {
      registry.unloadAll();
    };
  }, []);

  // Sync Vault Index Core
  useEffect(() => {
    if (vaultPath) {
      useVaultIndexStore.getState().buildIndex(vaultPath);
    }
  }, [vaultPath]);

  // Sync File Content with Active Tab
  useEffect(() => {
    let isMounted = true;

    // Update document title with Vault Name
    if (vaultPath) {
      const vaultName = vaultPath.split('/').pop() || "Syntagma";
      const tabTitle = openTabs.find(t => t.id === activeTabId)?.title || "Untitled";
      document.title = `${vaultName} - ${tabTitle}`;
    } else {
      document.title = "Syntagma";
    }

    const loadContent = async () => {
      if (!activeTabId) {
        if (isMounted) setFileContent("");
        return;
      }
      if (activeTabId === "welcome" || activeTabId.startsWith("tab-") || activeTabId.startsWith("browser-")) {
        // Welcome tab or newly created empty tab or browser tab
        if (isMounted) setFileContent(activeTabId === "welcome" ? "# Welcome to Syntagma\n\nYour new local-first, blazing fast markdown editor.\n\nStart typing here..." : "");
        return;
      }

      // Load from disk
      try {
        const content = await FileSystemAPI.readFile(activeTabId);
        if (isMounted) setFileContent(content || "");
      } catch (e) {
        console.error("Failed to read file", e);
        if (isMounted) setFileContent("");
      }
    };
    loadContent();
    return () => { isMounted = false; };
  }, [activeTabId]);

  // Debounced Save
  const handleEditorChange = (val: string) => {
    setFileContent(val);
    if (!activeTabId || activeTabId === "welcome" || activeTabId.startsWith("tab-") || activeTabId.startsWith("browser-")) return;

    setIsSaving(true);
    if ((window as any).saveTimeout) {
      clearTimeout((window as any).saveTimeout);
    }
    (window as any).saveTimeout = setTimeout(async () => {
      try {
        await FileSystemAPI.writeFile(activeTabId, val);
      } catch (e) {
        console.error("Failed to save file", e);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const allRightPanes = rightPaneGroups.flatMap(g => g.panes);
    const pane = [...leftPanes, ...allRightPanes].find((p) => p.id === active.id);
    if (pane) setActivePane(pane);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Handling smooth crossing between lists can be complex with dnd-kit.
    // For this minimal setup, we handle the move explicitly on drag end.
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePane(null);
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
                <aside className="sidebar left" style={{ width: leftSidebarWidth }}>
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
            <main className="workspace-content">
              <header
                className="header"
                style={{
                  justifyContent: "space-between",
                  paddingLeft: !leftSidebarOpen ? "76px" : "16px"
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {!leftSidebarOpen && (
                    <button
                      className="icon-btn"
                      onClick={toggleLeftSidebar}
                      title="Expand Left Sidebar"
                    >
                      <PanelLeftOpen size={18} />
                    </button>
                  )}
                </div>

                {/* Tab Bar Container */}
                <div className="tab-bar">
                  {openTabs.map(tab => (
                    <div
                      key={tab.id}
                      className={`workspace-tab ${activeTabId === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <PenTool size={14} color={activeTabId === tab.id ? "var(--text-accent)" : "currentColor"} />
                      {tab.title}
                      <button
                        className="icon-btn"
                        style={{ padding: '2px', marginLeft: '6px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
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
                    onClick={() => {
                      const newId = `tab-${Date.now()}`;
                      openTab({ id: newId, title: "Untitled Note.md" });
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      if (activeTabId && !activeTabId.startsWith("tab-") && !activeTabId.startsWith("browser-") && activeTabId !== "welcome") {
                        const tabTitle = openTabs.find(t => t.id === activeTabId)?.title || "Attached Note";
                        addNoteToSidebar(activeTabId, tabTitle, "right");
                      }
                    }}
                    title="Pin note to Right Sidebar"
                  >
                    <Pin size={18} />
                  </button>
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
                  {!rightSidebarOpen && (
                    <button
                      className="icon-btn"
                      onClick={toggleRightSidebar}
                      title="Expand Right Sidebar"
                    >
                      <PanelRightOpen size={18} />
                    </button>
                  )}
                </div>
              </header>

              {/* Full Path Breadcrumb Bar */}
              {activeTabId && !activeTabId.startsWith("tab-") && !activeTabId.startsWith("browser-") && activeTabId !== "welcome" && (
                <div style={{
                  padding: "4px 16px",
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  borderBottom: "1px solid var(--bg-border)",
                  backgroundColor: "var(--bg-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {activeTabId}
                </div>
              )}

              <div style={{ flexGrow: 1, width: "100%", height: "100%", overflow: "auto" }}>
                {activeTabId?.startsWith("browser-") ? (
                  <BrowserView />
                ) : activeTabId?.endsWith(".excalidraw") ? (
                  <ExcalidrawView fileContent={fileContent} onChange={handleEditorChange} />
                ) : (
                  <Editor
                    value={fileContent}
                    onChange={handleEditorChange}
                  />
                )}
              </div>
            </main>

            {/* Right Sidebar */}
            {rightSidebarOpen && (
              <>
                <div
                  className={`sidebar-resizer ${isResizingRight ? 'active' : ''}`}
                  onMouseDown={() => setIsResizingRight(true)}
                />
                <aside className="sidebar right" style={{ width: rightSidebarWidth, display: "flex", flexDirection: "column", gap: "2px" }}>
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
                    {rightPaneGroups.map(group => (
                      <div key={group.id} style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: "200px" }}>
                        <SidebarContainer
                          id={group.id}
                          panes={group.panes}
                        />
                      </div>
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
            <span>{fileContent.trim() ? fileContent.trim().split(/\s+/).length : 0} words</span>
            <span>{fileContent.length} characters</span>
          </div>
          <div className="status-bar-group">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isSaving ? "Saving..." : "Saved"}
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
          {activePane ? (
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
                {activePane.title}
              </span>
            </div>
          ) : null}
        </DragOverlay>

        {/* Global Modals */}
        <CommandPalette />
        <SettingsModal />
        <TemplateSelectorModal />
      </div>
    </DndContext>
  );
}

export default App;

const EmptyRightDropZone = () => {
  const { setNodeRef, isOver } = useDroppable({ id: "new-right-group" });
  return (
    <div
      ref={setNodeRef}
      style={{
        padding: "16px",
        minHeight: "40px",
        height: isOver ? "100px" : "40px",
        border: "2px dashed var(--bg-border)",
        margin: "8px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-secondary)",
        transition: "all 0.2s ease",
        opacity: isOver ? 1 : 0.5,
        backgroundColor: isOver ? "var(--bg-tertiary)" : "transparent"
      }}
    >
      Drop here to create a new split
    </div>
  );
};
