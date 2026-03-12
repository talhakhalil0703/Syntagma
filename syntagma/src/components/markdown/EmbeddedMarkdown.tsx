import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileSystemAPI } from '../../utils/fs';
import { MarkdownRenderer } from './MarkdownRenderer';

interface EmbeddedMarkdownProps {
    src: string;
}

export const EmbeddedMarkdown: React.FC<EmbeddedMarkdownProps> = ({ src }) => {
    const { vaultPath } = useWorkspaceStore();
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

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

                // Find absolute path
                const items = await FileSystemAPI.readDirRecursive(vaultPath);
                const match = items.find(i => !i.isDirectory && i.name.toLowerCase() === cleanName.toLowerCase());

                let fileContent = '';
                if (match) {
                    fileContent = await FileSystemAPI.readFile(match.path) || '';
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

        // Optional: listen to file changes if another tab modifies it
        const handleFsChange = () => loadContent();
        window.addEventListener('filesystem-changed', handleFsChange);
        return () => {
            isMounted = false;
            window.removeEventListener('filesystem-changed', handleFsChange);
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
        <div className="markdown-embed" style={{
            borderLeft: '2px solid var(--border-color, #444)',
            paddingLeft: '16px',
            margin: '16px 0',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '4px',
            overflow: 'hidden'
        }}>
            <MarkdownRenderer content={content} />
        </div>
    );
};
