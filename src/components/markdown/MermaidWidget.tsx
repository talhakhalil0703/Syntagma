import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with some reasonable defaults
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark', // We can adjust this based on the app's theme
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif',
});

interface MermaidWidgetProps {
    code: string;
}

export const MermaidWidget: React.FC<MermaidWidgetProps> = ({ code }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        
        const renderDiagram = async () => {
            if (!code.trim()) return;

            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, code);
                
                if (isMounted) {
                    setSvg(svg);
                    setError(null);
                }
            } catch (err: any) {
                console.error("Mermaid rendering error:", err);
                if (isMounted) {
                    setError(err.message || "Failed to render mermaid diagram");
                }
            }
        };

        renderDiagram();

        return () => {
            isMounted = false;
        };
    }, [code]);

    if (error) {
        return (
            <div className="mermaid-error" style={{
                padding: '12px',
                border: '1px solid var(--error-color, #ff4d4f)',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 77, 79, 0.1)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap'
            }}>
                <strong>Mermaid Error:</strong>
                <div style={{ marginTop: '8px' }}>{error}</div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="mermaid-render-container"
            style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                padding: '16px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                margin: '12px 0',
                cursor: 'pointer',
                overflowX: 'auto'
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};
