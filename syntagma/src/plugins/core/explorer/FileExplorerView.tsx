import React, { useEffect, useState } from "react";
import { FileSystemAPI, type DirEntry } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { ChevronRight, ChevronDown, File, FolderOpen } from "lucide-react";

export const FileExplorerView: React.FC = () => {
    const { vaultPath, openVault } = useWorkspaceStore();
    const [entries, setEntries] = useState<DirEntry[]>([]);

    useEffect(() => {
        const loadVault = async () => {
            if (vaultPath) {
                const items = await FileSystemAPI.readDir(vaultPath);
                // Filter out hidden files like .syntagma or .git
                const visible = items.filter(i => !i.name.startsWith('.'));
                // Sort directories first, then alphabetical
                visible.sort((a, b) => {
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                });
                setEntries(visible);
            } else {
                setEntries([]);
            }
        };
        loadVault();
    }, [vaultPath]);

    if (!vaultPath) {
        return (
            <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                <FolderOpen size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                <p>No Vault selected.</p>
                <button
                    onClick={openVault}
                    style={{
                        marginTop: "8px",
                        padding: "6px 12px",
                        backgroundColor: "var(--bg-tertiary)",
                        border: "1px solid var(--bg-border)",
                        borderRadius: "4px",
                        color: "var(--text-primary)",
                        cursor: "pointer"
                    }}
                >
                    Open Folder
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: "8px 0", userSelect: "none" }}>
            <div style={{ padding: "0 12px 8px 12px", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {vaultPath ? vaultPath.split('/').pop() : "Vault"}
            </div>
            {entries.map(entry => (
                <FileTreeItem key={entry.path} entry={entry} depth={0} />
            ))}
        </div>
    );
};

const FileTreeItem: React.FC<{ entry: DirEntry; depth: number }> = ({ entry, depth }) => {
    const [expanded, setExpanded] = useState(false);
    const [children, setChildren] = useState<DirEntry[]>([]);
    const { openTab } = useWorkspaceStore();

    const handleClick = async () => {
        if (entry.isDirectory) {
            if (!expanded && children.length === 0) {
                const items = await FileSystemAPI.readDir(entry.path);
                const visible = items.filter(i => !i.name.startsWith('.')).sort((a, b) => {
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                });
                setChildren(visible);
            }
            setExpanded(!expanded);
        } else {
            // It's a file, open it in a tab
            if (entry.name.endsWith('.md')) {
                openTab({ id: entry.path, title: entry.name });
            }
        }
    };

    const indent = depth * 16 + 12;

    return (
        <div>
            <div
                onClick={handleClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: `4px 12px 4px ${indent}px`,
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                }}
                className="file-explorer-item"
            >
                {entry.isDirectory ? (
                    expanded ? <ChevronDown size={14} style={{ marginRight: '4px', color: 'var(--text-secondary)' }} /> : <ChevronRight size={14} style={{ marginRight: '4px', color: 'var(--text-secondary)' }} />
                ) : (
                    <File size={14} style={{ marginRight: '4px', visibility: 'hidden' }} /> // Spacer to align text
                )}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.name}
                </span>
            </div>
            {expanded && children.map(child => (
                <FileTreeItem key={child.path} entry={child} depth={depth + 1} />
            ))}
        </div>
    );
};
