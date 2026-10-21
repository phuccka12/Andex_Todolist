'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Calendar,
  Camera,
  Trash2,
  X,
  ArrowLeft,
  Check,
  Search,
  Sparkles,
  BookOpen,
  Feather,
  ChevronRight,
  Download,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Tag,
  Heart,
  Compass,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../lib/audio';
import {
  JournalEntry,
  fetchJournals,
  createJournal,
  updateJournal,
  deleteJournal,
} from '../lib/journalApi';
import { AuthUser } from '../lib/authService';
import { notify } from '../lib/notificationService';


interface JournalViewProps {
  authUser?: AuthUser | null;
  onOpenAuth?: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({ authUser, onOpenAuth }) => {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [activeView, setActiveView] = useState<'board' | 'editor'>('board');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_photo'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Snapshot / Scrapbook Selection Mode States
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isScrapbookModalOpen, setIsScrapbookModalOpen] = useState(false);
  const [isExportingPNG, setIsExportingPNG] = useState(false);

  // Editor states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Journals
  const loadJournals = async () => {
    try {
      setIsLoading(true);
      const data = await fetchJournals();
      setJournals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJournals();
  }, [authUser]);

  // Open editor for a new entry
  const handleOpenNewPaper = (prefillDate?: string) => {
    setSelectedEntry(null);
    setDate(prefillDate || new Date().toISOString().split('T')[0]);
    setTitle('');
    setContent('');
    setPhotos([]);
    setActiveView('editor');
    soundEngine.playPentatonicChime(3);
  };

  // Open editor for an existing entry
  const handleOpenExistingPaper = (entry: JournalEntry) => {
    if (isSelectMode) {
      toggleSelectEntry(entry.id);
      return;
    }
    setSelectedEntry(entry);
    setDate(entry.date);
    setTitle(entry.title);
    setContent(entry.content);
    setPhotos(entry.photos || []);
    setActiveView('editor');
    soundEngine.playPentatonicChime(1);
  };

  // Toggle selection for an entry
  const toggleSelectEntry = (id?: string) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    soundEngine.playPentatonicChime(4);
  };

  // Select all or deselect all
  const handleSelectAll = () => {
    if (selectedIds.length === filteredJournals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredJournals.map((j) => j.id).filter(Boolean) as string[]);
    }
    soundEngine.playPentatonicChime(2);
  };

  // Photo Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setPhotos((prev) => [...prev, base64]);
          soundEngine.playPentatonicChime(5);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Save or Update Entry
  const handleSaveJournal = async () => {
    try {
      setIsSaving(true);
      const payload: Partial<JournalEntry> = {
        date,
        title: title.trim() || `Ký ức ngày ${new Date(date).toLocaleDateString('vi-VN')}`,
        content,
        photos,
        mood: 'peaceful',
      };

      if (selectedEntry?.id) {
        const updated = await updateJournal(selectedEntry.id, payload);
        setJournals((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      } else {
        const created = await createJournal(payload);
        setJournals((prev) => [created, ...prev]);
      }

      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#8B261E', '#D4A373', '#C28A44', '#2C180C'],
        });
      } catch {}

      soundEngine.playPentatonicChime(5);
      setActiveView('board');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Entry
  const handleDeleteJournal = async () => {
    if (!selectedEntry?.id) return;
    const confirmed = await notify.confirm('Bạn có chắc chắn muốn gỡ trang nhật ký này khỏi cuốn sổ?', {
      title: 'Xóa Nhật Ký',
      confirmText: 'Xóa trang này',
      type: 'warning',
    });
    if (!confirmed) return;

    try {
      await deleteJournal(selectedEntry.id);
      setJournals((prev) => prev.filter((j) => j.id !== selectedEntry.id));
      setActiveView('board');
      soundEngine.playPentatonicChime(2);
      await notify.success('Đã gỡ trang nhật ký thành công.');
    } catch (err) {
      console.error(err);
      await notify.error('Không thể xóa trang nhật ký.');
    }
  };

  // Filter journals
  const filteredJournals = journals.filter((entry) => {
    if (filterType === 'with_photo' && (!entry.photos || entry.photos.length === 0)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = entry.title?.toLowerCase().includes(q);
      const matchContent = entry.content?.toLowerCase().includes(q);
      const matchDate = entry.date?.includes(q);
      return matchTitle || matchContent || matchDate;
    }
    return true;
  });

  // Group filtered journals by month & year
  const groupedMonths = filteredJournals.reduce((acc, entry) => {
    const d = new Date(entry.date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const key = `Tháng ${String(month).padStart(2, '0')}, ${year}`;
    if (!acc[key]) {
      acc[key] = {
        key,
        month,
        year,
        entries: [],
      };
    }
    acc[key].entries.push(entry);
    return acc;
  }, {} as Record<string, { key: string; month: number; year: number; entries: JournalEntry[] }>);

  // Sort month groups descending
  const monthGroupsList = Object.values(groupedMonths).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // Sort entries descending by date
  monthGroupsList.forEach((group) => {
    group.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  const now = new Date();
  const currentMonthKey = `Tháng ${String(now.getMonth() + 1).padStart(2, '0')}, ${now.getFullYear()}`;

  // Selected entries for the scrapbook modal
  const selectedEntries = journals.filter((j) => j.id && selectedIds.includes(j.id));

  // =========================================================================
  // HIGH-RESOLUTION CANVAS RENDERER: EXPORT DEEP VINTAGE SCRAPBOOK PAPER COLLAGE
  // =========================================================================
  const handleExportScrapbookPNG = async () => {
    if (selectedEntries.length === 0) return;
    try {
      setIsExportingPNG(true);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = 2; // Retina sharpness
      const cols = selectedEntries.length === 1 ? 1 : selectedEntries.length <= 4 ? 2 : 3;
      const rows = Math.ceil(selectedEntries.length / cols);

      const cardWidth = 350;
      const cardHeight = 400;
      const cardGap = 40;
      const padding = 70;
      const headerHeight = 180;
      const footerHeight = 80;

      const totalWidth = padding * 2 + cols * cardWidth + (cols - 1) * cardGap;
      const totalHeight = padding * 2 + headerHeight + rows * cardHeight + (rows - 1) * cardGap + footerHeight;

      canvas.width = totalWidth * scale;
      canvas.height = totalHeight * scale;
      ctx.scale(scale, scale);

      // 1. Draw Deep Rich Honey Parchment Background
      ctx.fillStyle = '#F3EBDD';
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // Antique double border
      ctx.strokeStyle = '#C9B69B';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(22, 22, totalWidth - 44, totalHeight - 44);
      ctx.strokeStyle = '#DFCDB6';
      ctx.lineWidth = 1;
      ctx.strokeRect(28, 28, totalWidth - 56, totalHeight - 56);

      // Corner ornamental flourishes
      const drawCornerFlourish = (cx: number, cy: number, rot: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.strokeStyle = '#A88D70';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI / 2);
        ctx.stroke();
        ctx.restore();
      };
      drawCornerFlourish(40, 40, 0);
      drawCornerFlourish(totalWidth - 40, 40, 90);
      drawCornerFlourish(totalWidth - 40, totalHeight - 40, 180);
      drawCornerFlourish(40, totalHeight - 40, 270);

      // 2. Draw Crimson Wax Seal in Top-Right
      ctx.save();
      const sealX = totalWidth - 110;
      const sealY = 85;
      ctx.beginPath();
      ctx.arc(sealX, sealY, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#8B261E';
      ctx.shadowColor = 'rgba(74, 18, 14, 0.35)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#6E1B14';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FDF6E3';
      ctx.font = 'bold 12px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦ CBP ✦', sealX, sealY - 4);
      ctx.font = '9px serif';
      ctx.fillText('SEAL', sealX, sealY + 10);
      ctx.restore();

      // 3. Draw Header
      ctx.fillStyle = '#2C180C';
      ctx.font = 'bold 30px serif';
      ctx.textAlign = 'center';
      ctx.fillText('BƯU THIẾP KÝ ỨC • MEMORY SCRAPBOOK', totalWidth / 2, 75);

      ctx.fillStyle = '#6E4E36';
      ctx.font = 'italic 15px serif';
      ctx.fillText(
        `Lưu dấu ${selectedEntries.length} khoảnh khắc thân thương — CBP Atelier OS`,
        totalWidth / 2,
        108
      );

      // Postal stamp dashed cancellation line
      ctx.strokeStyle = '#BAA287';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding + 20, 140);
      ctx.lineTo(totalWidth - padding - 20, 140);
      ctx.stroke();
      ctx.setLineDash([]);

      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject();
          img.src = src;
        });
      };

      // 4. Draw Cards in Grid
      for (let i = 0; i < selectedEntries.length; i++) {
        const entry = selectedEntries[i];
        const col = i % cols;
        const row = Math.floor(i / cols);

        const x = padding + col * (cardWidth + cardGap);
        const y = padding + headerHeight + row * (cardHeight + cardGap);

        ctx.save();
        const tilts = [-1.5, 1.2, -1, 1.6, -1.8, 1];
        const tilt = tilts[i % tilts.length];
        ctx.translate(x + cardWidth / 2, y + cardHeight / 2);
        ctx.rotate((tilt * Math.PI) / 180);
        ctx.translate(-(x + cardWidth / 2), -(y + cardHeight / 2));

        // Card shadow & warm paper base
        ctx.shadowColor = 'rgba(44, 24, 12, 0.16)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(x, y, cardWidth, cardHeight);
        ctx.shadowColor = 'transparent';

        // Deep craft border
        ctx.strokeStyle = '#DECBB4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, cardWidth, cardHeight);

        // Striped diagonal washi tape
        ctx.fillStyle = '#E6D0B3';
        ctx.fillRect(x + cardWidth / 2 - 38, y - 7, 76, 18);
        ctx.strokeStyle = '#C9AFA0';
        ctx.strokeRect(x + cardWidth / 2 - 38, y - 7, 76, 18);

        // Brass Photo Corner Clips
        const drawClip = (cx: number, cy: number, rx: number, ry: number) => {
          ctx.fillStyle = '#8C6D4C';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + rx, cy);
          ctx.lineTo(cx, cy + ry);
          ctx.closePath();
          ctx.fill();
        };
        drawClip(x + 12, y + 16, 14, 14);
        drawClip(x + cardWidth - 12, y + 16, -14, 14);

        const dateObj = new Date(entry.date);
        const dayStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

        if (entry.photos && entry.photos.length > 0) {
          try {
            const img = await loadImage(entry.photos[0]);
            const imgAreaX = x + 12;
            const imgAreaY = y + 16;
            const imgAreaW = cardWidth - 24;
            const imgAreaH = 245;

            ctx.fillStyle = '#ECE2D2';
            ctx.fillRect(imgAreaX, imgAreaY, imgAreaW, imgAreaH);

            const aspect = img.width / img.height;
            const targetAspect = imgAreaW / imgAreaH;
            let sx = 0, sy = 0, sw = img.width, sh = img.height;
            if (aspect > targetAspect) {
              sw = img.height * targetAspect;
              sx = (img.width - sw) / 2;
            } else {
              sh = img.width / targetAspect;
              sy = (img.height - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, imgAreaX, imgAreaY, imgAreaW, imgAreaH);

            // Caption
            ctx.fillStyle = '#2C180C';
            ctx.font = 'bold 14px serif';
            ctx.textAlign = 'center';
            const titleSnippet = entry.title || `Ký ức ngày ${dayStr}`;
            ctx.fillText(titleSnippet.length > 32 ? titleSnippet.slice(0, 32) + '...' : titleSnippet, x + cardWidth / 2, y + 295);

            ctx.fillStyle = '#7A5B42';
            ctx.font = '11px monospace';
            ctx.fillText(`✦ ${dayStr} ✦`, x + cardWidth / 2, y + 322);
          } catch (e) {
            console.error('Canvas image render error', e);
          }
        } else {
          // Ruled Stationery Memo with Red Margin
          const memoX = x + 12;
          const memoY = y + 16;
          const memoW = cardWidth - 24;
          const memoH = 270;

          ctx.fillStyle = '#FAF5EC';
          ctx.fillRect(memoX, memoY, memoW, memoH);

          // Red margin line
          ctx.strokeStyle = '#D98279';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(memoX + 38, memoY);
          ctx.lineTo(memoX + 38, memoY + memoH);
          ctx.stroke();

          // Ruled lines
          ctx.strokeStyle = '#E0D4C3';
          for (let ly = memoY + 36; ly < memoY + memoH; ly += 24) {
            ctx.beginPath();
            ctx.moveTo(memoX + 6, ly);
            ctx.lineTo(memoX + memoW - 6, ly);
            ctx.stroke();
          }

          // Header
          ctx.fillStyle = '#7A5B42';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`NGÀY ${dayStr}`, memoX + 46, memoY + 24);

          // Content wrapped
          ctx.fillStyle = '#2C180C';
          ctx.font = 'italic 12px serif';
          const words = (entry.content || 'Trang nhật ký bình yên...').split(' ');
          let line = '';
          let lineY = memoY + 54;
          for (let w = 0; w < words.length; w++) {
            const testLine = line + words[w] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > memoW - 56 && w > 0) {
              ctx.fillText(line.trim(), memoX + 46, lineY);
              line = words[w] + ' ';
              lineY += 24;
              if (lineY > memoY + memoH - 30) {
                ctx.fillText(line.trim() + '...', memoX + 46, lineY);
                line = '';
                break;
              }
            } else {
              line = testLine;
            }
          }
          if (line) {
            ctx.fillText(line.trim(), memoX + 46, lineY);
          }

          // Bottom Title
          ctx.fillStyle = '#2C180C';
          ctx.font = 'bold 14px serif';
          ctx.textAlign = 'center';
          ctx.fillText(entry.title || `Ký ức ngày ${dayStr}`, x + cardWidth / 2, y + 325);
        }

        ctx.restore();
      }

      // 5. Draw Footer Postal Seal
      ctx.fillStyle = '#7A5B42';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `CHRONO ATELIER • LƯU TRỮ KÝ ỨC VĨNH CỬU • NGÀY ${new Date().toLocaleDateString('vi-VN')}`,
        totalWidth / 2,
        totalHeight - 45
      );

      // Trigger instant PNG Download
      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `buu-thiep-ky-uc-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      soundEngine.playPentatonicChime(5);
    } catch (err) {
      console.error('Export PNG failed:', err);
    } finally {
      setIsExportingPNG(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col p-4 sm:p-6 lg:p-7 select-none bg-[#F3EBDD] text-[#2C180C]">
      <AnimatePresence mode="wait">
        {/* ========================================================================= */}
        {/* VIEW 1: MONTHLY MEMORY BOARDS (BẢNG KÝ ỨC TỪNG THÁNG XẾP HÀNG NGANG)      */}
        {/* ========================================================================= */}
        {activeView === 'board' && (
          <motion.div
            key="board-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.22 }}
            className="flex-1 flex flex-col space-y-7"
          >
            {/* Top Bar with Warm Editorial Nostalgia & Crimson Wax Seal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#D8C7B0]">
              <div className="flex items-center gap-3.5">
                {/* Crimson Wax Seal Icon */}
                <div className="w-11 h-11 rounded-2xl bg-[#8B261E] text-amber-100 flex items-center justify-center shadow-[0_4px_12px_rgba(139,38,30,0.3)] border-2 border-[#731D16] relative shrink-0">
                  <Feather className="w-5 h-5 text-amber-200" />
                  <span className="absolute -bottom-1 -right-1 text-[8px] font-serif font-black bg-[#C28A44] text-[#2C180C] px-1 rounded-full border border-amber-200">
                    CBP
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold font-serif text-[#2C180C] tracking-tight flex items-center gap-2.5">
                    Bảng Ký Ức Theo Tháng
                    <span className="text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-[#E8DAC6] text-[#4A2F1B] border border-[#CCAFA0] shadow-2xs">
                      {journals.length} trang kỷ niệm
                    </span>
                  </h2>
                  <p className="text-xs text-[#6E4E36] mt-0.5 font-serif italic">
                    Mỗi tháng là một bảng kỷ niệm — nơi thời gian dừng lại cùng những khoảnh khắc và tấm ảnh thân thương.
                  </p>
                </div>
              </div>

              {/* Controls Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="flex items-center gap-2 bg-[#FFFDF9] border border-[#D5C2AA] px-3.5 py-1.5 rounded-xl shadow-2xs text-xs text-[#2C180C] w-44 sm:w-52 focus-within:border-[#8C5D35] focus-within:bg-white transition-all">
                  <Search className="w-3.5 h-3.5 text-[#8C6D4C] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm ký ức, ngày..."
                    className="w-full bg-transparent outline-none placeholder:text-[#9E8268] font-sans"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-[#8C6D4C] hover:text-[#2C180C]">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1 bg-[#E8DAC6] border border-[#D5C2AA] p-1 rounded-xl shadow-2xs text-xs font-semibold">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filterType === 'all'
                        ? 'bg-[#2C180C] text-[#F8F3EA] shadow-2xs'
                        : 'text-[#5C3D24] hover:text-[#2C180C]'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setFilterType('with_photo')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                      filterType === 'with_photo'
                        ? 'bg-[#2C180C] text-[#F8F3EA] shadow-2xs'
                        : 'text-[#5C3D24] hover:text-[#2C180C]'
                    }`}
                  >
                    <Camera className="w-3 h-3 text-[#C28A44]" />
                    <span>Có ảnh</span>
                  </button>
                </div>

                {/* Snapshot Selection Toggle Button */}
                <button
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    if (isSelectMode) setSelectedIds([]);
                    soundEngine.playPentatonicChime(3);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 ${
                    isSelectMode
                      ? 'bg-[#8B261E] text-white shadow-xs'
                      : 'bg-[#FFFDF9] hover:bg-[#EFE3D0] border border-[#D5C2AA] text-[#2C180C]'
                  }`}
                  title="Chọn các trang nhật ký để chụp thành ảnh paper"
                >
                  <Camera className="w-4 h-4 text-[#C28A44]" />
                  <span>{isSelectMode ? 'Đang Chọn' : 'Chụp Ảnh Kỷ Niệm'}</span>
                </button>

                {/* Primary Write Button */}
                <button
                  onClick={() => handleOpenNewPaper()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2C180C] hover:bg-[#1A0E07] text-[#FAF4EC] rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Viết Nhật Ký</span>
                </button>
              </div>
            </div>

            {/* SELECTION MODE ACTION BANNER */}
            {isSelectMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#EADBC4] border border-[#D1BFA8] rounded-2xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8B261E] animate-pulse" />
                  <span className="text-xs font-serif font-bold text-[#2C180C]">
                    Chế độ chọn: Hãy bấm vào các trang nhật ký bạn muốn xuất thành ảnh Paper ({selectedIds.length} đã chọn)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 rounded-xl bg-[#FFFDF9] hover:bg-[#F3E7D5] border border-[#CCAFA0] text-xs font-semibold text-[#422511] transition-all"
                  >
                    {selectedIds.length === filteredJournals.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>

                  <button
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedIds([]);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#7A5B42] hover:text-[#2C180C] transition-all"
                  >
                    Hủy
                  </button>

                  <button
                    disabled={selectedIds.length === 0}
                    onClick={() => setIsScrapbookModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#8B261E] hover:bg-[#731D16] disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-200" />
                    <span>Xuất Ảnh Scrapbook ({selectedIds.length})</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* MAIN CONTENT: SCROLLABLE MONTHLY BOARDS */}
            <div className="space-y-9 pb-12">
              {isLoading ? (
                <div className="py-24 text-center text-xs text-[#7A5B42] font-serif italic flex items-center justify-center gap-2">
                  <Feather className="w-4 h-4 animate-spin text-[#8C5D35]" />
                  <span>Đang lật mở các trang ký ức...</span>
                </div>
              ) : monthGroupsList.length === 0 ? (
                /* EMPTY STATE: DISPLAY A WARM PLACEHOLDER BOARD FOR CURRENT MONTH */
                <div className="bg-[#FAF4EC] border-2 border-dashed border-[#D5C2AA] rounded-3xl p-8 sm:p-12 text-center shadow-xs">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-[#FFFDF9] border border-[#CCAFA0] shadow-xs flex items-center justify-center text-[#8C5D35] mb-3">
                    <Feather className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold font-serif text-[#2C180C]">
                    Bảng Ký Ức {currentMonthKey} Đang Trống
                  </h3>
                  <p className="text-xs text-[#6E4E36] mt-1.5 max-w-md mx-auto leading-relaxed font-serif italic">
                    Chưa có trang ký ức nào được ghim trong tháng này. Hãy viết vài dòng chia sẻ hay đính kèm một bức ảnh kỷ niệm để mở đầu cuốn sổ nhé!
                  </p>
                  <button
                    onClick={() => handleOpenNewPaper()}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#2C180C] hover:bg-[#1A0E07] text-[#FAF4EC] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Viết trang ký ức đầu tiên</span>
                  </button>
                </div>
              ) : (
                monthGroupsList.map((group) => {
                  const photoCount = group.entries.reduce((acc, e) => acc + (e.photos?.length || 0), 0);

                  return (
                    <div
                      key={group.key}
                      className="bg-[#FAF4EC] border-2 border-[#DECBB4] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_6px_26px_rgba(44,24,12,0.05)] relative overflow-hidden"
                    >
                      {/* Decorative Background Stamp Watermark */}
                      <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full border-4 border-dashed border-[#E5D4C0]/40 pointer-events-none flex items-center justify-center rotate-12">
                        <span className="text-[11px] font-mono tracking-widest text-[#BAA287]/40 font-bold uppercase">
                          ATELIER ARCHIVE
                        </span>
                      </div>

                      {/* MONTH HEADER PANEL: VINTAGE SERRATED POSTAGE STAMP & WAX BADGE */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-5 border-b border-[#E2D1BC]">
                        <div className="flex items-center gap-3.5">
                          {/* Vintage Postage Stamp with Perforated Look */}
                          <div className="bg-[#FFFDF9] border-2 border-dashed border-[#B89E83] px-3.5 py-1.5 rounded-lg shadow-2xs flex items-center gap-2.5 relative">
                            <span className="w-2 h-2 rounded-full bg-[#8B261E]" />
                            <span className="text-[10px] font-mono tracking-widest text-[#8C5D35] font-black uppercase">
                              POSTAGE
                            </span>
                            <span className="w-1 h-1 rounded-full bg-[#C28A44]" />
                            <span className="text-xs font-serif font-black text-[#2C180C] tracking-wide">
                              {group.key.toUpperCase()}
                            </span>
                          </div>

                          <div className="hidden sm:flex items-center gap-2 text-xs text-[#7A5B42] font-serif italic">
                            <span>✦ {group.entries.length} trang ký ức</span>
                            {photoCount > 0 && (
                              <>
                                <span>•</span>
                                <span>{photoCount} bức ảnh lưu dấu</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Add to this month button */}
                        <button
                          onClick={() => {
                            const prefillDate = `${group.year}-${String(group.month).padStart(2, '0')}-01`;
                            handleOpenNewPaper(prefillDate);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFDF9] hover:bg-[#F3E7D5] border border-[#CCAFA0] text-xs font-semibold text-[#422511] transition-all shadow-2xs active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#8C5D35]" />
                          <span>Ghi ký ức {group.key}</span>
                        </button>
                      </div>

                      {/* THE CARDS: XẾP HÀNG NGANG RỒI XUỐNG DÒNG (EXPANSIVE GRID) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-4.5">
                        {group.entries.map((entry, idx) => {
                          const dateObj = new Date(entry.date);
                          const day = dateObj.toLocaleDateString('vi-VN', { day: '2-digit' });
                          const monthStr = dateObj.toLocaleDateString('vi-VN', { month: '2-digit' });
                          const yearStr = dateObj.getFullYear();
                          const hasPhoto = entry.photos && entry.photos.length > 0;
                          const isSelected = entry.id ? selectedIds.includes(entry.id) : false;

                          // Subtle natural tilt for vintage charm
                          const tilts = [-1.4, 1.2, -0.8, 1.5, -1.6, 1];
                          const tilt = isSelected ? 0 : tilts[idx % tilts.length];

                          return (
                            <motion.div
                              key={entry.id || idx}
                              whileHover={{
                                y: -5,
                                rotate: 0,
                                scale: 1.02,
                                transition: { duration: 0.2 },
                              }}
                              style={{ rotate: `${tilt}deg` }}
                              onClick={() => handleOpenExistingPaper(entry)}
                              className={`relative bg-[#FFFDF9] rounded-xl p-3 pb-3.5 transition-all cursor-pointer group flex flex-col justify-between ${
                                isSelected
                                  ? 'ring-3 ring-[#8B261E] shadow-[0_12px_32px_rgba(139,38,30,0.22)]'
                                  : 'shadow-[0_6px_18px_rgba(44,24,12,0.06)] hover:shadow-[0_14px_30px_rgba(44,24,12,0.12)] border border-[#DECBB4]'
                              }`}
                            >
                              {/* Striped Washi Tape Strip at top */}
                              <div
                                className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3.5 shadow-2xs rotate-1 z-10 border-t border-b border-[#CCAFA0]"
                                style={{
                                  backgroundImage: `repeating-linear-gradient(45deg, #E6D0B3, #E6D0B3 6px, #F5E8D3 6px, #F5E8D3 12px)`,
                                }}
                              />

                              {/* Corner Brass Clips on Polaroids */}
                              <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-[#8C6D4C] pointer-events-none z-10" />
                              <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-[#8C6D4C] pointer-events-none z-10" />

                              {/* Selection Stamp Indicator */}
                              {isSelectMode && (
                                <div className="absolute top-2 right-2 z-20">
                                  {isSelected ? (
                                    <div className="w-5 h-5 rounded-lg bg-[#8B261E] text-white flex items-center justify-center shadow-xs border border-white">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-lg bg-[#FFFDF9] border-2 border-[#B89E83] hover:border-[#8B261E] flex items-center justify-center shadow-2xs" />
                                  )}
                                </div>
                              )}

                              <div>
                                {/* Photo or Note area */}
                                {hasPhoto ? (
                                  <div className="w-full h-38 sm:h-40 rounded-sm overflow-hidden bg-[#ECE2D2] border border-[#DFCDB6] mb-2.5 relative">
                                    <img
                                      src={entry.photos[0]}
                                      alt="Memory photo"
                                      className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                                    />
                                    <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono backdrop-blur-xs">
                                      {entry.photos.length} ảnh
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="w-full h-38 sm:h-40 rounded-sm bg-[#FAF5EC] border border-[#DFCDB6] p-3 flex flex-col justify-between mb-2.5 relative"
                                    style={{
                                      backgroundImage: `linear-gradient(transparent, transparent 23px, #E5D9C8 23px, #E5D9C8 24px)`,
                                      backgroundSize: '100% 24px',
                                      lineHeight: '24px',
                                    }}
                                  >
                                    {/* Red margin line */}
                                    <div className="absolute top-0 bottom-0 left-5 w-[1px] bg-[#D98279]/60 pointer-events-none" />

                                    <div className="flex items-center justify-between text-[10px] text-[#7A5B42] font-mono border-b border-dashed border-[#DECBB4] pb-1 pl-3.5">
                                      <span>NGÀY {day}.{monthStr}</span>
                                      <Feather className="w-3 h-3 text-[#8C5D35]" />
                                    </div>
                                    <p className="text-xs text-[#2C180C] font-serif line-clamp-3 leading-relaxed italic pl-3.5">
                                      "{entry.content || 'Trang nhật ký bình yên...'}"
                                    </p>
                                    <span className="text-[9px] text-[#9E8268] text-right font-mono">
                                      #{idx + 1}
                                    </span>
                                  </div>
                                )}

                                {/* Bottom Polaroid Caption Area */}
                                <div className="text-center pt-0.5 px-1">
                                  <h4 className="text-xs font-bold font-serif text-[#2C180C] truncate group-hover:text-[#8C5D35] transition-colors">
                                    {entry.title || `Ký ức ngày ${day}/${monthStr}`}
                                  </h4>
                                  <p className="text-[10px] text-[#7A5B42] font-mono mt-0.5 tracking-wider">
                                    ✦ {day}/{monthStr}/{yearStr} ✦
                                  </p>
                                </div>
                              </div>

                              {/* Hover Hint */}
                              <div className="mt-2.5 pt-1.5 border-t border-[#EFE5D8] flex items-center justify-between text-[10px] text-[#7A5B42] opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="font-serif italic">
                                  {isSelectMode ? (isSelected ? 'Bỏ chọn trang này' : 'Chọn trang này') : 'Mở đọc ký ức'}
                                </span>
                                <Sparkles className="w-3 h-3 text-[#C28A44]" />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: THE SPACIOUS VINTAGE WRITING DESK (TRANG GIẤY VIẾT NHẬT KÝ)        */}
        {/* ========================================================================= */}
        {activeView === 'editor' && (
          <motion.div
            key="editor-view"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="flex-1 flex flex-col h-full max-w-3xl mx-auto w-full"
          >
            {/* Action Top Bar */}
            <div className="flex items-center justify-between pb-4 shrink-0">
              <button
                onClick={() => setActiveView('board')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FFFDF9] border border-[#D5C2AA] hover:bg-[#F3E7D5] text-xs font-semibold text-[#422511] transition-all shadow-2xs active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-[#8C5D35]" />
                <span>Trở Về Bảng Ký Ức</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedEntry?.id && (
                  <button
                    onClick={handleDeleteJournal}
                    className="p-2 text-[#9E8268] hover:text-rose-700 rounded-xl hover:bg-rose-50 transition-colors"
                    title="Xóa trang ký ức này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleSaveJournal}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2C180C] hover:bg-[#1A0E07] text-[#FAF4EC] rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSaving ? 'Đang lưu vào sổ...' : 'Lưu Vào Bảng Ký Ức'}</span>
                </button>
              </div>
            </div>

            {/* THE PURE WHITE SHEET WITH DISTINCT BOLD RULED LINES */}
            <div className="flex-1 bg-[#FFFDF9] border-2 border-[#DECBB4] rounded-3xl p-6 sm:p-10 shadow-[0_12px_35px_rgba(44,24,12,0.08)] flex flex-col relative select-text">
              {/* Postal Stamp Date & Photo Attachment Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2D1BC] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-[#F6EDE1] border border-[#CCAFA0] px-3.5 py-1.5 rounded-xl shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-[#8C5D35]" />
                    <span className="text-xs font-semibold text-[#422511]">Ngày:</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-[#2C180C] outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F6EDE1] hover:bg-[#EFE0CE] border border-[#CCAFA0] text-xs font-semibold text-[#2C180C] transition-all shadow-2xs active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#C28A44]" />
                    <span>Đính kèm ảnh Polaroid ({photos.length})</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Title Input */}
              <div className="pt-3 pb-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tiêu đề trang nhật ký hôm nay..."
                  className="w-full text-xl sm:text-2xl font-bold font-serif text-[#2C180C] bg-transparent outline-none placeholder:text-[#9E8268] border-b border-transparent focus:border-[#C28A44] pb-1 transition-colors"
                />
              </div>

              {/* Attached Photos Strip (Polaroid Preview) */}
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-3 py-3 shrink-0">
                  {photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="relative bg-white p-1.5 pb-2 rounded-lg shadow-sm border border-[#DECBB4] w-24 sm:w-28 group"
                    >
                      <div className="w-full h-20 overflow-hidden rounded-xs bg-[#ECE2D2]">
                        <img
                          src={photo}
                          alt="Attached memory"
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewPhoto(photo)}
                        />
                      </div>
                      <button
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#8B261E] text-white rounded-full flex items-center justify-center shadow-xs"
                        title="Xóa ảnh"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* DISTINCT BOLD RULED LINES WITH COMFORTABLE FONT & RED MARGIN */}
              <div className="flex-1 mt-2 relative min-h-[320px]">
                {/* Red margin line */}
                <div className="absolute top-0 bottom-0 left-8 w-[1.5px] bg-[#D98279]/70 pointer-events-none" />

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={13}
                  placeholder="Viết lại những điều bạn đã trải qua, niềm vui, nỗi bận tâm hay suy ngẫm trong ngày..."
                  className="w-full h-full bg-transparent text-sm sm:text-base font-serif text-[#2C180C] leading-relaxed outline-none resize-none placeholder:text-[#9E8268] pl-12"
                  style={{
                    backgroundImage: `linear-gradient(transparent, transparent 31px, #DFCDB6 31px, #DFCDB6 32px)`,
                    backgroundSize: '100% 32px',
                    lineHeight: '32px',
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* VINTAGE PAPER SCRAPBOOK PHOTO COLLAGE MODAL (WITH DEEP VINTAGE STAMPS)     */}
      {/* ========================================================================= */}
      {isScrapbookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-[#F3EBDD] border-2 border-[#D5C2AA] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#D8C7B0] bg-[#EADBC4]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8B261E] text-amber-100 flex items-center justify-center shadow-xs border border-[#731D16]">
                  <Camera className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-[#2C180C]">
                    Tờ Báo Kỷ Niệm (Paper Scrapbook Collage)
                  </h3>
                  <p className="text-xs text-[#6E4E36] font-serif italic">
                    Ghép {selectedEntries.length} trang ký ức thành bưu thiếp giấy thủ công hoài niệm
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={isExportingPNG}
                  onClick={handleExportScrapbookPNG}
                  className="flex items-center gap-2 px-4 py-2 bg-[#8B261E] hover:bg-[#731D16] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-amber-200" />
                  <span>{isExportingPNG ? 'Đang xuất ảnh...' : 'Tải Ảnh (.PNG)'}</span>
                </button>

                <button
                  onClick={() => setIsScrapbookModalOpen(false)}
                  className="p-2 text-[#7A5B42] hover:text-[#2C180C] rounded-xl hover:bg-[#DFCDB6] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Live Paper Collage Preview */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar space-y-8 bg-[#F3EBDD]">
              {/* Scrapbook Sheet */}
              <div className="bg-[#FAF5EC] border-2 border-[#C9B69B] rounded-3xl p-6 sm:p-10 shadow-[0_12px_40px_rgba(44,24,12,0.12)] relative overflow-hidden">
                {/* Crimson Wax Seal in Top-Right */}
                <div className="absolute top-6 right-6 w-14 h-14 rounded-full bg-[#8B261E] border-2 border-[#6E1B14] shadow-md flex flex-col items-center justify-center text-amber-100 rotate-12 z-20 pointer-events-none">
                  <span className="text-[9px] font-serif font-black tracking-widest">✦ CBP ✦</span>
                  <span className="text-[8px] font-mono tracking-wider text-amber-200/80">SEAL</span>
                </div>

                {/* Vintage Postal Header */}
                <div className="text-center pb-6 border-b-2 border-dashed border-[#B89E83] mb-8 relative pr-12">
                  <div className="inline-block bg-[#EADBC4] border border-[#CCAFA0] px-4 py-1 rounded-full text-[10px] font-mono tracking-widest text-[#5C3D24] font-bold uppercase mb-2 shadow-2xs">
                    POSTAL ARCHIVES • BƯU THIẾP KÝ ỨC
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-[#2C180C] tracking-tight">
                    Những Lát Cắt Thời Gian
                  </h2>
                  <p className="text-xs text-[#6E4E36] font-serif italic mt-1">
                    Cất giữ khoảnh khắc dịu dàng và những điều bình yên trong từng trang nhật ký
                  </p>
                </div>

                {/* Grid of Selected Memories */}
                <div className={`grid gap-6 ${
                  selectedEntries.length === 1
                    ? 'grid-cols-1 max-w-sm mx-auto'
                    : selectedEntries.length <= 4
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                }`}>
                  {selectedEntries.map((entry, idx) => {
                    const dateObj = new Date(entry.date);
                    const day = dateObj.toLocaleDateString('vi-VN', { day: '2-digit' });
                    const monthStr = dateObj.toLocaleDateString('vi-VN', { month: '2-digit' });
                    const yearStr = dateObj.getFullYear();
                    const hasPhoto = entry.photos && entry.photos.length > 0;

                    const tilts = [-1.5, 1.2, -1, 1.6, -1.8, 1];
                    const tilt = tilts[idx % tilts.length];

                    return (
                      <div
                        key={entry.id || idx}
                        style={{ transform: `rotate(${tilt}deg)` }}
                        className="relative bg-[#FFFDF9] rounded-xl p-3.5 pb-4 shadow-[0_6px_20px_rgba(44,24,12,0.1)] border border-[#DECBB4]"
                      >
                        {/* Washi tape */}
                        <div
                          className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-4 shadow-2xs rotate-1 z-10 border-t border-b border-[#CCAFA0]"
                          style={{
                            backgroundImage: `repeating-linear-gradient(45deg, #E6D0B3, #E6D0B3 6px, #F5E8D3 6px, #F5E8D3 12px)`,
                          }}
                        />

                        {/* Brass clips */}
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#8C6D4C] pointer-events-none z-10" />
                        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#8C6D4C] pointer-events-none z-10" />

                        {hasPhoto ? (
                          <div className="w-full h-48 rounded-sm overflow-hidden bg-[#ECE2D2] border border-[#DFCDB6] mb-3">
                            <img
                              src={entry.photos[0]}
                              alt="Scrapbook Memory"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-full h-48 rounded-sm bg-[#FAF5EC] border border-[#DFCDB6] p-3.5 flex flex-col justify-between mb-3 relative"
                            style={{
                              backgroundImage: `linear-gradient(transparent, transparent 23px, #E5D9C8 23px, #E5D9C8 24px)`,
                              backgroundSize: '100% 24px',
                              lineHeight: '24px',
                            }}
                          >
                            <div className="absolute top-0 bottom-0 left-6 w-[1px] bg-[#D98279]/60 pointer-events-none" />
                            <div className="flex items-center justify-between text-[10px] text-[#7A5B42] font-mono border-b border-dashed border-[#DECBB4] pb-1 pl-4">
                              <span>NGÀY {day}.{monthStr}</span>
                              <Feather className="w-3 h-3 text-[#8C5D35]" />
                            </div>
                            <p className="text-xs text-[#2C180C] font-serif line-clamp-4 leading-relaxed italic pl-4">
                              "{entry.content || 'Trang nhật ký bình yên...'}"
                            </p>
                            <span className="text-[9px] text-[#9E8268] text-right font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                        )}

                        <div className="text-center pt-1">
                          <h4 className="text-xs font-bold font-serif text-[#2C180C] truncate">
                            {entry.title || `Ký ức ngày ${day}/${monthStr}`}
                          </h4>
                          <p className="text-[10px] text-[#7A5B42] font-mono mt-0.5 tracking-wider">
                            ✦ {day}/{monthStr}/{yearStr} ✦
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Stamp on the Paper Sheet */}
                <div className="text-center pt-8 mt-10 border-t-2 border-dashed border-[#DECBB4]">
                  <p className="text-[10px] font-mono text-[#7A5B42] uppercase tracking-widest">
                    CHRONO ATELIER • SỔ TAY KÝ ỨC CẤT GIỮ THỜI GIAN
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PHOTO PREVIEW MODAL */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-white p-3 pb-6 rounded-2xl shadow-2xl">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhoto}
              alt="Expanded Polaroid"
              className="max-h-[75vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
