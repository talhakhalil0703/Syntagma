import { create } from "zustand";

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    action: (contextData: any) => void;
    // Use group to add separators (e.g. 'open', 'modify', 'plugin-git', 'danger')
    group?: string;
    // If not provided, it's a global context menu action or up to the view to filter.
    // E.g. "explorer", "tab"
    target?: "explorer" | "tab" | string;
}

export interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
    globalItems: ContextMenuItem[];
    contextData: any; // e.g. the file path clicked, or tab id

    registerItem: (item: ContextMenuItem) => void;
    unregisterItem: (id: string) => void;

    openMenu: (x: number, y: number, items: ContextMenuItem[], contextData?: any, target?: string) => void;
    closeMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set, get) => ({
    isOpen: false,
    x: 0,
    y: 0,
    items: [],
    globalItems: [],
    contextData: null,

    registerItem: (item) => set((state) => ({ globalItems: [...state.globalItems, item] })),
    unregisterItem: (id) => set((state) => ({ globalItems: state.globalItems.filter(i => i.id !== id) })),

    openMenu: (x, y, items, contextData, target) => {
        // Inject global items matching the target
        const injected = target ? get().globalItems.filter(i => i.target === target || !i.target) : [];
        set({
            isOpen: true,
            x,
            y,
            items: [...items, ...injected],
            contextData
        });
    },

    closeMenu: () => set({ isOpen: false, items: [], contextData: null })
}));
