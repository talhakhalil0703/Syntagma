import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home } from 'lucide-react';

export const BrowserView: React.FC = () => {
    const defaultUrl = 'https://duckduckgo.com';
    const [urlInput, setUrlInput] = useState(defaultUrl);
    const webviewRef = useRef<any>(null);

    const handleNavigate = (e: React.FormEvent) => {
        e.preventDefault();
        if (webviewRef.current) {
            let targetUrl = urlInput;
            if (!targetUrl.startsWith('http')) {
                // simple search heuristic
                if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
                    targetUrl = 'https://' + targetUrl;
                } else {
                    targetUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(targetUrl);
                }
            }
            webviewRef.current.loadURL(targetUrl);
        }
    };

    useEffect(() => {
        const wv = webviewRef.current;
        if (!wv) return;

        const handleUrlUpdate = () => setUrlInput(wv.getURL());

        wv.addEventListener('did-navigate', handleUrlUpdate);
        wv.addEventListener('did-navigate-in-page', handleUrlUpdate);

        return () => {
            wv.removeEventListener('did-navigate', handleUrlUpdate);
            wv.removeEventListener('did-navigate-in-page', handleUrlUpdate);
        };
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex', gap: '8px', padding: '8px 16px',
                background: 'var(--bg-secondary)', borderBottom: '1px solid var(--bg-border)',
                alignItems: 'center'
            }}>
                <button className="icon-btn" onClick={() => webviewRef.current?.goBack()} title="Go Back">
                    <ArrowLeft size={16} />
                </button>
                <button className="icon-btn" onClick={() => webviewRef.current?.goForward()} title="Go Forward">
                    <ArrowRight size={16} />
                </button>
                <button className="icon-btn" onClick={() => webviewRef.current?.reload()} title="Reload Page">
                    <RotateCw size={16} />
                </button>
                <button className="icon-btn" onClick={() => webviewRef.current?.loadURL(defaultUrl)} title="Home">
                    <Home size={16} />
                </button>
                <form onSubmit={handleNavigate} style={{ flexGrow: 1, display: 'flex' }}>
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        style={{
                            width: '100%', padding: '6px 12px', borderRadius: '16px',
                            border: '1px solid var(--bg-border)', background: 'var(--bg-primary)',
                            color: 'var(--text-primary)', outline: 'none'
                        }}
                        placeholder="Search or enter web address"
                    />
                </form>
            </div>

            {/* Native Webview Wrapper */}
            <div style={{ flexGrow: 1, backgroundColor: '#ffffff', position: 'relative' }}>
                { /* @ts-ignore */}
                <webview
                    ref={webviewRef}
                    src={defaultUrl}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
};
