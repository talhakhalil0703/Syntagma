import { Plugin } from "../../Plugin";
import { GitView } from "./GitView";
import { GitBranch } from "lucide-react";
import { useGitStore } from "./gitStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export default class GitPlugin extends Plugin {
    id = "core-git";
    name = "Git Version Control";
    version = "1.0.0";
    author = "Syntagma Core";

    private cleanupInterval: (() => void) | null = null;

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        // Register the Git Pane
        this.app.workspace.registerView(this.manifest.id, GitView, GitBranch);

        // Register the global Command Palette actions
        this.app.commands.addCommand({
            id: "git:sync",
            name: "Git: Sync Vault (Commit, Pull, Push)",
            pluginId: this.manifest.id,
            callback: () => {
                const store = useGitStore.getState();
                if (store.isGitRepo && !store.isSyncing) {
                    store.sync("Automated manual sync from Command Palette");
                }
            }
        });

        // Hook into Workspace initialization to verify git status immediately
        useWorkspaceStore.subscribe((state, prevState) => {
            if (state.vaultPath !== prevState.vaultPath && state.vaultPath) {
                useGitStore.getState().loadSettings().then(() => {
                    useGitStore.getState().checkStatus();
                });
            }
        });

        // Setup auto-sync interval logic
        let currentIntervalId: any = null;

        const setupAutoSync = () => {
            if (currentIntervalId) clearInterval(currentIntervalId);

            const state = useGitStore.getState();
            if (state.isGitRepo && state.autoCommitInterval > 0) {
                const ms = state.autoCommitInterval * 60 * 1000;
                currentIntervalId = setInterval(() => {
                    const currentState = useGitStore.getState();
                    if (currentState.isGitRepo && !currentState.isSyncing) {
                        currentState.sync();
                    }
                }, ms);
            }
        };

        // Re-evaluate auto-sync when settings or repo status changes
        useGitStore.subscribe((state, prevState) => {
            if (
                state.autoCommitInterval !== prevState.autoCommitInterval ||
                state.isGitRepo !== prevState.isGitRepo
            ) {
                setupAutoSync();
            }
        });

        this.cleanupInterval = () => {
            if (currentIntervalId) clearInterval(currentIntervalId);
        };

        console.log("Git Version Control: Registered Ribbon Icon");
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
        if (this.cleanupInterval) {
            this.cleanupInterval();
        }
    }
}
