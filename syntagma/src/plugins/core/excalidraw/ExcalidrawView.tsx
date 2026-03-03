import React, { useState, useEffect, useRef } from 'react';
import { Excalidraw } from "@excalidraw/excalidraw";
import { useThemeStore } from "../../../store/themeStore";

interface ExcalidrawViewProps {
    fileContent: string;
    onChange: (val: string) => void;
}

export const ExcalidrawView: React.FC<ExcalidrawViewProps> = ({ fileContent, onChange }) => {
    const { mode, systemDark } = useThemeStore();
    const isDark = mode === "dark" || (mode === "system" && systemDark);

    const [initialData, setInitialData] = useState<any>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Only load JSON from disk on initial mount of this file to prevent overlapping disk/UI sync errors
        if (!initialData) {
            if (fileContent.trim()) {
                try {
                    setInitialData(JSON.parse(fileContent));
                } catch (e) {
                    setInitialData({ elements: [], appState: {} });
                }
            } else {
                setInitialData({ elements: [], appState: {} });
            }
        }
    }, [fileContent, initialData]);

    const handleChange = (elements: readonly any[]) => {
        // Stringifying the AST vector array is expensive. Throttle passing it to App.tsx
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            onChange(JSON.stringify({ elements }, null, 2));
        }, 500);
    };

    if (!initialData) return <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading canvas...</div>;

    return (
        <div style={{ height: "100%", width: "100%" }}>
            <Excalidraw
                initialData={initialData}
                onChange={handleChange}
                theme={isDark ? "dark" : "light"}
            />
        </div>
    );
};
