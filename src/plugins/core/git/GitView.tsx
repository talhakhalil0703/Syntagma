import { useGitStore } from "./gitStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { GitBranch, GitCommit, RefreshCw, UploadCloud, AlertTriangle, Maximize2, Plus, Minus } from "lucide-react";
import { useEffect, useState } from "react";

export function GitView() {
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
    } = useGitStore();

    const { vaultPath } = useWorkspaceStore();
    const [commitMsg, setCommitMsg] = useState("");
    const [activeTab, setActiveTab] = useState<"changes" | "history" | "branches">("changes");

    useEffect(() => {
        if (!vaultPath) return;
        checkStatus();
        const interval = setInterval(() => { if (!isSyncing) checkStatus(); }, 60000);
        return () => clearInterval(interval);
    }, [vaultPath, checkStatus, isSyncing]);

    if (!vaultPath) {
        return <div style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>Open a vault to manage version control.</div>;
    }

    if (!isGitRepo) {
        return (
            <div style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <GitBranch size={24} style={{ margin: '0 auto', color: 'var(--text-muted)' }} />
                <span>Current vault is not initialized as a Git Repository.</span>
                <button onClick={() => useGitStore.getState().initRepo()} style={{ padding: '6px 12px', backgroundColor: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            
            {/* Header */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GitBranch size={14} color="var(--text-accent)" />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {currentBranch}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div title="Open Full Editor View" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => {
                        useWorkspaceStore.getState().openTab({ id: "git-changes-view", title: "Git Changes" });
                    }}>
                        <Maximize2 size={14} />
                    </div>
                    <div title="Refresh Status" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => checkStatus()}>
                        <RefreshCw size={14} className={isSyncing ? "spinning" : ""} />
                    </div>
                </div>
            </div>

            {/* Sync Banner */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                    disabled={isSyncing}
                    onClick={() => sync()}
                    style={{ padding: '6px 12px', backgroundColor: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: isSyncing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, opacity: isSyncing ? 0.6 : 1 }}
                >
                    {isSyncing ? <RefreshCw size={14} className="spinning" /> : <UploadCloud size={14} />}
                    {isSyncing ? 'Syncing...' : 'Sync Vault'}
                </button>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>Last Sync: {timeString}</div>
            </div>

            {/* Conflict Banner */}
            {hasConflicts && (
                <div style={{ padding: '8px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-error)', fontWeight: 600, fontSize: '11px' }}>
                        <AlertTriangle size={14} /> Conflicts Detected
                    </div>
                    <button onClick={() => abortMerge()} style={{ padding: '4px 8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--text-error)', color: 'var(--text-error)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Abort Merge</button>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)' }}>
                {(["changes", "history", "branches"] as const).map(tab => (
                    <div key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', color: activeTab === tab ? 'var(--text-accent)' : 'var(--text-muted)', borderBottom: activeTab === tab ? '2px solid var(--text-accent)' : '2px solid transparent' }}>
                        {tab}
                        {tab === 'changes' && uncommittedFiles.length > 0 && ` (${uncommittedFiles.length})`}
                    </div>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '8px' }}>
                {activeTab === "changes" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {uncommittedFiles.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>Working tree clean.</div>
                        ) : (
                            <>
                                {conflictedFiles.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-error)', marginBottom: '4px', textTransform: 'uppercase' }}>Conflicted</div>
                                        {conflictedFiles.map(f => (
                                            <div key={f.path} style={{ display: 'flex', alignItems: 'center', padding: '4px', fontSize: '11px', gap: '6px' }}>
                                                <span style={{ color: 'var(--text-error)', fontWeight: 'bold' }}>C</span> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {stagedFiles.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Staged</div>
                                        {stagedFiles.map(f => (
                                            <div key={f.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px', fontSize: '11px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', marginBottom: '2px' }}>
                                                <div style={{ display: 'flex', gap: '6px', overflow: 'hidden' }}>
                                                    <span style={{ color: 'var(--text-success)', fontWeight: 'bold' }}>{f.status === 'deleted' ? 'D' : (f.status === 'added' || f.status === 'untracked' ? 'A' : 'M')}</span>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</span>
                                                </div>
                                                <Minus size={12} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => unstageFile(f.path)} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {unstagedFiles.length > 0 && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unstaged</div>
                                            <div title="Stage All" style={{ cursor: 'pointer', color: 'var(--text-accent)' }} onClick={() => stageAll()}>
                                                <Plus size={12} />
                                            </div>
                                        </div>
                                        {unstagedFiles.map(f => (
                                            <div key={f.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px', fontSize: '11px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', marginBottom: '2px' }}>
                                                <div style={{ display: 'flex', gap: '6px', overflow: 'hidden' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>{f.status === 'deleted' ? 'D' : (f.status === 'added' || f.status === 'untracked' ? 'U' : 'M')}</span>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</span>
                                                </div>
                                                <Plus size={12} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => stageFile(f.path)} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === "history" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {history.length === 0 ? <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No history found.</div> : history.map((h, i) => (
                            <div 
                                key={i} 
                                onClick={() => {
                                    useWorkspaceStore.getState().openTab({ id: `git-commit-${h.hash}`, title: `Commit: ${h.hash.substring(0,7)}` });
                                }}
                                style={{ padding: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--bg-border)', fontSize: '11px', cursor: 'pointer' }}
                            >
                                <div style={{ fontWeight: 500, marginBottom: '4px' }}>{h.message}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                    <span>{h.author}</span>
                                    <span style={{ fontFamily: 'monospace' }}>{h.hash}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === "branches" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {branches.length === 0 ? <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No branches found.</div> : branches.map((b, i) => (
                            <div key={i} style={{ padding: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', backgroundColor: b.current ? 'rgba(78, 172, 248, 0.1)' : 'var(--bg-primary)', border: `1px solid ${b.current ? 'var(--text-accent)' : 'var(--bg-border)'}`, borderRadius: '4px' }}>
                                <GitBranch size={12} color={b.current ? 'var(--text-accent)' : 'var(--text-muted)'} />
                                <span style={{ fontWeight: b.current ? 600 : 400, color: b.current ? 'var(--text-accent)' : 'var(--text-primary)' }}>{b.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Commit UI */}
            {activeTab === 'changes' && stagedFiles.length > 0 && (
                <div style={{ padding: '8px', borderTop: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'var(--bg-primary)' }}>
                    <input
                        type="text"
                        value={commitMsg}
                        onChange={(e) => setCommitMsg(e.target.value)}
                        placeholder="Commit message..."
                        style={{ width: '100%', padding: '6px 8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none' }}
                    />
                    <button
                        disabled={!commitMsg.trim() || isSyncing}
                        onClick={async () => {
                            await commit(commitMsg || "Update files");
                            setCommitMsg("");
                        }}
                        style={{ padding: '6px', backgroundColor: commitMsg.trim() ? 'var(--text-accent)' : 'var(--bg-tertiary)', color: commitMsg.trim() ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: '4px', cursor: commitMsg.trim() ? 'pointer' : 'not-allowed', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 500 }}
                    >
                        <GitCommit size={12} /> Commit Staged
                    </button>
                </div>
            )}
        </div>
    );
}
