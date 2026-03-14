import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useThemeStore } from '../../store/themeStore';

mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
});

interface MermaidRendererProps {
    chart: string;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const { mode, systemDark } = useThemeStore();
    const isDark = mode === 'dark' || (mode === 'system' && systemDark);

    useEffect(() => {
        let active = true;
        mermaid.initialize({
            startOnLoad: false,
            // Ensure Mermaid seamlessly mirrors the active workspace app theme natively
            theme: isDark ? 'dark' : 'default',
            securityLevel: 'loose',
        });

        const renderChart = async () => {
            // Handle gracefully so AST loop doesn't crash on Syntax errors while typing live
            try {
                // Generate collision-resistant SVG element ID dynamically
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg: renderedSvg } = await mermaid.render(id, chart);
                if (active) {
                    setSvg(renderedSvg);
                }
            } catch (error) {
                console.error('Mermaid rendering failed. Likely typing syntax error:', error);
                if (active) {
                    setSvg(`<div style="color: var(--text-secondary); border: 2px dashed var(--bg-border); padding: 16px; border-radius: 8px; text-align: center;">Waiting for valid Mermaid syntax...</div>`);
                }
            }
        };

        if (chart) renderChart();

        return () => { active = false; };
    }, [chart, isDark]);

    return (
        <div
            ref={containerRef}
            dangerouslySetInnerHTML={{ __html: svg }}
            className="mermaid-wrapper"
            style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0', overflowX: 'auto' }}
        />
    );
};
