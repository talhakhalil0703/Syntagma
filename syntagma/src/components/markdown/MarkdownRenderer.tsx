import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkWikiLink from 'remark-wiki-link';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useVaultIndexStore } from '../../store/vaultIndexStore';
import { FileSystemAPI } from '../../utils/fs';
import { MermaidRenderer } from './MermaidRenderer';
import { EmbeddedMarkdown } from './EmbeddedMarkdown';
import { ResizableImage } from './ResizableImage';

interface MarkdownRendererProps {
    content: string;
    depth?: number;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, depth = 0 }) => {
    const { vaultPath, openTab } = useWorkspaceStore();
    const resolveShortestPath = useVaultIndexStore(state => state.resolveShortestPath);

    const processedContent = useMemo(() => {
        if (!content) return '';
        // Pre-process Obsidian image transclusions: ![[image.png]] -> ![image.png](image.png)
        // Pre-process Obsidian file transclusions: ![[file.md]] -> ![file.md](file.md)
        return content.replace(/!\[\[(.*?)\]\]/g, (_, inner) => {
            return `![${inner}](${inner})`;
        });
    }, [content]);

    const handleInternalLink = async (targetName: string) => {
        if (!vaultPath) return;

        // Normalize name
        let cleanName = decodeURIComponent(targetName).replace(/\\+/g, ' ');
        if (!cleanName.endsWith('.md')) cleanName += '.md';

        // Find the absolute path by scanning the vault recursively
        const items = await FileSystemAPI.readDirRecursive(vaultPath);
        const match = items.find(i => !i.isDirectory && i.name.toLowerCase() === cleanName.toLowerCase());

        if (match) {
            openTab({ id: match.path, title: match.name });
        } else {
            // Assume creation in root if it doesn't exist
            openTab({ id: `${vaultPath}/${cleanName}`, title: cleanName });
        }
    };

    const components = useMemo(() => ({
        a: ({ node, href, children, ...props }: any) => {
            const isInternal = props.className?.includes('internal') || href?.startsWith('wiki-link:');

            if (isInternal) {
                const targetName = href?.replace('wiki-link:', '') || children[0];
                return (
                    <a
                        {...props}
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleInternalLink(targetName);
                        }}
                        style={{ cursor: 'pointer', color: 'var(--text-accent)', textDecoration: 'none' }}
                        onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                        {children}
                    </a>
                );
            }

            return (
                <a {...props} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-accent)' }}>
                    {children}
                </a>
            );
        },
        img: ({ node, src, alt, ...props }: any) => {
            let mediaSrc = src || '';
            let rawAlt = alt || '';
            let width: number | undefined = undefined;

            // Handle Obsidian-style resize parameters: ![[image.png|100]]
            if (mediaSrc.includes('|')) {
                const parts = mediaSrc.split('|');
                mediaSrc = parts[0];
                const dimensionMatch = parts[1].match(/^\d+/);
                if (dimensionMatch) {
                    width = parseInt(dimensionMatch[0], 10);
                }
            } else if (rawAlt && rawAlt.match(/^\d+$/)) {
                width = parseInt(rawAlt, 10);
            } else if (rawAlt && rawAlt.includes('|')) {
                const parts = rawAlt.split('|');
                const dimensionMatch = parts[parts.length - 1].match(/^\d+/);
                if (dimensionMatch) {
                    width = parseInt(dimensionMatch[0], 10);
                }
            }

            // Is it a markdown file transclusion?
            if (mediaSrc.toLowerCase().endsWith('.md')) {
                return <EmbeddedMarkdown src={mediaSrc} depth={depth} />;
            }

            if (mediaSrc && !mediaSrc.startsWith('http') && !mediaSrc.startsWith('data:')) {
                let cleanPath = mediaSrc.replace(/^[/]/, '');
                cleanPath = decodeURIComponent(cleanPath).replace(/\+/g, ' ');
                const resolved = resolveShortestPath(cleanPath);
                
                if (resolved) {
                    mediaSrc = `file://${resolved}`;
                } else if (vaultPath) {
                    mediaSrc = `file://${vaultPath}/${cleanPath}`;
                }
            }

            return <ResizableImage {...props} src={mediaSrc} alt={rawAlt} originalSrc={src || ''} defaultWidth={width} />;
        },
        code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            if (!inline && match && match[1] === 'mermaid') {
                return <MermaidRenderer chart={String(children).replace(/\n$/, '')} />;
            }
            return (
                <code className={className} style={{ background: 'var(--bg-secondary)', padding: inline ? '2px 4px' : '16px', borderRadius: '4px', overflowX: 'auto', display: inline ? 'inline' : 'block' }} {...props}>
                    {children}
                </code>
            );
        }
    }), [vaultPath, openTab]);

    return (
        <div className="markdown-preview-container" style={{
            padding: '32px 16px',
            maxWidth: '800px',
            margin: '0 auto',
            color: 'var(--text-primary)',
            fontSize: '16px',
            lineHeight: 1.6,
            wordWrap: 'break-word'
        }}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkWikiLink, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={components}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};
