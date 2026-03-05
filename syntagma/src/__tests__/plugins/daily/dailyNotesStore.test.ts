import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDailyNotesStore } from '../../../plugins/core/daily/dailyNotesStore';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { FileSystemAPI } from '../../../utils/fs';

// Mock the FileSystem wrapper
vi.mock('../../../utils/fs', () => ({
    FileSystemAPI: {
        stat: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        readDir: vi.fn(),
        readDirRecursive: vi.fn(),
    }
}));

describe('dailyNotesStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Set up workspace with a vault path
        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });

        // Reset daily notes store to defaults
        useDailyNotesStore.setState({
            folderPath: 'Daily/',
            dateFormat: 'YYYY-MM-DD',
            templatePath: ''
        });

        // Mock openTab to avoid side effects
        const openTabMock = vi.fn();
        useWorkspaceStore.setState({ openTab: openTabMock });
    });

    it('openDailyNote creates a file with correct YYYY-MM-DD formatted name', async () => {
        vi.mocked(FileSystemAPI.stat).mockResolvedValue(null); // file does not exist
        vi.mocked(FileSystemAPI.mkdir).mockResolvedValue(true);
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        const testDate = new Date(2026, 2, 4); // March 4, 2026
        await useDailyNotesStore.getState().openDailyNote(testDate);

        expect(FileSystemAPI.writeFile).toHaveBeenCalledWith(
            '/mock/vault/Daily/2026-03-04.md',
            ''
        );
    });

    it('openDailyNote uses custom date format for nested folders', async () => {
        useDailyNotesStore.setState({ dateFormat: 'YYYY/MM/YYYY-MM-DD' });

        vi.mocked(FileSystemAPI.stat).mockResolvedValue(null);
        vi.mocked(FileSystemAPI.mkdir).mockResolvedValue(true);
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        const testDate = new Date(2026, 2, 4);
        await useDailyNotesStore.getState().openDailyNote(testDate);

        // dateStr = "2026/03/2026-03-04", split on "/" => ["2026", "03", "2026-03-04"]
        // fileName = "2026-03-04.md"
        // fullDirName = "/mock/vault/Daily/2026/03"
        expect(FileSystemAPI.mkdir).toHaveBeenCalledWith('/mock/vault/Daily/2026/03');
        expect(FileSystemAPI.writeFile).toHaveBeenCalledWith(
            '/mock/vault/Daily/2026/03/2026-03-04.md',
            ''
        );
    });

    it('openDailyNote works with text month format (MMMM)', async () => {
        useDailyNotesStore.setState({ dateFormat: 'YYYY-MMMM-DD' });

        vi.mocked(FileSystemAPI.stat).mockResolvedValue(null);
        vi.mocked(FileSystemAPI.mkdir).mockResolvedValue(true);
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        const testDate = new Date(2026, 2, 4);
        await useDailyNotesStore.getState().openDailyNote(testDate);

        expect(FileSystemAPI.writeFile).toHaveBeenCalledWith(
            '/mock/vault/Daily/2026-March-04.md',
            ''
        );
    });

    it('openDailyNote works with abbreviated month (MMM) in nested dirs', async () => {
        useDailyNotesStore.setState({ dateFormat: 'YYYY/MMM/DD' });

        vi.mocked(FileSystemAPI.stat).mockResolvedValue(null);
        vi.mocked(FileSystemAPI.mkdir).mockResolvedValue(true);
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        const testDate = new Date(2026, 2, 4);
        await useDailyNotesStore.getState().openDailyNote(testDate);

        // dateStr = "2026/Mar/04", split on "/" => ["2026", "Mar", "04"]
        // fileName = "04.md"
        // fullDirName = "/mock/vault/Daily/2026/Mar"
        expect(FileSystemAPI.mkdir).toHaveBeenCalledWith('/mock/vault/Daily/2026/Mar');
        expect(FileSystemAPI.writeFile).toHaveBeenCalledWith(
            '/mock/vault/Daily/2026/Mar/04.md',
            ''
        );
    });

    it('openDailyNote skips file creation if note already exists', async () => {
        vi.mocked(FileSystemAPI.stat).mockResolvedValue({
            isDirectory: false, size: 100, mtimeMs: Date.now()
        });

        const testDate = new Date(2026, 2, 4);
        await useDailyNotesStore.getState().openDailyNote(testDate);

        expect(FileSystemAPI.writeFile).not.toHaveBeenCalled();
    });

    it('openDailyNote applies template content with {{date}} substitution', async () => {
        useDailyNotesStore.setState({ templatePath: 'Templates/Daily.md' });

        // File does not exist yet
        vi.mocked(FileSystemAPI.stat)
            .mockResolvedValueOnce(null) // note doesn't exist
            .mockResolvedValueOnce({ isDirectory: false, size: 50, mtimeMs: Date.now() }) // template exists
            .mockResolvedValueOnce(null); // dir doesn't exist

        vi.mocked(FileSystemAPI.readFile).mockResolvedValue('# {{date}}\nJournal entry for {{date}}');
        vi.mocked(FileSystemAPI.mkdir).mockResolvedValue(true);
        vi.mocked(FileSystemAPI.writeFile).mockResolvedValue(true);

        const testDate = new Date(2026, 2, 4);
        await useDailyNotesStore.getState().openDailyNote(testDate);

        expect(FileSystemAPI.writeFile).toHaveBeenCalledWith(
            '/mock/vault/Daily/2026-03-04.md',
            '# 2026-03-04\nJournal entry for 2026-03-04'
        );
    });
});
