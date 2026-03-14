import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useVaultIndexStore } from '../../store/vaultIndexStore';
import { FileSystemAPI } from '../../utils/fs';
import { MarkdownRenderer } from './MarkdownRenderer';

interface EmbeddedMarkdownProps {
    src: string;
    depth?: number;
}

export const EmbeddedMarkdown: React.FC<EmbeddedMarkdownProps> = ({ src, depth = 0 }) => {
    const { vaultPath } = useWorkspaceStore();
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    if (depth > 5) {
        return (
            <div className="markdown-embed error" style={{
                borderLeft: '2px solid var(--error-color, red)',
                paddingLeft: '16px',margin: '16px 0',color: 'var(--text-secondary)'
            }}>
                Transclusion loop or max depth reached.
            </div>
        );
    }

    useEffect(() => {
        let isMounted = true;
        
        const loadContent = async () => {
            if (!vaultPath) return;

            setLoading(true);
            setError(null);

            try {
                // Determine absolute path
                let targetSrc = src.replace(/^[/]/, '');
                if (targetSrc.startsWith('wiki-link:')) targetSrc = targetSrc.replace('wiki-link:', '');
                
                if (targetSrc.includes('|')) {
                    targetSrc = targetSrc.split('|')[0];
                }
                
                // Transclusions often come as `![[file]]` without .md, so try adding .md if missing
                let cleanName = decodeURIComponent(targetSrc).replace(/\+/g, ' ');
                if (!cleanName.endsWith('.md')) cleanName += '.md';

                // Find absolute path utilizing the fast cached index
                const resolveShortestPath = useVaultIndexStore.getState().resolveShortestPath;
                let resolvedPath = resolveShortestPath(cleanName);
                
                let fileContent = '';
                if (resolvedPath) {
                    fileContent = await FileSystemAPI.readFile(resolvedPath) || '';
                } else {
                    fileContent = await FileSystemAPI.readFile(`${vaultPath}/${cleanName}`) || '';
                }

                if (isMounted) {
                    setContent(fileContent);
                }
            } catch (err) {
                if (isMounted) {
                    setError('Failed to load embedded file.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadContent();

        return () => {
            isMounted = false;
        };
    }, [src, vaultPath]);

    if (loading) {
        return (
            <div className="markdown-embed loading" style={{
                borderLeft: '2px solid var(--border-color)',
                paddingLeft: '16px',
                margin: '16px 0',
                color: 'var(--text-secondary)'
            }}>
                Loading content...
            </div>
        );
    }

    if (error) {
        return (
            <div className="markdown-embed error" style={{
                borderLeft: '2px solid var(--error-color, red)',
                paddingLeft: '16px',
                margin: '16px 0',
                color: 'var(--text-secondary)'
            }}>
                File not found: {src}
            </div>
        );
    }

    return (
        <div className="markdown-embed">
            <MarkdownRenderer content={content} depth={depth + 1} />
        </div>
    );
};
