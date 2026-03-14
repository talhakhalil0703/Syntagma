import { useDataviewStore } from "./dataviewStore";
import { SettingItem, SettingToggle } from "../../../components/ui/SettingsUI";

export function DataviewSettingTab() {
    const {
        parseFrontmatter,
        updateSetting
    } = useDataviewStore();

    return (
        <div>
            <SettingItem
                name="Enable Frontmatter Database Extraction"
                description="Dynamically scan and parse YAML frontmatter (between `---` blocks) in all markdown files across the vault for use in the Databases side panel."
                control={
                    <SettingToggle
                        value={parseFrontmatter}
                        onChange={(val) => updateSetting('parseFrontmatter', val)}
                    />
                }
            />

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Dataview settings are securely isolated and saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/dataview.json</code>
            </div>
        </div>
    );
}
