import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileSystemAPI } from '../../utils/fs';

// Mock the electron window object
const mockIpcRenderer = {
    invoke: vi.fn(),
};

(window as any).require = vi.fn().mockReturnValue({
    ipcRenderer: mockIpcRenderer,
});

describe('FileSystemAPI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('writeFile should invoke fs:writeFile successfully', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ success: true });
        const result = await FileSystemAPI.writeFile('/test/path.json', 'content');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fs:writeFile', { filePath: '/test/path.json', content: 'content' });
        expect(result).toBe(true);
    });

    it('writeFile should return false on failure', async () => {
        mockIpcRenderer.invoke.mockRejectedValue(new Error('IPC Error'));
        const result = await FileSystemAPI.writeFile('/test/path.json', 'content');
        expect(result).toBe(false);
    });

    it('readFile should invoke fs:readFile and return content', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ success: true, content: 'file content' });
        const result = await FileSystemAPI.readFile('/test/path.json');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fs:readFile', { filePath: '/test/path.json' });
        expect(result).toBe('file content');
    });

    it('readFile should return null on failure', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ success: false, error: 'Not found' });
        const result = await FileSystemAPI.readFile('/test/path.json');
        expect(result).toBeNull();
    });

    it('getVaultPath should invoke fs:getVaultPath', async () => {
        mockIpcRenderer.invoke.mockResolvedValue('/mock/vault/path');
        const result = await FileSystemAPI.getVaultPath();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fs:getVaultPath');
        expect(result).toBe('/mock/vault/path');
    });

    it('readDir should invoke fs:readDir and return items', async () => {
        const mockItems = [{ name: 'file.md', isDirectory: false, path: '/test/file.md' }];
        mockIpcRenderer.invoke.mockResolvedValue({ success: true, items: mockItems });
        const result = await FileSystemAPI.readDir('/test');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fs:readDir', { dirPath: '/test' });
        expect(result).toEqual(mockItems);
    });

    it('readDir should return empty array on failure', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ success: false, error: 'Not found' });
        const result = await FileSystemAPI.readDir('/test');
        expect(result).toEqual([]);
    });

    it('stat should invoke fs:stat and return stats', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ success: true, isDirectory: true, size: 4096, mtimeMs: 123456789 });
        const result = await FileSystemAPI.stat('/test');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fs:stat', { targetPath: '/test' });
        expect(result).toEqual({ isDirectory: true, size: 4096, mtimeMs: 123456789 });
    });

    it('mkdir should invoke fs:mkdir and return success', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ success: true });
        const result = await FileSystemAPI.mkdir('/test/newdir');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fs:mkdir', { dirPath: '/test/newdir' });
        expect(result).toBe(true);
    });
});
