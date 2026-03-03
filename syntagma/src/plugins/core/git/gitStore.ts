import { create } from "zustand";
import { FileSystemAPI } from "../../../utils/fs";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export interface GitStatusItem {
    path: string;
    staged: boolean;
    status: "modified" | "added" | "deleted" | "untracked";
}

interface GitState {
    isGitRepo: boolean;
    currentBranch: string;
    uncommittedFiles: GitStatusItem[];
    lastSyncTime: number | null;
    isSyncing: boolean;

    // Automation Settings
    autoCommitInterval: number; // 0 means disabled, otherwise minutes
    pullBeforeCommit: boolean;
    commitMessageTemplate: string; // e.g. "Automated sync: {{date}}"

    checkStatus: () => Promise<void>;
    stageAll: () => Promise<void>;
    commit: (message: string) => Promise<void>;
    push: () => Promise<void>;
    pull: () => Promise<void>;
    sync: (commitMessage?: string) => Promise<void>;

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

    autoCommitInterval: 0,
    pullBeforeCommit: true,
    commitMessageTemplate: "Automated vault sync: {{date}}",

    checkStatus: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;

        // 1. Check if it is a git repo
        const repoCheck = await FileSystemAPI.executeGitCommand(vaultPath, "rev-parse --is-inside-work-tree");
        if (!repoCheck.success) {
            set({ isGitRepo: false, currentBranch: "", uncommittedFiles: [] });
            return;
        }

        // 2. Get current branch
        const branchCheck = await FileSystemAPI.executeGitCommand(vaultPath, "branch --show-current");
        const currentBranch = branchCheck.success ? (branchCheck.stdout?.trim() || "master") : "master";

        // 3. Get status porcelain
        const statusCheck = await FileSystemAPI.executeGitCommand(vaultPath, "status --porcelain");
        const uncommittedFiles: GitStatusItem[] = [];

        if (statusCheck.success && statusCheck.stdout) {
            const lines = statusCheck.stdout.split('\n').filter(l => l.trim() !== "");
            for (const line of lines) {
                const xy = line.substring(0, 2);
                const path = line.substring(3).trim();

                let status: GitStatusItem["status"] = "modified";
                if (xy === "??") status = "untracked";
                else if (xy.includes("A")) status = "added";
                else if (xy.includes("D")) status = "deleted";

                const staged = xy[0] !== ' ' && xy[0] !== '?';

                uncommittedFiles.push({ path, status, staged });
            }
        }

        set({ isGitRepo: true, currentBranch, uncommittedFiles });
    },

    stageAll: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        await FileSystemAPI.executeGitCommand(vaultPath, "add .");
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
        await FileSystemAPI.executeGitCommand(vaultPath, "push");
        set({ isSyncing: false, lastSyncTime: Date.now() });
    },

    pull: async () => {
        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return;
        set({ isSyncing: true });
        await FileSystemAPI.executeGitCommand(vaultPath, "pull");
        set({ isSyncing: false, lastSyncTime: Date.now() });
        await get().checkStatus();
    },

    sync: async (customMessage?: string) => {
        set({ isSyncing: true });

        // User preference: pull before commiting?
        if (get().pullBeforeCommit) {
            const vaultPath = useWorkspaceStore.getState().vaultPath;
            if (vaultPath) {
                await FileSystemAPI.executeGitCommand(vaultPath, "pull");
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
                    commitMessageTemplate: parsed.commitMessageTemplate ?? "Automated vault sync: {{date}}"
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
                commitMessageTemplate: state.commitMessageTemplate
            }, null, 2)
        );
    }
}));
