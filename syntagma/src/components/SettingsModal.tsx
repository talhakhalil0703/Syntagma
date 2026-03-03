import { useSettingsStore } from "../store/settingsStore";
import { X } from "lucide-react";

export function SettingsModal() {
    const {
        isSettingsOpen, closeSettings,
        attachmentFolderPath, autoUpdate, updateSetting
    } = useSettingsStore();

    if (!isSettingsOpen) return null;

    return (
        <div
            className="modal-overlay"
            onClick={closeSettings}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                WebkitAppRegion: 'no-drag' // electron
            } as any}
        >
            <div
                className="settings-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '800px',
                    height: '600px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    border: '1px solid var(--bg-border)',
                    overflow: 'hidden'
                }}
            >
                {/* Settings Left Nav Sidebar */}
                <div style={{ width: '200px', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 16px', fontWeight: 600, fontSize: '18px', borderBottom: '1px solid var(--bg-border)' }}>
                        Settings
                    </div>
                    <div style={{ flexGrow: 1, overflowY: 'auto', padding: '12px 8px' }}>
                        <div className="settings-nav-item active" style={{ padding: '8px 12px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', marginBottom: '4px' }}>
                            General
                        </div>
                        <div className="settings-nav-item" style={{ padding: '8px 12px', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '4px' }}>
                            Appearance
                        </div>
                        <div className="settings-nav-item" style={{ padding: '8px 12px', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '4px' }}>
                            Hotkeys
                        </div>
                        <div className="settings-nav-item" style={{ padding: '8px 12px', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '4px' }}>
                            Core Plugins
                        </div>
                    </div>
                </div>

                {/* Settings Content */}
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-border)' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>General</h2>
                        <button className="icon-btn" onClick={closeSettings} title="Close Settings">
                            <X size={20} />
                        </button>
                    </div>
                    <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px' }}>

                        <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Attachment folder path</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Where newly pasted images and files are saved.</div>
                            </div>
                            <input
                                type="text"
                                value={attachmentFolderPath}
                                onChange={(e) => updateSetting('attachmentFolderPath', e.target.value)}
                                style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Automatically update</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Check for and apply updates automatically.</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={autoUpdate}
                                onChange={(e) => updateSetting('autoUpdate', e.target.checked)}
                            />
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Settings are saved automatically to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/settings.json</code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
