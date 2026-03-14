import { useDailyNotesStore } from "./dailyNotesStore";
import { SettingItem, SettingText } from "../../../components/ui/SettingsUI";

export function DailyNotesSettingTab() {
    const {
        folderPath, dateFormat, templatePath,
        updateSetting
    } = useDailyNotesStore();

    return (
        <div>
            <SettingItem
                name="Date Format"
                description="The naming convention for new daily notes. (e.g. YYYY-MM-DD or MM-DD-YYYY)"
                control={
                    <SettingText
                        value={dateFormat}
                        onChange={(val) => updateSetting('dateFormat', val)}
                        placeholder="YYYY-MM-DD"
                    />
                }
            />

            <SettingItem
                name="New file location"
                description="New daily notes will be placed here exactly as defined."
                control={
                    <SettingText
                        value={folderPath}
                        onChange={(val) => updateSetting('folderPath', val)}
                        placeholder="Daily/"
                    />
                }
            />

            <SettingItem
                name="Template file location"
                description="Choose a file to use as a template. New daily notes will pre-load with its contents."
                control={
                    <SettingText
                        value={templatePath}
                        onChange={(val) => updateSetting('templatePath', val)}
                        placeholder="Templates/Daily.md"
                    />
                }
            />

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Daily Note settings are securely isolated and saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/daily.json</code>
            </div>
        </div>
    );
}
