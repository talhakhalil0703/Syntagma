import { useState, useEffect, useCallback } from "react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { searchEngine, type SearchResultItem } from "./searchEngine";
import { Search as SearchIcon, FileText, Loader } from "lucide-react";

export function SearchView() {
    const { vaultPath, openTab } = useWorkspaceStore();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isIndexing, setIsIndexing] = useState(false);

    // Trigger vault indexing when vaultPath changes
    useEffect(() => {
        if (vaultPath && searchEngine.documentCount === 0) {
            setIsIndexing(true);
            searchEngine.indexVault(vaultPath).then(() => {
                setIsIndexing(false);
            });
        }
    }, [vaultPath]);

    const performSearch = useCallback(
        async (searchQuery: string) => {
            if (!vaultPath) return;
            setIsSearching(true);
            setHasSearched(true);

            const res = await searchEngine.search(searchQuery);
            setResults(res);
            setIsSearching(false);
        },
        [vaultPath]
    );

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (query.trim().length > 1 && vaultPath) {
                performSearch(query);
            } else if (query.trim().length <= 1) {
                setResults([]);
                setHasSearched(false);
            }
        }, 200);

        return () => clearTimeout(debounce);
    }, [query, vaultPath, performSearch]);

    if (!vaultPath) {
        return (
            <div style={{ padding: "16px", color: "var(--text-secondary)", fontSize: "14px", textAlign: "center" }}>
                Open a vault to enable global search.
            </div>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
            }}
        >
            {/* Search Input */}
            <div style={{ padding: "16px", borderBottom: "1px solid var(--bg-border)" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "var(--bg-primary)",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        border: "1px solid var(--bg-border)",
                    }}
                >
                    <SearchIcon size={16} color="var(--text-secondary)" style={{ marginRight: "8px" }} />
                    <input
                        type="text"
                        placeholder="Search across files…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            width: "100%",
                        }}
                    />
                </div>
            </div>

            {/* Results */}
            <div style={{ flexGrow: 1, overflowY: "auto", padding: "16px" }}>
                {isIndexing && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            color: "var(--text-secondary)",
                            fontSize: "13px",
                            padding: "12px",
                        }}
                    >
                        <Loader size={14} className="spin" />
                        Indexing vault…
                    </div>
                )}

                {isSearching && !isIndexing && (
                    <div style={{ color: "var(--text-secondary)", fontSize: "13px", textAlign: "center" }}>
                        Searching…
                    </div>
                )}

                {!isSearching && !isIndexing && hasSearched && results.length === 0 && (
                    <div style={{ color: "var(--text-secondary)", fontSize: "13px", textAlign: "center" }}>
                        No matches found.
                    </div>
                )}

                {!isSearching &&
                    !isIndexing &&
                    results.map((result, i) => (
                        <div key={i} style={{ marginBottom: "16px" }}>
                            {/* File Header */}
                            <div
                                style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: "6px",
                                    wordBreak: "break-all",
                                }}
                            >
                                <span style={{ display: "flex", alignItems: "center" }}>
                                    <FileText size={14} style={{ marginRight: "6px", color: "var(--text-secondary)" }} />
                                    {result.fileName}
                                </span>
                                <span
                                    style={{
                                        fontSize: "10px",
                                        color: "var(--text-muted)",
                                        backgroundColor: "var(--bg-primary)",
                                        padding: "1px 6px",
                                        borderRadius: "3px",
                                        fontWeight: 400,
                                        whiteSpace: "nowrap",
                                        marginLeft: "8px",
                                    }}
                                >
                                    {result.score.toFixed(1)}
                                </span>
                            </div>

                            {/* Excerpts */}
                            {result.matches.map((match, j) => (
                                <div
                                    key={j}
                                    onClick={() => openTab({ id: result.filePath, title: result.fileName + ".md" })}
                                    style={{
                                        fontSize: "13px",
                                        color: "var(--text-secondary)",
                                        backgroundColor: "var(--bg-primary)",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        marginBottom: "4px",
                                        cursor: "pointer",
                                        border: "1px solid var(--bg-border)",
                                        lineHeight: "1.4",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text-accent)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
                                >
                                    <span style={{ color: "var(--text-muted)", marginRight: "8px", fontSize: "11px" }}>
                                        L{match.lineNumber}
                                    </span>
                                    <span dangerouslySetInnerHTML={{ __html: match.excerpt }} />
                                </div>
                            ))}

                            {/* If no excerpts but we have a result (e.g. basename-only match) */}
                            {result.matches.length === 0 && (
                                <div
                                    onClick={() => openTab({ id: result.filePath, title: result.fileName + ".md" })}
                                    style={{
                                        fontSize: "13px",
                                        color: "var(--text-muted)",
                                        backgroundColor: "var(--bg-primary)",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontStyle: "italic",
                                        border: "1px solid var(--bg-border)",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text-accent)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
                                >
                                    Filename match
                                </div>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );
}
