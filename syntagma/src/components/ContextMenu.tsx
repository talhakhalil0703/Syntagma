import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useContextMenuStore, type ContextMenuItem } from "../store/contextMenuStore";
import "./ContextMenu.css";

export const ContextMenu: React.FC = () => {
    const { isOpen, x, y, items, contextData, closeMenu } = useContextMenuStore();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                closeMenu();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, closeMenu]);

    // Close when pressing Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeMenu();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, closeMenu]);

    if (!isOpen) return null;

    // Adjust position if menu goes off screen
    let finalX = x;
    let finalY = y;

    // Simplistic adjustment; ideal would use ResizeObserver or actual DOM rect after render
    const estimatedWidth = 220;
    const estimatedHeight = items.length * 32 + 20;

    if (finalX + estimatedWidth > window.innerWidth) {
        finalX = window.innerWidth - estimatedWidth - 10;
    }
    if (finalY + estimatedHeight > window.innerHeight) {
        finalY = window.innerHeight - estimatedHeight - 10;
    }

    // Group items
    const groupedItems: { [key: string]: ContextMenuItem[] } = {};
    items.forEach(item => {
        const group = item.group || 'default';
        if (!groupedItems[group]) groupedItems[group] = [];
        groupedItems[group].push(item);
    });

    const groups = Object.keys(groupedItems);

    return createPortal(
        <div
            ref={menuRef}
            className="context-menu"
            style={{
                left: finalX,
                top: finalY,
                position: 'fixed'
            }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            {groups.map((group, groupIndex) => (
                <React.Fragment key={group}>
                    {groupedItems[group].map((item) => (
                        <div
                            key={item.id}
                            className="context-menu-item"
                            onClick={() => {
                                item.action(contextData);
                                closeMenu();
                            }}
                        >
                            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
                            <span className="context-menu-label">{item.label}</span>
                        </div>
                    ))}
                    {groupIndex < groups.length - 1 && <div className="context-menu-separator" />}
                </React.Fragment>
            ))}
        </div>,
        document.body
    );
};
