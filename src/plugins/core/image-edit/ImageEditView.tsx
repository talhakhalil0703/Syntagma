import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    MousePointer2, Square, Circle, Pencil, Minus, ArrowUpRight, 
    Type, Search, Hash, Eraser, Droplets, Grid3X3, 
    Save, Download, Copy, Crop, Box
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

export const ImageEditView: React.FC<ImageEditViewProps> = ({ fileId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
    const [canvasOrigin, setCanvasOrigin] = useState({ x: 0, y: 0 });
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
    const textInputRef = useRef<HTMLInputElement>(null);
    
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [activeHandle, setActiveHandle] = useState<number | null>(null); // -1 for move, 0+ for handles
    const [history, setHistory] = useState<DrawingElement[][]>([]);
    const [redoStack, setRedoStack] = useState<DrawingElement[][]>([]);
    const [cropSelection, setCropSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);



    const { mode, systemDark } = useThemeStore();
    const isDark = mode === "dark" || (mode === "system" && systemDark);
    const isSvg = fileId.toLowerCase().endsWith('.svg');

    const centerImage = useCallback((img: HTMLImageElement) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || 800; // Fallback to avoid NaN
        const height = rect.height || 600;
        
        const s = Math.max(0.1, Math.min((width - 40) / (img.width || 1), (height - 40) / (img.height || 1), 1));
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
        if (selectedElementIds.length > 0) {
            setHistory(prev => [...prev, elements]);
            setElements(prev => prev.map(el => {
                if (selectedElementIds.includes(el.id)) {
                    return { ...el, [property]: value };
                }
                return el;
            }));
            setRedoStack([]);
        }
    }, [selectedElementIds, elements]);

    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setRedoStack(prev => [...prev, elements]);
        setHistory(prev => prev.slice(0, -1));
        setElements(previous);
        setSelectedElementIds([]);
    }, [history, elements]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setHistory(prev => [...prev, elements]);
        setHistory(prev => prev.slice(0, -1));
        setElements(next);
        setSelectedElementIds([]);
    }, [redoStack, elements]);

    const handleTextSubmit = useCallback((e?: React.FormEvent) => {
        if (e) e.preventDefault();
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
            setSelectedElementIds([newEl.id]);
        }
        setTextOverlay(null);
        setTextInputValue('');
    }, [textOverlay, textInputValue, elements, settings, saveToHistory]);

    const handleConfirmCrop = useCallback(() => {
        if (!cropSelection || !canvasRef.current || !image) return;

        // Ensure we don't blur or crash during crop
        if (textOverlay) handleTextSubmit();

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
        if (fileId.startsWith('image-edit-empty-')) {
            const canvas = document.createElement('canvas');
            const w = 800;
            const h = 600;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = isDark ? '#1a1a1a' : '#ffffff';
            ctx.fillRect(0, 0, w, h);
            
            const img = new Image();
            img.onload = () => {
                setImage(img);
                setCanvasSize({ width: w, height: h });
                setTimeout(() => centerImage(img), 0); // Defer to ensure container is rendered
            };
            img.src = canvas.toDataURL();
        }
    }, [fileId]); // Only run when fileId changes

    useEffect(() => {
        if (textOverlay && textInputRef.current) {
            const input = textInputRef.current;
            setTimeout(() => {
                input.focus();
                input.select();
            }, 50);
        }
    }, [textOverlay]);

    useEffect(() => {
        if (activeTool !== 'text' && textOverlay) {
            handleTextSubmit();
        }
    }, [activeTool, textOverlay, handleTextSubmit]);

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
                            width: img.width,
                            height: img.height,
                            image: img,
                            color: '#fff',
                            fillColor: 'transparent',
                            strokeWidth: 0
                        };
                        saveToHistory([...elements, newEl]);
                        setSelectedElementIds([newEl.id]);
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
                    setCanvasSize({ width: img.width, height: img.height });
                    centerImage(img);
                };
                img.src = dataUrl;
            } catch (e) {
                console.error("Failed to load image", e);
            }
        };
        loadImage();
    }, [fileId, centerImage]);

    useEffect(() => {
        if (!image) return;
        let minX = 0;
        let minY = 0;
        let maxX = image.width;
        let maxY = image.height;

        const allElements = [...elements];
        if (currentElement) allElements.push(currentElement);

        allElements.forEach(el => {
            if (el.points && el.points.length > 0) {
                el.points.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
            } else if (el.width !== undefined && el.height !== undefined) {
                const x1 = el.x;
                const y1 = el.y;
                const x2 = el.x + el.width;
                const y2 = el.y + el.height;
                minX = Math.min(minX, x1, x2);
                minY = Math.min(minY, y1, y2);
                maxX = Math.max(maxX, x1, x2);
                maxY = Math.max(maxY, y1, y2);
            } else {
                // Fallback for elements with only x, y (text, step, etc.)
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
                maxX = Math.max(maxX, el.x);
                maxY = Math.max(maxY, el.y);
            }
        });

        const newWidth = maxX - minX;
        const newHeight = maxY - minY;

        if (newWidth !== canvasSize.width || newHeight !== canvasSize.height || minX !== canvasOrigin.x || minY !== canvasOrigin.y) {
            setCanvasSize({ width: newWidth, height: newHeight });
            setCanvasOrigin({ x: minX, y: minY });
        }
    }, [elements, currentElement, image, canvasSize.width, canvasSize.height, canvasOrigin.x, canvasOrigin.y]);

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
                        const headSize = Math.max(10, el.strokeWidth * 4);
                        ctx.lineTo(-headSize, -headSize * 0.5);
                        ctx.lineTo(-headSize, headSize * 0.5);
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
                const lines = (el.text || '').split('\n');
                lines.forEach((line, i) => {
                    ctx.fillText(line, el.x, el.y + i * (el.fontSize || 14) * 1.2);
                });
                break;
            case 'step':
                const baseRadius = 12;
                const scaleFactor = (el.fontSize || 14) / 14;
                const r = baseRadius * scaleFactor;
                
                ctx.save();
                ctx.translate(el.x, el.y);
                ctx.fillStyle = el.fillColor;
                
                if (el.direction && (Math.abs(el.direction.x) > 5 || Math.abs(el.direction.y) > 5)) {
                    const angle = Math.atan2(el.direction.y, el.direction.x);
                    const dist = Math.sqrt(el.direction.x * el.direction.x + el.direction.y * el.direction.y);
                    const stretch = Math.min(dist, r * 3);
                    
                    ctx.rotate(angle);
                    
                    // Draw elongated tear-drop
                    ctx.beginPath();
                    ctx.arc(0, 0, r, Math.PI * 0.35, Math.PI * 1.65);
                    ctx.lineTo(r + stretch, 0);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Regular circle if not dragging
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                
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
                    const w = Math.abs(el.width || 0);
                    const h = Math.abs(el.height || 0);
                    const x = el.width! < 0 ? el.x + el.width! : el.x;
                    const y = el.height! < 0 ? el.y + el.height! : el.y;
                    ctx.filter = 'blur(5px)';
                    ctx.drawImage(ctx.canvas, x * scale + offset.x, y * scale + offset.y, w * scale, h * scale, x, y, w, h);
                } else {
                    const pSize = 8;
                    const w = Math.abs(el.width || 0);
                    const h = Math.abs(el.height || 0);
                    const x = el.width! < 0 ? el.x + el.width! : el.x;
                    const y = el.height! < 0 ? el.y + el.height! : el.y;
                    
                    if (image && w > 0 && h > 0) {
                        try {
                            const offCanvas = document.createElement('canvas');
                            offCanvas.width = Math.max(1, w / pSize);
                            offCanvas.height = Math.max(1, h / pSize);
                            const offCtx = offCanvas.getContext('2d');
                            if (offCtx) {
                                offCtx.imageSmoothingEnabled = false;
                                offCtx.drawImage(ctx.canvas, x * scale + offset.x, y * scale + offset.y, w * scale, h * scale, 0, 0, offCanvas.width, offCanvas.height);
                                ctx.imageSmoothingEnabled = false;
                                ctx.drawImage(offCanvas, 0, 0, offCanvas.width, offCanvas.height, x, y, w, h);
                            }
                        } catch (e) {
                            console.error("Pixelate failed", e);
                        }
                    }
                }
                ctx.restore();
                break;
        }
    }, [image, canvasSize, isDark]);

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
        
        ctx.fillStyle = isDark ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(canvasOrigin.x, canvasOrigin.y, canvasSize.width, canvasSize.height);
        
        ctx.drawImage(image, 0, 0);

        elements.forEach(el => drawElement(ctx, el));
        if (currentElement) drawElement(ctx, currentElement);

        // Draw multi-selection highlights
        selectedElementIds.forEach(id => {
            const el = elements.find(e => e.id === id) || (currentElement?.id === id ? currentElement : null);
            if (!el) return;

            ctx.strokeStyle = '#00aaff';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1;
            
            if (el.type === 'rect' || el.type === 'blur' || el.type === 'pixelate' || el.type === 'circle' || el.type === 'image') {
                ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
                if (selectedElementIds.length === 1) {
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
                }
            } else if (el.type === 'text') {
                 ctx.font = `${el.fontSize || 14}px sans-serif`;
                const lines = (el.text || '').split('\n');
                let maxW = 0;
                lines.forEach(l => {
                    const w = ctx.measureText(l).width;
                    if (w > maxW) maxW = w;
                });
                const th = lines.length * (el.fontSize || 14) * 1.2;
                ctx.strokeRect(el.x, el.y, maxW, th);
                if (selectedElementIds.length === 1) {
                    const handles = [
                        { x: el.x, y: el.y },
                        { x: el.x + maxW, y: el.y },
                        { x: el.x, y: el.y + th },
                        { x: el.x + maxW, y: el.y + th }
                    ];
                    ctx.setLineDash([]);
                    handles.forEach(h => {
                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    });
                }
            } else if (el.points && el.points.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                el.points.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
                ctx.strokeRect(minX - 5, minY - 5, (maxX - minX) + 10, (maxY - minY) + 10);
                if (selectedElementIds.length === 1) {
                    const handles = [
                        { x: minX - 5, y: minY - 5 },
                        { x: maxX + 5, y: minY - 5 },
                        { x: minX - 5, y: maxY + 5 },
                        { x: maxX + 5, y: maxY + 5 }
                    ];
                    ctx.setLineDash([]);
                    handles.forEach(h => {
                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    });
                }
            }
        });

        if (selectionRect) {
            ctx.strokeStyle = '#00aaff';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1;
            ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
            ctx.fillStyle = 'rgba(0, 170, 255, 0.1)';
            ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        }

        if (image) {
            ctx.strokeStyle = 'var(--bg-border)';
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
            ctx.strokeRect(canvasOrigin.x, canvasOrigin.y, canvasSize.width, canvasSize.height);

            // Resizing corner handle (bottom right)
            if ((activeTool as string) === 'select' && selectedElementIds.length === 0) {
                ctx.fillStyle = '#00aaff';
                ctx.beginPath();
                ctx.arc(canvasOrigin.x + canvasSize.width, canvasOrigin.y + canvasSize.height, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    }, [image, scale, offset, elements, currentElement, drawElement, selectedElementIds, canvasSize, activeTool, isDark]);

    const getMousePos = useCallback((e: React.MouseEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const currentScale = scale || 1;
        return {
            x: (e.clientX - rect.left - offset.x) / currentScale,
            y: (e.clientY - rect.top - offset.y) / currentScale
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
        const mx = (x - offset.x) / scale;
        const my = (y - offset.y) / scale;

        // Check for handles first if an element is selected and tool is 'select' or matching tool
        if (selectedElementIds.length > 0) {
            // Handles only supported for single selection for now
            if (selectedElementIds.length === 1) {
                const el = elements.find(e => e.id === selectedElementIds[0]);
                if (el && (activeTool === 'select' || activeTool === el.type)) {
                    let handles: { x: number, y: number }[] = [];
                    if (el.type === 'rect' || el.type === 'blur' || el.type === 'pixelate' || el.type === 'circle' || el.type === 'image') {
                        handles = [
                            { x: el.x, y: el.y },
                            { x: el.x + (el.width || 0), y: el.y },
                            { x: el.x, y: el.y + (el.height || 0) },
                            { x: el.x + (el.width || 0), y: el.y + (el.height || 0) }
                        ];
                    } else if (el.type === 'text') {
                        const ctx = canvasRef.current?.getContext('2d');
                        if (ctx) {
                            ctx.font = `${el.fontSize || 14}px sans-serif`;
                            const lines = (el.text || '').split('\n');
                            let maxW = 0;
                            lines.forEach(l => {
                                const w = ctx.measureText(l).width;
                                if (w > maxW) maxW = w;
                            });
                            const h = lines.length * (el.fontSize || 14) * 1.2;
                            handles = [
                                { x: el.x, y: el.y },
                                { x: el.x + maxW, y: el.y },
                                { x: el.x, y: el.y + h },
                                { x: el.x + maxW, y: el.y + h }
                            ];
                        }
                    } else if (el.type === 'pen' && el.points) {
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        el.points.forEach(p => {
                            minX = Math.min(minX, p.x);
                            minY = Math.min(minY, p.y);
                            maxX = Math.max(maxX, p.x);
                            maxY = Math.max(maxY, p.y);
                        });
                        handles = [
                            { x: minX, y: minY },
                            { x: maxX, y: minY },
                            { x: minX, y: maxY },
                            { x: maxX, y: maxY }
                        ];
                   }

                    const handleIdx = handles.findIndex(h => Math.abs(mx - h.x) < 10 && Math.abs(my - h.y) < 10);
                    if (handleIdx !== -1) {
                        setActiveHandle(handleIdx);
                        setIsDrawing(true);
                        setLastMousePos({ x: mx, y: my });
                        return;
                    }
                }
            }

            // Check for move for any of the selected elements
            for (const id of selectedElementIds) {
                const el = elements.find(e => e.id === id);
                if (!el) continue;

                let isInside = false;
                if (el.type === 'rect' || el.type === 'blur' || el.type === 'pixelate' || el.type === 'image') {
                    const w = el.width || 0;
                    const h = el.height || 0;
                    const ex = w < 0 ? el.x + w : el.x;
                    const ey = h < 0 ? el.y + h : el.y;
                    isInside = mx >= ex && mx <= ex + Math.abs(w) && my >= ey && my <= ey + Math.abs(h);
                } else if (el.type === 'circle') {
                    const dx = mx - (el.x + (el.width || 0) / 2);
                    const dy = my - (el.y + (el.height || 0) / 2);
                    const rx = Math.abs(el.width || 0) / 2;
                    const ry = Math.abs(el.height || 0) / 2;
                    isInside = (dx * dx) / (rx * rx || 1) + (dy * dy) / (ry * ry || 1) <= 1;
                } else if (el.type === 'text') {
                    const ctx = canvasRef.current?.getContext('2d');
                    if (ctx) {
                        ctx.font = `${el.fontSize || 14}px sans-serif`;
                        const lines = (el.text || '').split('\n');
                        let maxW = 0;
                        lines.forEach(l => {
                            const w = ctx.measureText(l).width;
                            if (w > maxW) maxW = w;
                        });
                        const h = lines.length * (el.fontSize || 14) * 1.2;
                        isInside = mx >= el.x && mx <= el.x + maxW && my >= el.y && my <= el.y + h;
                    }
                } else if (el.type === 'pen' && el.points) {
                    isInside = el.points.some(p => Math.abs(p.x - mx) < 10 && Math.abs(p.y - my) < 10);
                }

                if (isInside) {
                    setActiveHandle(-1); // Move
                    setIsDrawing(true);
                    setLastMousePos({ x: mx, y: my });
                    return;
                }
            }
        }

        if (activeTool === 'select' || (activeTool !== 'erase' && activeTool !== 'crop' && activeTool !== 'zoom')) {
            // Find element under cursor
            const foundIdx = [...elements].reverse().findIndex(el => {
                // Restrict pen selection to 'select' tool
                if (el.type === 'pen' && activeTool === 'pen') return false;

                // Only intercept selection if tool matches or is select tool
                if (activeTool !== 'select' && el.type !== activeTool) return false;

                if (el.type === 'rect' || el.type === 'blur' || el.type === 'pixelate' || el.type === 'image') {
                    const w = el.width || 0;
                    const h = el.height || 0;
                    const ex = w < 0 ? el.x + w : el.x;
                    const ey = h < 0 ? el.y + h : el.y;
                    return mx >= ex && mx <= ex + Math.abs(w) && my >= ey && my <= ey + Math.abs(h);
                }
                if (el.type === 'circle') {
                    const dx = mx - (el.x + (el.width || 0) / 2);
                    const dy = my - (el.y + (el.height || 0) / 2);
                    const rx = Math.abs(el.width || 0) / 2;
                    const ry = Math.abs(el.height || 0) / 2;
                    return (dx * dx) / (rx * rx || 1) + (dy * dy) / (ry * ry || 1) <= 1;
                }
                if (el.type === 'text') {
                    const ctx = canvasRef.current?.getContext('2d');
                    if (ctx) {
                        ctx.font = `${el.fontSize || 14}px sans-serif`;
                        const lines = (el.text || '').split('\n');
                        let maxW = 0;
                        lines.forEach(l => {
                            const w = ctx.measureText(l).width;
                            if (w > maxW) maxW = w;
                        });
                        const h = lines.length * (el.fontSize || 14) * 1.2;
                        return mx >= el.x && mx <= el.x + maxW && my >= el.y && my <= el.y + h;
                    }
                }
                if (el.type === 'pen' && el.points) {
                    return el.points.some(p => Math.abs(p.x - mx) < 10 && Math.abs(p.y - my) < 10);
                }
                return false;
            });

            if (foundIdx !== -1) {
                const actualIdx = elements.length - 1 - foundIdx;
                const clickedId = elements[actualIdx].id;
                
                // If already selected, don't clear other selections
                if (selectedElementIds.includes(clickedId)) {
                    setActiveHandle(-1);
                    setIsDrawing(true);
                    setLastMousePos({ x: mx, y: my });
                    return;
                }
                
                setSelectedElementIds([clickedId]);
                setActiveHandle(-1);
                setIsDrawing(true);
                setLastMousePos({ x: mx, y: my });
                return;
            } else if (activeTool === 'select') {
                setSelectedElementIds([]);
                setSelectionRect({ x: mx, y: my, w: 0, h: 0 });
                setIsDrawing(true);
                setLastMousePos({ x: mx, y: my });
                return;
            } else {
                setSelectedElementIds([]);
            }
        }

        if (activeTool === 'erase') {
            const hitIdx = [...elements].reverse().findIndex(el => {
                if (el.points) return el.points.some(p => Math.abs(p.x - x) < 20 && Math.abs(p.y - y) < 20);
                return Math.abs(el.x - x) < 20 && Math.abs(el.y - y) < 20;
            });
            if (hitIdx !== -1) {
                const actualIdx = elements.length - 1 - hitIdx;
                saveToHistory(elements.filter((_, i) => i !== actualIdx));
            }
            setIsDrawing(true); // Allow dragging to erase more
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
            if (textOverlay && textInputValue.trim()) {
                handleTextSubmit();
            }
            const containerRect = containerRef.current!.getBoundingClientRect();
            const canvasX = x;
            const canvasY = y;
            const screenX = e.clientX - containerRect.left;
            const screenY = e.clientY - containerRect.top;
            
            if (isNaN(screenX) || isNaN(screenY)) {
                console.error("NaN coordinates detected", { e, containerRect });
                return;
            }
            
            console.log("Activating Text Tool at", { screenX, screenY, canvasX, canvasY });
            
            setTextOverlay({ 
                x: screenX, 
                y: screenY,
                canvasX,
                canvasY
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
        
        if (selectedElementIds.length > 0) {
            if (activeHandle === -1) {
                // Moving selected elements
                const dx = x - lastMousePos.x;
                const dy = y - lastMousePos.y;
                setElements(prev => prev.map(el => {
                    if (selectedElementIds.includes(el.id)) {
                        const updated = { ...el, x: el.x + dx, y: el.y + dy };
                        if (updated.points) updated.points = updated.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                        return updated;
                    }
                    return el;
                }));
            } else if (selectedElementIds.length === 1 && activeHandle !== null) {
                // Resizing single element
                const id = selectedElementIds[0];
                setElements(prev => prev.map(el => {
                    if (el.id !== id) return el;
                    const updated = { ...el };
                    if (el.type === 'rect' || el.type === 'blur' || el.type === 'pixelate' || el.type === 'circle' || el.type === 'image') {
                        const curW = el.width || 0;
                        const curH = el.height || 0;
                        if (activeHandle === 0) { // Top-left
                            updated.x = x; updated.width = curW + (el.x - x); updated.y = y; updated.height = curH + (el.y - y);
                        } else if (activeHandle === 1) { // Top-right
                            updated.width = x - el.x; updated.y = y; updated.height = curH + (el.y - y);
                        } else if (activeHandle === 2) { // Bottom-left
                            updated.x = x; updated.width = curW + (el.x - x); updated.height = y - el.y;
                        } else if (activeHandle === 3) { // Bottom-right
                            updated.width = x - el.x; updated.height = y - el.y;
                        }
                    } else if (el.type === 'text') {
                        const ctx = canvasRef.current?.getContext('2d');
                        if (ctx) {
                            ctx.font = `${el.fontSize || 14}px sans-serif`;
                            const lines = (el.text || '').split('\n');
                            let maxW = 0;
                            lines.forEach(l => {
                                const w = ctx.measureText(l).width;
                                if (w > maxW) maxW = w;
                            });
                            const totalH = lines.length * (el.fontSize || 14) * 1.2;
                            let newFontSize = el.fontSize || 14;
                            let newX = el.x;
                            let newY = el.y;

                            if (activeHandle === 0) { // Top-left
                                const anchorX = el.x + maxW; const anchorY = el.y + totalH;
                                const scale_ = Math.max(0.1, Math.max((anchorX - x) / maxW, (anchorY - y) / totalH));
                                newFontSize = Math.max(8, Math.round((el.fontSize || 14) * scale_));
                                ctx.font = `${newFontSize}px sans-serif`;
                                let newMaxW = 0; lines.forEach(l => { const w = ctx.measureText(l).width; if (w > newMaxW) newMaxW = w; });
                                newX = anchorX - newMaxW; newY = anchorY - (lines.length * newFontSize * 1.2);
                            } else if (activeHandle === 1) { // Top-right
                                const anchorY = el.y + totalH;
                                const scale_ = Math.max(0.1, Math.max((x - el.x) / maxW, (anchorY - y) / totalH));
                                newFontSize = Math.max(8, Math.round((el.fontSize || 14) * scale_));
                                newY = anchorY - (lines.length * newFontSize * 1.2);
                            } else if (activeHandle === 2) { // Bottom-left
                                const anchorX = el.x + maxW;
                                const scale_ = Math.max(0.1, Math.max((anchorX - x) / maxW, (y - el.y) / totalH));
                                newFontSize = Math.max(8, Math.round((el.fontSize || 14) * scale_));
                                ctx.font = `${newFontSize}px sans-serif`;
                                let newMaxW = 0; lines.forEach(l => { const w = ctx.measureText(l).width; if (w > newMaxW) newMaxW = w; });
                                newX = anchorX - newMaxW;
                            } else if (activeHandle === 3) { // Bottom-right
                                const scale_ = Math.max(0.1, Math.max((x - el.x) / maxW, (y - el.y) / totalH));
                                newFontSize = Math.max(8, Math.round((el.fontSize || 14) * scale_));
                            }
                            updated.fontSize = newFontSize; updated.x = newX; updated.y = newY;
                        }
                    } else if (el.type === 'pen' && el.points) {
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        el.points.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
                        const w = maxX - minX, h = maxY - minY;
                        let scaleX = 1, scaleY = 1, originX = minX, originY = minY;
                        if (activeHandle === 0) { scaleX = (maxX - x) / w; scaleY = (maxY - y) / h; originX = maxX; originY = maxY; }
                        else if (activeHandle === 1) { scaleX = (x - minX) / w; scaleY = (maxY - y) / h; originX = minX; originY = maxY; }
                        else if (activeHandle === 2) { scaleX = (maxX - x) / w; scaleY = (y - minY) / h; originX = maxX; originY = minY; }
                        else if (activeHandle === 3) { scaleX = (x - minX) / w; scaleY = (y - minY) / h; originX = minX; originY = minY; }
                        if (!isNaN(scaleX) && isFinite(scaleX) && !isNaN(scaleY) && isFinite(scaleY)) {
                            updated.points = el.points.map(p => ({ x: originX + (p.x - originX) * scaleX, y: originY + (p.y - originY) * scaleY }));
                        }
                    }
                    return updated;
                }));
            }
            setLastMousePos({ x, y });
            return;
        }

        if (selectionRect) {
            setSelectionRect(prev => prev ? { ...prev, w: x - prev.x, h: y - prev.y } : null);
            return;
        }

        if (activeTool === 'erase') {
            const hitIdx = [...elements].reverse().findIndex(el => {
                if (el.points) return el.points.some(p => Math.abs(p.x - x) < 20 && Math.abs(p.y - y) < 20);
                return Math.abs(el.x - x) < 20 && Math.abs(el.y - y) < 20;
            });
            if (hitIdx !== -1) {
                const actualIdx = elements.length - 1 - hitIdx;
                setElements(prev => prev.filter((_, i) => i !== actualIdx));
            }
            return;
        }

        if (currentElement) {
            const updated = { ...currentElement };
            if (activeTool === 'pen') {
                updated.points = [...(updated.points || []), { x, y }];
            } else if (activeTool === 'step') {
                updated.direction = { x: x - updated.x, y: y - updated.y };
            } else if (activeTool === 'line' || activeTool === 'arrow') {
                updated.points = [updated.points![0], { x, y }];
            } else {
                updated.width = x - updated.x;
                updated.height = y - updated.y;
            }
            setCurrentElement(updated);
        }
    };

    const handleMouseUp = () => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (!isDrawing) return;

        if (selectionRect) {
            const sx = selectionRect.w < 0 ? selectionRect.x + selectionRect.w : selectionRect.x;
            const sy = selectionRect.h < 0 ? selectionRect.y + selectionRect.h : selectionRect.y;
            const sw = Math.abs(selectionRect.w);
            const sh = Math.abs(selectionRect.h);

            const foundIds = elements.filter(el => {
                if (el.points && el.points.length > 0) {
                    return el.points.every(p => p.x >= sx && p.x <= sx + sw && p.y >= sy && p.y <= sy + sh);
                }
                const w = el.width || 0; const h = el.height || 0;
                const ex = w < 0 ? el.x + w : el.x; const ey = h < 0 ? el.y + h : el.y;
                return ex >= sx && ex + Math.abs(w) <= sx + sw && ey >= sy && ey + Math.abs(h) <= sy + sh;
            }).map(el => el.id);

            setSelectedElementIds(foundIds);
            setSelectionRect(null);
        } else if (currentElement) {
            saveToHistory([...elements, currentElement]);
            setCurrentElement(null);
        } else if (selectedElementIds.length > 0) {
            saveToHistory(elements);
        }

        setIsDrawing(false);
        setActiveHandle(null);
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

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const { x, y } = getMousePos(e);
        const mx = x;
        const my = y;

        const hitIdx = [...elements].reverse().findIndex(el => {
             const w = el.width || 20;
             const h = el.height || 20;
             return mx >= el.x && mx <= el.x + w && my >= el.y && my <= el.y + h;
        });

        if (hitIdx !== -1) {
            const actualIdx = elements.length - 1 - hitIdx;
            const choice = window.prompt("Layering: f(Front), b(Back), F(Forward), B(Backward)");
            if (!choice) return;

            let newElements = [...elements];
            const el = newElements.splice(actualIdx, 1)[0];

            if (choice === 'f') newElements.push(el);
            else if (choice === 'b') newElements.unshift(el);
            else if (choice === 'F') newElements.splice(Math.min(newElements.length, actualIdx + 1), 0, el);
            else if (choice === 'B') newElements.splice(Math.max(0, actualIdx - 1), 0, el);
            
            saveToHistory(newElements);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY;
        const zoomSpeed = 0.001 * scale;
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
        tempCanvas.width = canvasSize.width;
        tempCanvas.height = canvasSize.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = isDark ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        ctx.save();
        ctx.translate(-canvasOrigin.x, -canvasOrigin.y);
        ctx.drawImage(image, 0, 0);
        elements.forEach(el => drawElement(ctx, el));
        ctx.restore();

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
        tempCanvas.width = canvasSize.width;
        tempCanvas.height = canvasSize.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        
        ctx.fillStyle = isDark ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        ctx.save();
        ctx.translate(-canvasOrigin.x, -canvasOrigin.y);
        ctx.drawImage(image, 0, 0);
        elements.forEach(el => drawElement(ctx, el));
        ctx.restore();

        const blob = await new Promise<Blob | null>(resolve => tempCanvas.toBlob(resolve, 'image/png'));
        if (blob && typeof ClipboardItem !== 'undefined') {
            try {
                const data = [new ClipboardItem({ 'image/png': blob })];
                await navigator.clipboard.write(data);
            } catch (e) {
                console.error("Clipboard write failed, falling back to data URL", e);
                const dataUrl = tempCanvas.toDataURL('image/png');
                await navigator.clipboard.writeText(dataUrl);
            }
        } else if (blob) {
            const dataUrl = tempCanvas.toDataURL('image/png');
            await navigator.clipboard.writeText(dataUrl);
        }
    };

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

            const keyMap: Record<string, Tool> = {
                'v': 'select', 'r': 'rect', 'o': 'circle', 'p': 'pen', 'l': 'line', 'a': 'arrow',
                't': 'text', 'z': 'zoom', 's': 'step', 'e': 'erase', 'b': 'blur', 'x': 'pixelate', 'k': 'crop'
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
                    <div className="toolbar-btn-wrapper">
                        <button className="toolbar-btn" onClick={() => saveImage(false)}><Save size={18} /></button>
                        <span className="tooltip">Save</span>
                    </div>
                    <div className="toolbar-btn-wrapper">
                        <button className="toolbar-btn" onClick={() => saveImage(true)}><Download size={18} /></button>
                        <span className="tooltip">Download</span>
                    </div>
                    <div className="toolbar-btn-wrapper">
                        <button className="toolbar-btn" onClick={() => copyToClipboard()}><Copy size={18} /></button>
                        <span className="tooltip">Copy to Clipboard</span>
                    </div>
                </div>
                <div className="toolbar-divider" />
                <div className="toolbar-section">
                    {Tools.map(t => (
                        <div key={t.id} className="toolbar-btn-wrapper">
                            <button 
                                className={`toolbar-btn ${(activeTool as string) === t.id ? 'active' : ''} ${isSvg && t.id !== 'select' ? 'disabled' : ''}`}
                                onClick={() => !isSvg && setActiveTool(t.id as Tool)}
                            >
                                {t.icon}
                            </button>
                            <span className="tooltip">{t.label}</span>
                        </div>
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
                    <div className="toolbar-btn-wrapper">
                        <button 
                            className={`toolbar-btn ${settings.fillColor === 'transparent' ? 'active' : ''}`}
                            onClick={() => {
                                const newFill = settings.fillColor === 'transparent' ? '#ffffff' : 'transparent';
                                setSettings({...settings, fillColor: newFill});
                                updateSelectedProperty('fillColor', newFill);
                            }} 
                        >
                            <Box size={18} strokeDasharray={settings.fillColor === 'transparent' ? "4 4" : "0"} />
                        </button>
                        <span className="tooltip">{settings.fillColor === 'transparent' ? 'Fill: Transparent' : 'Fill: Opaque'}</span>
                    </div>
                    <input 
                        type="number" 
                        value={settings.strokeWidth} 
                        min="1" max="20" 
                        onChange={e => {
                            const val = parseInt(e.target.value);
                            setSettings({...settings, strokeWidth: val});
                            updateSelectedProperty('strokeWidth', val);
                        }} 
                        title="Stroke Width" 
                        style={{width: '40px'}} 
                    />
                    {(activeTool === 'text' || activeTool === 'step' || (selectedElementIds.length === 1 && elements.find(e => e.id === selectedElementIds[0])?.fontSize)) && (
                        <input 
                            type="number" 
                            value={settings.fontSize} 
                            min="8" max="72" 
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
                onContextMenu={handleContextMenu}
            />
            {cropSelection && activeTool === 'crop' && (
                <button className="crop-confirm-btn" onClick={handleConfirmCrop}>Confirm Crop</button>
            )}
            {textOverlay && (
                <div className="text-input-overlay" style={{ left: textOverlay.x, top: textOverlay.y, background: 'transparent', border: 'none' }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                    <form onSubmit={handleTextSubmit}>
                        <textarea 
                            ref={textInputRef as any}
                            autoFocus 
                            value={textInputValue}
                            onChange={e => setTextInputValue(e.target.value)}
                            onKeyDown={e => {
                                e.stopPropagation();
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }
                                if (e.key === 'Escape') { setTextOverlay(null); setTextInputValue(''); }
                            }}
                            placeholder="Type..."
                            style={{ 
                                fontSize: Math.max(8, (settings.fontSize || 14) * (scale || 1)) + 'px', 
                                color: settings.color || '#ff0000',
                                border: '1px dashed var(--text-accent)',
                                background: 'rgba(255,255,255,0.1)',
                                outline: 'none', padding: '4px', minWidth: '100px', resize: 'both', fontFamily: 'sans-serif'
                             }}
                        />
                    </form>
                </div>
            )}
        </div>
    );
};

export default ImageEditView;
