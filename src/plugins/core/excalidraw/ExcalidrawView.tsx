import React, { useState, useEffect, useRef } from 'react';
import { Excalidraw } from "@excalidraw/excalidraw";
import { useThemeStore } from "../../../store/themeStore";

interface ExcalidrawViewProps {
    fileContent: string;
    onChange: (val: string) => void;
    fileId?: string;
}

export const ExcalidrawView: React.FC<ExcalidrawViewProps> = ({ fileContent, onChange, fileId }) => {
    const { mode, systemDark } = useThemeStore();
    const isDark = mode === "dark" || (mode === "system" && systemDark);

    const [initialData, setInitialData] = useState<any>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onChangeRef = useRef(onChange);
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const lastSavedDataRef = useRef<string | null>(null);

    // Force a fresh mount key whenever the content ID changes drastically
    const [mountKey, setMountKey] = useState(Date.now());
    const lastFileIdRef = useRef(fileId);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Clean up debounce timer on unmount to prevent stale saves
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                debounceTimer.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (fileId !== lastFileIdRef.current) {
            lastFileIdRef.current = fileId;
            setExcalidrawAPI(null);
            setMountKey(Date.now());
        }
    }, [fileId]);

    useEffect(() => {
        try {
            if (fileContent.trim() && fileContent !== lastSavedDataRef.current) {
                const parsed = JSON.parse(fileContent);
                setInitialData(parsed);
                if (excalidrawAPI) {
                    excalidrawAPI.updateScene({ elements: parsed.elements || [], appState: parsed.appState || {} });
                }
            } else if (!fileContent.trim()) {
                setInitialData({ elements: [], appState: {} });
                if (excalidrawAPI) {
                    excalidrawAPI.updateScene({ elements: [], appState: {} });
                }
            }
        } catch (e) {
            setInitialData({ elements: [], appState: {} });
            if (excalidrawAPI) {
                excalidrawAPI.updateScene({ elements: [], appState: {} });
            }
        }
    }, [fileContent, excalidrawAPI, mountKey]);

    const handleChange = React.useCallback((elements: readonly any[], appState: any, files: any) => {
        // ... (keep debounce same) ...
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            const payload = JSON.stringify({
                type: "excalidraw",
                version: 2,
                source: "https://excalidraw.com",
                elements,
                appState: {
                    theme: appState.theme,
                    viewBackgroundColor: appState.viewBackgroundColor,
                    currentItemStrokeColor: appState.currentItemStrokeColor,
                    currentItemBackgroundColor: appState.currentItemBackgroundColor,
                    currentItemFillStyle: appState.currentItemFillStyle,
                    currentItemStrokeWidth: appState.currentItemStrokeWidth,
                    currentItemStrokeStyle: appState.currentItemStrokeStyle,
                    currentItemRoughness: appState.currentItemRoughness,
                    currentItemOpacity: appState.currentItemOpacity,
                    currentItemFontFamily: appState.currentItemFontFamily,
                    currentItemFontSize: appState.currentItemFontSize,
                    currentItemTextAlign: appState.currentItemTextAlign,
                    currentItemStartArrowhead: appState.currentItemStartArrowhead,
                    currentItemEndArrowhead: appState.currentItemEndArrowhead,
                    scrollX: appState.scrollX,
                    scrollY: appState.scrollY,
                    zoom: appState.zoom
                },
                files
            }, null, 2);
            lastSavedDataRef.current = payload;
            onChangeRef.current(payload);
        }, 500);
    }, []);

    if (!initialData) return <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading canvas...</div>;

    return (
        <div style={{ height: "100%", width: "100%" }}>
            <Excalidraw
                key={`${mountKey}-${isDark ? "dark" : "light"}`}
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                initialData={initialData}
                onChange={handleChange}
                theme={isDark ? "dark" : "light"}
            />
        </div>
    );
};
