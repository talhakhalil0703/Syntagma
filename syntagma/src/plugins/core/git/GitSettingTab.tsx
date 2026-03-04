import { useGitStore } from "./gitStore";
import { SettingItem, SettingToggle, SettingText } from "../../../components/ui/SettingsUI";

export function GitSettingTab() {
    const {
        autoCommitInterval, pullBeforeCommit, commitMessageTemplate,
        updateSetting
    } = useGitStore();

    return (
        <div>
            <SettingItem
                name="Auto-commit Interval (minutes)"
                description="Automatically sync your vault in the background. Set to 0 to disable automated background syncs."
                control={
                    <input
                        type="number"
                        min="0"
                        value={autoCommitInterval}
                        onChange={(e) => updateSetting('autoCommitInterval', parseInt(e.target.value) || 0)}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', width: '60px', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = "var(--text-accent)"}
                        onBlur={e => e.target.style.borderColor = "var(--bg-border)"}
                    />
                }
            />

            <SettingItem
                name="Pull before Committing"
                description="Ensures latest remote changes are fetched before pushing new edits."
                control={
                    <SettingToggle
                        value={pullBeforeCommit}
                        onChange={(val) => updateSetting('pullBeforeCommit', val)}
                    />
                }
            />

            <SettingItem
                name="Commit Message Template"
                description="The default message used for automated commits. Use {{date}} to insert the timestamp."
                control={
                    <SettingText
                        value={commitMessageTemplate}
                        onChange={(val) => updateSetting('commitMessageTemplate', val)}
                        placeholder="Automated vault sync: {{date}}"
                    />
                }
            />

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Git plugin settings are securely isolated and saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/git.json</code>
            </div>
        </div>
    );
}
