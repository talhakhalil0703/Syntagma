import { useTasksStore } from "./tasksStore";
import { SettingItem, SettingToggle } from "../../../components/ui/SettingsUI";

export function TasksSettingTab() {
    const {
        showCompleted,
        groupByFile,
        updateSetting
    } = useTasksStore();

    return (
        <div>
            <SettingItem
                name="Show Completed Tasks"
                description="Include tasks checked as [x] in the sidebar."
                control={
                    <SettingToggle
                        value={showCompleted}
                        onChange={(val) => updateSetting('showCompleted', val)}
                    />
                }
            />

            <SettingItem
                name="Group By File Instead of Date"
                description="Group the task lists visually by their parent `.md` document name rather than their inner `due:` parameter date."
                control={
                    <SettingToggle
                        value={groupByFile}
                        onChange={(val) => updateSetting('groupByFile', val)}
                    />
                }
            />

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Tasks settings are securely isolated and saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/tasks.json</code>
            </div>
        </div>
    );
}
