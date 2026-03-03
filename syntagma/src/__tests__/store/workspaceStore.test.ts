import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('workspaceStore', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        useWorkspaceStore.setState({
            vaultPath: '/mock/vault',
            leftSidebarOpen: true,
            rightSidebarOpen: true,
            openTabs: [{ id: "welcome", title: "Untitled Note.md" }],
            activeTabId: "welcome"
        });
    });

    it('loadWorkspaceState restores tabs and layout', async () => {
        const mockJson = JSON.stringify({
            leftSidebarOpen: false,
            rightSidebarOpen: true,
            openTabs: [{ id: "t1", title: "Note 1" }, { id: "t2", title: "Note 2" }],
            activeTabId: "t2"
        });

        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });
        vi.mocked(FileSystemAPI.readFile).mockResolvedValue(mockJson);

        await useWorkspaceStore.getState().loadWorkspaceState();

        const state = useWorkspaceStore.getState();
        expect(state.leftSidebarOpen).toBe(false);
        expect(state.rightSidebarOpen).toBe(true);
        expect(state.openTabs.length).toBe(2);
        expect(state.activeTabId).toBe("t2");
    });

    it('saveWorkspaceState writes current state to json', async () => {
        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        useWorkspaceStore.setState({
            leftSidebarOpen: false,
            activeTabId: "test-note"
        });

        await useWorkspaceStore.getState().saveWorkspaceState();

        const expectedPayload = JSON.stringify({
            leftSidebarOpen: false,
            rightSidebarOpen: true,
            openTabs: [{ id: "welcome", title: "Untitled Note.md" }],
            activeTabId: "test-note"
        }, null, 2);

        expect(FileSystemAPI.writeFile).toHaveBeenCalledWith('/mock/vault/.syntagma/workspace.json', expectedPayload);
    });

    it('actions trigger auto-save', async () => {
        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        useWorkspaceStore.getState().setActiveTab('new-tab');

        expect(useWorkspaceStore.getState().activeTabId).toBe('new-tab');

        // allow microtasks to flush
        await new Promise(process.nextTick);

        expect(FileSystemAPI.writeFile).toHaveBeenCalled();
    });
});
