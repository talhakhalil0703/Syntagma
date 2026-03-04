import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorkspaceStore, type SplitNode } from '../../store/workspaceStore';
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

        const fallbackRoot: SplitNode = {
            id: 'mock-root',
            type: 'leaf',
            group: {
                id: 'mock-group',
                tabs: [{ id: "welcome", title: "Untitled Note.md" }],
                activeTabId: "welcome"
            }
        };

        useWorkspaceStore.setState({
            vaultPath: '/mock/vault',
            leftSidebarOpen: true,
            rightSidebarOpen: true,
            rootSplit: fallbackRoot,
            activeGroupId: 'mock-group'
        });
    });

    it('loadWorkspaceState restores tabs and layout', async () => {
        const mockRoot: SplitNode = {
            id: 'mock-root-loaded',
            type: 'leaf',
            group: {
                id: 'mock-group-loaded',
                tabs: [{ id: "t1", title: "Note 1" }, { id: "t2", title: "Note 2" }],
                activeTabId: "t2"
            }
        };

        const mockJson = JSON.stringify({
            leftSidebarOpen: false,
            rightSidebarOpen: true,
            rootSplit: mockRoot,
            activeGroupId: 'mock-group-loaded'
        });

        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });
        vi.mocked(FileSystemAPI.readFile).mockResolvedValue(mockJson);

        await useWorkspaceStore.getState().loadWorkspaceState();

        const state = useWorkspaceStore.getState();
        expect(state.leftSidebarOpen).toBe(false);
        expect(state.rightSidebarOpen).toBe(true);
        expect(state.rootSplit.group?.tabs.length).toBe(2);
        expect(state.rootSplit.group?.activeTabId).toBe("t2");
    });

    it('saveWorkspaceState writes current state to json', async () => {
        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        useWorkspaceStore.setState({
            leftSidebarOpen: false,
            activeGroupId: "test-group",
            rootSplit: {
                id: 'mock-root-saved',
                type: 'leaf',
                group: {
                    id: 'test-group',
                    tabs: [{ id: "welcome", title: "Untitled Note.md" }],
                    activeTabId: "test-note"
                }
            }
        });

        await useWorkspaceStore.getState().saveWorkspaceState();

        const state = useWorkspaceStore.getState();

        const expectedPayload = JSON.stringify({
            leftSidebarOpen: state.leftSidebarOpen,
            rightSidebarOpen: state.rightSidebarOpen,
            leftSidebarWidth: state.leftSidebarWidth,
            rightSidebarWidth: state.rightSidebarWidth,
            leftPanes: state.leftPanes,
            rightPaneGroups: state.rightPaneGroups,
            activeLeftPaneId: state.activeLeftPaneId,
            rootSplit: state.rootSplit,
            activeGroupId: state.activeGroupId,
            viewMode: state.viewMode,
        }, null, 2);

        expect(FileSystemAPI.writeFile).toHaveBeenCalledWith('/mock/vault/.syntagma/workspace.json', expectedPayload);
    });

    it('actions trigger auto-save', async () => {
        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        useWorkspaceStore.getState().setActiveTab('new-tab', 'mock-group');

        expect(useWorkspaceStore.getState().rootSplit.group?.activeTabId).toBe('new-tab');

        // allow microtasks to flush
        await new Promise((r) => setTimeout(r, 0));

        expect(FileSystemAPI.writeFile).toHaveBeenCalled();
    });
});
