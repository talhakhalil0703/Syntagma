import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface GitStatusItem {
    path: string;
    staged: boolean;
    status: "modified" | "added" | "deleted" | "untracked" | "conflict";
}

export interface GitCommitLog {
    hash: string;
    message: string;
    author: string;
    date: string;
}

export interface GitBranchItem {
    name: string;
    current: boolean;
}

interface GitState {
    isGitRepo: boolean;
    currentBranch: string;
    uncommittedFiles: GitStatusItem[];
    lastSyncTime: number | null;
    isSyncing: boolean;
    
    // New States
    hasConflicts: boolean;
    history: GitCommitLog[];
    branches: GitBranchItem[];

    // Automation Settings
    autoCommitInterval: number; // 0 means disabled, otherwise minutes
    pullBeforeCommit: boolean;
    commitMessageTemplate: string; // e.g. "Automated sync: {{date}}"
    
    // New Settings
    pullOnLoad: boolean;
    autoPullInterval: number; // 0 means disabled, otherwise minutes
    autoPushInterval: number; // 0 means disabled, otherwise minutes
    pullStrategy: "merge" | "rebase";

    initRepo: () => Promise<void>;
    checkStatus: () => Promise<void>;
    fetchHistory: () => Promise<void>;
    fetchBranches: () => Promise<void>;
    
    stageAll: () => Promise<void>;
    stageFile: (path: string) => Promise<void>;
    unstageFile: (path: string) => Promise<void>;
    
    commit: (message: string) => Promise<void>;
    push: () => Promise<void>;
    pull: () => Promise<void>;
    sync: (commitMessage?: string) => Promise<void>;
    abortMerge: () => Promise<void>;

    updateSetting: <K extends keyof GitState>(key: K, value: GitState[K]) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}

export const useGitStore = create<GitState>((set, get) => ({
    isGitRepo: false,
    currentBranch: "",
    uncommittedFiles: [],
    lastSyncTime: null,
    isSyncing: false,
    
    hasConflicts: false,
    history: [],
    branches: [],

    autoCommitInterval: 0,
    pullBeforeCommit: true,
    commitMessageTemplate: "Automated vault sync: {{date}}",
    
    pullOnLoad: false,
    autoPullInterval: 0,
    autoPushInterval: 0,
    pullStrategy: "merge",

    initRepo: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        set({ isSyncing: true });
        await FileSystemAPI.executeGitCommand(vaultPath, "init");
        set({ isSyncing: false });
        await get().checkStatus();
    },

    fetchHistory: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        
        // Use a strict format: %h|%an|%s|%ar
        const res = await FileSystemAPI.executeGitCommand(vaultPath, "log -n 30 --pretty=format:'%h|%an|%s|%ar'");
        if (res.success && res.stdout) {
            const logs = res.stdout.split('\n').filter(l => l.trim() !== '').map(line => {
                const parts = line.split('|');
                return {
                    hash: parts[0] || "",
                    author: parts[1] || "",
                    message: parts[2] || "",
                    date: parts[3] || ""
                };
            });
            set({ history: logs });
        } else {
            set({ history: [] });
        }
    },

    fetchBranches: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        
        const res = await FileSystemAPI.executeGitCommand(vaultPath, "branch -a");
        if (res.success && res.stdout) {
            const lines = res.stdout.split('\n').filter(l => l.trim() !== '');
            const branches: GitBranchItem[] = [];
            for (const line of lines) {
                const isCurrent = line.startsWith('* ');
                const name = line.replace('* ', '').trim();
                branches.push({ name, current: isCurrent });
            }
            set({ branches });
        } else {
            set({ branches: [] });
        }
    },

    checkStatus: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        // 1. Check if it is a git repo
        const repoCheck = await FileSystemAPI.executeGitCommand(vaultPath, "rev-parse --is-inside-work-tree");
        if (!repoCheck.success) {
            set({ isGitRepo: false, currentBranch: "", uncommittedFiles: [], hasConflicts: false });
            return;
        }

        // 2. Get current branch
        const branchCheck = await FileSystemAPI.executeGitCommand(vaultPath, "branch --show-current");
        const currentBranch = branchCheck.success ? (branchCheck.stdout?.trim() || "master") : "master";

        // 3. Get status porcelain
        const statusCheck = await FileSystemAPI.executeGitCommand(vaultPath, "status --porcelain");
        const uncommittedFiles: GitStatusItem[] = [];
        let hasConflicts = false;

        if (statusCheck.success && statusCheck.stdout) {
            const lines = statusCheck.stdout.split('\n').filter(l => l.trim() !== "");
            for (const line of lines) {
                const xy = line.substring(0, 2);
                const path = line.substring(3).trim();

                let status: GitStatusItem["status"] = "modified";
                if (xy === "??") status = "untracked";
                else if (xy.includes("A")) status = "added";
                else if (xy.includes("D")) status = "deleted";
                
                // Unmerged paths (Conflicts)
                if (xy === "UU" || xy === "AA" || xy === "DD" || xy === "AU" || xy === "UA" || xy === "DU" || xy === "UD") {
                    status = "conflict";
                    hasConflicts = true;
                }

                const staged = xy[0] !== ' ' && xy[0] !== '?' && status !== "conflict";

                uncommittedFiles.push({ path, status, staged });
            }
        }

        set({ isGitRepo: true, currentBranch, uncommittedFiles, hasConflicts });
        
        // Fetch extra info silently
        await get().fetchBranches();
        await get().fetchHistory();
    },

    stageAll: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        await FileSystemAPI.executeGitCommand(vaultPath, "add .");
        await get().checkStatus();
    },

    stageFile: async (path: string) => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        await FileSystemAPI.executeGitCommand(vaultPath, `add "${path}"`);
        await get().checkStatus();
    },

    unstageFile: async (path: string) => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        await FileSystemAPI.executeGitCommand(vaultPath, `restore --staged "${path}"`);
        await get().checkStatus();
    },

    abortMerge: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        await FileSystemAPI.executeGitCommand(vaultPath, "merge --abort");
        await get().checkStatus();
    },

    commit: async (message: string) => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        await FileSystemAPI.executeGitCommand(vaultPath, `commit -m "${message}"`);
        await get().checkStatus();
    },

    push: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        set({ isSyncing: true });
        
        // Push currently active branch
        const { currentBranch } = get();
        await FileSystemAPI.executeGitCommand(vaultPath, `push origin ${currentBranch}`);
        
        set({ isSyncing: false, lastSyncTime: Date.now() });
    },

    pull: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        set({ isSyncing: true });
        
        const strategy = get().pullStrategy === "rebase" ? "--rebase" : "--no-rebase";
        
        const res = await FileSystemAPI.executeGitCommand(vaultPath, `pull ${strategy} origin ${get().currentBranch}`);
        
        set({ isSyncing: false, lastSyncTime: Date.now() });
        await get().checkStatus();
        
        // If the pull command failed, it could be due to conflicts
        if (!res.success && res.stdout?.toLowerCase().includes("conflict")) {
            set({ hasConflicts: true });
        }
    },

    sync: async (customMessage?: string) => {
        set({ isSyncing: true });

        // User preference: pull before commiting?
        if (get().pullBeforeCommit) {
            const vaultPath = useWorkspaceStore.getState().vaultPath;
            if (vaultPath) {
                const strategy = get().pullStrategy === "rebase" ? "--rebase" : "--no-rebase";
                await FileSystemAPI.executeGitCommand(vaultPath, `pull ${strategy} origin ${get().currentBranch}`);
            }
        }

        await get().stageAll();

        const uncommitted = get().uncommittedFiles;
        if (uncommitted.length > 0) {
            let msg = customMessage;
            if (!msg) {
                msg = get().commitMessageTemplate.replace("{{date}}", new Date().toLocaleString());
            }
            await get().commit(msg);
        }

        if (!get().pullBeforeCommit) {
            await get().pull();
        }

        await get().push();
        set({ isSyncing: false, lastSyncTime: Date.now() });
    },

    updateSetting: (key, value) => {
        set({ [key]: value } as any);
        useGitStore.getState().saveSettings();
    },

    loadSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const data = await FileSystemAPI.readFile(`${vaultPath}/.syntagma/git.json`);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                set({
                    autoCommitInterval: parsed.autoCommitInterval ?? 0,
                    pullBeforeCommit: parsed.pullBeforeCommit ?? true,
                    commitMessageTemplate: parsed.commitMessageTemplate ?? "Automated vault sync: {{date}}",
                    pullOnLoad: parsed.pullOnLoad ?? false,
                    autoPullInterval: parsed.autoPullInterval ?? 0,
                    autoPushInterval: parsed.autoPushInterval ?? 0,
                    pullStrategy: parsed.pullStrategy ?? "merge"
                });
            } catch (e) {
                console.error("Failed to parse git settings loop:", e);
            }
        }
    },

    saveSettings: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        const state = get();
        await FileSystemAPI.writeFile(
            `${vaultPath}/.syntagma/git.json`,
            JSON.stringify({
                autoCommitInterval: state.autoCommitInterval,
                pullBeforeCommit: state.pullBeforeCommit,
                commitMessageTemplate: state.commitMessageTemplate,
                pullOnLoad: state.pullOnLoad,
                autoPullInterval: state.autoPullInterval,
                autoPushInterval: state.autoPushInterval,
                pullStrategy: state.pullStrategy
            }, null, 2)
        );
    }
}));
