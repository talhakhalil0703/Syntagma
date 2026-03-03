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
        this.app.commands.addCommand({
            id: "bookmarks:toggle-current",
            name: "Bookmark: Toggle active file",
            pluginId: this.manifest.id,
            callback: () => {
                const { activeTabId, openTabs } = useWorkspaceStore.getState();
                if (!activeTabId) return;

                const activeTab = openTabs.find(t => t.id === activeTabId);
                if (!activeTab) return;

                const { isBookmarked, addBookmark, removeBookmark } = useBookmarksStore.getState();

                if (isBookmarked(activeTab.id)) {
                    removeBookmark(activeTab.id);
                    console.log(`Removed bookmark: ${activeTab.title}`);
                } else {
                    addBookmark(activeTab.id, activeTab.title);
                    console.log(`Added bookmark: ${activeTab.title}`);
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
