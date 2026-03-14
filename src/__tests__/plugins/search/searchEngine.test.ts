import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the FileSystemAPI before importing SearchEngine
vi.mock("../../../utils/fs", () => ({
    FileSystemAPI: {
        readDirRecursive: vi.fn(),
        readFile: vi.fn(),
    },
}));

import { SearchEngine } from "../../../plugins/core/search/searchEngine";
import { FileSystemAPI } from "../../../utils/fs";

const mockReadDirRecursive = vi.mocked(FileSystemAPI.readDirRecursive);
const mockReadFile = vi.mocked(FileSystemAPI.readFile);

// Sample vault documents
const sampleDocs = [
    {
        name: "React Guide.md",
        path: "/vault/React Guide.md",
        content: "# React Guide\n\nReact is a JavaScript library for building user interfaces.\n\n## Components\n\nComponents let you split the UI into independent, reusable pieces.",
    },
    {
        name: "Obsidian Notes.md",
        path: "/vault/Obsidian Notes.md",
        content: "# Obsidian Notes\n\nObsidian is a knowledge management tool.\n\n## Features\n\nIt supports markdown, wikilinks, and graph views.\n\n### Plugins\n\nPlugins extend Obsidian with additional features.",
    },
    {
        name: "Daily Log.md",
        path: "/vault/Daily Log.md",
        content: "# Daily Log\n\nToday I worked on the React project.\n\nI also reviewed some Obsidian plugins.\n\n## Tasks\n\n- Fix the search plugin\n- Write unit tests",
    },
    {
        name: "Random Thoughts.md",
        path: "/vault/Random Thoughts.md",
        content: "# Random Thoughts\n\nSometimes I think about markdown editors.\n\nThey are interesting tools for writing.",
    },
];

function setupMocks() {
    mockReadDirRecursive.mockResolvedValue(
        sampleDocs.map((d) => ({
            name: d.name,
            path: d.path,
            isDirectory: false,
        }))
    );
    mockReadFile.mockImplementation(async (filePath: string) => {
        const doc = sampleDocs.find((d) => d.path === filePath);
        return doc ? doc.content : null;
    });
}

describe("SearchEngine", () => {
    let engine: SearchEngine;

    beforeEach(() => {
        vi.clearAllMocks();
        engine = new SearchEngine();
        setupMocks();
    });

    describe("indexVault", () => {
        it("should index all .md files in the vault", async () => {
            await engine.indexVault("/vault");

            expect(mockReadDirRecursive).toHaveBeenCalledWith("/vault");
            expect(engine.documentCount).toBe(4);
            expect(engine.isIndexing).toBe(false);
        });

        it("should set isIndexing to true during indexing", async () => {
            const indexPromise = engine.indexVault("/vault");
            // The flag is set immediately before async work
            expect(engine.isIndexing).toBe(true);

            await indexPromise;
            expect(engine.isIndexing).toBe(false);
        });

        it("should skip non-.md files", async () => {
            mockReadDirRecursive.mockResolvedValue([
                { name: "image.png", path: "/vault/image.png", isDirectory: false },
                { name: "note.md", path: "/vault/note.md", isDirectory: false },
            ]);
            mockReadFile.mockResolvedValue("# Test Note\n\nHello world");

            await engine.indexVault("/vault");
            expect(engine.documentCount).toBe(1);
        });
    });

    describe("search", () => {
        beforeEach(async () => {
            await engine.indexVault("/vault");
        });

        it("should return results ranked by relevance", async () => {
            const results = await engine.search("react");

            expect(results.length).toBeGreaterThan(0);
            // "React Guide" should rank highest because "react" appears in the basename
            expect(results[0].fileName).toBe("React Guide");
        });

        it("should return empty array for short queries", async () => {
            const results = await engine.search("a");
            expect(results).toEqual([]);
        });

        it("should return empty array for empty queries", async () => {
            const results = await engine.search("");
            expect(results).toEqual([]);
        });

        it("should boost basename matches over content matches", async () => {
            const results = await engine.search("obsidian");

            // "Obsidian Notes" has "Obsidian" in its basename, should rank highest
            expect(results[0].fileName).toBe("Obsidian Notes");
        });

        it("should support prefix search", async () => {
            const results = await engine.search("mark");

            // Should match "markdown" in multiple docs
            expect(results.length).toBeGreaterThan(0);
        });

        it("should support fuzzy search for longer terms", async () => {
            // "obsidain" is a typo of "obsidian" (edit distance 1 in a 8-char word)
            const results = await engine.search("obsidain");

            expect(results.length).toBeGreaterThan(0);
        });

        it("should return context excerpts with match highlights", async () => {
            const results = await engine.search("react");

            const reactGuide = results.find((r) => r.fileName === "React Guide");
            expect(reactGuide).toBeDefined();
            expect(reactGuide!.matches.length).toBeGreaterThan(0);

            // Excerpts should contain <mark> tags
            const hasHighlight = reactGuide!.matches.some((m) => m.excerpt.includes("<mark>"));
            expect(hasHighlight).toBe(true);
        });

        it("should include line numbers in excerpts", async () => {
            const results = await engine.search("react");

            const reactGuide = results.find((r) => r.fileName === "React Guide");
            expect(reactGuide).toBeDefined();
            expect(reactGuide!.matches[0].lineNumber).toBeGreaterThan(0);
        });

        it("should limit results to 50", async () => {
            // We only have 4 docs, so this tests the code path but won't hit 50
            const results = await engine.search("the");
            expect(results.length).toBeLessThanOrEqual(50);
        });
    });

    describe("updateDocument", () => {
        beforeEach(async () => {
            await engine.indexVault("/vault");
        });

        it("should update a document in the index", async () => {
            // Update "React Guide" to mention "Vue" instead
            await engine.updateDocument(
                "/vault/React Guide.md",
                "# Vue Guide\n\nVue is a progressive JavaScript framework."
            );

            // "Vue" should now be found
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath === "/vault/React Guide.md") {
                    return "# Vue Guide\n\nVue is a progressive JavaScript framework.";
                }
                return sampleDocs.find((d) => d.path === filePath)?.content ?? null;
            });

            const vueResults = await engine.search("vue");
            expect(vueResults.length).toBeGreaterThan(0);

            expect(engine.documentCount).toBe(4); // Count unchanged
        });
    });

    describe("removeDocument", () => {
        beforeEach(async () => {
            await engine.indexVault("/vault");
        });

        it("should remove a document from the index", () => {
            engine.removeDocument("/vault/React Guide.md");
            expect(engine.documentCount).toBe(3);
        });

        it("should be a no-op for non-existent paths", () => {
            engine.removeDocument("/vault/nonexistent.md");
            expect(engine.documentCount).toBe(4);
        });
    });
});
