import React, { useState, useEffect } from "react";
import { FileSystemAPI } from "../utils/fs";
import { Editor } from "./Editor";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";
import { useWorkspaceStore } from "../store/workspaceStore";

export const SidebarNoteView: React.FC<{ noteId: string }> = ({ noteId }) => {
    const [content, setContent] = useState<string>("");
    const viewMode = useWorkspaceStore(state => state.viewMode);

    useEffect(() => {
        let isMounted = true;
        const loadNote = async () => {
            try {
                const text = await FileSystemAPI.readFile(noteId);
                if (isMounted && text !== null) {
                    setContent(text);
                }
            } catch (e) {
                console.error("Failed to load side note", e);
            }
        };
        loadNote();
        return () => {
            isMounted = false;
        };
    }, [noteId]);

    const handleChange = (newVal: string) => {
        setContent(newVal);
        // Debounce save
        if ((window as any)[`saveTimeout_${noteId}`]) {
            clearTimeout((window as any)[`saveTimeout_${noteId}`]);
        }
        (window as any)[`saveTimeout_${noteId}`] = setTimeout(async () => {
            try {
                await FileSystemAPI.writeFile(noteId, newVal);
            } catch (e) {
                console.error("Failed to save sidebar note", e);
            }
        }, 1000);
    };

    return (
        <div style={{ height: "100%", overflow: "auto" }}>
            {viewMode === "edit" ? (
                <Editor value={content} onChange={handleChange} />
            ) : (
                <div style={{ padding: "16px" }}>
                    <MarkdownRenderer content={content} />
                </div>
            )}
        </div>
    );
};
