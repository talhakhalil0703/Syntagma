import { useTableStore } from "./tableStore";
import { SettingItem, SettingToggle } from "../../../components/ui/SettingsUI";

export default function TableSettingTab() {
    const {
        renderInViewMode,
        updateSetting
    } = useTableStore();

    return (
        <div>
            <SettingItem
                name="Render Tables in Live Preview"
                description="When enabled, markdown tables will be rendered as interactive tables in the editor."
                control={
                    <SettingToggle
                        value={renderInViewMode}
                        onChange={(val) => updateSetting('renderInViewMode', val)}
                    />
                }
            />

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Table settings are saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/table.json</code>
            </div>
        </div>
    );
}
