import { Plugin } from "../../Plugin";
import { GitView } from "./GitView";
import { GitChangesView } from "./GitChangesView";
import { GitBranch } from "lucide-react";
import { useGitStore } from "./gitStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export default class GitPlugin extends Plugin {
    id = "core-git";
    name = "Git Version Control";
    version = "1.0.0";
    author = "Syntagma Core";

    private cleanupIntervals: (() => void)[] = [];

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name} `);

        // Register the Git Sidebar Pane
        this.app.workspace.registerView(this.manifest.id, GitView, GitBranch);

        // Register the Git full-editor pane
        this.app.workspace.registerView("git-changes-view", GitChangesView, GitBranch);

        // Register the global Command Palette actions
        this.addCommand({
            id: "git:sync",
            name: "Git: Sync Vault (Commit, Pull, Push)",
            callback: () => {
                const store = useGitStore.getState();
                if (store.isGitRepo && !store.isSyncing) {
                    store.sync("Automated manual sync from Command Palette");
                }
            }
        });

        this.addCommand({
            id: "git:open-changes",
            name: "Git: Open Changes View",
            callback: () => {
                const store = useWorkspaceStore.getState();
                store.openTab({
                    id: "git-changes-view",
                    title: "Git Changes"
                });
            }
        });

        // Hook into Workspace initialization to verify git status immediately
        useWorkspaceStore.subscribe((state, prevState) => {
            if (state.vaultPath !== prevState.vaultPath && state.vaultPath) {
                useGitStore.getState().loadSettings().then(() => {
                    useGitStore.getState().checkStatus().then(() => {
                        const gitState = useGitStore.getState();
                        if (gitState.isGitRepo && gitState.pullOnLoad && !gitState.isSyncing) {
                            gitState.pull();
                        }
                    });
                });
            }
        });

        // Setup auto-sync interval logic
        let commitIntervalId: any = null;
        let pullIntervalId: any = null;
        let pushIntervalId: any = null;

        const setupIntervals = () => {
            if (commitIntervalId) clearInterval(commitIntervalId);
            if (pullIntervalId) clearInterval(pullIntervalId);
            if (pushIntervalId) clearInterval(pushIntervalId);

            const state = useGitStore.getState();
            if (state.isGitRepo) {
                // Auto Commit / Sync
                if (state.autoCommitInterval > 0) {
                    commitIntervalId = setInterval(() => {
                        const current = useGitStore.getState();
                        if (current.isGitRepo && !current.isSyncing) current.sync();
                    }, state.autoCommitInterval * 60 * 1000);
                }

                // Auto Pull
                if (state.autoPullInterval > 0) {
                    pullIntervalId = setInterval(() => {
                        const current = useGitStore.getState();
                        if (current.isGitRepo && !current.isSyncing) current.pull();
                    }, state.autoPullInterval * 60 * 1000);
                }

                // Auto Push
                if (state.autoPushInterval > 0) {
                    pushIntervalId = setInterval(() => {
                        const current = useGitStore.getState();
                        if (current.isGitRepo && !current.isSyncing) current.push();
                    }, state.autoPushInterval * 60 * 1000);
                }
            }
        };

        // Re-evaluate auto-sync when settings or repo status changes
        useGitStore.subscribe((state, prevState) => {
            if (
                state.autoCommitInterval !== prevState.autoCommitInterval ||
                state.autoPullInterval !== prevState.autoPullInterval ||
                state.autoPushInterval !== prevState.autoPushInterval ||
                state.isGitRepo !== prevState.isGitRepo
            ) {
                setupIntervals();
            }
        });

        this.cleanupIntervals.push(() => {
            if (commitIntervalId) clearInterval(commitIntervalId);
            if (pullIntervalId) clearInterval(pullIntervalId);
            if (pushIntervalId) clearInterval(pushIntervalId);
        });

        console.log("Git Version Control: Registered Ribbon Icon");
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
        this.cleanupIntervals.forEach(fn => fn());
    }
}
