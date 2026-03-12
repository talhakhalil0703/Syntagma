import { useEffect, useState } from "react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { FileSystemAPI } from "../../../utils/fs";
import { Editor } from "../../../components/Editor";

export function GitCommitView({ tabId }: { tabId?: string }) {
    const hash = tabId ? tabId.replace("git-commit-", "") : "";
    const [diff, setDiff] = useState<string>("Loading diff...");
    const vaultPath = useWorkspaceStore(state => state.vaultPath);

    useEffect(() => {
        if (!vaultPath || !hash) return;
        
        let isMounted = true;
        const fetchDiff = async () => {
            const res = await FileSystemAPI.executeGitCommand(vaultPath, `show ${hash}`);
            if (!isMounted) return;
            if (res.success && res.stdout) {
                setDiff(res.stdout);
            } else {
                setDiff(`Failed to load diff for commit ${hash}\n${res.stderr || ""}`);
            }
        };
        fetchDiff();
        return () => { isMounted = false; };
    }, [vaultPath, hash]);

    if (!hash) return null;

    return (
        <div style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-primary)' }}>
            <Editor value={diff} readOnly={true} language="diff" />
        </div>
    );
}
