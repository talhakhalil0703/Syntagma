import { useState } from "react";
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
} from "lucide-react";
import { SidebarContainer } from "./components/SidebarContainer";
import { Editor } from "./components/Editor";
import "./styles/layout.css";

function App() {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    leftPanes,
    rightPanes,
    toggleLeftSidebar,
    toggleRightSidebar,
    movePane,
  } = useWorkspaceStore();

  const { mode, systemDark, setMode } = useThemeStore();
  const isDark = mode === "dark" || (mode === "system" && systemDark);

  const [activePane, setActivePane] = useState<PaneItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
            <div>
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
            <div style={{ fontWeight: 500 }}>Untitled Note.md</div>
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
              initialValue="# Welcome to Syntagma\n\nYour new local-first, blazing fast markdown editor.\n\nStart typing here..."
              onChange={(_val) => console.log("Editor output updated")}
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
    </DndContext>
  );
}

export default App;
