import { useEffect } from "react";
import { useTasksStore, type TaskItem } from "./tasksStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { CheckSquare, FileText, Calendar } from "lucide-react";

export function TasksPane() {
    const {
        tasks, isLoading, showCompleted, groupByFile,
        queryTasks, toggleTask
    } = useTasksStore();

    // Auto-refresh when workspace vaultPath changes
    const vaultPath = useWorkspaceStore(state => state.vaultPath);

    useEffect(() => {
        if (vaultPath) {
            queryTasks();
        }
    }, [vaultPath, queryTasks]);

    // Filter and group tasks
    const filteredTasks = showCompleted ? tasks : tasks.filter(t => !t.completed);

    const groupedTasks = filteredTasks.reduce((acc, task) => {
        const key = groupByFile ? task.fileName : (task.dueDate || "No Due Date");
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {} as Record<string, TaskItem[]>);

    const groupKeys = Object.keys(groupedTasks).sort();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Header / Stats */}
            <div style={{
                padding: '12px', borderBottom: '1px solid var(--bg-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {isLoading ? "Scanning Vault..." : `${filteredTasks.length} tasks`}
                </span>

                <button
                    className="icon-btn"
                    title="Refresh Tasks"
                    onClick={queryTasks}
                    style={{ padding: '4px' }}
                >
                    <CheckSquare size={14} color="var(--text-accent)" />
                </button>
            </div>

            {/* Scrollable Task List */}
            <div style={{ flexGrow: 1, overflow: 'auto', padding: '12px' }}>
                {filteredTasks.length === 0 && !isLoading && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '24px' }}>
                        <CheckSquare size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <br />
                        No tasks found in vault.
                    </div>
                )}

                {groupKeys.map(group => (
                    <div key={group} style={{ marginBottom: '20px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            fontSize: '11px', fontWeight: 600,
                            color: 'var(--text-muted)', textTransform: 'uppercase',
                            letterSpacing: '0.05em', marginBottom: '8px',
                            borderBottom: '1px dashed var(--bg-border)', paddingBottom: '4px'
                        }}>
                            {groupByFile ? <FileText size={12} style={{ marginRight: '6px' }} /> : <Calendar size={12} style={{ marginRight: '6px' }} />}
                            {group}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {groupedTasks[group].map((task) => (
                                <div
                                    key={task.id}
                                    style={{
                                        display: 'flex', alignItems: 'flex-start',
                                        padding: '6px', borderRadius: '4px',
                                        backgroundColor: 'var(--bg-primary)',
                                        border: '1px solid var(--bg-border)',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-accent)'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--bg-border)'}
                                >
                                    {/* Interactive Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => toggleTask(task)}
                                        style={{
                                            marginRight: '10px', marginTop: '3px',
                                            cursor: 'pointer'
                                        }}
                                    />

                                    {/* Task Content mapped to Editor router */}
                                    <div
                                        style={{
                                            flexGrow: 1, fontSize: '13px',
                                            textDecoration: task.completed ? 'line-through' : 'none',
                                            color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                            lineHeight: '1.4',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => {
                                            useWorkspaceStore.getState().openTab({
                                                id: task.filePath,
                                                title: task.fileName
                                            });
                                        }}
                                    >
                                        {task.content}
                                        {task.dueDate && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center',
                                                marginLeft: '8px', fontSize: '10px',
                                                color: 'var(--text-accent)', backgroundColor: 'var(--bg-secondary)',
                                                padding: '2px 6px', borderRadius: '4px'
                                            }}>
                                                <Calendar size={10} style={{ marginRight: '4px' }} />
                                                {task.dueDate}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
