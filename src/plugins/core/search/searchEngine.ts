import MiniSearch, { type SearchResult as MiniSearchResult } from "minisearch";
import { FileSystemAPI } from "../../../utils/fs";

// ---- Types ----

export interface IndexedDocument {
    path: string;
    basename: string;
    content: string;
    headings1: string;
    headings2: string;
    headings3: string;
}

export interface SearchMatch {
    excerpt: string; // HTML string with <mark> highlights
    lineNumber: number;
}

export interface SearchResultItem {
    filePath: string;
    fileName: string;
    score: number;
    matches: SearchMatch[];
}

// ---- Heading Extraction ----

function extractHeadings(content: string): { h1: string; h2: string; h3: string } {
    const h1: string[] = [];
    const h2: string[] = [];
    const h3: string[] = [];

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith("### ")) {
            h3.push(trimmed.slice(4).trim());
        } else if (trimmed.startsWith("## ")) {
            h2.push(trimmed.slice(3).trim());
        } else if (trimmed.startsWith("# ")) {
            h1.push(trimmed.slice(2).trim());
        }
    }

    return {
        h1: h1.join(" "),
        h2: h2.join(" "),
        h3: h3.join(" "),
    };
}

// ---- Excerpt Extraction ----

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Find excerpts in `content` where any of `terms` appear,
 * and wrap the matched terms in <mark> tags.
 * Returns up to `maxExcerpts` results.
 */
function getExcerpts(
    content: string,
    terms: string[],
    maxExcerpts = 3
): SearchMatch[] {
    if (!terms.length || !content) return [];

    const lines = content.split(/\r?\n/);
    const lowerTerms = terms.map((t) => t.toLowerCase());
    const results: SearchMatch[] = [];

    for (let i = 0; i < lines.length && results.length < maxExcerpts; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        const hasMatch = lowerTerms.some((t) => lowerLine.includes(t));

        if (hasMatch) {
            // Build an excerpt of ~120 chars around the match
            const firstTermIdx = Math.min(
                ...lowerTerms
                    .map((t) => lowerLine.indexOf(t))
                    .filter((idx) => idx !== -1)
            );
            const start = Math.max(0, firstTermIdx - 40);
            const end = Math.min(line.length, firstTermIdx + 80);
            let excerpt = line.substring(start, end);

            // Escape HTML first, then highlight
            excerpt = escapeHtml(excerpt);
            for (const term of lowerTerms) {
                const escapedTerm = escapeHtml(term);
                // Case-insensitive global replace with <mark>
                const regex = new RegExp(
                    escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                    "gi"
                );
                excerpt = excerpt.replace(regex, (match) => `<mark>${match}</mark>`);
            }

            if (start > 0) excerpt = "…" + excerpt;
            if (end < line.length) excerpt = excerpt + "…";

            results.push({ excerpt, lineNumber: i + 1 });
        }
    }

    return results;
}

// ---- Search Engine ----

export class SearchEngine {
    private miniSearch: MiniSearch<IndexedDocument>;
    private indexedPaths: Set<string> = new Set();
    private _isIndexing = false;

    constructor() {
        this.miniSearch = new MiniSearch<IndexedDocument>({
            idField: "path",
            fields: ["basename", "content", "headings1", "headings2", "headings3"],
            storeFields: ["basename"],
            processTerm: (term: string) => term.toLowerCase(),
        });
    }

    get isIndexing(): boolean {
        return this._isIndexing;
    }

    get documentCount(): number {
        return this.indexedPaths.size;
    }

    /**
     * Index all .md files in the vault.
     */
    async indexVault(vaultPath: string): Promise<void> {
        this._isIndexing = true;

        try {
            // Get all files recursively
            const allFiles = await FileSystemAPI.readDirRecursive(vaultPath);
            const mdFiles = allFiles.filter((f) => !f.isDirectory && f.name.endsWith(".md"));

            // Clear existing index
            this.miniSearch = new MiniSearch<IndexedDocument>({
                idField: "path",
                fields: ["basename", "content", "headings1", "headings2", "headings3"],
                storeFields: ["basename"],
                processTerm: (term: string) => term.toLowerCase(),
            });
            this.indexedPaths.clear();

            // Read and index all documents in batches
            const batchSize = 50;
            for (let i = 0; i < mdFiles.length; i += batchSize) {
                const batch = mdFiles.slice(i, i + batchSize);
                const docs: IndexedDocument[] = [];

                for (const file of batch) {
                    const content = await FileSystemAPI.readFile(file.path);
                    if (content === null) continue;

                    const headings = extractHeadings(content);
                    const basename = file.name.replace(/\.md$/, "");

                    docs.push({
                        path: file.path,
                        basename,
                        content,
                        headings1: headings.h1,
                        headings2: headings.h2,
                        headings3: headings.h3,
                    });
                }

                if (docs.length > 0) {
                    this.miniSearch.addAll(docs);
                    docs.forEach((d) => this.indexedPaths.add(d.path));
                }
            }

            console.log(`SearchEngine: Indexed ${this.indexedPaths.size} documents`);
        } finally {
            this._isIndexing = false;
        }
    }

    /**
     * Re-index a single document (after edit or creation).
     */
    async updateDocument(filePath: string, content: string): Promise<void> {
        // Remove old version if it exists
        if (this.indexedPaths.has(filePath)) {
            this.miniSearch.discard(filePath);
            this.indexedPaths.delete(filePath);
        }

        const basename = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "";
        const headings = extractHeadings(content);

        const doc: IndexedDocument = {
            path: filePath,
            basename,
            content,
            headings1: headings.h1,
            headings2: headings.h2,
            headings3: headings.h3,
        };

        this.miniSearch.add(doc);
        this.indexedPaths.add(filePath);
    }

    /**
     * Remove a document from the index.
     */
    removeDocument(filePath: string): void {
        if (this.indexedPaths.has(filePath)) {
            this.miniSearch.discard(filePath);
            this.indexedPaths.delete(filePath);
        }
    }

    /**
     * Search the index with Omnisearch-style options:
     * - BM25 scoring
     * - Fuzzy matching (scaled by term length)
     * - Prefix search
     * - Field boosting (basename 3x, headings 2x)
     */
    async search(query: string): Promise<SearchResultItem[]> {
        if (!query || query.trim().length < 2) return [];

        const rawResults: MiniSearchResult[] = this.miniSearch.search(query, {
            prefix: (term) => term.length >= 1,
            fuzzy: (term) =>
                term.length <= 3 ? 0 : term.length <= 5 ? 0.1 : 0.2,
            boost: {
                basename: 3,
                headings1: 2.5,
                headings2: 2,
                headings3: 1.5,
            },
        });

        // Limit to top 50 results
        const topResults = rawResults.slice(0, 50);

        // Build result items with context excerpts
        const items: SearchResultItem[] = [];

        for (const result of topResults) {
            const filePath = result.id as string;
            const fileName =
                (result.basename as string) ||
                filePath.split("/").pop()?.replace(/\.md$/, "") ||
                filePath;

            // Read content for excerpts
            const content = await FileSystemAPI.readFile(filePath);
            const terms = result.terms || [];
            const excerpts = content ? getExcerpts(content, terms, 3) : [];

            items.push({
                filePath,
                fileName,
                score: result.score,
                matches: excerpts,
            });
        }

        return items;
    }
}

// Module-level singleton so SearchView and SearchPlugin can share it
export const searchEngine = new SearchEngine();
