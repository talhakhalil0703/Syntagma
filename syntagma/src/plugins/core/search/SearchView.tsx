import { useState, useEffect } from "react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { FileSystemAPI, type SearchResult } from "../../../utils/fs";
import { Search as SearchIcon, FileText } from "lucide-react";

export function SearchView() {
    const { vaultPath, openTab } = useWorkspaceStore();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (query.trim().length > 1 && vaultPath) {
                performSearch(query);
            } else if (query.trim().length <= 1) {
                setResults([]);
                setHasSearched(false);
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [query, vaultPath]);

    const performSearch = async (searchQuery: string) => {
        if (!vaultPath) return;
        setIsSearching(true);
        setHasSearched(true);

        const res = await FileSystemAPI.searchVault(vaultPath, searchQuery);
        setResults(res);
        setIsSearching(false);
    };

    if (!vaultPath) {
        return (
            <div style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
                Open a vault to enable global search.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--bg-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--bg-border)' }}>
                    <SearchIcon size={16} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
                    <input
                        type="text"
                        placeholder="Search across files..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            width: '100%'
                        }}
                    />
                </div>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px' }}>
                {isSearching && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
                        Searching...
                    </div>
                )}

                {!isSearching && hasSearched && results.length === 0 && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
                        No matches found.
                    </div>
                )}

                {!isSearching && results.map((result, i) => (
                    <div key={i} style={{ marginBottom: '16px' }}>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '6px',
                            wordBreak: 'break-all'
                        }}>
                            <FileText size={14} style={{ marginRight: '6px', color: 'var(--text-secondary)' }} />
                            {result.fileName}
                        </div>

                        {result.matches.map((match, j) => (
                            <div
                                key={j}
                                onClick={() => openTab({ id: result.filePath, title: result.fileName })}
                                style={{
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    backgroundColor: 'var(--bg-primary)',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    marginBottom: '4px',
                                    cursor: 'pointer',
                                    border: '1px solid var(--bg-border)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-accent)'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--bg-border)'}
                            >
                                <span style={{ color: 'var(--text-muted)', marginRight: '8px', fontSize: '11px' }}>
                                    L{match.lineNumber}
                                </span>
                                {match.excerpt}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
