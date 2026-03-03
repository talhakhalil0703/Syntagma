import { Plugin } from "../../Plugin";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useTasksStore } from "./tasksStore";
import { TasksPane } from "./TasksPane";
import { CheckSquare } from "lucide-react";

export default class TasksPlugin extends Plugin {
    id = "core-tasks";
    name = "Tasks";
    version = "1.0.0";
    description = "Aggregate and interact with markdown checkboxes across your vault.";
    author = "Syntagma Core";

    async onload(): Promise<void> {
        console.log(`Loading plugin: ${this.manifest.name}`);

        // Register the UI View
        this.app.workspace.registerView(this.manifest.id, TasksPane, CheckSquare);

        // Whenever a new vault is opened, synchronize our store settings
        useWorkspaceStore.subscribe((state, prevState) => {
            if (state.vaultPath !== prevState.vaultPath && state.vaultPath) {
                useTasksStore.getState().loadSettings();
            }
        });

        // Listen for active file saves/modifications so we can refresh the task list
        window.addEventListener('syntagma:reload-active-file', () => {
            useTasksStore.getState().queryTasks();
        });
    }

    async onunload(): Promise<void> {
        console.log(`Unloading plugin: ${this.manifest.name}`);
    }
}
