import { useGitStore } from "./gitStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { GitBranch, GitCommit, RefreshCw, UploadCloud, Plus, Minus, AlertTriangle, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export function GitChangesView() {
    const {
        isGitRepo,
        currentBranch,
        uncommittedFiles,
        lastSyncTime,
        isSyncing,
        hasConflicts,
        history,
        branches,
        checkStatus,
        stageAll,
        stageFile,
        unstageFile,
        commit,
        sync,
        abortMerge,
        push,
        pull
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
            <div style={{ padding: '32px', color: 'var(--text-secondary)', fontSize: '16px', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Open a vault to manage version control.
            </div>
        );
    }

    if (!isGitRepo) {
        return (
            <div style={{ padding: '32px', color: 'var(--text-secondary)', fontSize: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <GitBranch size={48} style={{ margin: '0 auto', color: 'var(--text-muted)' }} />
                <span>Current vault is not initialized as a Git Repository.</span>
                <button
                    onClick={() => useGitStore.getState().initRepo()}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--text-accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    Initialize Repository
                </button>
            </div>
        );
    }

    const timeString = lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Never";

    const stagedFiles = uncommittedFiles.filter(f => f.staged);
    const unstagedFiles = uncommittedFiles.filter(f => !f.staged && f.status !== 'conflict');
    const conflictedFiles = uncommittedFiles.filter(f => f.status === 'conflict');

    return (
        <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            
            {/* Left Panel: Changes & Commit */}
            <div style={{ flex: '0 0 350px', borderRight: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GitBranch size={16} color="var(--text-accent)" />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {currentBranch}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div title="Pull" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => pull()}>
                            <ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} />
                        </div>
                        <div title="Push" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => push()}>
                            <ArrowRight size={16} style={{ transform: 'rotate(-90deg)' }} />
                        </div>
                        <div title="Refresh Status" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => checkStatus()}>
                            <RefreshCw size={16} className={isSyncing ? "spinning" : ""} />
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        disabled={isSyncing}
                        onClick={() => sync()}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--text-accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isSyncing ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: 500,
                            opacity: isSyncing ? 0.6 : 1
                        }}
                    >
                        {isSyncing ? <RefreshCw size={16} className="spinning" /> : <UploadCloud size={16} />}
                        {isSyncing ? 'Syncing...' : 'Sync Vault'}
                    </button>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Last Sync: {timeString}
                    </div>
                </div>

                {hasConflicts && (
                    <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-error)', fontWeight: 600, fontSize: '13px' }}>
                            <AlertTriangle size={16} /> Merge Conflicts Detected
                        </div>
                        <button
                            onClick={() => abortMerge()}
                            style={{ padding: '4px 8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--text-error)', color: 'var(--text-error)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                        >
                            Abort Merge
                        </button>
                    </div>
                )}

                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px' }}>
                    
                    {/* Conflicted Files Section */}
                    {conflictedFiles.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-error)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                Conflicted Changes ({conflictedFiles.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {conflictedFiles.map((file, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--bg-border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                            <span style={{ color: 'var(--text-error)', fontSize: '11px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>C</span>
                                            <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.path}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Staged Changes Section */}
                    {stagedFiles.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                Staged Changes ({stagedFiles.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {stagedFiles.map((file, idx) => {
                                    let color = 'var(--text-success)';
                                    let badge = 'M';
                                    if (file.status === 'added' || file.status === 'untracked') badge = 'A';
                                    if (file.status === 'deleted') { color = 'var(--text-error)'; badge = 'D'; }

                                    return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--bg-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                <span style={{ color, fontSize: '11px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>{badge}</span>
                                                <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.path}</span>
                                            </div>
                                            <div title="Unstage" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => unstageFile(file.path)}>
                                                <Minus size={14} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Unstaged Changes Section */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                Changes ({unstagedFiles.length})
                            </div>
                            {unstagedFiles.length > 0 && (
                                <div title="Stage All" style={{ cursor: 'pointer', color: 'var(--text-accent)' }} onClick={() => stageAll()}>
                                    <Plus size={14} />
                                </div>
                            )}
                        </div>

                        {unstagedFiles.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '8px' }}>
                                Working tree clean.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {unstagedFiles.map((file, idx) => {
                                    let color = 'var(--text-secondary)';
                                    let badge = 'M';
                                    if (file.status === 'added' || file.status === 'untracked') { color = 'var(--text-success)'; badge = 'U'; }
                                    if (file.status === 'deleted') { color = 'var(--text-error)'; badge = 'D'; }

                                    return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--bg-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                <span style={{ color, fontSize: '11px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>{badge}</span>
                                                <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.path}</span>
                                            </div>
                                            <div title="Stage" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => stageFile(file.path)}>
                                                <Plus size={14} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {stagedFiles.length > 0 && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-primary)' }}>
                        <textarea
                            value={commitMsg}
                            onChange={(e) => setCommitMsg(e.target.value)}
                            placeholder="Commit message..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--bg-border)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                outline: 'none',
                                resize: 'none'
                            }}
                        />
                        <button
                            onClick={async () => {
                                await commit(commitMsg || "Update files");
                                setCommitMsg("");
                            }}
                            disabled={!commitMsg.trim()}
                            style={{
                                padding: '8px',
                                backgroundColor: commitMsg.trim() ? 'var(--text-accent)' : 'var(--bg-tertiary)',
                                color: commitMsg.trim() ? 'white' : 'var(--text-muted)',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: commitMsg.trim() ? 'pointer' : 'not-allowed',
                                fontSize: '13px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <GitCommit size={14} />
                            Commit Staged
                        </button>
                    </div>
                )}
            </div>

            {/* Right Panel: History & Branches */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>Repository Overview</h2>
                
                <div style={{ display: 'flex', gap: '32px' }}>
                    
                    {/* Commits List */}
                    <div style={{ flex: 2 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <GitCommit size={16} /> Recent Commits
                        </h3>
                        {history.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No commits found.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {history.map((log, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => {
                                            useWorkspaceStore.getState().openTab({ id: `git-commit-${log.hash}`, title: `Commit: ${log.hash.substring(0,7)}` });
                                        }}
                                        style={{ display: 'flex', flexDirection: 'column', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--bg-border)', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{log.message}</span>
                                            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-accent)', backgroundColor: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>{log.hash}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                                            <span>{log.author}</span>
                                            <span>{log.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Branches List */}
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <GitBranch size={16} /> Branches
                        </h3>
                        {branches.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No branches found.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {branches.map((b, idx) => (
                                    <div key={idx} style={{ 
                                        display: 'flex', alignItems: 'center', gap: '8px', 
                                        padding: '10px 12px', 
                                        backgroundColor: b.current ? 'rgba(78, 172, 248, 0.1)' : 'var(--bg-secondary)', 
                                        borderRadius: '8px', 
                                        border: `1px solid ${b.current ? 'var(--text-accent)' : 'var(--bg-border)'}` 
                                    }}>
                                        <GitBranch size={14} color={b.current ? 'var(--text-accent)' : 'var(--text-muted)'} />
                                        <span style={{ fontSize: '13px', fontWeight: b.current ? 600 : 400, color: b.current ? 'var(--text-accent)' : 'var(--text-primary)' }}>
                                            {b.name}
                                        </span>
                                        {b.current && (
                                            <span style={{ marginLeft: 'auto', fontSize: '10px', backgroundColor: 'var(--text-accent)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>ACTIVE</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
            
        </div>
    );
}
