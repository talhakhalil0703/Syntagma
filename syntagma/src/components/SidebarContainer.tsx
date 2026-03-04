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
  id: string;
  panes: PaneItem[];
  headerStart?: React.ReactNode;
  headerEnd?: React.ReactNode;
}

export const SidebarContainer: React.FC<SidebarProps> = ({ id, panes, headerStart, headerEnd }) => {
  const { setNodeRef } = useDroppable({ id });

  const activePaneId = useWorkspaceStore(state => {
    if (id === "left") return state.activeLeftPaneId;
    const group = state.rightPaneGroups.find(g => g.id === id);
    return group ? group.activeTabId : null;
  });

  const setActivePane = (paneId: string) => {
    if (id === "left") {
      useWorkspaceStore.getState().setActiveLeftPane(paneId);
    } else {
      useWorkspaceStore.getState().setActiveRightPane(id, paneId);
    }
  };

  const activePane = activePaneId ? panes.find(p => p.id === activePaneId) : panes[0];
  const currentActivePane = activePane || panes[0];

  return (
    <div
      // Sidebar Content Layout
      style={{
        display: "flex", flex: 1, flexDirection: "column", height: "100%", overflow: "hidden", WebkitAppRegion: "no-drag"
      } as any}
    >
      {/* Tab Bar / Header merged */}
      <SortableContext
        id={id}
        items={panes.map((p) => p.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="header"
          style={{
            paddingLeft: id === "left" ? "76px" : "16px",
            gap: "4px",
            justifyContent: "flex-start"
          }}
        >
          {headerStart}
          <div style={{ display: 'flex', gap: '4px', flexGrow: 1, overflowX: 'auto', scrollbarWidth: 'none', height: '100%', alignItems: 'center' }} className="hide-scrollbar">
            {panes.map((pane) => (
              <SortableTab
                key={pane.id}
                pane={pane}
                isActive={currentActivePane && pane.id === currentActivePane.id}
                onClick={() => setActivePane(pane.id)}
              />
            ))}
          </div>
          {headerEnd}
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
    backgroundColor: "transparent",
    userSelect: "none",
    height: "100%",
    minWidth: "32px",
    flexShrink: 0,
    WebkitAppRegion: "no-drag"
  } as React.CSSProperties;

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
