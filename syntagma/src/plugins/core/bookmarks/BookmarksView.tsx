import { useBookmarksStore } from "./bookmarksStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { Bookmark, X } from "lucide-react";
import { useEffect } from "react";

export function BookmarksView() {
    const { bookmarks, removeBookmark, loadBookmarks } = useBookmarksStore();
    const { openTab, vaultPath } = useWorkspaceStore();

    useEffect(() => {
        if (vaultPath) {
            loadBookmarks();
        }
    }, [vaultPath, loadBookmarks]);

    if (!vaultPath) {
        return (
            <div style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
                Open a vault to view bookmarks.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bookmark size={14} color="var(--text-secondary)" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Bookmarks
                </span>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '8px' }}>
                {bookmarks.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '16px', padding: '0 16px' }}>
                        No bookmarks added yet. Open a file and use the Command Palette to bookmark it.
                    </div>
                )}

                {bookmarks.map((bookmark) => (
                    <div
                        key={bookmark.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            marginBottom: '2px',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => openTab({ id: bookmark.id, title: bookmark.title })}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <Bookmark size={14} color="var(--text-accent)" style={{ flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {bookmark.title}
                            </span>
                        </div>

                        <div
                            style={{ padding: '2px', borderRadius: '4px', color: 'var(--text-muted)' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                removeBookmark(bookmark.id);
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-muted)';
                            }}
                        >
                            <X size={14} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
