import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pen, Highlighter, Eraser, Trash2, X, Download, Undo } from 'lucide-react';

const VideoCallWhiteboard = ({ isOpen, onClose, onSendStroke }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
  const [color, setColor] = useState('#06b6d4'); // Cyan default
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [history, setHistory] = useState([]);

  const colors = ['#06b6d4', '#ec4899', '#eab308', '#22c55e', '#a855f7', '#ffffff', '#ef4444'];

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize canvas to match container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Save initial state
    saveState();
  }, [isOpen]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory((prev) => [...prev.slice(-15), canvas.toDataURL()]);
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 4;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color + '66'; // semi-transparent
      ctx.lineWidth = strokeWidth * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
    }

    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();

    if (onSendStroke) {
      onSendStroke({ x, y, color, tool, strokeWidth });
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // Remove current
    const previousImageSrc = newHistory[newHistory.length - 1];
    setHistory(newHistory);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = previousImageSrc;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    };
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `call-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="absolute inset-2 sm:inset-4 z-40 rounded-3xl bg-zinc-950/80 backdrop-blur-xl border border-white/20 flex flex-col overflow-hidden shadow-2xl"
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Pen size={14} /> Live Whiteboard & Annotation
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            title="Undo"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Undo size={15} />
          </button>
          <button
            onClick={handleDownload}
            title="Export Snapshot"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
          >
            <Download size={15} />
          </button>
          <button
            onClick={handleClear}
            title="Clear Canvas"
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={onClose}
            title="Close Whiteboard"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white ml-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative touch-none bg-transparent cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* Bottom Tool selector */}
      <div className="px-4 py-2.5 bg-black/60 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 z-10">
        {/* Tool Modes */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setTool('pen')}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
              tool === 'pen' ? 'bg-cyan-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Pen size={13} /> Pen
          </button>
          <button
            onClick={() => setTool('highlighter')}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
              tool === 'highlighter' ? 'bg-amber-400 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Highlighter size={13} /> Glow
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
              tool === 'eraser' ? 'bg-rose-500 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Eraser size={13} /> Eraser
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1.5">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                if (tool === 'eraser') setTool('pen');
              }}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full transition-transform active:scale-125 border-2 ${
                color === c && tool !== 'eraser' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'border-transparent opacity-80'
              }`}
            />
          ))}
        </div>

        {/* Stroke Size Selector */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="2"
            max="18"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-20 accent-cyan-400 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default VideoCallWhiteboard;
