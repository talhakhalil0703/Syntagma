import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    MousePointer2, Square, Circle, Pencil, Minus, ArrowUpRight, 
    Type, Search, Hash, Eraser, Droplets, Grid3X3, 
    Save, Download, Clipboard, Crop
} from 'lucide-react';
import { FileSystemAPI } from '../../../utils/fs';
import { useThemeStore } from '../../../store/themeStore';
import './ImageEdit.css';

type Tool = 'select' | 'rect' | 'circle' | 'pen' | 'line' | 'arrow' | 'text' | 'zoom' | 'step' | 'erase' | 'blur' | 'pixelate' | 'image' | 'crop';

interface ImageEditViewProps {
    fileId: string;
}

interface DrawingElement {
    id: string;
    type: Tool;
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: { x: number, y: number }[];
    text?: string;
    color: string;
    fillColor: string;
    strokeWidth: number;
    fontSize?: number;
    direction?: { x: number, y: number }; // For tear-drop step
    image?: HTMLImageElement; // For pasted images
}

export const ImageEditView: React.FC<ImageEditViewProps> = ({ fileId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [elements, setElements] = useState<DrawingElement[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
    const [settings, setSettings] = useState({
        color: '#ff0000',
        fillColor: 'transparent',
        strokeWidth: 2,
        fontSize: 16
    });
    const [stepCount, setStepCount] = useState(1);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [textOverlay, setTextOverlay] = useState<{ x: number, y: number, canvasX: number, canvasY: number } | null>(null);
    const [textInputValue, setTextInputValue] = useState('');
    
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [activeHandle, setActiveHandle] = useState<number | null>(null); // -1 for move, 0+ for handles
    const [history, setHistory] = useState<DrawingElement[][]>([]);
    const [redoStack, setRedoStack] = useState<DrawingElement[][]>([]);
    const [cropSelection, setCropSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);



    const { mode, systemDark } = useThemeStore();
    const isDark = mode === "dark" || (mode === "system" && systemDark);
    const isSvg = fileId.toLowerCase().endsWith('.svg');

    const centerImage = useCallback((img: HTMLImageElement) => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        const s = Math.min((width - 40) / img.width, (height - 40) / img.height, 1);
        setScale(s);
        setOffset({
            x: (width - img.width * s) / 2,
            y: (height - img.height * s) / 2
        });
    }, []);

    const saveToHistory = useCallback((newElements: DrawingElement[]) => {
        setHistory(prev => [...prev, elements]);
        setRedoStack([]);
        setElements(newElements);
    }, [elements]);

    const updateSelectedProperty = useCallback((property: keyof DrawingElement, value: any) => {
        if (selectedElementId) {
            setHistory(prev => [...prev, elements]);
            setElements(prev => prev.map(el => {
                if (el.id === selectedElementId) {
                    return { ...el, [property]: value };
                }
                return el;
            }));
            setRedoStack([]);
        }
    }, [selectedElementId, elements]);

    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setRedoStack(prev => [...prev, elements]);
        setHistory(prev => prev.slice(0, -1));
        setElements(previous);
        setSelectedElementId(null);
    }, [history, elements]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setHistory(prev => [...prev, elements]);
        setRedoStack(prev => prev.slice(0, -1));
        setElements(next);
        setSelectedElementId(null);
    }, [redoStack, elements]);

    const handleConfirmCrop = useCallback(() => {
        if (!cropSelection || !canvasRef.current || !image) return;

        const sx = cropSelection.w < 0 ? cropSelection.x + cropSelection.w : cropSelection.x;
        const sy = cropSelection.h < 0 ? cropSelection.y + cropSelection.h : cropSelection.y;
        const sw = Math.abs(cropSelection.w);
        const sh = Math.abs(cropSelection.h);

        if (sw < 5 || sh < 5) {
            setCropSelection(null);
            return;
        }

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = sw;
        cropCanvas.height = sh;
        const ctx = cropCanvas.getContext('2d')!;

        // Draw current state to new base image (flattening on crop for simplicity)
        ctx.drawImage(canvasRef.current, sx, sy, sw, sh, 0, 0, sw, sh);

        const newImg = new Image();
        newImg.onload = () => {
            saveToHistory([]); // Flattening means clearing elements
            setImage(newImg);
            setCropSelection(null);
            setActiveTool('select');
            centerImage(newImg);
        };
        newImg.src = cropCanvas.toDataURL();
    }, [cropSelection, image, saveToHistory, centerImage]);





    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    if (!blob) continue;
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => {
                        const newEl: DrawingElement = {
                            id: Date.now().toString(),
                            type: 'image',
                            x: 50, y: 50,
                            width: img.width / 2,
                            height: img.height / 2,
                            image: img,
                            color: '#fff',
                            fillColor: 'transparent',
                            strokeWidth: 0
                        };
                        saveToHistory([...elements, newEl]);
                        setSelectedElementId(newEl.id);
                    };
                    img.src = url;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [elements, saveToHistory]);

    useEffect(() => {
        const loadImage = async () => {
            try {
                const dataUrl = await FileSystemAPI.readImageBase64(fileId);
                if (!dataUrl) return;
                
                const img = new Image();
                img.onload = () => {
                    setImage(img);
                    centerImage(img);
                };
                img.src = dataUrl;
            } catch (e) {
                console.error("Failed to load image", e);
            }
        };
        loadImage();
    }, [fileId, centerImage]);

    const drawElement = useCallback((ctx: CanvasRenderingContext2D, el: DrawingElement) => {
        ctx.strokeStyle = el.color;
        ctx.fillStyle = el.fillColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        switch (el.type) {
            case 'rect':
                ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
                if (el.fillColor !== 'transparent') ctx.fillRect(el.x, el.y, el.width || 0, el.height || 0);
                break;
            case 'circle':
                ctx.beginPath();
                const rx = Math.abs(el.width || 0) / 2;
                const ry = Math.abs(el.height || 0) / 2;
                const cx = el.x + (el.width || 0) / 2;
                const cy = el.y + (el.height || 0) / 2;
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.stroke();
                if (el.fillColor !== 'transparent') ctx.fill();
                break;
            case 'pen':
                if (el.points && el.points.length > 0) {
                    ctx.beginPath();
                    ctx.moveTo(el.points[0].x, el.points[0].y);
                    el.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
                    ctx.stroke();
                }
                break;
            case 'line':
            case 'arrow':
                if (el.points && el.points.length >= 2) {
                    const [p1, p2, p3] = el.points;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    if (p3) {
                        ctx.quadraticCurveTo(p3.x, p3.y, p2.x, p2.y);
                    } else {
                        ctx.lineTo(p2.x, p2.y);
                    }
                    ctx.stroke();

                    if (el.type === 'arrow' && p2) {
                        const angle = Math.atan2(p2.y - (p3?.y ?? p1.y), p2.x - (p3?.x ?? p1.x));
                        ctx.save();
                        ctx.translate(p2.x, p2.y);
                        ctx.rotate(angle);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-15, -7);
                        ctx.lineTo(-15, 7);
                        ctx.closePath();
                        ctx.fillStyle = el.color;
                        ctx.fill();
                        ctx.restore();
                    }
                }
                break;
            case 'image':
                if (el.image) {
                    ctx.drawImage(el.image, el.x, el.y, el.width || el.image.width, el.height || el.image.height);
                }
                break;
            case 'text':
                ctx.fillStyle = el.color;
                ctx.font = `${el.fontSize}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(el.text || '', el.x, el.y);
                break;
            case 'step':
                const badgeRadius = 12;
                ctx.save();
                ctx.translate(el.x, el.y);
                if (el.direction) {
                    const angle = Math.atan2(el.direction.y, el.direction.x);
                    ctx.rotate(angle);
                }
                
                // Draw tear-drop
                ctx.beginPath();
                ctx.arc(0, 0, badgeRadius, Math.PI * 0.25, Math.PI * 1.75);
                ctx.lineTo(badgeRadius * 2, 0);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
                
                ctx.fillStyle = el.color; 
                ctx.font = `bold ${el.fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.text || '', el.x, el.y);
                break;
            case 'zoom':
                const zoomSize = 80;
                const zoomLevel = 2;
                ctx.save();
                ctx.beginPath();
                ctx.arc(el.x, el.y, zoomSize / 2, 0, Math.PI * 2);
                ctx.clip();
                if (image) {
                    ctx.drawImage(
                        image,
                        el.x - zoomSize / (2 * zoomLevel), el.y - zoomSize / (2 * zoomLevel),
                        zoomSize / zoomLevel, zoomSize / zoomLevel,
                        el.x - zoomSize / 2, el.y - zoomSize / 2,
                        zoomSize, zoomSize
                    );
                }
                ctx.restore();
                ctx.beginPath();
                ctx.arc(el.x, el.y, zoomSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'blur':
            case 'pixelate':
                ctx.save();
                ctx.beginPath();
                ctx.rect(el.x, el.y, el.width || 0, el.height || 0);
                ctx.clip();
                if (el.type === 'blur') {
                    ctx.filter = 'blur(5px)';
                    if (image) ctx.drawImage(image, 0, 0);
                } else {
                    const pSize = 8;
                    const w = Math.abs(el.width || 0);
                    const h = Math.abs(el.height || 0);
                    const x = el.width! < 0 ? el.x + el.width! : el.x;
                    const y = el.height! < 0 ? el.y + el.height! : el.y;
                    
                    if (image) {
                        const offCanvas = document.createElement('canvas');
                        offCanvas.width = w / pSize;
                        offCanvas.height = h / pSize;
                        const offCtx = offCanvas.getContext('2d');
                        if (offCtx) {
                            offCtx.imageSmoothingEnabled = false;
                            offCtx.drawImage(image, x, y, w, h, 0, 0, w / pSize, h / pSize);
                            ctx.imageSmoothingEnabled = false;
                            ctx.drawImage(offCanvas, 0, 0, w / pSize, h / pSize, x, y, w, h);
                        }
                    }
                }
                ctx.restore();
                break;
        }
    }, [image]);

    useEffect(() => {
        if (!image || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = containerRef.current!.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);
        
        ctx.drawImage(image, 0, 0);

        elements.forEach(el => drawElement(ctx, el));
        if (currentElement) drawElement(ctx, currentElement);

        // Draw handles for selected element
        if (selectedElementId) {
            const el = elements.find(e => e.id === selectedElementId) || (currentElement?.id === selectedElementId ? currentElement : null);
            if (el) {
                ctx.strokeStyle = '#00aaff';
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 1;
                
                if (el.type === 'rect' || el.type === 'blur' || el.type === 'pixelate' || el.type === 'circle' || el.type === 'image') {
                    ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
                    const handles = [
                        { x: el.x, y: el.y },
                        { x: el.x + (el.width || 0), y: el.y },
                        { x: el.x, y: el.y + (el.height || 0) },
                        { x: el.x + (el.width || 0), y: el.y + (el.height || 0) }
                    ];
                    ctx.setLineDash([]);
                    handles.forEach(h => {
                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    });
                } else if (el.points) {
                    ctx.beginPath();
                    ctx.moveTo(el.points[0].x, el.points[0].y);
                    el.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
                    ctx.stroke();
                    
                    ctx.setLineDash([]);
                    el.points.forEach(p => {
                        ctx.fillStyle = el.type === 'step' ? '#fff' : '#00aaff';
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    });
                }
            }
        }

        ctx.restore();
    }, [image, scale, offset, elements, currentElement, drawElement, selectedElementId]);

    const getMousePos = useCallback((e: React.MouseEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - offset.x) / scale,
            y: (e.clientY - rect.top - offset.y) / scale
        };
    }, [offset, scale]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isSvg) return;

        if (e.button === 1) {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
            return;
        }
        
        const { x, y } = getMousePos(e);

        // Check for handles first if an element is selected
        if (selectedElementId) {
            const el = elements.find(e => e.id === selectedElementId);
            if (el) {
                if (el.type === 'rect' || el.type === 'blur' || el.type === 'pixelate' || el.type === 'circle' || el.type === 'image') {
                    const handles = [
                        { x: el.x, y: el.y },
                        { x: el.x + (el.width || 0), y: el.y },
                        { x: el.x, y: el.y + (el.height || 0) },
                        { x: el.x + (el.width || 0), y: el.y + (el.height || 0) }
                    ];
                    const handleIdx = handles.findIndex(h => Math.abs(x - h.x) < 8 && Math.abs(y - h.y) < 8);
                    if (handleIdx !== -1) {
                        setActiveHandle(handleIdx);
                        setIsDrawing(true);
                        setLastMousePos({ x, y });
                        return;
                    }
                } else if (el.points) {
                    const handleIdx = el.points.findIndex(p => Math.abs(x - p.x) < 8 && Math.abs(y - p.y) < 8);
                    if (handleIdx !== -1) {
                        setActiveHandle(handleIdx);
                        setIsDrawing(true);
                        setLastMousePos({ x, y });
                        return;
                    }
                }
                
                // Check for move (click inside or near)
                let isInside = false;
                if (el.type === 'rect' || el.type === 'blur' || el.type === 'pixelate' || el.type === 'image') {
                    const w = el.width || 0;
                    const h = el.height || 0;
                    const ex = w < 0 ? el.x + w : el.x;
                    const ey = h < 0 ? el.y + h : el.y;
                    isInside = x >= ex && x <= ex + Math.abs(w) && y >= ey && y <= ey + Math.abs(h);
                } else {
                    isInside = Math.abs(x - el.x) < 20 && Math.abs(y - el.y) < 20;
                }

                if (isInside) {
                    setActiveHandle(-1); // Move
                    setIsDrawing(true);
                    setLastMousePos({ x, y });
                    return;
                }
            }
        }

        if (activeTool === 'select') {
            // Find element under cursor
            const foundIdx = [...elements].reverse().findIndex(el => {
                if (el.type === 'rect' || el.type === 'blur' || el.type === 'pixelate' || el.type === 'image') {
                    const w = el.width || 0;
                    const h = el.height || 0;
                    const ex = w < 0 ? el.x + w : el.x;
                    const ey = h < 0 ? el.y + h : el.y;
                    return x >= ex && x <= ex + Math.abs(w) && y >= ey && y <= ey + Math.abs(h);
                }
                if (el.type === 'circle') {
                    const dx = x - (el.x + (el.width || 0) / 2);
                    const dy = y - (el.y + (el.height || 0) / 2);
                    const rx = Math.abs(el.width || 0) / 2;
                    const ry = Math.abs(el.height || 0) / 2;
                    return (dx * dx) / (rx * rx || 1) + (dy * dy) / (ry * ry || 1) <= 1;
                }
                return Math.abs(x - el.x) < 15 && Math.abs(y - el.y) < 15;
            });

            if (foundIdx !== -1) {
                const actualIdx = elements.length - 1 - foundIdx;
                const el = elements[actualIdx];
                setSelectedElementId(el.id);
                setActiveHandle(-1);
                setIsDrawing(true);
                setLastMousePos({ x, y });
            } else {
                setSelectedElementId(null);
            }
            return;
        }

        if (activeTool === 'erase') {
            const newElements = elements.filter(el => {
                if (el.type === 'rect' || el.type === 'blur' || el.type === 'pixelate') {
                    const w = el.width || 0;
                    const h = el.height || 0;
                    const ex = w < 0 ? el.x + w : el.x;
                    const ey = h < 0 ? el.y + h : el.y;
                    return !(x >= ex && x <= ex + Math.abs(w) && y >= ey && y <= ey + Math.abs(h));
                }
                return !(Math.abs(x - el.x) < 20 && Math.abs(y - el.y) < 20);
            });
            if (newElements.length !== elements.length) {
                saveToHistory(newElements);
            }
            return;
        }

        if (activeTool === 'step') {
            setIsDrawing(true);
            const newEl: DrawingElement = {
                id: Date.now().toString(),
                type: 'step',
                x, y,
                text: stepCount.toString(),
                color: '#fff',
                fillColor: settings.color,
                strokeWidth: 1,
                fontSize: 14,
                direction: { x: 0, y: 0 }
            };
            setCurrentElement(newEl);
            setStepCount(prev => prev + 1);
            return;
        }

        if (activeTool === 'text') {
            const rect = canvasRef.current!.getBoundingClientRect();
            setTextOverlay({ 
                x: e.clientX - rect.left, 
                y: e.clientY - rect.top,
                canvasX: x,
                canvasY: y
            });
            setTextInputValue('');
            return;
        }

        if (activeTool === 'zoom') {
            const newEl: DrawingElement = {
                id: Date.now().toString(),
                type: 'zoom',
                x, y,
                width: 100, height: 100,
                color: '#fff',
                fillColor: 'transparent',
                strokeWidth: 2
            };
            setElements(prev => [...prev, newEl]);
            return;
        }
        
        setIsDrawing(true);
        const newEl: DrawingElement = {
            id: Date.now().toString(),
            type: activeTool,
            x, y,
            width: 0, height: 0,
            color: settings.color,
            fillColor: settings.fillColor,
            strokeWidth: settings.strokeWidth,
            fontSize: settings.fontSize,
            points: (activeTool === 'pen' || activeTool === 'line' || activeTool === 'arrow') ? [{ x, y }] : []
        };
        setCurrentElement(newEl);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
            return;
        }

        if (!isDrawing) return;
        const { x, y } = getMousePos(e);
        
        if (selectedElementId) {
            const elIdx = elements.findIndex(e => e.id === selectedElementId);
            if (elIdx === -1) {
                // Moving current element or transforming it
                if (activeHandle === -1) {
                    const dx = x - lastMousePos.x;
                    const dy = y - lastMousePos.y;
                    setCurrentElement(prev => {
                        if (!prev) return null;
                        const updated = { ...prev, x: prev.x + dx, y: prev.y + dy };
                        if (updated.points) updated.points = updated.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                        return updated;
                    });
                } else if (currentElement) {
                    // Transforming existing element
                    setCurrentElement(prev => {
                        if (!prev) return null;
                        const updated = { ...prev };
                        if (prev.type === 'rect' || prev.type === 'blur' || prev.type === 'pixelate' || prev.type === 'circle' || prev.type === 'image') {
                            if (activeHandle === 0) { updated.x = x; updated.width = (prev.width || 0) + (prev.x - x); updated.y = y; updated.height = (prev.height || 0) + (prev.y - y); }
                            else if (activeHandle === 1) { updated.width = x - prev.x; updated.y = y; updated.height = (prev.height || 0) + (prev.y - y); }
                            else if (activeHandle === 2) { updated.x = x; updated.width = (prev.width || 0) + (prev.x - x); updated.height = y - prev.y; }
                            else if (activeHandle === 3) { updated.width = x - prev.x; updated.height = y - prev.y; }
                        } else if (updated.points && activeHandle! < updated.points.length) {
                            updated.points = [...updated.points];
                            updated.points[activeHandle!] = { x, y };
                        }
                        return updated;
                    });
                }
                setLastMousePos({ x, y });
                return;
            } else if (activeHandle !== null) {
                // Start transforming an element that's in the elements array
                const el = elements[elIdx];
                setCurrentElement(el);
                setElements(prev => prev.filter(e => e.id !== selectedElementId));
                setLastMousePos({ x, y });
                return;
            }
        }

        if (activeTool === 'select' && activeHandle === -1 && currentElement) {
            const dx = x - lastMousePos.x;
            const dy = y - lastMousePos.y;
            setCurrentElement(prev => {
                if (!prev) return null;
                const updated = { ...prev, x: prev.x + dx, y: prev.y + dy };
                if (updated.points) updated.points = updated.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                return updated;
            });
            setLastMousePos({ x, y });
            return;
        }

        if (activeTool === 'crop' && isDrawing) {
            setCropSelection(prev => prev ? { ...prev, w: x - prev.x, h: y - prev.y } : null);
            return;
        }

        setCurrentElement(prev => {
            if (!prev) return null;
            if (prev.type === 'pen') {
                return { ...prev, points: [...(prev.points || []), { x, y }] };
            }
            if (prev.type === 'line' || prev.type === 'arrow') {
                const start = prev.points![0];
                return { ...prev, points: [start, { x, y }, { x: (start.x + x) / 2, y: (start.y + y) / 2 }] };
            }
            if (prev.type === 'step') {
                return { ...prev, direction: { x: x - prev.x, y: y - prev.y } };
            }
            return {
                ...prev,
                width: x - prev.x,
                height: y - prev.y
            };
        });
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setActiveHandle(null);
        if (activeTool === 'crop') {
            setIsDrawing(false);
            return;
        }
        if (!isDrawing || !currentElement) return;
        setIsDrawing(false);
        saveToHistory([...elements, currentElement]);
        setSelectedElementId(currentElement.id);
        setCurrentElement(null);
    };

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (textOverlay && textInputValue.trim()) {
            const newEl: DrawingElement = {
                id: Date.now().toString(),
                type: 'text',
                x: textOverlay.canvasX,
                y: textOverlay.canvasY,
                text: textInputValue,
                color: settings.color,
                fillColor: 'transparent',
                strokeWidth: 1,
                fontSize: settings.fontSize
            };
            saveToHistory([...elements, newEl]);
        }
        setTextOverlay(null);
        setTextInputValue('');
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        const { x, y } = getMousePos(e);
        const el = elements.find(el => el.type === 'text' && Math.abs(x - el.x) < 30 && Math.abs(y - el.y) < 20);
        if (el) {
            setTextOverlay({
                x: (el.x * scale) + offset.x,
                y: (el.y * scale) + offset.y,
                canvasX: el.x,
                canvasY: el.y
            });
            setTextInputValue(el.text || '');
            const newElements = elements.filter(e => e.id !== el.id);
            setElements(newElements);
            setSettings(prev => ({
                ...prev,
                color: el.color,
                fontSize: el.fontSize || prev.fontSize
            }));
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY;
        const zoomSpeed = 0.001 * scale; // Zoom speed proportional to current scale
        const newScale = Math.max(0.1, Math.min(20, scale + delta * zoomSpeed));

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const imageMouseX = (mouseX - offset.x) / scale;
            const imageMouseY = (mouseY - offset.y) / scale;

            setOffset({
                x: mouseX - imageMouseX * newScale,
                y: mouseY - imageMouseY * newScale
            });
        }
        setScale(newScale);
    };

    const saveImage = async (saveAs = false) => {
        if (!image) return;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(image, 0, 0);
        elements.forEach(el => drawElement(ctx, el));

        const dataUrl = tempCanvas.toDataURL('image/png');
        if (saveAs) {
            const { canceled, filePath } = await FileSystemAPI.showSaveDialog({
                title: 'Save As',
                defaultPath: fileId,
                filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
            });
            if (!canceled && filePath) {
                await FileSystemAPI.writeFile(filePath, dataUrl);
            }
        } else {
            await FileSystemAPI.writeFile(fileId, dataUrl);
        }
    };

    const copyToClipboard = async () => {
        if (!image) return;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(image, 0, 0);
        elements.forEach(el => drawElement(ctx, el));
        
        tempCanvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    const item = new ClipboardItem({ [blob.type]: blob });
                    await navigator.clipboard.write([item]);
                } catch (e) {
                    console.error("Clipboard write failed", e);
                }
            }
        });
    };

    const Tools = [
        { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select (V)' },
        { id: 'rect', icon: <Square size={18} />, label: 'Rectangle (R)' },
        { id: 'circle', icon: <Circle size={18} />, label: 'Sphere (O)' },
        { id: 'pen', icon: <Pencil size={18} />, label: 'Free hand (P)' },
        { id: 'line', icon: <Minus size={18} />, label: 'Line (L)' },
        { id: 'arrow', icon: <ArrowUpRight size={18} />, label: 'Arrow (A)' },
        { id: 'text', icon: <Type size={18} />, label: 'Text (T)' },
        { id: 'zoom', icon: <Search size={18} />, label: 'Zoom (Z)' },
        { id: 'step', icon: <Hash size={18} />, label: 'Step (S)' },
        { id: 'erase', icon: <Eraser size={18} />, label: 'Erase (E)' },
        { id: 'blur', icon: <Droplets size={18} />, label: 'Blur (B)' },
        { id: 'pixelate', icon: <Grid3X3 size={18} />, label: 'Pixelate (X)' },
        { id: 'crop', icon: <Crop size={18} />, label: 'Crop (K)' },
    ];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) handleRedo();
                else handleUndo();
                return;
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                handleRedo();
                return;
            } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveImage(false);
                return;
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                copyToClipboard();
                return;
            }

            // Tool shortcuts
            const keyMap: Record<string, Tool> = {
                'v': 'select',
                'r': 'rect',
                'o': 'circle',
                'p': 'pen',
                'l': 'line',
                'a': 'arrow',
                't': 'text',
                'z': 'zoom',
                's': 'step',
                'e': 'erase',
                'b': 'blur',
                'x': 'pixelate',
                'k': 'crop'
            };
            if (keyMap[e.key.toLowerCase()]) {
                setActiveTool(keyMap[e.key.toLowerCase()]);
                if (keyMap[e.key.toLowerCase()] !== 'crop') setCropSelection(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, image, elements, saveImage, copyToClipboard]);

    return (
        <div ref={containerRef} className={`image-edit-container ${isDark ? 'dark' : 'light'}`} onWheel={handleWheel}>
            <div className="image-edit-toolbar">
                <div className="toolbar-section">
                    <button className="toolbar-btn" onClick={() => saveImage(false)} title="Save"><Save size={18} /></button>
                    <button className="toolbar-btn" onClick={() => saveImage(true)} title="Save As"><Download size={18} /></button>
                    <button className="toolbar-btn" onClick={() => copyToClipboard()} title="Copy to Clipboard"><Clipboard size={18} /></button>
                </div>
                <div className="toolbar-divider" />
                <div className="toolbar-section">
                    {Tools.map(t => (
                        <button 
                            key={t.id} 
                            className={`toolbar-btn ${activeTool === t.id ? 'active' : ''} ${isSvg && t.id !== 'select' ? 'disabled' : ''}`}
                            onClick={() => !isSvg && setActiveTool(t.id as Tool)}
                            title={t.label}
                        >
                            {t.icon}
                        </button>
                    ))}
                </div>
                <div className="toolbar-divider" />
                {!isSvg && (
                <div className="toolbar-section settings">
                    <input 
                        type="color" 
                        value={settings.color} 
                        onChange={e => {
                            setSettings({...settings, color: e.target.value});
                            updateSelectedProperty('color', e.target.value);
                        }} 
                        title="Primary Color" 
                    />
                    <input 
                        type="color" 
                        value={settings.fillColor === 'transparent' ? '#ffffff' : settings.fillColor} 
                        onChange={e => {
                            setSettings({...settings, fillColor: e.target.value});
                            updateSelectedProperty('fillColor', e.target.value);
                        }} 
                        title="Fill Color" 
                    />
                    <button 
                        className="toolbar-btn" 
                        onClick={() => {
                            const newFill = settings.fillColor === 'transparent' ? '#ffffff' : 'transparent';
                            setSettings({...settings, fillColor: newFill});
                            updateSelectedProperty('fillColor', newFill);
                        }} 
                        title="Toggle Fill"
                    >
                        {settings.fillColor === 'transparent' ? 'No Fill' : 'Fill'}
                    </button>
                    <input 
                        type="number" 
                        value={settings.strokeWidth} 
                        min="1" 
                        max="20" 
                        onChange={e => {
                            const val = parseInt(e.target.value);
                            setSettings({...settings, strokeWidth: val});
                            updateSelectedProperty('strokeWidth', val);
                        }} 
                        title="Stroke Width" 
                        style={{width: '40px'}} 
                    />
                    {(activeTool === 'text' || activeTool === 'step' || (selectedElementId && elements.find(e => e.id === selectedElementId)?.fontSize)) && (
                        <input 
                            type="number" 
                            value={settings.fontSize} 
                            min="8" 
                            max="72" 
                            onChange={e => {
                                const val = parseInt(e.target.value);
                                setSettings({...settings, fontSize: val});
                                updateSelectedProperty('fontSize', val);
                            }} 
                            title="Font Size" 
                            style={{width: '40px'}} 
                        />
                    )}
                </div>
                )}
            </div>
            <canvas 
                ref={canvasRef} 
                style={{ cursor: isPanning ? 'grabbing' : activeTool === 'zoom' ? 'zoom-in' : 'crosshair' }} 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                onContextMenu={(e) => e.preventDefault()}
            />
            {cropSelection && activeTool === 'crop' && (
                <button className="crop-confirm-btn" onClick={handleConfirmCrop}>
                    Confirm Crop
                </button>
            )}
            {textOverlay && (
                <div 
                    className="text-input-overlay" 
                    style={{ left: textOverlay.x, top: textOverlay.y }}
                >
                    <form onSubmit={handleTextSubmit}>
                        <input 
                            autoFocus 
                            value={textInputValue}
                            onChange={e => setTextInputValue(e.target.value)}
                            onBlur={() => setTextOverlay(null)}
                            onKeyDown={e => {
                                if (e.key === 'Escape') setTextOverlay(null);
                            }}
                            placeholder="Type and press Enter..."
                        />
                    </form>
                </div>
            )}
            {isSvg && <div className="svg-overlay">SVG View Only</div>}
        </div>
    );
};
