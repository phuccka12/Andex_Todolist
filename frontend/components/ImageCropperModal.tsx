'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  Crop,
  Move,
  RotateCcw,
  Minimize2,
  Maximize2,
  MousePointer,
  HelpCircle,
} from 'lucide-react';
import { soundEngine } from '../lib/audio';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  cropType: 'circle' | 'banner' | 'wallpaper';
  title?: string;
  onClose: () => void;
  onConfirmCrop: (croppedDataUrl: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  cropType,
  title = 'Chỉnh Sửa & Cắt Ảnh',
  onClose,
  onConfirmCrop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [brightness, setBrightness] = useState(100); // 60 to 140
  const [contrast, setContrast] = useState(100); // 60 to 140
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  
  // Compact mode state: user can toggle between compact view and standard view
  const [isCompact, setIsCompact] = useState(true);

  // Keyboard shortcut (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load image object
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      setImageObj(img);
      setScale(1);
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => {
      // Fallback if crossOrigin caused load error
      if (img.crossOrigin) {
        const fallback = new Image();
        fallback.onload = () => setImageObj(fallback);
        fallback.src = imageSrc;
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Dimensions of viewport canvas (Compact vs Standard)
  const canvasWidth = isCompact
    ? cropType === 'circle'
      ? 220
      : 380
    : cropType === 'circle'
    ? 290
    : 480;

  const canvasHeight = isCompact
    ? cropType === 'circle'
      ? 220
      : cropType === 'banner'
      ? 150
      : 210
    : cropType === 'circle'
    ? 290
    : cropType === 'banner'
    ? 190
    : 270;

  // Redraw canvas whenever transform changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Move to center of canvas
    ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Draw image centered
    const imgRatio = imageObj.width / imageObj.height;
    let drawWidth = canvas.width;
    let drawHeight = canvas.width / imgRatio;
    if (drawHeight < canvas.height) {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgRatio;
    }

    ctx.drawImage(imageObj, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Draw crop guidelines overlay
    ctx.save();
    if (cropType === 'circle') {
      const radius = Math.min(canvas.width, canvas.height) / 2 - 10;
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
      ctx.fill();

      // Border circle
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#E11D48';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else {
      // Banner or Wallpaper overlay frame
      ctx.strokeStyle = '#E11D48';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    }
    ctx.restore();
  }, [imageObj, scale, rotation, brightness, contrast, offset, cropType, canvasWidth, canvasHeight]);

  useEffect(() => {
    if (isOpen) redraw();
  }, [isOpen, redraw]);

  if (!isOpen || !imageSrc) return null;

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler: Scroll up = zoom in, Scroll down = zoom out
  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((prev) => {
      const next = Math.min(3.5, Math.max(0.4, Number((prev + delta).toFixed(2))));
      return next;
    });
  };

  // Final crop export
  const handleApplyCrop = () => {
    if (!imageObj) return;

    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    if (cropType === 'circle') {
      const size = 400;
      exportCanvas.width = size;
      exportCanvas.height = size;

      exportCtx.save();
      // Circle clipping mask
      exportCtx.beginPath();
      exportCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      exportCtx.clip();

      exportCtx.translate(size / 2 + offset.x * (size / canvasWidth), size / 2 + offset.y * (size / canvasHeight));
      exportCtx.rotate((rotation * Math.PI) / 180);
      exportCtx.scale(scale * (size / canvasWidth), scale * (size / canvasHeight));
      exportCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

      const imgRatio = imageObj.width / imageObj.height;
      let drawW = canvasWidth;
      let drawH = canvasWidth / imgRatio;
      if (drawH < canvasHeight) {
        drawH = canvasHeight;
        drawW = canvasHeight * imgRatio;
      }

      exportCtx.drawImage(imageObj, -drawW / 2, -drawH / 2, drawW, drawH);
      exportCtx.restore();

      const croppedUrl = exportCanvas.toDataURL('image/png');
      soundEngine.playPentatonicChime(4);
      onConfirmCrop(croppedUrl);
    } else {
      const exportWidth = cropType === 'banner' ? 1200 : 1600;
      const exportHeight = cropType === 'banner' ? 500 : 900;
      exportCanvas.width = exportWidth;
      exportCanvas.height = exportHeight;

      exportCtx.save();
      exportCtx.translate(exportWidth / 2 + offset.x * (exportWidth / canvasWidth), exportHeight / 2 + offset.y * (exportHeight / canvasHeight));
      exportCtx.rotate((rotation * Math.PI) / 180);
      exportCtx.scale(scale * (exportWidth / canvasWidth), scale * (exportHeight / canvasHeight));
      exportCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

      const imgRatio = imageObj.width / imageObj.height;
      let drawW = canvasWidth;
      let drawH = canvasWidth / imgRatio;
      if (drawH < canvasHeight) {
        drawH = canvasHeight;
        drawW = canvasHeight * imgRatio;
      }

      exportCtx.drawImage(imageObj, -drawW / 2, -drawH / 2, drawW, drawH);
      exportCtx.restore();

      try {
        const croppedUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
        soundEngine.playPentatonicChime(4);
        onConfirmCrop(croppedUrl);
      } catch (err) {
        console.warn('Canvas export failed, using raw imageSrc as fallback:', err);
        soundEngine.playPentatonicChime(4);
        onConfirmCrop(imageSrc);
      }
    }
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setOffset({ x: 0, y: 0 });
    soundEngine.playSoftClick();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-[#FFFDF7] rounded-3xl max-w-lg w-full max-h-[90vh] shadow-[6px_6px_0px_#0F172A] flex flex-col overflow-hidden border-2 border-[#0F172A] animate-in zoom-in-95 duration-150">
        
        {/* Header - Fixed at Top */}
        <div className="px-4 py-3 shrink-0 flex items-center justify-between border-b-2 border-[#0F172A] bg-[#FFF1F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#E11D48] flex items-center justify-center shrink-0">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-xs md:text-sm text-[#0F172A] leading-tight">{title}</h3>
              <p className="text-[10px] text-slate-600 font-bold flex items-center gap-1">
                <span>Cuộn chuột để zoom</span> • <span>Kéo để căn chỉnh vị trí</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Toggle compact / standard popup size button */}
            <button
              onClick={() => {
                setIsCompact(!isCompact);
                soundEngine.playSoftClick();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FEF9C3] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all flex items-center gap-1 text-[11px] font-black cursor-pointer"
              title={isCompact ? 'Mở rộng khung cắt' : 'Thu nhỏ khung cắt'}
            >
              {isCompact ? <Maximize2 className="w-3.5 h-3.5 text-[#E11D48]" /> : <Minimize2 className="w-3.5 h-3.5 text-[#E11D48]" />}
              <span className="hidden sm:inline">{isCompact ? 'Phóng to' : 'Thu nhỏ'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white hover:bg-[#FFE4E6] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Container */}
        <div className="p-4 overflow-y-auto custom-main-scroll flex-1 space-y-3.5 bg-[#FFFDF7]">
          
          {/* Canvas Display Viewport with Mouse Wheel Zoom */}
          <div
            onWheel={handleWheelZoom}
            className="flex flex-col items-center justify-center bg-[#0F172A] rounded-2xl p-2.5 relative overflow-hidden select-none border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] group"
          >
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-move rounded-lg max-w-full"
              style={{ touchAction: 'none' }}
            />

            {/* Hint badges inside canvas */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none px-1">
              <span className="text-[9.5px] font-black text-[#0F172A] bg-[#FEF9C3] border border-[#0F172A] px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-[1px_1px_0px_#0F172A]">
                <Move className="w-2.5 h-2.5 text-[#E11D48]" /> Kéo để di chuyển
              </span>
              <span className="text-[9.5px] font-black text-[#0F172A] bg-[#FEF9C3] border border-[#0F172A] px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-[1px_1px_0px_#0F172A]">
                <MousePointer className="w-2.5 h-2.5 text-[#E11D48]" /> Cuộn chuột để zoom
              </span>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="space-y-3 bg-white p-3.5 rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
            {/* Zoom Controls Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-[#FFF1F2] hover:bg-[#FEF9C3] text-[#0F172A] border border-[#0F172A] transition-colors cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#FFF1F2] border border-[#0F172A] rounded-lg appearance-none cursor-pointer accent-[#E11D48]"
                  title="Kéo hoặc lăn chuột để phóng to / thu nhỏ"
                />
                <button
                  onClick={() => setScale((s) => Math.min(3.5, Number((s + 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-[#FFF1F2] hover:bg-[#FEF9C3] text-[#0F172A] border border-[#0F172A] transition-colors cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-black text-[#E11D48] min-w-[38px] text-right">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    setRotation((r) => (r + 90) % 360);
                    soundEngine.playSoftClick();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer"
                  title="Xoay ảnh 90 độ theo chiều kim đồng hồ"
                >
                  <RotateCw className="w-3 h-3 text-[#E11D48]" />
                  <span>Xoay 90°</span>
                </button>

                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-xl bg-white hover:bg-[#FFE4E6] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] transition-all cursor-pointer"
                  title="Đặt lại thông số ban đầu"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Brightness & Contrast Sliders */}
            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t-2 border-[#0F172A]/15">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black text-[#0F172A]">
                  <span>Độ sáng:</span>
                  <span className="text-[#E11D48]">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-[#FFF1F2] border border-[#0F172A] rounded-lg appearance-none cursor-pointer accent-[#E11D48]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black text-[#0F172A]">
                  <span>Độ tương phản:</span>
                  <span className="text-[#E11D48]">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-[#FFF1F2] border border-[#0F172A] rounded-lg appearance-none cursor-pointer accent-[#E11D48]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions - Fixed at bottom */}
        <div className="px-4 py-3 shrink-0 flex items-center justify-between border-t-2 border-[#0F172A] bg-[#FFFDF7]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#FEF9C3] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black transition-all cursor-pointer"
          >
            Hủy
          </button>

          <button
            onClick={handleApplyCrop}
            className="px-5 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black transition-all active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Cắt & Áp Dụng Ảnh</span>
          </button>
        </div>

      </div>
    </div>
  );
};
