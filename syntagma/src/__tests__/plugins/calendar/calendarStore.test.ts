import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCalendarStore } from '../../../plugins/core/calendar/calendarStore';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useDailyNotesStore } from '../../../plugins/core/daily/dailyNotesStore';
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

describe('calendarStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        useWorkspaceStore.setState({ vaultPath: '/mock/vault' });

        useDailyNotesStore.setState({
            folderPath: 'Daily/',
            dateFormat: 'YYYY-MM-DD',
            templatePath: ''
        });

        useCalendarStore.setState({
            activeDays: new Set(),
            isLoading: false,
        });
    });

    it('queryActiveDays correctly parses YYYY-MM-DD filenames', async () => {
        vi.mocked(FileSystemAPI.readDirRecursive).mockResolvedValue([
            { name: '2026-03-04.md', isDirectory: false, path: '/mock/vault/Daily/2026-03-04.md' },
            { name: '2026-03-05.md', isDirectory: false, path: '/mock/vault/Daily/2026-03-05.md' },
            { name: 'README.md', isDirectory: false, path: '/mock/vault/Daily/README.md' }, // should be ignored
        ]);

        await useCalendarStore.getState().queryActiveDays();

        const state = useCalendarStore.getState();
        expect(state.activeDays.has('2026-03-04')).toBe(true);
        expect(state.activeDays.has('2026-03-05')).toBe(true);
        expect(state.activeDays.has('README')).toBe(false);
        expect(state.activeDays.size).toBe(2);
        expect(state.isLoading).toBe(false);
    });

    it('queryActiveDays finds notes in nested folder structures', async () => {
        useDailyNotesStore.setState({ dateFormat: 'YYYY-MM-DD' });

        // These would be in subdirectories like Daily/2026/03/
        vi.mocked(FileSystemAPI.readDirRecursive).mockResolvedValue([
            { name: '2026-03-04.md', isDirectory: false, path: '/mock/vault/Daily/2026/03/2026-03-04.md' },
            { name: '2026-02-15.md', isDirectory: false, path: '/mock/vault/Daily/2026/02/2026-02-15.md' },
        ]);

        await useCalendarStore.getState().queryActiveDays();

        const state = useCalendarStore.getState();
        expect(state.activeDays.has('2026-03-04')).toBe(true);
        expect(state.activeDays.has('2026-02-15')).toBe(true);
        expect(state.activeDays.size).toBe(2);
    });

    it('queryActiveDays parses text month names (YYYY-MMMM-DD)', async () => {
        useDailyNotesStore.setState({ dateFormat: 'YYYY-MMMM-DD' });

        vi.mocked(FileSystemAPI.readDirRecursive).mockResolvedValue([
            { name: '2026-March-04.md', isDirectory: false, path: '/mock/vault/Daily/2026-March-04.md' },
            { name: '2026-January-15.md', isDirectory: false, path: '/mock/vault/Daily/2026-January-15.md' },
        ]);

        await useCalendarStore.getState().queryActiveDays();

        const state = useCalendarStore.getState();
        expect(state.activeDays.has('2026-03-04')).toBe(true);
        expect(state.activeDays.has('2026-01-15')).toBe(true);
        expect(state.activeDays.size).toBe(2);
    });

    it('queryActiveDays parses abbreviated month (DD-MMM-YYYY)', async () => {
        useDailyNotesStore.setState({ dateFormat: 'DD-MMM-YYYY' });

        vi.mocked(FileSystemAPI.readDirRecursive).mockResolvedValue([
            { name: '04-Mar-2026.md', isDirectory: false, path: '/mock/vault/Daily/04-Mar-2026.md' },
        ]);

        await useCalendarStore.getState().queryActiveDays();

        const state = useCalendarStore.getState();
        expect(state.activeDays.has('2026-03-04')).toBe(true);
    });

    it('queryActiveDays handles slash format with text month (MMMM/YYYY-MM-DD)', async () => {
        useDailyNotesStore.setState({ dateFormat: 'MMMM/YYYY-MM-DD' });

        // With MMMM/YYYY-MM-DD, files are in subdirs like March/2026-03-04.md
        // readDirRecursive returns just the filename, which matches the last format segment
        vi.mocked(FileSystemAPI.readDirRecursive).mockResolvedValue([
            { name: '2026-03-04.md', isDirectory: false, path: '/mock/vault/Daily/March/2026-03-04.md' },
        ]);

        await useCalendarStore.getState().queryActiveDays();

        const state = useCalendarStore.getState();
        expect(state.activeDays.has('2026-03-04')).toBe(true);
    });

    it('queryActiveDays handles non-existent directory gracefully', async () => {
        vi.mocked(FileSystemAPI.readDirRecursive).mockRejectedValue(new Error('ENOENT'));

        await useCalendarStore.getState().queryActiveDays();

        const state = useCalendarStore.getState();
        expect(state.activeDays.size).toBe(0);
        expect(state.isLoading).toBe(false);
    });

    it('queryActiveDays skips non-vault state', async () => {
        useWorkspaceStore.setState({ vaultPath: '' });

        await useCalendarStore.getState().queryActiveDays();

        // readDirRecursive should not have been called
        expect(FileSystemAPI.readDirRecursive).not.toHaveBeenCalled();
    });
});
