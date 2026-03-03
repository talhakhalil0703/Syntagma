import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type PaneItem } from "../store/workspaceStore";
import { GripVertical } from "lucide-react";
import { registry } from "../plugins/PluginRegistry";

interface SidebarProps {
  id: "left" | "right";
  panes: PaneItem[];
}

export const SidebarContainer: React.FC<SidebarProps> = ({ id, panes }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <SortableContext
      id={id}
      items={panes.map((p) => p.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          padding: "8px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {panes.length === 0 && (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              color: "var(--text-secondary)",
              border: "1px dashed var(--bg-border)",
              borderRadius: "4px",
            }}
          >
            Empty
          </div>
        )}
        {panes.map((pane) => (
          <SortablePane key={pane.id} pane={pane} />
        ))}
      </div>
    </SortableContext>
  );
};

interface SortablePaneProps {
  pane: PaneItem;
}

const SortablePane: React.FC<SortablePaneProps> = ({ pane }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pane.id });

  const ViewComponent = registry.getView(pane.pluginId);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    border: "1px solid var(--bg-border)",
    borderRadius: "4px",
    backgroundColor: "var(--bg-primary)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: isDragging ? "var(--shadow-md)" : "var(--shadow-sm)",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Pane Header (Draggable Handle) */}
      <div
        {...attributes}
        {...listeners}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 8px",
          borderBottom: "1px solid var(--bg-border)",
          backgroundColor: "var(--bg-tertiary)",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <GripVertical size={14} color="var(--text-secondary)" />
        <span style={{ fontSize: "13px", fontWeight: 500 }}>{pane.title}</span>
      </div>

      {/* Pane Content */}
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          fontSize: "12px",
          color: "var(--text-primary)",
          overflowY: 'auto',
          minHeight: "100px",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {ViewComponent ? <ViewComponent /> : (
          <div style={{ padding: '8px', color: 'var(--text-secondary)' }}>
            Waiting for plugin payload...
          </div>
        )}
      </div>
    </div>
  );
};
