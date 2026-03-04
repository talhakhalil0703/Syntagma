import { useEffect, useState, useRef } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { Search, File, Command as CommandIcon } from "lucide-react";
import { FileSystemAPI } from "../utils/fs";
import { fuzzyMatch } from "../utils/search";

export function CommandPalette() {
    const { isCommandPaletteOpen, isQuickOpen, closeCommandPalette, commands } = useSettingsStore();
    const { openTab, vaultPath } = useWorkspaceStore();
    const [query, setQuery] = useState("");
    const [files, setFiles] = useState<{ id: string, title: string }[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch files dynamically when Quick Open is activated
    useEffect(() => {
        let isMounted = true;

        async function fetchFiles() {
            if (isCommandPaletteOpen && isQuickOpen && vaultPath) {
                const entries = await FileSystemAPI.readDirRecursive(vaultPath);
                if (!isMounted) return;

                const mdFiles = entries
                    .filter(e => e.name.endsWith('.md'))
                    .map(e => {
                        // Create a title relative to the vault path
                        let relPath = e.path;
                        if (relPath.startsWith(vaultPath)) {
                            relPath = relPath.substring(vaultPath.length);
                            if (relPath.startsWith('/') || relPath.startsWith('\\')) {
                                relPath = relPath.substring(1);
                            }
                        }
                        return { id: e.path, title: relPath || e.name };
                    });

                setFiles(mdFiles);
            }
        }

        fetchFiles();

        return () => { isMounted = false; };
    }, [isCommandPaletteOpen, isQuickOpen, vaultPath]);

    const commandItems = commands.map(c => ({
        id: c.id,
        title: c.name,
        action: c.callback
    }));

    const fileItems = files.map(f => ({
        id: f.id,
        title: f.title,
        action: () => openTab({ id: f.id, title: f.title.split('/').pop() || f.title })
    }));

    const results = isQuickOpen ? fileItems : commandItems;
    const filteredResults = results.filter(item => fuzzyMatch(query, item.title));

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+P or Ctrl+P
            if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
                e.preventDefault();
                useSettingsStore.getState().openCommandPalette(false);
            }
            // Cmd+O or Ctrl+O
            if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
                e.preventDefault();
                useSettingsStore.getState().openCommandPalette(true);
            }
            if (e.key === 'Escape') {
                closeCommandPalette();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isCommandPaletteOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery(""); // clear on open
        }
    }, [isCommandPaletteOpen]);

    if (!isCommandPaletteOpen) return null;

    return (
        <div
            className="modal-overlay"
            onClick={closeCommandPalette}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '15vh',
                zIndex: 1000,
                WebkitAppRegion: 'no-drag' // electron
            } as any}
        >
            <div
                className="command-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '600px',
                    maxHeight: '400px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid var(--bg-border)',
                    overflow: 'hidden'
                } as any}
            >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', gap: '8px' } as any}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={isQuickOpen ? "Find file..." : "Type a command..."}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        style={{
                            flexGrow: 1,
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '16px'
                        } as any}
                    />
                </div>

                <div style={{ overflowY: 'auto', flexGrow: 1, padding: '8px' }}>
                    {filteredResults.map(item => (
                        <div
                            key={item.id}
                            style={{
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                color: 'var(--text-primary)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => {
                                item.action();
                                closeCommandPalette();
                            }}
                        >
                            {isQuickOpen ? <File size={16} color="var(--text-secondary)" /> : <CommandIcon size={16} color="var(--text-secondary)" />}
                            {item.title}
                        </div>
                    ))}
                    {filteredResults.length === 0 && (
                        <div style={{ padding: '16px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            No results found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
