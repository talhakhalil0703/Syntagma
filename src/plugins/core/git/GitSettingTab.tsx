import { useGitStore } from "./gitStore";
import { SettingItem, SettingToggle, SettingText } from "../../../components/ui/SettingsUI";

export function GitSettingTab() {
    const {
        autoCommitInterval, pullBeforeCommit, commitMessageTemplate,
        pullOnLoad, autoPullInterval, autoPushInterval, pullStrategy,
        updateSetting
    } = useGitStore();

    return (
        <div>
            <SettingItem
                name="Pull on App Load"
                description="Automatically pull the latest changes from the remote repository when the app starts."
                control={
                    <SettingToggle
                        value={pullOnLoad}
                        onChange={(val) => updateSetting('pullOnLoad', val)}
                    />
                }
            />

            <SettingItem
                name="Auto-pull Interval (minutes)"
                description="Automatically pull changes in the background. Set to 0 to disable."
                control={
                    <input
                        type="number"
                        min="0"
                        value={autoPullInterval}
                        onChange={(e) => updateSetting('autoPullInterval', parseInt(e.target.value) || 0)}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', width: '60px', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = "var(--text-accent)"}
                        onBlur={e => e.target.style.borderColor = "var(--bg-border)"}
                    />
                }
            />
            
            <SettingItem
                name="Auto-push Interval (minutes)"
                description="Automatically push local changes in the background. Set to 0 to disable."
                control={
                    <input
                        type="number"
                        min="0"
                        value={autoPushInterval}
                        onChange={(e) => updateSetting('autoPushInterval', parseInt(e.target.value) || 0)}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', width: '60px', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = "var(--text-accent)"}
                        onBlur={e => e.target.style.borderColor = "var(--bg-border)"}
                    />
                }
            />

            <SettingItem
                name="Pull Strategy"
                description="Choose whether to Merge or Rebase by default when pulling changes."
                control={
                    <select
                        value={pullStrategy}
                        onChange={(e) => updateSetting('pullStrategy', e.target.value as "merge" | "rebase")}
                        style={{
                            padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none'
                        }}
                    >
                        <option value="merge">Merge</option>
                        <option value="rebase">Rebase</option>
                    </select>
                }
            />

            <SettingItem
                name="Auto-commit Interval (minutes)"
                description="Automatically stage and commit your vault in the background. Set to 0 to disable."
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
                description="Ensures latest remote changes are fetched before pushing new edits (used by Sync Vault)."
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
