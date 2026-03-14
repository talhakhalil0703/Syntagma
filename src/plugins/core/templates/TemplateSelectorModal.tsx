import { useEffect, useState } from "react";
import { useTemplatesStore } from "./templatesStore";
import { Search, FileText } from "lucide-react";

export function TemplateSelectorModal() {
    const { isSelectorOpen, closeSelector, getTemplates, applyTemplateAndInsert } = useTemplatesStore();
    const [templates, setTemplates] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (isSelectorOpen) {
            getTemplates().then(setTemplates);
            setSearchQuery("");
        }
    }, [isSelectorOpen, getTemplates]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isSelectorOpen) {
                closeSelector();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSelectorOpen, closeSelector]);

    if (!isSelectorOpen) return null;

    const filteredTemplates = templates.filter(t =>
        t.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div
            className="modal-overlay"
            onClick={closeSelector}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                display: 'flex', justifyContent: 'center', paddingTop: '15vh'
            }}
        >
            <div
                className="command-palette"
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    width: '600px',
                    maxHeight: '400px',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid var(--bg-border)'
                }}
            >
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--bg-border)' }}>
                    <Search size={18} color="var(--text-secondary)" style={{ marginRight: '12px' }} />
                    <input
                        type="text"
                        autoFocus
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            flexGrow: 1, border: 'none', outline: 'none',
                            backgroundColor: 'transparent', color: 'var(--text-primary)',
                            fontSize: '16px'
                        }}
                    />
                </div>

                <div style={{ overflowY: 'auto', flexGrow: 1, padding: '8px' }}>
                    {filteredTemplates.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No templates found in configuration directory.
                        </div>
                    ) : (
                        filteredTemplates.map((template, index) => (
                            <div
                                key={index}
                                onClick={() => {
                                    applyTemplateAndInsert(template);
                                    closeSelector();
                                }}
                                style={{
                                    padding: '10px 12px', display: 'flex', alignItems: 'center',
                                    borderRadius: '4px', cursor: 'pointer',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-primary)'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <FileText size={16} color="var(--text-accent)" style={{ marginRight: '12px' }} />
                                <span>{template}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
