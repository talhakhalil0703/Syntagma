import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type PaneItem, useWorkspaceStore } from "../store/workspaceStore";
import { registry } from "../plugins/PluginRegistry";
import { SidebarNoteView } from "./SidebarNoteView";
import { FileText } from "lucide-react";

interface SidebarProps {
  id: "left" | "right";
  panes: PaneItem[];
}

export const SidebarContainer: React.FC<SidebarProps> = ({ id, panes }) => {
  const { setNodeRef } = useDroppable({ id });

  const activePaneId = useWorkspaceStore(state => id === "left" ? state.activeLeftPaneId : state.activeRightPaneId);
  const setActivePane = id === "left" ? useWorkspaceStore.getState().setActiveLeftPane : useWorkspaceStore.getState().setActiveRightPane;

  const activePane = activePaneId ? panes.find(p => p.id === activePaneId) : panes[0];
  const currentActivePane = activePane || panes[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab Bar */}
      <SortableContext
        id={id}
        items={panes.map((p) => p.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="sidebar-tab-bar"
          style={{
            display: "flex",
            flexDirection: "row",
            overflowX: "auto",
            overflowY: "hidden",
            borderBottom: "1px solid var(--bg-border)",
            minHeight: "40px",
            backgroundColor: "var(--bg-tertiary)",
          }}
        >
          {panes.map((pane) => (
            <SortableTab
              key={pane.id}
              pane={pane}
              isActive={currentActivePane && pane.id === currentActivePane.id}
              onClick={() => setActivePane(pane.id)}
            />
          ))}
        </div>
      </SortableContext>

      {/* Pane Content */}
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          minHeight: 0 // important for flex children scrolling
        }}
      >
        {currentActivePane ? (
          <ActivePaneContent pane={currentActivePane} />
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Empty
          </div>
        )}
      </div>
    </div>
  );
};

interface SortableTabProps {
  pane: PaneItem;
  isActive: boolean;
  onClick: () => void;
}

const SortableTab: React.FC<SortableTabProps> = ({ pane, isActive, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pane.id });

  let IconComponent = FileText;
  if (pane.type === "plugin" && pane.pluginId) {
    const viewReg = registry.getView(pane.pluginId);
    if (viewReg && viewReg.icon) {
      IconComponent = viewReg.icon;
    }
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    cursor: "pointer",
    borderBottom: isActive ? "2px solid var(--text-accent)" : "2px solid transparent",
    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
    backgroundColor: isActive ? "var(--bg-primary)" : "transparent",
    userSelect: "none",
    minWidth: "44px",
    flexShrink: 0
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        // Allow drag logic, but if we aren't dragging, the click is handled implicitly via a wrapping un-draggabe click or just triggering onClick on pointer down/up.

        // Actually dnd-kit handles click on its own, but we can do:
        onClick();
        listeners?.onPointerDown?.(e);
      }}
      title={pane.title}
    >
      <IconComponent size={20} />
    </div>
  );
};

const ActivePaneContent: React.FC<{ pane: PaneItem }> = ({ pane }) => {
  if (pane.type === "note" && pane.noteId) {
    return <SidebarNoteView noteId={pane.noteId} />;
  }

  if (pane.type === "plugin" && pane.pluginId) {
    const viewReg = registry.getView(pane.pluginId);
    if (viewReg && viewReg.component) {
      const ViewComponent = viewReg.component;
      return <ViewComponent />;
    }
  }

  return (
    <div style={{ padding: '16px', color: 'var(--text-secondary)' }}>
      Waiting for plugin payload...
    </div>
  );
};
