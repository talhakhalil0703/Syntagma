import { useMermaidStore } from "./mermaidStore";
import { SettingItem, SettingToggle } from "../../../components/ui/SettingsUI";

export default function MermaidSettingTab() {
    const {
        renderInViewMode,
        updateSetting
    } = useMermaidStore();

    return (
        <div>
            <SettingItem
                name="Render Mermaid in View Mode"
                description="When enabled, mermaid code blocks will be rendered as diagrams when not being edited."
                control={
                    <SettingToggle
                        value={renderInViewMode}
                        onChange={(val) => updateSetting('renderInViewMode', val)}
                    />
                }
            />

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Mermaid settings are saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/mermaid.json</code>
            </div>
        </div>
    );
}
