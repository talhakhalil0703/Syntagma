import { Plugin } from "../../Plugin";
import { BookmarksView } from "./BookmarksView";
import { Bookmark } from "lucide-react";
import { useBookmarksStore } from "./bookmarksStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export default class BookmarksPlugin extends Plugin {
    id = "core-bookmarks";
    name = "Bookmarks";
    version = "1.0.0";
    description = "Pin your favorite files to quickly access them.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        // Register the Bookmarks Sidebar Pane
        this.app.workspace.registerView(this.manifest.id, BookmarksView, Bookmark);

        // Register the global Command Palette action
        this.addCommand({
            id: "bookmarks:toggle-current",
            name: "Bookmark: Toggle active file",
            callback: () => {
                const workspaceStore = useWorkspaceStore.getState();
                let activeFileId: string | null = null;
                let activeFileTitle: string | null = null;

                if (workspaceStore.activeGroupId) {
                    const findGroup = (node: any): any => {
                        if (node.type === "leaf" && node.group?.id === workspaceStore.activeGroupId) return node.group;
                        if (node.children) {
                            for (const child of node.children) {
                                const found = findGroup(child);
                                if (found) return found;
                            }
                        }
                        return null;
                    };
                    const group = findGroup(workspaceStore.rootSplit);
                    if (group && group.activeTabId) {
                        activeFileId = group.activeTabId;
                        const tab = group.tabs.find((t: any) => t.id === activeFileId);
                        if (tab) activeFileTitle = tab.title;
                    }
                }

                if (!activeFileId || !activeFileTitle) return;

                const { isBookmarked, addBookmark, removeBookmark } = useBookmarksStore.getState();

                if (isBookmarked(activeFileId)) {
                    removeBookmark(activeFileId);
                    console.log(`Removed bookmark: ${activeFileTitle}`);
                } else {
                    addBookmark(activeFileId, activeFileTitle);
                    console.log(`Added bookmark: ${activeFileTitle}`);
                }
            }
        });

        // Mock ribbon icon registration
        console.log("Bookmarks: Registered Ribbon Icon");
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
