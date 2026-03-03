import { useSettingsStore } from "../store/settingsStore";
import { useGitStore } from "../plugins/core/git/gitStore";
import { useDailyNotesStore } from "../plugins/core/daily/dailyNotesStore";
import { useTemplatesStore } from "../plugins/core/templates/templatesStore";
import { useDataviewStore } from "../plugins/core/dataview/dataviewStore";
import { useTasksStore } from "../plugins/core/tasks/tasksStore";
import { X } from "lucide-react";
import { useState } from "react";

export function SettingsModal() {
    const [activeTab, setActiveTab] = useState("general");
    const {
        isSettingsOpen, closeSettings,
        attachmentFolderPath, autoUpdate, updateSetting
    } = useSettingsStore();

    const {
        autoCommitInterval, pullBeforeCommit, commitMessageTemplate,
        updateSetting: updateGitSetting
    } = useGitStore();

    const {
        folderPath, dateFormat, templatePath,
        updateSetting: updateDailySetting
    } = useDailyNotesStore();

    const {
        templateFolderPath,
        updateSetting: updateTemplatesSetting
    } = useTemplatesStore();

    const {
        parseFrontmatter,
        updateSetting: updateDataviewSetting
    } = useDataviewStore();

    const {
        showCompleted,
        groupByFile,
        updateSetting: updateTasksSetting
    } = useTasksStore();

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
                </div>
                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '12px 8px' }}>
                    <div
                        onClick={() => setActiveTab("general")}
                        style={{
                            padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px',
                            backgroundColor: activeTab === "general" ? 'var(--bg-tertiary)' : 'transparent',
                            color: activeTab === "general" ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        General
                    </div>

                    <div style={{ marginTop: '16px', marginBottom: '8px', padding: '0 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Core Plugins
                    </div>
                    <div
                        onClick={() => setActiveTab("git")}
                        style={{
                            padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px',
                            backgroundColor: activeTab === "git" ? 'var(--bg-tertiary)' : 'transparent',
                            color: activeTab === "git" ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        Git Version Control
                    </div>
                    <div
                        onClick={() => setActiveTab("daily")}
                        style={{
                            padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px',
                            backgroundColor: activeTab === "daily" ? 'var(--bg-tertiary)' : 'transparent',
                            color: activeTab === "daily" ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        Daily Notes
                    </div>
                    <div
                        onClick={() => setActiveTab("templates")}
                        style={{
                            padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px',
                            backgroundColor: activeTab === "templates" ? 'var(--bg-tertiary)' : 'transparent',
                            color: activeTab === "templates" ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        Templates
                    </div>
                    <div
                        onClick={() => setActiveTab("dataview")}
                        style={{
                            padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px',
                            backgroundColor: activeTab === "dataview" ? 'var(--bg-tertiary)' : 'transparent',
                            color: activeTab === "dataview" ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        Databases (Dataview)
                    </div>
                    <div
                        onClick={() => setActiveTab("tasks")}
                        style={{
                            padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px',
                            backgroundColor: activeTab === "tasks" ? 'var(--bg-tertiary)' : 'transparent',
                            color: activeTab === "tasks" ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        Tasks
                    </div>
                </div>
            </div>

            {/* Settings Content */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-border)' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>
                        {activeTab === "general" && "General"}
                        {activeTab === "git" && "Git Version Control"}
                        {activeTab === "daily" && "Daily Notes"}
                        {activeTab === "templates" && "Templates"}
                        {activeTab === "dataview" && "Databases (Dataview)"}
                        {activeTab === "tasks" && "Tasks"}
                    </h2>
                    <button className="icon-btn" onClick={closeSettings} title="Close Settings">
                        <X size={20} />
                    </button>
                </div>
                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px' }}>

                    {activeTab === "general" && (
                        <>
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
                        </>
                    )}

                    {activeTab === "git" && (
                        <>
                            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ maxWidth: '60%' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Auto-commit Interval (minutes)</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Automatically sync your vault in the background. Set to 0 to disable automated background syncs.</div>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    value={autoCommitInterval}
                                    onChange={(e) => updateGitSetting('autoCommitInterval', parseInt(e.target.value) || 0)}
                                    style={{ width: '80px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ maxWidth: '60%' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Pull before Committing</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ensures latest remote changes are fetched before pushing new edits.</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={pullBeforeCommit}
                                    onChange={(e) => updateGitSetting('pullBeforeCommit', e.target.checked)}
                                />
                            </div>

                            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ maxWidth: '50%' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Commit Message Template</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>The default message used for automated commits. Use <code>&#123;&#123;date&#125;&#125;</code> to insert the timestamp.</div>
                                </div>
                                <input
                                    type="text"
                                    value={commitMessageTemplate}
                                    onChange={(e) => updateGitSetting('commitMessageTemplate', e.target.value)}
                                    style={{ width: '250px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Git plugin settings are securely isolated and saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/git.json</code>
                            </div>
                        </>
                    )}

                    {activeTab === "daily" && (
                        <>
                            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ maxWidth: '60%' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Date Format</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>The naming convention for new daily notes. (e.g. YYYY-MM-DD or MM-DD-YYYY)</div>
                                </div>
                                <input
                                    type="text"
                                    value={dateFormat}
                                    placeholder="YYYY-MM-DD"
                                    onChange={(e) => updateDailySetting('dateFormat', e.target.value)}
                                    style={{ width: '150px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ maxWidth: '60%' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>New file location</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>New daily notes will be placed here exactly as defined.</div>
                                </div>
                                <input
                                    type="text"
                                    value={folderPath}
                                    placeholder="Daily/"
                                    onChange={(e) => updateDailySetting('folderPath', e.target.value)}
                                    style={{ width: '250px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ maxWidth: '50%' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Template file location</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Choose a file to use as a template. New daily notes will pre-load with its contents.</div>
                                </div>
                                <input
                                    type="text"
                                    value={templatePath}
                                    placeholder="Templates/Daily.md"
                                    onChange={(e) => updateDailySetting('templatePath', e.target.value)}
                                    style={{ width: '250px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Daily Note settings are securely isolated and saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/daily.json</code>
                            </div>
                        </>
                    )}

                    {activeTab === "templates" && (
                        <>
                            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ maxWidth: '60%' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Template folder location</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Files in this folder will be available as templates. You can use <code>&#123;&#123;title&#125;&#125;</code>, <code>&#123;&#123;date&#125;&#125;</code>, and <code>&#123;&#123;time&#125;&#125;</code> variables.</div>
                                </div>
                                <input
                                    type="text"
                                    value={templateFolderPath}
                                    placeholder="Templates/"
                                    onChange={(e) => updateTemplatesSetting('templateFolderPath', e.target.value)}
                                    style={{ width: '250px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Templates settings are securely isolated and saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/templates.json</code>
                            </div>
                        </>
                    )}

                    {activeTab === "dataview" && (
                        <>
                            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ maxWidth: '60%' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Enable Frontmatter Database Extraction</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Dynamically scan and parse YAML frontmatter (between `---` blocks) in all markdown files across the vault for use in the Databases side panel.</div>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={parseFrontmatter}
                                        onChange={(e) => updateDataviewSetting('parseFrontmatter', e.target.checked)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Dataview settings are securely isolated and saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/dataview.json</code>
                            </div>
                        </>
                    )}

                    {activeTab === "tasks" && (
                        <>
                            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ maxWidth: '60%' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Show Completed Tasks</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Include tasks checked as <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>[x]</code> in the sidebar.</div>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={showCompleted}
                                        onChange={(e) => updateTasksSetting('showCompleted', e.target.checked)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ maxWidth: '60%' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Group By File Instead of Date</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Group the task lists visually by their parent `.md` document name rather than their inner `due:` parameter date.</div>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={groupByFile}
                                        onChange={(e) => updateTasksSetting('groupByFile', e.target.checked)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Tasks settings are securely isolated and saved to <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>.syntagma/tasks.json</code>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
