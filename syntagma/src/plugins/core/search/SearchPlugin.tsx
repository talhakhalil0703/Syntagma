import { Plugin } from "../../Plugin";
import { SearchView } from "./SearchView";
import { Search } from "lucide-react";

export default class SearchPlugin extends Plugin {
    id = "core-search";
    name = "Global Search";
    version = "1.0.0";
    description = "Search across all files in your vault.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        this.app.workspace.registerView(this.manifest.id, SearchView, Search);

        // Mock ribbon icon registration for prototype
        console.log("Search: Registered Ribbon Icon");
    }

    async onunload(): Promise<void> {
        console.log("Unloading plugin: Search");
    }
}
