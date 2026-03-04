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
import { useContextMenuStore } from "../store/contextMenuStore";

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
                onContextMenu={(e) => {
                  e.preventDefault();
                  useContextMenuStore.getState().openMenu(
                    e.clientX,
                    e.clientY,
                    [
                      {
                        id: "close-tab",
                        label: "Close Tab",
                        action: () => {
                          useWorkspaceStore.getState().closeSidebarTab(pane.id, id);
                        }
                      }
                    ],
                    { paneId: pane.id, sourceId: id }
                  );
                }}
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
  onContextMenu?: (e: React.MouseEvent) => void;
}

const SortableTab: React.FC<SortableTabProps> = ({ pane, isActive, onClick, onContextMenu }) => {
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
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sidebar-tab ${isActive ? 'active' : ''}`}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        // Allow drag logic, but if we aren't dragging, the click is handled implicitly via a wrapping un-draggabe click or just triggering onClick on pointer down/up.

        // Actually dnd-kit handles click on its own, but we can do:
        onClick();
        listeners?.onPointerDown?.(e);
      }}
      onContextMenu={onContextMenu}
      title={pane.title}
    >
      <div className="sidebar-tab-icon">
        <IconComponent size={18} />
      </div>
    </div>
  );
};

const ActivePaneContent: React.FC<{ pane: PaneItem }> = ({ pane }) => {
  const { vaultPath } = useWorkspaceStore();

  let headerTitle = pane.title;
  if (pane.id === "pane-file-explorer" && vaultPath) {
    headerTitle = vaultPath.split('/').pop() || "Vault";
  }

  let contentNode = null;
  if (pane.type === "note" && pane.noteId) {
    contentNode = <SidebarNoteView noteId={pane.noteId} />;
  } else if (pane.type === "plugin" && pane.pluginId) {
    const viewReg = registry.getView(pane.pluginId);
    if (viewReg && viewReg.component) {
      const ViewComponent = viewReg.component;
      contentNode = <ViewComponent />;
    } else {
      contentNode = (
        <div style={{ padding: '16px', color: 'var(--text-secondary)' }}>
          Waiting for plugin payload...
        </div>
      );
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: "8px 12px 8px 12px",
        fontSize: "11px",
        fontWeight: 600,
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        flexShrink: 0,
      }}>
        {headerTitle}
      </div>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {contentNode}
      </div>
    </div>
  );
};
