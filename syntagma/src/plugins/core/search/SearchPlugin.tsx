import { Plugin } from "../../Plugin";
import { SearchView } from "./SearchView";
import { Search } from "lucide-react";

export default class SearchPlugin extends Plugin {
    id = "core-search";
    name = "Global Search";
    version = "1.0.0";
    description = "Search across all files in your vault using MiniSearch.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        this.app.workspace.registerView(this.manifest.id, SearchView, Search);

        this.addCommand({
            id: "core:search:reindex",
            name: "Search: Re-index vault",
            callback: () => {
                // Re-indexing is triggered from SearchView when it detects vault changes
                console.log("Search: Re-index requested via command palette");
            },
        });

        console.log("Search: Registered Ribbon Icon");
    }

    async onunload(): Promise<void> {
        console.log("Unloading plugin: Search");
    }
}
