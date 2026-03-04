import { useSettingsStore } from "../store/settingsStore";
import { X, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { SettingHeading, SettingItem, SettingToggle, SettingText, SettingSelect } from "./ui/SettingsUI";

export function SettingsModal() {
    const [activeTab, setActiveTab] = useState("general");
    const [hotkeyQuery, setHotkeyQuery] = useState("");
    const [recordingCommandId, setRecordingCommandId] = useState<string | null>(null);

    const {
        isSettingsOpen, closeSettings,
        attachmentFolderPath, newFileLocation, autoUpdate, updateSetting,
        pluginSettingsTabs, commands, hotkeys, setHotkey
    } = useSettingsStore();

    const corePluginTabs = pluginSettingsTabs.filter(t => t.pluginId.startsWith("core-"));
    const communityPluginTabs = pluginSettingsTabs.filter(t => !t.pluginId.startsWith("core-"));

    const handleKeyDownRecord = (e: React.KeyboardEvent, commandId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "Escape") {
            setRecordingCommandId(null);
            return;
        }

        const modifiers = [];
        if (e.metaKey) modifiers.push("Mod");
        if (e.ctrlKey && !e.metaKey) modifiers.push("Ctrl");
        if (e.altKey) modifiers.push("Alt");
        if (e.shiftKey) modifiers.push("Shift");

        const key = e.key.toUpperCase();
        // Ignore just modifier presses
        if (["META", "CONTROL", "ALT", "SHIFT"].includes(key)) return;

        const combo = [...modifiers, key].join("+");
        setHotkey(commandId, combo);
        setRecordingCommandId(null);
    };

    const filteredCommands = useMemo(() => {
        if (!hotkeyQuery) return commands;
        return commands.filter(c => c.name.toLowerCase().includes(hotkeyQuery.toLowerCase()));
    }, [commands, hotkeyQuery]);

    if (!isSettingsOpen) return null;

    const navItemStyle = (id: string) => ({
        padding: '6px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        marginBottom: '2px',
        fontSize: '14px',
        backgroundColor: activeTab === id ? 'var(--bg-tertiary)' : 'transparent',
        color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        margin: '0 8px'
    });

    const renderOptionsCategories = () => (
        <>
            <div style={{ marginTop: '16px', marginBottom: '8px', padding: '0 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Options
            </div>
            <div onClick={() => setActiveTab("general")} style={navItemStyle("general")}>General</div>
            <div onClick={() => setActiveTab("hotkeys")} style={navItemStyle("hotkeys")}>Hotkeys</div>
        </>
    );

    const renderPluginCategories = () => (
        <>
            {corePluginTabs.length > 0 && (
                <>
                    <div style={{ marginTop: '24px', marginBottom: '8px', padding: '0 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Core Plugins
                    </div>
                    {corePluginTabs.map(t => (
                        <div key={t.id} onClick={() => setActiveTab(t.id)} style={navItemStyle(t.id)}>
                            {t.name}
                        </div>
                    ))}
                </>
            )}

            {communityPluginTabs.length > 0 && (
                <>
                    <div style={{ marginTop: '24px', marginBottom: '8px', padding: '0 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Community Plugins
                    </div>
                    {communityPluginTabs.map(t => (
                        <div key={t.id} onClick={() => setActiveTab(t.id)} style={navItemStyle(t.id)}>
                            {t.name}
                        </div>
                    ))}
                </>
            )}
        </>
    );

    const renderContent = () => {
        if (activeTab === "general") {
            return (
                <div style={{ padding: '0 40px' }}>
                    <SettingHeading title="General" />

                    <SettingItem
                        name="Attachment folder path"
                        description="Where newly pasted images and files are saved."
                        control={
                            <SettingText
                                value={attachmentFolderPath}
                                onChange={(val) => updateSetting('attachmentFolderPath', val)}
                            />
                        }
                    />

                    <SettingItem
                        name="Default location for new notes"
                        description="Where newly created pages from wikilinks are placed."
                        control={
                            <SettingSelect
                                value={newFileLocation}
                                onChange={(val) => updateSetting('newFileLocation', val as any)}
                                options={[
                                    { label: 'Vault folder', value: 'root' },
                                    { label: 'Same folder as current file', value: 'current' }
                                ]}
                            />
                        }
                    />

                    <SettingItem
                        name="Automatically update"
                        description="Check for and apply updates automatically."
                        control={
                            <SettingToggle
                                value={autoUpdate}
                                onChange={(val) => updateSetting('autoUpdate', val)}
                            />
                        }
                    />
                </div>
            );
        }

        if (activeTab === "hotkeys") {
            return (
                <div style={{ padding: '0 40px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <SettingHeading title="Hotkeys" />

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--bg-border)' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '8px' }} />
                            <input
                                type="text"
                                placeholder="Search hotkeys..."
                                value={hotkeyQuery}
                                onChange={(e) => setHotkeyQuery(e.target.value)}
                                style={{ width: '100%', padding: '6px 12px 6px 36px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
                        {filteredCommands.map(cmd => {
                            const isRecording = recordingCommandId === cmd.id;
                            const currentHotkey = hotkeys[cmd.id] || cmd.defaultHotkey || "Blank";

                            return (
                                <div key={cmd.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--bg-tertiary)' }}>
                                    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{cmd.name}</span>
                                    <button
                                        onClick={() => setRecordingCommandId(cmd.id)}
                                        onKeyDown={(e) => isRecording && handleKeyDownRecord(e, cmd.id)}
                                        onBlur={() => isRecording && setRecordingCommandId(null)}
                                        autoFocus={isRecording}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            border: isRecording ? '1px solid var(--text-accent)' : '1px solid var(--bg-border)',
                                            backgroundColor: isRecording ? 'var(--bg-tertiary)' : 'transparent',
                                            color: isRecording ? 'var(--text-accent)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            minWidth: '80px',
                                            textAlign: 'center',
                                            outline: 'none'
                                        }}
                                    >
                                        {isRecording ? "Press keys..." : currentHotkey}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Render Dynamic Plugin Tab
        const activePluginTab = pluginSettingsTabs.find(t => t.id === activeTab);
        if (activePluginTab) {
            return (
                <div style={{ padding: '0 40px' }}>
                    <SettingHeading title={activePluginTab.name} />
                    {activePluginTab.render()}
                </div>
            );
        }

        return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Tab not found.</div>;
    };

    return (
        <div
            className="modal-overlay"
            onClick={closeSettings}
            style={
                {
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    WebkitAppRegion: 'no-drag' as any
                } as any
            }
        >
            <div
                className="settings-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '900px',
                    height: '650px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    border: '1px solid var(--bg-border)',
                    overflow: 'hidden'
                }}
            >
                {/* Left Sidebar Menu */}
                <div style={{ width: '240px', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingTop: '16px', paddingBottom: '16px' }}>
                    {renderOptionsCategories()}
                    {renderPluginCategories()}
                </div>

                {/* Right Content Area */}
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button className="icon-btn" onClick={closeSettings} title="Close Settings">
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ flexGrow: 1, overflowY: 'auto', paddingBottom: '40px' }}>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
