import { useGitStore } from "./gitStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { GitBranch, GitCommit, RefreshCw, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";

export function GitView() {
    const {
        isGitRepo,
        currentBranch,
        uncommittedFiles,
        lastSyncTime,
        isSyncing,
        checkStatus,
        stageAll,
        commit,
        push,
        pull,
        sync
    } = useGitStore();

    const { vaultPath } = useWorkspaceStore();
    const [commitMsg, setCommitMsg] = useState("");

    // Setup an interval to poll git status if we are in a repo
    useEffect(() => {
        if (!vaultPath) return;

        checkStatus();

        // Background poll every minute to see if files changed
        const interval = setInterval(() => {
            if (!isSyncing) {
                checkStatus();
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [vaultPath, checkStatus, isSyncing]);

    if (!vaultPath) {
        return (
            <div style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
                Open a vault to manage version control.
            </div>
        );
    }

    if (!isGitRepo) {
        return (
            <div style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <GitBranch size={24} style={{ margin: '0 auto', color: 'var(--text-muted)' }} />
                <span>Current vault is not initialized as a Git Repository.</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Open your terminal and run <code style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>git init</code> inside your vault path to enable automated syncing.
                </span>
            </div>
        );
    }

    const timeString = lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Never";

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GitBranch size={14} color="var(--text-accent)" />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {currentBranch}
                    </span>
                </div>
                <div
                    title="Refresh Status"
                    style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                    onClick={() => checkStatus()}
                >
                    <RefreshCw size={14} className={isSyncing ? "spinning" : ""} />
                </div>
            </div>

            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                    disabled={isSyncing}
                    onClick={() => sync()}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--text-accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isSyncing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        opacity: isSyncing ? 0.6 : 1
                    }}
                >
                    {isSyncing ? <RefreshCw size={14} className="spinning" /> : <UploadCloud size={14} />}
                    {isSyncing ? 'Syncing...' : 'Sync Vault'}
                </button>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Last Sync: {timeString}
                </div>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', padding: '0 8px', textTransform: 'uppercase' }}>
                    Changes ({uncommittedFiles.length})
                </div>

                {uncommittedFiles.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '16px', padding: '0 16px' }}>
                        No changes detected. Working tree clean.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {uncommittedFiles.map((file, idx) => {
                            let color = 'var(--text-secondary)';
                            let badge = 'M';
                            if (file.status === 'added' || file.status === 'untracked') { color = 'var(--text-success)'; badge = 'U'; }
                            if (file.status === 'deleted') { color = 'var(--text-error)'; badge = 'D'; }

                            return (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '4px 8px',
                                    fontSize: '13px',
                                    borderRadius: '4px',
                                    cursor: 'default',
                                }}>
                                    <span style={{ color, fontSize: '10px', fontWeight: 700, minWidth: '12px', textAlign: 'center' }}>{badge}</span>
                                    <span style={{ color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {file.path}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {uncommittedFiles.length > 0 && (
                <div style={{ padding: '8px', borderTop: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input
                        type="text"
                        value={commitMsg}
                        onChange={(e) => setCommitMsg(e.target.value)}
                        placeholder="Commit message..."
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--bg-border)',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            outline: 'none',
                        }}
                    />
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            onClick={async () => {
                                await stageAll();
                                await commit(commitMsg || "Update files");
                                setCommitMsg("");
                            }}
                            style={{
                                flex: 1,
                                padding: '4px',
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--bg-border)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                        >
                            <GitCommit size={12} />
                            Commit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
