'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../lib/audio';
import {
  JournalEntry,
  getCachedJournalSummary,
  fetchJournalSummaryPage,
  fetchJournalById,
  fetchJournalCoverUrl,
  createJournal,
  updateJournal,
  deleteJournal,
} from '../lib/journalApi';
import { compressImageDataUrl } from '../lib/imageUtils';
import { uploadImageToCloud } from '../lib/uploadService';
import { AuthUser } from '../lib/authService';
import { notify } from '../lib/notificationService';

const INITIAL_PAGE_SIZE = 18;
const LOAD_MORE_PAGE_SIZE = 24;

interface DeferredCoverImageProps {
  entryId: string;
  version?: string;
  initialSrc?: string;
  alt: string;
  className?: string;
  onResolved?: (entryId: string, url: string) => void;
}

const DeferredCoverImage: React.FC<DeferredCoverImageProps> = ({
  entryId,
  version,
  initialSrc,
  alt,
  className = '',
  onResolved,
}) => {
  const [src, setSrc] = useState<string | null>(initialSrc || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (initialSrc) {
      setSrc(initialSrc);
    }
  }, [initialSrc]);

  useEffect(() => {
    if (src || requestedRef.current || !entryId) return;
    const node = containerRef.current;
    if (!node) return;

    const triggerLoad = async () => {
      if (requestedRef.current) return;
      requestedRef.current = true;
      const url = await fetchJournalCoverUrl(entryId, version || '');
      if (url) {
        setSrc(url);
        onResolved?.(entryId, url);
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      triggerLoad();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          triggerLoad();
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [entryId, version, src, onResolved]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={className}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#FFF1F2] via-[#FFF8F1] to-[#FEF9C3] animate-pulse flex items-center justify-center">
          <Camera className="w-5 h-5 text-[#E11D48]/40" />
        </div>
      )}
    </div>
  );
};


interface JournalViewProps {
  authUser?: AuthUser | null;
  onOpenAuth?: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({ authUser, onOpenAuth }) => {
  const userCacheKey = authUser?.id || (authUser ? 'authed_default' : 'guest');
  const initialCache = getCachedJournalSummary(userCacheKey);

  const [journals, setJournals] = useState<JournalEntry[]>(initialCache?.items || []);
  const [totalCount, setTotalCount] = useState<number>(initialCache?.totalCount || 0);
  const [hasMore, setHasMore] = useState<boolean>(initialCache?.hasMore || false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [deferredCovers, setDeferredCovers] = useState<Record<string, string>>({});

  const [activeView, setActiveView] = useState<'board' | 'editor'>('board');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_photo'>('all');
  const [isLoading, setIsLoading] = useState(!initialCache || initialCache.items.length === 0);
  const [isHydratingPhotos, setIsHydratingPhotos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
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
  const activeEditEntryIdRef = useRef<string | null>(null);
  const pendingUploadsRef = useRef<Map<string, Promise<string>>>(new Map());

  const handleCoverResolved = useCallback((entryId: string, url: string) => {
    setDeferredCovers((prev) => (prev[entryId] === url ? prev : { ...prev, [entryId]: url }));
  }, []);

  // Load paginated light summary journals (instant cache hydration + background refresh)
  const loadJournals = useCallback(async () => {
    const cached = getCachedJournalSummary(userCacheKey);
    if (cached && cached.items.length > 0) {
      setJournals(cached.items);
      setTotalCount(cached.totalCount);
      setHasMore(cached.hasMore);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const page = await fetchJournalSummaryPage({
        limit: INITIAL_PAGE_SIZE,
        skip: 0,
        userKey: userCacheKey,
      });
      setJournals(page.items);
      setTotalCount(page.totalCount);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [userCacheKey]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    try {
      setIsLoadingMore(true);
      const page = await fetchJournalSummaryPage({
        limit: LOAD_MORE_PAGE_SIZE,
        skip: journals.length,
        userKey: userCacheKey,
      });
      setJournals((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = [...prev];
        page.items.forEach((item) => {
          if (!item.id || !seen.has(item.id)) next.push(item);
        });
        return next;
      });
      setTotalCount(page.totalCount);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, journals.length, userCacheKey]);

  useEffect(() => {
    loadJournals();
  }, [loadJournals]);

  // If user searches or filters by photo while older entries haven't loaded yet, fetch the next batch
  useEffect(() => {
    if ((searchQuery.trim() || filterType === 'with_photo') && hasMore && !isLoadingMore) {
      handleLoadMore();
    }
  }, [searchQuery, filterType, hasMore, isLoadingMore, handleLoadMore]);

  // Open editor for a new entry
  const handleOpenNewPaper = (prefillDate?: string) => {
    activeEditEntryIdRef.current = null;
    setSelectedEntry(null);
    setDate(prefillDate || new Date().toISOString().split('T')[0]);
    setTitle('');
    setContent('');
    setPhotos([]);
    setIsHydratingPhotos(false);
    setActiveView('editor');
    soundEngine.playPentatonicChime(3);
  };

  // Open editor for an existing entry (instant open + background full-photo hydration if needed)
  const handleOpenExistingPaper = async (entry: JournalEntry) => {
    if (isSelectMode) {
      toggleSelectEntry(entry.id);
      return;
    }

    const entryId = entry.id || null;
    activeEditEntryIdRef.current = entryId;
    setSelectedEntry(entry);
    setDate(entry.date);
    setTitle(entry.title);
    setContent(entry.content);

    const initialPhotos =
      entry.photos && entry.photos.length > 0
        ? entry.photos
        : entryId && deferredCovers[entryId]
          ? [deferredCovers[entryId]]
          : [];
    setPhotos(initialPhotos);
    setActiveView('editor');
    soundEngine.playPentatonicChime(1);

    const expectedPhotoCount = entry.photoCount ?? entry.photos?.length ?? 0;
    const needsFullFetch =
      Boolean(entryId) &&
      !entryId!.startsWith('local-journal-') &&
      (Boolean(entry.hasDeferredCover) || expectedPhotoCount > (entry.photos?.length ?? 0));

    if (needsFullFetch && entryId) {
      try {
        setIsHydratingPhotos(true);
        const fullEntry = await fetchJournalById(entryId);
        if (fullEntry && activeEditEntryIdRef.current === entryId) {
          setSelectedEntry(fullEntry);
          setPhotos(fullEntry.photos || []);
          setJournals((prev) =>
            prev.map((j) =>
              j.id === entryId
                ? {
                    ...j,
                    ...fullEntry,
                    photoCount: fullEntry.photos?.length || 0,
                    hasDeferredCover: false,
                  }
                : j
            )
          );
        }
      } finally {
        if (activeEditEntryIdRef.current === entryId) {
          setIsHydratingPhotos(false);
        }
      }
    } else {
      setIsHydratingPhotos(false);
    }
  };

  // Toggle selection for an entry
  const toggleSelectEntry = (id?: string) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    soundEngine.playPentatonicChime(4);
  };

  // Photo Upload Handler (compresses client-side + uploads to Cloudinary in background)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;
        if (!rawBase64) return;

        // Compress immediately (~5MB camera photo -> ~90KB crisp JPEG)
        const compressed = await compressImageDataUrl(rawBase64, 1280, 1280, 0.82);
        setPhotos((prev) => [...prev, compressed]);
        soundEngine.playPentatonicChime(5);

        // Background upload to Cloudinary (falls back cleanly to compressed JPEG if offline/unconfigured)
        setIsUploadingPhotos(true);
        const uploadPromise = uploadImageToCloud(compressed, 'genncore_journals')
          .then((res) => {
            const finalUrl = res.url || compressed;
            if (finalUrl !== compressed) {
              setPhotos((prev) => prev.map((p) => (p === compressed ? finalUrl : p)));
            }
            return finalUrl;
          })
          .catch(() => compressed)
          .finally(() => {
            pendingUploadsRef.current.delete(compressed);
            if (pendingUploadsRef.current.size === 0) {
              setIsUploadingPhotos(false);
            }
          });

        pendingUploadsRef.current.set(compressed, uploadPromise);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const target = photos[index];
    if (target) pendingUploadsRef.current.delete(target);
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Save or Update Entry
  const handleSaveJournal = async () => {
    try {
      setIsSaving(true);

      // Resolve any in-flight Cloudinary uploads before saving so DB never stores raw base64 unnecessarily
      let resolvedPhotos = [...photos];
      if (pendingUploadsRef.current.size > 0) {
        const entries = Array.from(pendingUploadsRef.current.entries());
        const results = await Promise.all(
          entries.map(async ([tempKey, promise]) => [tempKey, await promise] as const)
        );
        const replacements = new Map(results);
        resolvedPhotos = resolvedPhotos.map((p) => replacements.get(p) || p);
        setPhotos(resolvedPhotos);
      }

      const payload: Partial<JournalEntry> = {
        date,
        title: title.trim() || `Ký ức ngày ${new Date(date).toLocaleDateString('vi-VN')}`,
        content,
        photos: resolvedPhotos,
        mood: 'peaceful',
      };

      if (selectedEntry?.id) {
        const updated = await updateJournal(selectedEntry.id, payload);
        setJournals((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      } else {
        const created = await createJournal(payload);
        setJournals((prev) => [created, ...prev]);
        setTotalCount((c) => c + 1);
      }

      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#E11D48', '#FDE047', '#FB7185', '#0F172A'],
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
      setTotalCount((c) => Math.max(0, c - 1));
      setActiveView('board');
      soundEngine.playPentatonicChime(2);
      await notify.success('Đã gỡ trang nhật ký thành công.');
    } catch (err) {
      console.error(err);
      await notify.error('Không thể xóa trang nhật ký.');
    }
  };

  // Memoized filtering & monthly grouping
  const filteredJournals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return journals.filter((entry) => {
      const photoCount = entry.photoCount ?? entry.photos?.length ?? 0;
      if (filterType === 'with_photo' && photoCount === 0) {
        return false;
      }
      if (q) {
        const matchTitle = entry.title?.toLowerCase().includes(q);
        const matchContent = entry.content?.toLowerCase().includes(q);
        const matchDate = entry.date?.includes(q);
        return matchTitle || matchContent || matchDate;
      }
      return true;
    });
  }, [journals, filterType, searchQuery]);

  // Select all or deselect all
  const handleSelectAll = () => {
    if (selectedIds.length === filteredJournals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredJournals.map((j) => j.id).filter(Boolean) as string[]);
    }
    soundEngine.playPentatonicChime(2);
  };

  const monthGroupsList = useMemo(() => {
    const grouped = filteredJournals.reduce((acc, entry) => {
      const d = new Date(entry.date);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const key = `Tháng ${String(month).padStart(2, '0')}, ${year}`;
      if (!acc[key]) {
        acc[key] = { key, month, year, entries: [] };
      }
      acc[key].entries.push(entry);
      return acc;
    }, {} as Record<string, { key: string; month: number; year: number; entries: JournalEntry[] }>);

    const list = Object.values(grouped).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    list.forEach((group) => {
      group.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return list;
  }, [filteredJournals]);

  const now = new Date();
  const currentMonthKey = `Tháng ${String(now.getMonth() + 1).padStart(2, '0')}, ${now.getFullYear()}`;

  // Selected entries for the scrapbook modal (resolved with any cached lazy cover URLs)
  const selectedEntries = useMemo(
    () =>
      journals
        .filter((j) => j.id && selectedIds.includes(j.id))
        .map((j) => {
          if ((!j.photos || j.photos.length === 0) && j.id && deferredCovers[j.id]) {
            return { ...j, photos: [deferredCovers[j.id]] };
          }
          return j;
        }),
    [journals, selectedIds, deferredCovers]
  );

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
      ctx.fillText('✦ GC ✦', sealX, sealY - 4);
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
        `Lưu dấu ${selectedEntries.length} khoảnh khắc thân thương — Gencoore`,
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

        let coverSrc = entry.photos && entry.photos.length > 0 ? entry.photos[0] : undefined;
        if (!coverSrc && entry.hasDeferredCover && entry.id) {
          coverSrc = (await fetchJournalCoverUrl(entry.id, entry.updatedAt || '')) || undefined;
        }

        if (coverSrc) {
          try {
            const img = await loadImage(coverSrc);
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
        `GENCOORE • LƯU TRỮ KÝ ỨC VĨNH CỬU • NGÀY ${new Date().toLocaleDateString('vi-VN')}`,
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
    <div className="min-h-full flex flex-col p-4 sm:p-6 lg:p-7 select-none bg-[#FFF8F1] text-[#0F172A] rounded-3xl">
      {/* ========================================================================= */}
      {/* VIEW 1: MONTHLY MEMORY BOARDS (BẢNG KÝ ỨC TỪNG THÁNG XẾP HÀNG NGANG)      */}
      {/* ========================================================================= */}
      {activeView === 'board' && (
        <div className="flex-1 flex flex-col space-y-7">
          {/* Top Bar with Genncore Cartoon + Warm Cream Paper Aesthetic */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b-2 border-[#0F172A]">
            <div className="flex items-center gap-3.5">
              {/* Genncore Crimson Red Cartoon Icon Box */}
              <div className="w-11 h-11 rounded-2xl bg-[#E11D48] text-white flex items-center justify-center border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] relative shrink-0">
                <Feather className="w-5 h-5 text-white" />
                <span className="absolute -bottom-1.5 -right-1.5 text-[8px] font-black bg-[#FEF08A] text-[#0F172A] px-1.5 py-0.2 rounded-full border-2 border-[#0F172A]">
                  CBP
                </span>
              </div>
              <div>
                <h2 className="text-xl font-black text-[#0F172A] tracking-tight flex items-center gap-2.5 flex-wrap">
                  Bảng Ký Ức Theo Tháng
                  <span className="text-[11px] font-sans font-black px-2.5 py-0.5 rounded-full bg-[#FFE4E6] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
                    {totalCount || journals.length} trang kỷ niệm
                  </span>
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Mỗi tháng là một bảng kỷ niệm — nơi thời gian dừng lại cùng những khoảnh khắc và tấm ảnh thân thương.
                </p>
              </div>
            </div>

              {/* Controls Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="flex items-center gap-2 bg-[#FFFDF7] border-2 border-[#0F172A] px-3.5 py-1.5 rounded-xl shadow-[2px_2px_0px_#0F172A] text-xs font-bold text-[#0F172A] w-44 sm:w-52 focus-within:bg-[#FFF1F2] transition-all">
                  <Search className="w-3.5 h-3.5 text-[#E11D48] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm ký ức, ngày..."
                    className="w-full bg-transparent outline-none placeholder:text-slate-400 font-sans font-bold text-[#0F172A]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-[#E11D48] cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1 bg-[#FFF1F2] border-2 border-[#0F172A] p-1 rounded-xl shadow-[2px_2px_0px_#0F172A] text-xs font-black">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-[#E11D48] text-white border border-[#0F172A]'
                        : 'text-[#0F172A] hover:bg-white/70'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setFilterType('with_photo')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === 'with_photo'
                        ? 'bg-[#E11D48] text-white border border-[#0F172A]'
                        : 'text-[#0F172A] hover:bg-white/70'
                    }`}
                  >
                    <Camera className={`w-3 h-3 ${filterType === 'with_photo' ? 'text-white' : 'text-[#E11D48]'}`} />
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer ${
                    isSelectMode
                      ? 'bg-[#E11D48] text-white'
                      : 'bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A]'
                  }`}
                  title="Chọn các trang nhật ký để chụp thành ảnh paper"
                >
                  <Camera className={`w-4 h-4 ${isSelectMode ? 'text-white' : 'text-[#E11D48]'}`} />
                  <span>{isSelectMode ? 'Đang Chọn' : 'Chụp Ảnh Kỷ Niệm'}</span>
                </button>

                {/* Primary Write Button */}
                <button
                  onClick={() => handleOpenNewPaper()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white rounded-xl text-xs font-black border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Viết Nhật Ký</span>
                </button>
              </div>
            </div>

            {/* SELECTION MODE ACTION BANNER */}
            {isSelectMode && (
              <div className="bg-[#FFF1F2] border-2 border-[#0F172A] rounded-2xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 shadow-[3px_3px_0px_#0F172A]">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] border border-[#0F172A] animate-pulse" />
                  <span className="text-xs font-black text-[#0F172A]">
                    Chế độ chọn: Hãy bấm vào các trang nhật ký bạn muốn xuất thành ảnh Paper ({selectedIds.length} đã chọn)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black text-[#0F172A] transition-all cursor-pointer"
                  >
                    {selectedIds.length === filteredJournals.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>

                  <button
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedIds([]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFE4E6] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black text-[#0F172A] hover:text-[#E11D48] transition-all cursor-pointer"
                  >
                    Hủy
                  </button>

                  <button
                    disabled={selectedIds.length === 0}
                    onClick={() => setIsScrapbookModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] disabled:opacity-40 text-white text-xs font-black border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                    <span>Xuất Ảnh Scrapbook ({selectedIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* MAIN CONTENT: SCROLLABLE MONTHLY BOARDS */}
            <div className="space-y-9 pb-12">
              {isLoading ? (
                <div className="bg-[#FFFDF7] border-2 border-[#0F172A] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[4px_4px_0px_#0F172A] space-y-5">
                  <div className="flex items-center justify-between pb-3.5 border-b-2 border-[#0F172A]/10">
                    <div className="h-8 w-48 rounded-xl bg-[#FFF1F2] border border-[#0F172A]/15 animate-pulse" />
                    <div className="h-8 w-36 rounded-xl bg-[#FEF9C3] border border-[#0F172A]/15 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl p-3 pb-4 border-2 border-[#0F172A]/20 shadow-[3px_3px_0px_rgba(15,23,42,0.12)] space-y-3"
                      >
                        <div className="w-full h-38 sm:h-40 rounded-xl bg-[#FFF8F1] animate-pulse" />
                        <div className="h-3.5 w-3/4 mx-auto rounded-full bg-slate-200 animate-pulse" />
                        <div className="h-2.5 w-1/2 mx-auto rounded-full bg-slate-100 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : monthGroupsList.length === 0 ? (
                /* EMPTY STATE: DISPLAY A WARM PLACEHOLDER BOARD FOR CURRENT MONTH */
                <div className="bg-[#FFFDF7] border-2 border-[#0F172A] rounded-3xl p-8 sm:p-12 text-center shadow-[4px_4px_0px_#0F172A]">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFE4E6] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] flex items-center justify-center text-[#E11D48] mb-3">
                    <Feather className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-[#0F172A]">
                    Bảng Ký Ức {currentMonthKey} Đang Trống
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed font-medium">
                    Chưa có trang ký ức nào được ghim trong tháng này. Hãy viết vài dòng chia sẻ hay đính kèm một bức ảnh kỷ niệm để mở đầu cuốn sổ nhé!
                  </p>
                  <button
                    onClick={() => handleOpenNewPaper()}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-black rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Viết trang ký ức đầu tiên</span>
                  </button>
                </div>
              ) : (
                monthGroupsList.map((group) => {
                  const photoCount = group.entries.reduce(
                    (acc, e) => acc + (e.photoCount ?? e.photos?.length ?? 0),
                    0
                  );

                  return (
                    <div
                      key={group.key}
                      className="bg-[#FFFDF7] border-2 border-[#0F172A] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[4px_4px_0px_#0F172A] relative overflow-hidden"
                    >
                      {/* Decorative Background Stamp Watermark */}
                      <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full border-4 border-dashed border-[#E11D48]/15 pointer-events-none flex items-center justify-center rotate-12">
                        <span className="text-[11px] font-mono tracking-widest text-[#E11D48]/25 font-black uppercase">
                          GENNCORE ARCHIVE
                        </span>
                      </div>

                      {/* MONTH HEADER PANEL: CARTOON POSTAGE STAMP & BADGE */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-5 border-b-2 border-[#0F172A]/15">
                        <div className="flex items-center gap-3.5">
                          {/* Cartoon Postage Stamp */}
                          <div className="bg-[#FFF1F2] border-2 border-[#0F172A] px-3.5 py-1.5 rounded-xl shadow-[2px_2px_0px_#0F172A] flex items-center gap-2.5 relative">
                            <span className="w-2 h-2 rounded-full bg-[#E11D48] border border-[#0F172A]" />
                            <span className="text-[10px] font-mono tracking-widest text-[#E11D48] font-black uppercase">
                              POSTAGE
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] border border-[#0F172A]" />
                            <span className="text-xs font-black text-[#0F172A] tracking-wide">
                              {group.key.toUpperCase()}
                            </span>
                          </div>

                          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 font-bold">
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] border-2 border-[#0F172A] text-xs font-black text-[#0F172A] transition-all shadow-[2px_2px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#E11D48]" />
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
                          const entryPhotoCount = entry.photoCount ?? entry.photos?.length ?? 0;
                          const hasPhoto = entryPhotoCount > 0;
                          const inlineCover = entry.photos?.[0] || (entry.id ? deferredCovers[entry.id] : undefined);
                          const isSelected = entry.id ? selectedIds.includes(entry.id) : false;

                          // Subtle natural tilt for cartoon polaroid charm
                          const tilts = [-1.4, 1.2, -0.8, 1.5, -1.6, 1];
                          const tilt = isSelected ? 0 : tilts[idx % tilts.length];

                          return (
                            <div
                              key={entry.id || idx}
                              style={{ transform: `rotate(${tilt}deg)` }}
                              onClick={() => handleOpenExistingPaper(entry)}
                              className={`relative bg-white rounded-2xl p-3 pb-3.5 border-2 border-[#0F172A] transition-all duration-150 hover:-translate-y-1 hover:scale-[1.02] hover:!rotate-0 cursor-pointer group flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-[#FFF1F2] ring-2 ring-[#E11D48] shadow-[4px_4px_0px_#E11D48]'
                                  : 'shadow-[4px_4px_0px_#0F172A] hover:shadow-[5px_5px_0px_#0F172A]'
                              }`}
                            >
                              {/* Striped Cartoon Washi Tape Strip at top */}
                              <div
                                className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-3.5 rotate-1 z-10 border-2 border-[#0F172A] rounded-xs"
                                style={{
                                  backgroundImage: `repeating-linear-gradient(45deg, #FEF08A, #FEF08A 6px, #FFE4E6 6px, #FFE4E6 12px)`,
                                }}
                              />

                              {/* Corner Ink Clips on Polaroids */}
                              <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-[#0F172A] pointer-events-none z-10" />
                              <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-[#0F172A] pointer-events-none z-10" />

                              {/* Selection Stamp Indicator */}
                              {isSelectMode && (
                                <div className="absolute top-2 right-2 z-20">
                                  {isSelected ? (
                                    <div className="w-5 h-5 rounded-lg bg-[#E11D48] text-white flex items-center justify-center border-2 border-[#0F172A] shadow-[1px_1px_0px_#0F172A]">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-lg bg-white border-2 border-[#0F172A] hover:bg-[#FEF9C3] flex items-center justify-center shadow-[1px_1px_0px_#0F172A]" />
                                  )}
                                </div>
                              )}

                              <div>
                                {/* Photo or Note area */}
                                {hasPhoto ? (
                                  <div className="w-full h-38 sm:h-40 rounded-xl overflow-hidden bg-[#FFF8F1] border-2 border-[#0F172A] mb-2.5 relative">
                                    {inlineCover ? (
                                      <img
                                        src={inlineCover}
                                        alt="Memory photo"
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                                      />
                                    ) : entry.id ? (
                                      <DeferredCoverImage
                                        entryId={entry.id}
                                        version={entry.updatedAt}
                                        alt="Memory photo"
                                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                                        onResolved={handleCoverResolved}
                                      />
                                    ) : null}
                                    <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-[#0F172A] text-white text-[9px] font-mono font-black">
                                      {entryPhotoCount} ảnh
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="w-full h-38 sm:h-40 rounded-xl bg-[#FFFDF7] border-2 border-[#0F172A] p-3 flex flex-col justify-between mb-2.5 relative"
                                    style={{
                                      backgroundImage: `linear-gradient(transparent, transparent 23px, #F1E5D6 23px, #F1E5D6 24px)`,
                                      backgroundSize: '100% 24px',
                                      lineHeight: '24px',
                                    }}
                                  >
                                    {/* Crimson margin line */}
                                    <div className="absolute top-0 bottom-0 left-5 w-[1.5px] bg-[#E11D48]/45 pointer-events-none" />

                                    <div className="flex items-center justify-between text-[10px] text-[#E11D48] font-mono font-black border-b border-dashed border-[#0F172A]/20 pb-1 pl-3.5">
                                      <span>NGÀY {day}.{monthStr}</span>
                                      <Feather className="w-3 h-3 text-[#E11D48]" />
                                    </div>
                                    <p className="text-xs text-[#0F172A] font-serif line-clamp-3 leading-relaxed italic pl-3.5">
                                      "{entry.content || 'Trang nhật ký bình yên...'}"
                                    </p>
                                    <span className="text-[9px] text-slate-500 font-bold text-right font-mono">
                                      #{idx + 1}
                                    </span>
                                  </div>
                                )}

                                {/* Bottom Polaroid Caption Area */}
                                <div className="text-center pt-0.5 px-1">
                                  <h4 className="text-xs font-black text-[#0F172A] truncate group-hover:text-[#E11D48] transition-colors">
                                    {entry.title || `Ký ức ngày ${day}/${monthStr}`}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5 tracking-wider">
                                    ✦ {day}/{monthStr}/{yearStr} ✦
                                  </p>
                                </div>
                              </div>

                              {/* Hover Hint */}
                              <div className="mt-2.5 pt-1.5 border-t-2 border-[#0F172A]/10 flex items-center justify-between text-[10px] font-bold text-[#E11D48] opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>
                                  {isSelectMode ? (isSelected ? 'Bỏ chọn trang này' : 'Chọn trang này') : 'Mở đọc ký ức'}
                                </span>
                                <Sparkles className="w-3 h-3 text-[#E11D48]" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              {!isLoading && hasMore && !searchQuery.trim() && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black text-[#0F172A] transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#E11D48]" />
                        <span>Đang tải thêm ký ức cũ...</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 text-[#E11D48]" />
                        <span>
                          Tải thêm ký ức cũ ({Math.max(1, totalCount - journals.length)} trang nữa)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: THE SPACIOUS CARTOON CREAM WRITING DESK (TRANG GIẤY VIẾT NHẬT KÝ) */}
      {/* ========================================================================= */}
      {activeView === 'editor' && (
        <div className="flex-1 flex flex-col h-full max-w-3xl mx-auto w-full">
            {/* Action Top Bar */}
            <div className="flex items-center justify-between pb-4 shrink-0">
              <button
                onClick={() => setActiveView('board')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] text-xs font-black text-[#0F172A] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#E11D48]" />
                <span>Trở Về Bảng Ký Ức</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedEntry?.id && (
                  <button
                    onClick={handleDeleteJournal}
                    className="p-2 bg-[#FFE4E6] text-[#E11D48] hover:bg-[#E11D48] hover:text-white rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer"
                    title="Xóa trang ký ức này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleSaveJournal}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white rounded-xl text-xs font-black border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSaving ? 'Đang lưu vào sổ...' : 'Lưu Vào Bảng Ký Ức'}</span>
                </button>
              </div>
            </div>

            {/* THE WARM CREAM PAPER SHEET WITH CARTOON OUTLINE & HARD SHADOW */}
            <div className="flex-1 bg-[#FFFDF7] border-2 border-[#0F172A] rounded-3xl p-6 sm:p-10 shadow-[4px_4px_0px_#0F172A] flex flex-col relative select-text">
              {/* Postal Stamp Date & Photo Attachment Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-[#0F172A]/15 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-white border-2 border-[#0F172A] px-3.5 py-1.5 rounded-xl shadow-[2px_2px_0px_#0F172A]">
                    <Calendar className="w-3.5 h-3.5 text-[#E11D48]" />
                    <span className="text-xs font-black text-[#0F172A]">Ngày:</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent text-xs font-black text-[#0F172A] outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FEF9C3] hover:bg-[#FDE047] border-2 border-[#0F172A] text-xs font-black text-[#0F172A] transition-all shadow-[2px_2px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#E11D48]" />
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
                  className="w-full text-xl sm:text-2xl font-black text-[#0F172A] bg-transparent outline-none placeholder:text-slate-400 border-b-2 border-transparent focus:border-[#E11D48] pb-1 transition-colors"
                />
              </div>

              {/* Attached Photos Strip (Polaroid Preview) */}
              {(photos.length > 0 || isHydratingPhotos || isUploadingPhotos) && (
                <div className="flex flex-wrap items-center gap-3 py-3 shrink-0">
                  {photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="relative bg-white p-1.5 pb-2 rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] w-24 sm:w-28 group"
                    >
                      <div className="w-full h-20 overflow-hidden rounded-lg bg-[#FFF8F1] border border-[#0F172A]">
                        <img
                          src={photo}
                          alt="Attached memory"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewPhoto(photo)}
                        />
                      </div>
                      <button
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-[#E11D48] text-white border-2 border-[#0F172A] rounded-full flex items-center justify-center cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(isHydratingPhotos || isUploadingPhotos) && (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFF1F2] border border-[#E11D48]/30 text-[11px] font-bold text-[#E11D48]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isHydratingPhotos ? 'Đang tải thêm ảnh...' : 'Đang nén & tối ưu ảnh...'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* DISTINCT BOLD RULED LINES WITH COMFORTABLE FONT & CRIMSON MARGIN */}
              <div className="flex-1 mt-2 relative min-h-[320px]">
                {/* Crimson margin line */}
                <div className="absolute top-0 bottom-0 left-8 w-[1.5px] bg-[#E11D48]/60 pointer-events-none" />

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={13}
                  placeholder="Viết lại những điều bạn đã trải qua, niềm vui, nỗi bận tâm hay suy ngẫm trong ngày..."
                  className="w-full h-full bg-transparent text-sm sm:text-base font-serif text-[#0F172A] leading-relaxed outline-none resize-none placeholder:text-slate-400 pl-12"
                  style={{
                    backgroundImage: `linear-gradient(transparent, transparent 31px, #EADBC8 31px, #EADBC8 32px)`,
                    backgroundSize: '100% 32px',
                    lineHeight: '32px',
                  }}
                />
              </div>
            </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CARTOON CREAM PAPER SCRAPBOOK PHOTO COLLAGE MODAL                         */}
      {/* ========================================================================= */}
      {isScrapbookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-[#FFF8F1] border-2 border-[#0F172A] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-[6px_6px_0px_#0F172A] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-[#0F172A] bg-[#FFF1F2]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E11D48] text-white flex items-center justify-center border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0F172A]">
                    Tờ Báo Kỷ Niệm (Paper Scrapbook Collage)
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Ghép {selectedEntries.length} trang ký ức thành bưu thiếp giấy thủ công hoài niệm
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={isExportingPNG}
                  onClick={handleExportScrapbookPNG}
                  className="flex items-center gap-2 px-4 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white rounded-xl text-xs font-black border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>{isExportingPNG ? 'Đang xuất ảnh...' : 'Tải Ảnh (.PNG)'}</span>
                </button>

                <button
                  onClick={() => setIsScrapbookModalOpen(false)}
                  className="p-2 text-[#0F172A] bg-white hover:bg-[#FEF9C3] rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Live Paper Collage Preview */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar space-y-8 bg-[#FFF8F1]">
              {/* Scrapbook Sheet */}
              <div className="bg-[#FFFDF7] border-2 border-[#0F172A] rounded-3xl p-6 sm:p-10 shadow-[4px_4px_0px_#0F172A] relative overflow-hidden">
                {/* Crimson Seal in Top-Right */}
                <div className="absolute top-6 right-6 w-14 h-14 rounded-full bg-[#E11D48] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] flex flex-col items-center justify-center text-white rotate-12 z-20 pointer-events-none">
                  <span className="text-[9px] font-black tracking-widest">✦ CBP ✦</span>
                  <span className="text-[8px] font-mono tracking-wider text-white/90">SEAL</span>
                </div>

                {/* Postal Header */}
                <div className="text-center pb-6 border-b-2 border-dashed border-[#0F172A]/25 mb-8 relative pr-12">
                  <div className="inline-block bg-[#FEF9C3] border-2 border-[#0F172A] px-4 py-1 rounded-full text-[10px] font-mono tracking-widest text-[#0F172A] font-black uppercase mb-2 shadow-[2px_2px_0px_#0F172A]">
                    POSTAL ARCHIVES • BƯU THIẾP KÝ ỨC
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                    Những Lát Cắt Thời Gian
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-1">
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
                    const entryPhotoCount = entry.photoCount ?? entry.photos?.length ?? 0;
                    const hasPhoto = entryPhotoCount > 0;
                    const scrapbookCover = entry.photos?.[0] || (entry.id ? deferredCovers[entry.id] : undefined);

                    const tilts = [-1.5, 1.2, -1, 1.6, -1.8, 1];
                    const tilt = tilts[idx % tilts.length];

                    return (
                      <div
                        key={entry.id || idx}
                        style={{ transform: `rotate(${tilt}deg)` }}
                        className="relative bg-white rounded-2xl p-3.5 pb-4 border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A]"
                      >
                        {/* Washi tape */}
                        <div
                          className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 h-4 rotate-1 z-10 border-2 border-[#0F172A] rounded-xs"
                          style={{
                            backgroundImage: `repeating-linear-gradient(45deg, #FEF08A, #FEF08A 6px, #FFE4E6 6px, #FFE4E6 12px)`,
                          }}
                        />

                        {/* Corner clips */}
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#0F172A] pointer-events-none z-10" />
                        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#0F172A] pointer-events-none z-10" />

                        {hasPhoto ? (
                          <div className="w-full h-48 rounded-xl overflow-hidden bg-[#FFF8F1] border-2 border-[#0F172A] mb-3">
                            {scrapbookCover ? (
                              <img
                                src={scrapbookCover}
                                alt="Scrapbook Memory"
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            ) : entry.id ? (
                              <DeferredCoverImage
                                entryId={entry.id}
                                version={entry.updatedAt}
                                alt="Scrapbook Memory"
                                className="w-full h-full object-cover"
                                onResolved={handleCoverResolved}
                              />
                            ) : null}
                          </div>
                        ) : (
                          <div
                            className="w-full h-48 rounded-xl bg-[#FFFDF7] border-2 border-[#0F172A] p-3.5 flex flex-col justify-between mb-3 relative"
                            style={{
                              backgroundImage: `linear-gradient(transparent, transparent 23px, #F1E5D6 23px, #F1E5D6 24px)`,
                              backgroundSize: '100% 24px',
                              lineHeight: '24px',
                            }}
                          >
                            <div className="absolute top-0 bottom-0 left-6 w-[1.5px] bg-[#E11D48]/50 pointer-events-none" />
                            <div className="flex items-center justify-between text-[10px] text-[#E11D48] font-mono font-black border-b border-dashed border-[#0F172A]/20 pb-1 pl-4">
                              <span>NGÀY {day}.{monthStr}</span>
                              <Feather className="w-3 h-3 text-[#E11D48]" />
                            </div>
                            <p className="text-xs text-[#0F172A] font-serif line-clamp-4 leading-relaxed italic pl-4">
                              "{entry.content || 'Trang nhật ký bình yên...'}"
                            </p>
                            <span className="text-[9px] text-slate-500 font-bold text-right font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                        )}

                        <div className="text-center pt-1">
                          <h4 className="text-xs font-black text-[#0F172A] truncate">
                            {entry.title || `Ký ức ngày ${day}/${monthStr}`}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5 tracking-wider">
                            ✦ {day}/{monthStr}/{yearStr} ✦
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Stamp on the Paper Sheet */}
                <div className="text-center pt-8 mt-10 border-t-2 border-dashed border-[#0F172A]/20">
                  <p className="text-[10px] font-mono font-black text-[#E11D48] uppercase tracking-widest">
                    GENNCORE • SỔ TAY KÝ ỨC CẤT GIỮ THỜI GIAN
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
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[90vh] bg-white p-3 pb-6 rounded-2xl border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A]"
          >
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#BE123C] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewPhoto}
              alt="Expanded Polaroid"
              className="max-h-[75vh] w-auto object-contain rounded-xl border-2 border-[#0F172A]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
