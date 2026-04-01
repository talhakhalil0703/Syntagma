import React, { useState, useMemo, useCallback, useRef } from 'react';
import { MarkdownRenderer } from '../../../components/markdown/MarkdownRenderer';
import { useContextMenuStore } from '../../../store/contextMenuStore';
import { ChevronUp, ChevronDown, Filter, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Copy } from 'lucide-react';
import './Table.css';

interface TableViewProps {
    content: string;
    onChange: (newMarkdown: string) => void;
}

export const TableView: React.FC<TableViewProps> = ({ content, onChange }) => {
    // Parsing
    const { initialHeaders, initialRows } = useMemo(() => {
        const lines = content.trim().split('\n');
        if (lines.length < 2) return { initialHeaders: [], initialRows: [] };

        const parseRow = (line: string) => {
            const row = line.trim();
            if (!row.startsWith('|')) return [];
            
            const cells = [];
            let currentCell = '';
            let bracketDepth = 0;
            let escaped = false;
            
            // Slice off the leading pipe and trailing pipe if it exists
            const contentPart = row.slice(1, row.endsWith('|') ? -1 : undefined);
            
            for (let i = 0; i < contentPart.length; i++) {
                const char = contentPart[i];
                if (escaped) {
                    currentCell += char;
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                    currentCell += char;
                } else if (char === '[' && contentPart[i+1] === '[') {
                    bracketDepth++;
                    currentCell += '[[';
                    i++;
                } else if (char === ']' && contentPart[i+1] === ']') {
                    bracketDepth--;
                    currentCell += ']]';
                    i++;
                } else if (char === '|' && bracketDepth === 0) {
                    cells.push(currentCell.trim());
                    currentCell = '';
                } else {
                    currentCell += char;
                }
            }
            cells.push(currentCell.trim());
            
            // Unescape \| for the internal state
            return cells.map(c => c.replace(/\\\|/g, '|'));
        }

        const headers = parseRow(lines[0]);
        const rows = lines.slice(2).map(parseRow).filter(row => row.length > 0);

        return { initialHeaders: headers, initialRows: rows };
    }, [content]);

    const [headers, setHeaders] = useState<string[]>(initialHeaders);
    const [rows, setRows] = useState<string[][]>(initialRows);
    const [sortConfig, setSortConfig] = useState<{ key: number, direction: 'asc' | 'desc' | null }>({ key: -1, direction: null });
    const [filters, setFilters] = useState<string[]>(new Array(initialHeaders.length).fill(''));
    
    // Resizing State
    const [columnWidths, setColumnWidths] = useState<number[]>(new Array(initialHeaders.length).fill(150));
    const [rowHeights, setRowHeights] = useState<number[]>(new Array(initialRows.length).fill(40));

    const lastSerialized = useRef(content);

    // Sync state if content prop changes significantly (e.g. undo/redo)
    React.useEffect(() => {
        if (content === lastSerialized.current) return;

        setHeaders(initialHeaders);
        setRows(initialRows);
        setFilters(new Array(initialHeaders.length).fill(''));
        if (columnWidths.length !== initialHeaders.length) {
            setColumnWidths(new Array(initialHeaders.length).fill(150));
        }
        if (rowHeights.length !== initialRows.length) {
            setRowHeights(new Array(initialRows.length).fill(40));
        }
        lastSerialized.current = content;
    }, [initialHeaders, initialRows, content]);

    const serialize = useCallback((h: string[], r: string[][]) => {
        if (h.length === 0) return '';
        
        const escapeCell = (cell: string) => cell.replace(/\|/g, '\\|');
        
        const headerRow = `| ${h.map(escapeCell).join(' | ')} |`;
        const separatorRow = `| ${h.map(() => '---').join(' | ')} |`;
        const dataRows = r.map(row => `| ${row.map(escapeCell).join(' | ')} |`).join('\n');
        return `${headerRow}\n${separatorRow}\n${dataRows}`;
    }, []);

    const triggerChange = useCallback((h: string[], r: string[][]) => {
        const newMd = serialize(h, r);
        lastSerialized.current = newMd;
        onChange(newMd);
    }, [onChange, serialize]);

    // Sorting Logic
    const handleSort = (index: number) => {
        let direction: 'asc' | 'desc' | null = 'asc';
        if (sortConfig.key === index && sortConfig.direction === 'asc') direction = 'desc';
        else if (sortConfig.key === index && sortConfig.direction === 'desc') direction = null;

        setSortConfig({ key: index, direction });
    };

    const sortedRows = useMemo(() => {
        if (sortConfig.key === -1 || !sortConfig.direction) return rows;
        return [...rows].sort((a, b) => {
            const valA = a[sortConfig.key] || '';
            const valB = b[sortConfig.key] || '';
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [rows, sortConfig]);

    // Filtering Logic
    const filteredRows = useMemo(() => {
        return sortedRows.filter(row => {
            return row.every((cell, index) => {
                const filter = filters[index]?.toLowerCase() || '';
                return cell.toLowerCase().includes(filter);
            });
        });
    }, [sortedRows, filters]);

    // Manipulation Actions
    const addRow = (index: number, position: 'above' | 'below') => {
        const newRows = [...rows];
        const newRow = new Array(headers.length).fill('');
        const insertAt = position === 'above' ? index : index + 1;
        newRows.splice(insertAt, 0, newRow);
        setRows(newRows);
        triggerChange(headers, newRows);
    };

    const removeRow = (index: number) => {
        const newRows = [...rows];
        newRows.splice(index, 1);
        setRows(newRows);
        triggerChange(headers, newRows);
    };

    const addCol = (index: number, position: 'left' | 'right') => {
        const insertAt = position === 'left' ? index : index + 1;
        const newHeaders = [...headers];
        newHeaders.splice(insertAt, 0, 'New Column');
        const newRows = rows.map(row => {
            const newRow = [...row];
            newRow.splice(insertAt, 0, '');
            return newRow;
        });
        setHeaders(newHeaders);
        setRows(newRows);
        setFilters(prev => {
            const nf = [...prev];
            nf.splice(insertAt, 0, '');
            return nf;
        });
        triggerChange(newHeaders, newRows);
    };

    const removeCol = (index: number) => {
        if (headers.length <= 1) return;
        const newHeaders = [...headers];
        newHeaders.splice(index, 1);
        const newRows = rows.map(row => {
            const newRow = [...row];
            newRow.splice(index, 1);
            return newRow;
        });
        setHeaders(newHeaders);
        setRows(newRows);
        setFilters(prev => {
            const nf = [...prev];
            nf.splice(index, 1);
            return nf;
        });
        triggerChange(newHeaders, newRows);
    };

    const handleCopyMarkdown = () => {
        const md = serialize(headers, rows);
        navigator.clipboard.writeText(md);
        // Could add a toast here
    };

    // Context Menu Integration
    const { openMenu } = useContextMenuStore();
    const handleContextMenu = (e: React.MouseEvent, _type: 'cell' | 'header', rowIndex: number, colIndex: number) => {
        e.preventDefault();
        const items = [
            { id: 'add-row-above', label: 'Add Row Above', icon: <ArrowUp size={14}/>, action: () => addRow(rowIndex, 'above'), group: 'modify' },
            { id: 'add-row-below', label: 'Add Row Below', icon: <ArrowDown size={14}/>, action: () => addRow(rowIndex, 'below'), group: 'modify' },
            { id: 'remove-row', label: 'Remove Row', icon: <Trash2 size={14}/>, action: () => removeRow(rowIndex), group: 'danger' },
            { id: 'sep-1', label: '-', action: () => {} },
            { id: 'add-col-left', label: 'Add Column Left', icon: <ArrowLeft size={14}/>, action: () => addCol(colIndex, 'left'), group: 'modify' },
            { id: 'add-col-right', label: 'Add Column Right', icon: <ArrowRight size={14}/>, action: () => addCol(colIndex, 'right'), group: 'modify' },
            { id: 'remove-col', label: 'Remove Column', icon: <Trash2 size={14}/>, action: () => removeCol(colIndex), group: 'danger' },
            { id: 'sep-2', label: '-', action: () => {} },
            { id: 'copy-md', label: 'Copy as Markdown', icon: <Copy size={14}/>, action: handleCopyMarkdown, group: 'export' },
        ];
        openMenu(e.clientX, e.clientY, items);
    };

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = [...rows];
        newRows[rowIndex][colIndex] = value;
        setRows(newRows);
        triggerChange(headers, newRows);
    };

    const handleHeaderChange = (index: number, value: string) => {
        const newHeaders = [...headers];
        newHeaders[index] = value;
        setHeaders(newHeaders);
        triggerChange(newHeaders, rows);
    };

    const handleColumnResize = (index: number, newWidth: number) => {
        const newWidths = [...columnWidths];
        newWidths[index] = Math.max(50, newWidth);
        setColumnWidths(newWidths);
    };

    const handleRowResize = (index: number, newHeight: number) => {
        const newHeights = [...rowHeights];
        newHeights[index] = Math.max(30, newHeight);
        setRowHeights(newHeights);
    };

    return (
        <div className="interactive-table-wrapper">
            <table className="interactive-table">
                <thead>
                    <tr className="header-row">
                        {headers.map((h, i) => (
                            <th 
                                key={i} 
                                className="table-header-cell"
                                style={{ width: columnWidths[i] }}
                                onContextMenu={(e) => handleContextMenu(e, 'header', -1, i)}
                            >
                                <div className="header-content">
                                    <input 
                                        className="header-input"
                                        value={h}
                                        onChange={(e) => handleHeaderChange(i, e.target.value)}
                                        placeholder="Header..."
                                    />
                                    <div className="header-actions">
                                        <button className="sort-btn" onClick={() => handleSort(i)}>
                                            {sortConfig.key === i ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>
                                            ) : <ChevronUp size={12} style={{ opacity: 0.3 }}/>}
                                        </button>
                                    </div>
                                </div>
                                <div className="filter-wrapper">
                                    <Filter size={10} className="filter-icon" />
                                    <input 
                                        className="filter-input"
                                        placeholder="Filter..."
                                        value={filters[i]}
                                        onChange={(e) => {
                                            const nf = [...filters];
                                            nf[i] = e.target.value;
                                            setFilters(nf);
                                        }}
                                    />
                                </div>
                                <ResizeHandle 
                                    type="col" 
                                    onResize={(d) => handleColumnResize(i, columnWidths[i] + d)} 
                                />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {filteredRows.map((row, rowIndex) => (
                        <tr 
                            key={rowIndex} 
                            className="data-row"
                            style={{ height: rowHeights[rowIndex] }}
                        >
                            {row.map((cell, colIndex) => (
                                <td 
                                    key={colIndex} 
                                    className="table-cell"
                                    style={{ width: columnWidths[colIndex] }}
                                    onContextMenu={(e) => handleContextMenu(e, 'cell', rowIndex, colIndex)}
                                >
                                    <div className="cell-container">
                                        <CellContent 
                                            value={cell} 
                                            onChange={(val) => handleCellChange(rowIndex, colIndex, val)} 
                                        />
                                    </div>
                                    {colIndex === row.length - 1 && (
                                        <ResizeHandle 
                                            type="row" 
                                            onResize={(d) => handleRowResize(rowIndex, rowHeights[rowIndex] + d)} 
                                        />
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ResizeHandle = ({ type, onResize }: { type: 'col' | 'row', onResize: (delta: number) => void }) => {
    const [isResizing, setIsResizing] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        const startPos = type === 'col' ? e.clientX : e.clientY;

        const onMouseMove = (me: MouseEvent) => {
            const currentPos = type === 'col' ? me.clientX : me.clientY;
            onResize(currentPos - startPos);
            // In a better implementation we'd use requestAnimationFrame
        };

        const onMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div 
            className={`resize-handle ${type} ${isResizing ? 'active' : ''}`}
            onMouseDown={handleMouseDown}
        />
    );
};

const CellContent = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    // Sync if external value changes
    React.useEffect(() => setLocalValue(value), [value]);

    if (isEditing) {
        return (
            <textarea
                className="cell-editor"
                autoFocus
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={() => {
                    setIsEditing(false);
                    onChange(localValue);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        setIsEditing(false);
                        onChange(localValue);
                    }
                }}
            />
        );
    }

    return (
        <div 
            className="cell-renderer" 
            onClick={() => setIsEditing(true)}
        >
            <MarkdownRenderer content={value} />
        </div>
    );
};
