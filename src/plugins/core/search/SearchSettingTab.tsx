import { useSearchStore } from "./searchStore";
import { SettingItem, SettingToggle } from "../../../components/ui/SettingsUI";

export function SearchSettingTab() {
  const { enabled, updateSetting } = useSearchStore();

  return (
    <div>
      <SettingItem
        name="Enable Global Search"
        description="Enables MiniSearch-powered full-text search across your vault. When disabled, the ⌘O Quick Open shortcut will not work."
        control={
          <SettingToggle
            value={enabled}
            onChange={(val) => updateSetting("enabled", val)}
          />
        }
      />

      <div
        style={{
          marginTop: "24px",
          paddingTop: "24px",
          borderTop: "1px dashed var(--bg-border)",
          fontSize: "12px",
          color: "var(--text-secondary)",
        }}
      >
        Search settings are saved to{" "}
        <code
          style={{
            backgroundColor: "var(--bg-secondary)",
            padding: "2px 4px",
            borderRadius: "2px",
          }}
        >
          .syntagma/search.json
        </code>
      </div>
    </div>
  );
}
