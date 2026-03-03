import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
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
  Files,
  Search,
  Bookmark,
  Settings,
  Database,
  GitBranch,
  X,
  Plus
} from "lucide-react";
import { CommandPalette } from "./components/CommandPalette";
import { SettingsModal } from "./components/SettingsModal";
import { SidebarContainer } from "./components/SidebarContainer";
import { Editor } from "./components/Editor";
import { useSettingsStore } from "./store/settingsStore";
import { registry } from "./plugins/PluginRegistry";
import FileExplorerPlugin from "./plugins/core/explorer/FileExplorerPlugin";
import { FileSystemAPI } from "./utils/fs";
import "./styles/layout.css";

function App() {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    leftPanes,
    rightPanes,
    openTabs,
    activeTabId,
    toggleLeftSidebar,
    toggleRightSidebar,
    movePane,
    setActiveTab,
    closeTab,
    openTab,
    initWorkspace,
    openVault
  } = useWorkspaceStore();

  const { openSettings, loadSettings } = useSettingsStore();

  const { mode, systemDark, setMode } = useThemeStore();
  const isDark = mode === "dark" || (mode === "system" && systemDark);

  const [activePane, setActivePane] = useState<PaneItem | null>(null);

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

    return () => {
      registry.unloadAll();
    };
  }, []);

  // Sync File Content with Active Tab
  useEffect(() => {
    let isMounted = true;
    const loadContent = async () => {
      if (!activeTabId) {
        if (isMounted) setFileContent("");
        return;
      }
      if (activeTabId === "welcome" || activeTabId.startsWith("tab-")) {
        // Welcome tab or newly created empty tab
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
    if (!activeTabId || activeTabId === "welcome" || activeTabId.startsWith("tab-")) return;

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
    const pane = [...leftPanes, ...rightPanes].find((p) => p.id === active.id);
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

    // Find what container the active item started in
    const activeContainer = leftPanes.find((p) => p.id === activeId)
      ? "left"
      : "right";

    // Find what container the drop target is in (could be a pane, or the empty sidebar container itself)
    let overContainer = overId === "left" || overId === "right" ? overId : null;

    if (!overContainer) {
      overContainer = leftPanes.find((p) => p.id === overId) ? "left" : "right";
    }

    if (!overContainer) return;

    // If we dropped over a pane, find its index. Otherwise append to the end.
    let targetIndex = -1;
    if (overId !== "left" && overId !== "right") {
      const overArray = overContainer === "left" ? leftPanes : rightPanes;
      targetIndex = overArray.findIndex((p) => p.id === overId);
    } else {
      targetIndex =
        overContainer === "left" ? leftPanes.length : rightPanes.length;
    }

    if (activeContainer === overContainer && activeId === overId) return;

    movePane(
      activeId,
      activeContainer,
      overContainer as "left" | "right",
      targetIndex,
    );
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
          {/* Left Activity Ribbon */}
          <div className="activity-ribbon">
            <button className="icon-btn" title="Explorer"><Files size={24} /></button>
            <button className="icon-btn" title="Search"><Search size={24} /></button>
            <button className="icon-btn" title="Bookmarks"><Bookmark size={24} /></button>

            <div className="spacer" />

            <button className="icon-btn" title="Open Vault" onClick={openVault}><Database size={24} /></button>
            <button className="icon-btn" title="Settings" onClick={openSettings}><Settings size={24} /></button>
          </div>

          <div className="app-container">
            {/* Left Sidebar */}
            {leftSidebarOpen && (
              <aside className="sidebar left">
                <div className="header">
                  <span
                    style={{
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <PenTool size={18} color="var(--text-accent)" />
                    Syntagma
                  </span>
                  <button
                    className="icon-btn"
                    onClick={toggleLeftSidebar}
                    title="Collapse Left Sidebar"
                  >
                    <PanelLeftClose size={18} />
                  </button>
                </div>
                {/* Draggable Sidebar Content */}
                <SidebarContainer id="left" panes={leftPanes} />
              </aside>
            )}

            {/* Main Content Workspace */}
            <main className="workspace-content">
              <header
                className="header"
                style={{ justifyContent: "space-between" }}
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

              <div style={{ flexGrow: 1, width: "100%", overflow: "hidden" }}>
                <Editor
                  value={fileContent}
                  onChange={handleEditorChange}
                />
              </div>
            </main>

            {/* Right Sidebar */}
            {rightSidebarOpen && (
              <aside className="sidebar right">
                <div className="header">
                  <span style={{ fontWeight: 600 }}>Properties</span>
                  <button
                    className="icon-btn"
                    onClick={toggleRightSidebar}
                    title="Collapse Right Sidebar"
                  >
                    <PanelRightClose size={18} />
                  </button>
                </div>
                {/* Draggable Sidebar Content */}
                <SidebarContainer id="right" panes={rightPanes} />
              </aside>
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
      </div>
    </DndContext>
  );
}

export default App;
