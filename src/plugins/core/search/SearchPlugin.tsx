import React from "react";
import { Plugin } from "../../Plugin";
import { SearchView } from "./SearchView";
import { SearchSettingTab } from "./SearchSettingTab";
import { useSearchStore } from "./searchStore";
import {
  useSettingsStore,
  type QuickOpenResult,
} from "../../../store/settingsStore";
import { useVaultIndexStore } from "../../../store/vaultIndexStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { searchEngine } from "./searchEngine";
import { fuzzyMatch } from "../../../utils/search";
import { Search } from "lucide-react";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Wraps matched characters in the filename with <mark> tags.
 * For substring matches, wraps the contiguous block.
 * For fuzzy matches, wraps each individually matched character.
 */
function highlightFilename(query: string, filename: string): string {
  const q = query.toLowerCase();
  const fl = filename.toLowerCase();

  // Contiguous substring match — wrap the whole block
  const idx = fl.indexOf(q);
  if (idx !== -1) {
    return (
      escapeHtml(filename.substring(0, idx)) +
      `<mark>${escapeHtml(filename.substring(idx, idx + q.length))}</mark>` +
      escapeHtml(filename.substring(idx + q.length))
    );
  }

  // Fuzzy match — highlight each individually matched character
  let result = "";
  let qIdx = 0;
  for (let i = 0; i < filename.length; i++) {
    if (qIdx < q.length && fl[i] === q[qIdx]) {
      result += `<mark>${escapeHtml(filename[i])}</mark>`;
      qIdx++;
    } else {
      result += escapeHtml(filename[i]);
    }
  }
  return result;
}

function toRelPath(absPath: string, vaultPath: string): string {
  let rel = absPath;
  if (rel.startsWith(vaultPath)) {
    rel = rel.substring(vaultPath.length);
    if (rel.startsWith("/") || rel.startsWith("\\")) rel = rel.substring(1);
  }
  return rel || absPath;
}

export default class SearchPlugin extends Plugin {
  id = "core-search";
  name = "Global Search";
  version = "1.0.0";
  description = "Search across all files in your vault using MiniSearch.";
  author = "Syntagma Core";

  async onload(): Promise<void> {
    console.log(`Loading plugin: ${this.manifest.name}`);

    // 1. Load persisted settings
    await useSearchStore.getState().loadSettings();

    // 2. Register the sidebar view
    this.app.workspace.registerView(this.manifest.id, SearchView, Search);

    // 3. Register settings tab
    this.addSettingTab({
      name: this.name,
      render: () => React.createElement(SearchSettingTab),
    });

    // 4. Register the Quick Open provider.
    //    This function is called by CommandPalette whenever isQuickOpen is true.
    //    All ranking logic lives here — CommandPalette is just a display shell.
    useSettingsStore
      .getState()
      .registerQuickOpenProvider(
        async (query: string): Promise<QuickOpenResult[]> => {
          const vaultPath = useWorkspaceStore.getState().vaultPath;
          const vaultFiles = useVaultIndexStore.getState().files;

          if (!vaultPath) return [];

          // Empty query → list all .md files (no highlights needed)
          if (query.trim().length === 0) {
            return vaultFiles
              .filter((e) => e.name.endsWith(".md"))
              .map((e) => ({
                id: e.path,
                title: toRelPath(e.path, vaultPath),
                isNameMatch: true,
                score: 0,
              }));
          }

          // Use the search engine as the sole truth for ranking, just like the sidebar.
          // The search engine naturally boosts filename matches (3x).
          const engineResults = await searchEngine.search(query);

          return engineResults.map((r): QuickOpenResult => {
            const excerptHtml = r.matches[0]?.excerpt || undefined;
            const fileName = r.fileName || r.filePath.split("/").pop() || "";

            // If fuzzyMatch matches the filename, we conceptually call it a name match
            // (colors the icon yellow in the UI).
            const isNameMatch = fuzzyMatch(
              query,
              fileName.replace(/\.md$/, ""),
            );

            return {
              id: r.filePath,
              title: toRelPath(r.filePath, vaultPath),
              filenameHtml: highlightFilename(query, fileName),
              excerptHtml,
              isNameMatch,
              score: r.score, // Preserved for transparency, but array index implies ranking
            };
          });
        },
      );

    // 5. Register the CMD+O command — gates on the enabled setting
    this.addCommand({
      id: "core:search:quick-open",
      name: "Quick Open (Search)",
      defaultHotkey: "Mod+O",
      callback: () => {
        const { enabled } = useSearchStore.getState();
        if (!enabled) return; // Plugin disabled — CMD+O does nothing
        useSettingsStore.getState().openCommandPalette(true);
      },
    });

    this.addCommand({
      id: "core:search:reindex",
      name: "Search: Re-index vault",
      callback: () => {
        console.log("Search: Re-index requested via command palette");
      },
    });

    console.log(
      "Search: Registered quick open provider, settings tab, and commands",
    );
  }

  async onunload(): Promise<void> {
    // Clean up the provider so CMD+O gracefully does nothing if plugin unloads
    useSettingsStore.getState().unregisterQuickOpenProvider();
    console.log("Unloading plugin: Search");
  }
}
