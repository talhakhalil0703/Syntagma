import { describe, it, expect, beforeEach } from 'vitest';
import { useExplorerSelectionStore } from '../../../plugins/core/explorer/explorerSelectionStore';

describe('explorerSelectionStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useExplorerSelectionStore.setState({
            selectedPaths: new Set<string>(),
            lastSelectedPath: null,
            clipboardPaths: [],
            clipboardSourceDir: null,
        });
    });

    describe('select', () => {
        it('selects a single path and clears others', () => {
            const store = useExplorerSelectionStore.getState();
            store.select('/vault/file1.md');
            const state = useExplorerSelectionStore.getState();
            expect(state.selectedPaths.size).toBe(1);
            expect(state.selectedPaths.has('/vault/file1.md')).toBe(true);
            expect(state.lastSelectedPath).toBe('/vault/file1.md');
        });

        it('clears previous selection when selecting a new path', () => {
            const store = useExplorerSelectionStore.getState();
            store.select('/vault/file1.md');
            store.select('/vault/file2.md');
            const state = useExplorerSelectionStore.getState();
            expect(state.selectedPaths.size).toBe(1);
            expect(state.selectedPaths.has('/vault/file2.md')).toBe(true);
            expect(state.selectedPaths.has('/vault/file1.md')).toBe(false);
        });
    });

    describe('toggle', () => {
        it('adds a path when not selected', () => {
            const store = useExplorerSelectionStore.getState();
            store.select('/vault/file1.md');
            store.toggle('/vault/file2.md');
            const state = useExplorerSelectionStore.getState();
            expect(state.selectedPaths.size).toBe(2);
            expect(state.selectedPaths.has('/vault/file1.md')).toBe(true);
            expect(state.selectedPaths.has('/vault/file2.md')).toBe(true);
        });

        it('removes a path when already selected', () => {
            const store = useExplorerSelectionStore.getState();
            store.select('/vault/file1.md');
            store.toggle('/vault/file1.md');
            const state = useExplorerSelectionStore.getState();
            expect(state.selectedPaths.size).toBe(0);
        });
    });

    describe('rangeSelect', () => {
        const flatPaths = [
            '/vault/a.md',
            '/vault/b.md',
            '/vault/c.md',
            '/vault/d.md',
            '/vault/e.md',
        ];

        it('selects a contiguous range from anchor to target', () => {
            const store = useExplorerSelectionStore.getState();
            store.select('/vault/b.md'); // Set anchor
            store.rangeSelect('/vault/d.md', flatPaths);
            const state = useExplorerSelectionStore.getState();
            expect(state.selectedPaths.size).toBe(3);
            expect(state.selectedPaths.has('/vault/b.md')).toBe(true);
            expect(state.selectedPaths.has('/vault/c.md')).toBe(true);
            expect(state.selectedPaths.has('/vault/d.md')).toBe(true);
        });

        it('selects range in reverse direction', () => {
            const store = useExplorerSelectionStore.getState();
            store.select('/vault/d.md'); // Set anchor
            store.rangeSelect('/vault/b.md', flatPaths);
            const state = useExplorerSelectionStore.getState();
            expect(state.selectedPaths.size).toBe(3);
            expect(state.selectedPaths.has('/vault/b.md')).toBe(true);
            expect(state.selectedPaths.has('/vault/c.md')).toBe(true);
            expect(state.selectedPaths.has('/vault/d.md')).toBe(true);
        });

        it('falls back to single select when no anchor', () => {
            const store = useExplorerSelectionStore.getState();
            store.rangeSelect('/vault/c.md', flatPaths);
            const state = useExplorerSelectionStore.getState();
            expect(state.selectedPaths.size).toBe(1);
            expect(state.selectedPaths.has('/vault/c.md')).toBe(true);
        });
    });

    describe('selectMultiple', () => {
        it('sets multiple paths at once', () => {
            const store = useExplorerSelectionStore.getState();
            store.selectMultiple(['/vault/a.md', '/vault/c.md', '/vault/e.md']);
            const state = useExplorerSelectionStore.getState();
            expect(state.selectedPaths.size).toBe(3);
        });
    });

    describe('clearSelection', () => {
        it('clears all selected paths', () => {
            const store = useExplorerSelectionStore.getState();
            store.select('/vault/file1.md');
            store.clearSelection();
            const state = useExplorerSelectionStore.getState();
            expect(state.selectedPaths.size).toBe(0);
            expect(state.lastSelectedPath).toBeNull();
        });
    });

    describe('copySelection', () => {
        it('copies selected paths to clipboard', () => {
            const store = useExplorerSelectionStore.getState();
            store.select('/vault/file1.md');
            store.toggle('/vault/file2.md');
            store.copySelection('/vault');
            const state = useExplorerSelectionStore.getState();
            expect(state.clipboardPaths).toHaveLength(2);
            expect(state.clipboardPaths).toContain('/vault/file1.md');
            expect(state.clipboardPaths).toContain('/vault/file2.md');
            expect(state.clipboardSourceDir).toBe('/vault');
        });
    });

    describe('isSelected', () => {
        it('returns true for selected path', () => {
            const store = useExplorerSelectionStore.getState();
            store.select('/vault/file1.md');
            expect(store.isSelected('/vault/file1.md')).toBe(true);
        });

        it('returns false for unselected path', () => {
            const store = useExplorerSelectionStore.getState();
            expect(store.isSelected('/vault/file1.md')).toBe(false);
        });
    });
});
