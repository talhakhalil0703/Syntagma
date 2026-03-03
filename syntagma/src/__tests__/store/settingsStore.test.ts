import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from '../../store/settingsStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileSystemAPI } from '../../utils/fs';

// Mock the FileSystem wrapper
vi.mock('../../utils/fs', () => ({
    FileSystemAPI: {
        getVaultPath: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
    }
}));

describe('settingsStore', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        useSettingsStore.setState({
            attachmentFolderPath: "/",
            autoUpdate: true,
            commands: []
        });
    });

    it('loadSettings should fetch settings from fs and set state', async () => {
        const mockJson = JSON.stringify({ attachmentFolderPath: "/custom/path", autoUpdate: false });

        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });
        vi.mocked(FileSystemAPI.readFile).mockResolvedValue(mockJson);

        await useSettingsStore.getState().loadSettings();

        const state = useSettingsStore.getState();
        expect(state.attachmentFolderPath).toBe("/custom/path");
        expect(state.autoUpdate).toBe(false);
        expect(FileSystemAPI.readFile).toHaveBeenCalledWith('/mock/vault/.syntagma/settings.json');
    });

    it('loadSettings should silently handle missing vault path or files', async () => {
        useWorkspaceStore.setState({ vaultPath: null });
        await useSettingsStore.getState().loadSettings();
        expect(FileSystemAPI.readFile).not.toHaveBeenCalled();

        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });
        vi.mocked(FileSystemAPI.readFile).mockResolvedValue(null);
        await useSettingsStore.getState().loadSettings();
        // state should remain default
        expect(useSettingsStore.getState().attachmentFolderPath).toBe("/");
    });

    it('saveSettings should write current settings to fs', async () => {
        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        useSettingsStore.setState({ attachmentFolderPath: "/saved/path" });
        await useSettingsStore.getState().saveSettings();

        const expectedPayload = JSON.stringify({
            attachmentFolderPath: "/saved/path",
            autoUpdate: true
        }, null, 2);

        expect(FileSystemAPI.writeFile).toHaveBeenCalledWith('/mock/vault/.syntagma/settings.json', expectedPayload);
    });

    it('updateSetting should modify scalar state and automatically invoke saveSettings', async () => {
        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        // Call update setting
        useSettingsStore.getState().updateSetting('autoUpdate', false);

        expect(useSettingsStore.getState().autoUpdate).toBe(false);

        // Auto-save gets triggered
        const expectedPayload = JSON.stringify({
            attachmentFolderPath: "/",
            autoUpdate: false
        }, null, 2);

        // allow microtasks to flush so the saveSettings promise resolves
        await new Promise((r) => setTimeout(r, 0));
        expect(FileSystemAPI.writeFile).toHaveBeenCalledWith('/mock/vault/.syntagma/settings.json', expectedPayload);
    });

    it('registerCommand puts command in array and unregister removes it', () => {
        const cmd = { id: 'c1', name: 'Test', callback: vi.fn() };
        useSettingsStore.getState().registerCommand(cmd);
        expect(useSettingsStore.getState().commands.length).toBe(1);

        useSettingsStore.getState().unregisterCommand('c1');
        expect(useSettingsStore.getState().commands.length).toBe(0);
    });
});
