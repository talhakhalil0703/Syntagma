import { useEffect, useState, useMemo } from "react";
import { useDataviewStore, type DatabaseRow } from "./dataviewStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { Search, Database, FileText } from "lucide-react";

export function DataviewPane() {
    const { queryVault, parseFrontmatter } = useDataviewStore();
    const [query, setQuery] = useState("");
    const [rows, setRows] = useState<DatabaseRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Auto-refresh when workspace vaultPath changes
    const vaultPath = useWorkspaceStore(state => state.vaultPath);

    useEffect(() => {
        let isMounted = true;

        async function fetch() {
            if (!vaultPath) return;
            setIsLoading(true);
            const results = await queryVault(query);
            if (isMounted) {
                setRows(results);
                setIsLoading(false);
            }
        }

        // Debounce search input
        const timeoutId = setTimeout(fetch, 300);
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [query, vaultPath, parseFrontmatter, queryVault]);

    // Extract unique column keys from all current rows
    const columns = useMemo(() => {
        const keySet = new Set<string>();
        keySet.add("fileName"); // Base core column

        rows.forEach(row => {
            Object.keys(row).forEach(key => {
                if (key !== "filePath" && key !== "fileName") {
                    keySet.add(key);
                }
            });
        });

        return Array.from(keySet);
    }, [rows]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Search Header */}
            <div style={{ padding: '12px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center' }}>
                <Search size={14} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
                <input
                    type="text"
                    placeholder="tag:#todo folder:Notes"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        width: '100%',
                        backgroundColor: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                    }}
                />
            </div>

            {/* Dataview Statistics Bar */}
            <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{isLoading ? "Querying Vault..." : `${rows.length} records`}</span>
                {!parseFrontmatter && <span style={{ color: 'var(--text-accent)' }}>YAML Parser Disabled</span>}
            </div>

            {/* Scrollable Table View */}
            <div style={{ flexGrow: 1, overflow: 'auto' }}>
                {rows.length === 0 && !isLoading && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <Database size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <br />
                        No records match this query.
                    </div>
                )}

                {rows.length > 0 && (
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '13px',
                        textAlign: 'left'
                    }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
                            <tr>
                                {columns.map(col => (
                                    <th
                                        key={col}
                                        style={{
                                            padding: '8px 12px',
                                            borderBottom: '1px solid var(--bg-border)',
                                            borderRight: '1px solid var(--bg-border)',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            textTransform: 'capitalize',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr
                                    key={idx}
                                    style={{
                                        borderBottom: '1px solid var(--bg-border)',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => {
                                        useWorkspaceStore.getState().openTab({
                                            id: row.filePath,
                                            title: row.fileName
                                        });
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    {columns.map(col => {
                                        const cellData = row[col];
                                        // Complex types (like arrays of tags) need stringification
                                        const renderData = Array.isArray(cellData)
                                            ? cellData.join(", ")
                                            : (typeof cellData === 'boolean' ? (cellData ? 'true' : 'false') : cellData);

                                        return (
                                            <td
                                                key={`${idx}-${col}`}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRight: '1px solid var(--bg-border)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: '200px'
                                                }}
                                            >
                                                {col === 'fileName' ? (
                                                    <span style={{ display: 'flex', alignItems: 'center' }}>
                                                        <FileText size={12} color="var(--text-accent)" style={{ marginRight: '6px' }} />
                                                        {renderData}
                                                    </span>
                                                ) : (
                                                    renderData
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
