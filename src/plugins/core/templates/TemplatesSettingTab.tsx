import { useTemplatesStore } from "./templatesStore";
import { SettingItem, SettingText } from "../../../components/ui/SettingsUI";

export function TemplatesSettingTab() {
    const {
        templateFolderPath,
        updateSetting
    } = useTemplatesStore();

    return (
        <div>
            <SettingItem
                name="Template folder location"
                description="Files in this folder will be available as templates. You can use {{title}}, {{date}}, and {{time}} variables."
                control={
                    <SettingText
                        value={templateFolderPath}
                        onChange={(val) => updateSetting('templateFolderPath', val)}
                        placeholder="Templates/"
                    />
                }
            />

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Templates settings are securely isolated and saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/templates.json</code>
            </div>
        </div>
    );
}
