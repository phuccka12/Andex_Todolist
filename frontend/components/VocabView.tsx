'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Sparkles,
  Volume2,
  Plus,
  Search,
  Upload,
  RotateCw,
  Check,
  X,
  Trash2,
  Edit3,
  Loader2,
  FileText,
  Image as ImageIcon,
  Brain,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  RefreshCw,
  Wand2,
  Maximize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../lib/audio';
import { notify } from '../lib/notificationService';
import { compressImageDataUrl } from '../lib/imageUtils';
import { AppTheme } from '../lib/settingsStorage';
import {
  VocabItem,
  ReviewRating,
  ExtractedVocabDraft,
  fetchVocab,
  createVocab,
  bulkCreateVocab,
  aiExtractVocab,
  reviewVocab,
  updateVocab,
  deleteVocab,
  autoTagExistingVocab,
  parseStructuredVocabLines,
  speakEnglishWord,
} from '../lib/vocabApi';

interface VocabViewProps {
  theme?: AppTheme;
  authUserId?: string;
}

export const VocabView: React.FC<VocabViewProps> = ({ theme = 'slate', authUserId }) => {
  const isDark = theme === 'midnight';

  const [words, setWords] = useState<VocabItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Main 2 Modes: Học (learn) & Review (review)
  const [mode, setMode] = useState<'learn' | 'review'>('learn');
  const [isStudyPopupOpen, setIsStudyPopupOpen] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [isAutoTagging, setIsAutoTagging] = useState(false);

  // Single Flashcard Deck state (in Learn Deck mode)
  const [deckIndex, setDeckIndex] = useState(0);
  const [isDeckFlipped, setIsDeckFlipped] = useState(false);

  // Review Mode State
  const [reviewStyle, setReviewStyle] = useState<'flashcard' | 'quiz'>('flashcard');
  const [reviewScope, setReviewScope] = useState<'due' | 'all'>('due');
  const [reviewTopic, setReviewTopic] = useState<string>('all');
  const [reviewQueue, setReviewQueue] = useState<VocabItem[]>([]);
  const [reviewPos, setReviewPos] = useState(0);
  const [showReviewAnswer, setShowReviewAnswer] = useState(false);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [quizSelectedIdx, setQuizSelectedIdx] = useState<number | null>(null);

  // Single Word Add / Edit Modal
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabItem | null>(null);
  const [formWord, setFormWord] = useState('');
  const [formPhonetic, setFormPhonetic] = useState('');
  const [formPos, setFormPos] = useState('');
  const [formMeaning, setFormMeaning] = useState('');
  const [formExample, setFormExample] = useState('');
  const [formExampleTrans, setFormExampleTrans] = useState('');
  const [formTopic, setFormTopic] = useState('Tự động');
  const [isAutoFillingSingle, setIsAutoFillingSingle] = useState(false);
  const [isSavingWord, setIsSavingWord] = useState(false);

  // Auto-Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'text' | 'file' | 'image'>('text');
  const [importText, setImportText] = useState('');
  const [importTopic, setImportTopic] = useState('Tự động');
  const [importImagePreview, setImportImagePreview] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedDrafts, setExtractedDrafts] = useState<ExtractedVocabDraft[]>([]);
  const [isSavingImport, setIsSavingImport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const loadWords = async () => {
    setIsLoading(true);
    try {
      const list = await fetchVocab();
      setWords(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, [authUserId]);

  // Derived stats
  const dueWords = useMemo(() => {
    const now = Date.now();
    return words.filter((w) => !w.nextReviewAt || new Date(w.nextReviewAt).getTime() <= now);
  }, [words]);

  const masteredCount = useMemo(() => words.filter((w) => (w.srsLevel || 0) >= 3).length, [words]);

  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    words.forEach((w) => {
      const tp = w.topic?.trim() || 'Chung';
      counts[tp] = (counts[tp] || 0) + 1;
    });
    return counts;
  }, [words]);

  const topics = useMemo(() => {
    return Object.keys(topicCounts).sort(
      (a, b) => (topicCounts[b] || 0) - (topicCounts[a] || 0) || a.localeCompare(b, 'vi')
    );
  }, [topicCounts]);

  const uncategorizedCount = useMemo(() => {
    return words.filter((w) => {
      const tp = (w.topic || '').trim().toLowerCase();
      return !tp || tp === 'chung' || tp === 'tự động' || tp === 'từ ảnh';
    }).length;
  }, [words]);

  const getTopicBadgeCls = (topicName: string) => {
    const key = (topicName || '').trim();
    const map: Record<string, { light: string; dark: string }> = {
      'IT & Tech': {
        light: 'bg-sky-50 text-sky-700 border-sky-200',
        dark: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
      },
      'Kinh doanh': {
        light: 'bg-violet-50 text-violet-700 border-violet-200',
        dark: 'bg-violet-500/15 text-violet-300 border-violet-400/25',
      },
      'Tài chính': {
        light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dark: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
      },
      'Cảm xúc & Tâm lý': {
        light: 'bg-rose-50 text-rose-700 border-rose-200',
        dark: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
      },
      'Sức khỏe': {
        light: 'bg-lime-50 text-lime-700 border-lime-200',
        dark: 'bg-lime-500/15 text-lime-300 border-lime-400/25',
      },
      'Du lịch': {
        light: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        dark: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/25',
      },
      'IELTS & Học thuật': {
        light: 'bg-amber-50 text-amber-700 border-amber-200',
        dark: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
      },
      'Giao tiếp': {
        light: 'bg-blue-50 text-blue-700 border-blue-200',
        dark: 'bg-blue-500/15 text-blue-300 border-blue-400/25',
      },
      'Đời sống': {
        light: 'bg-teal-50 text-teal-700 border-teal-200',
        dark: 'bg-teal-500/15 text-teal-300 border-teal-400/25',
      },
    };
    const palette = map[key] || {
      light: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      dark: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/25',
    };
    return isDark ? palette.dark : palette.light;
  };

  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (selectedTopic !== 'all' && (w.topic?.trim() || 'Chung') !== selectedTopic) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hit =
          w.word.toLowerCase().includes(q) ||
          w.meaning.toLowerCase().includes(q) ||
          (w.topic || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [words, selectedTopic, searchQuery]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredWords.length / pageSize)),
    [filteredWords.length, pageSize]
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedWords = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredWords.slice(start, start + pageSize);
  }, [filteredWords, safePage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
    setDeckIndex(0);
    setIsDeckFlipped(false);
  }, [selectedTopic, searchQuery, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Keep deck index bounded
  useEffect(() => {
    if (deckIndex >= filteredWords.length) {
      setDeckIndex(0);
      setIsDeckFlipped(false);
    }
  }, [filteredWords.length, deckIndex]);

  const openStudyPopupAt = (index = 0) => {
    if (filteredWords.length === 0) return;
    soundEngine.playSoftClick();
    const bounded = Math.max(0, Math.min(index, filteredWords.length - 1));
    setDeckIndex(bounded);
    setIsDeckFlipped(false);
    setIsStudyPopupOpen(true);
  };

  useEffect(() => {
    if (!isStudyPopupOpen || isWordModalOpen || isImportModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (e.key === 'Escape') {
        setIsStudyPopupOpen(false);
      } else if (e.key === 'ArrowRight' && filteredWords.length > 0) {
        soundEngine.playSoftClick();
        setIsDeckFlipped(false);
        setDeckIndex((prev) => (prev + 1) % filteredWords.length);
      } else if (e.key === 'ArrowLeft' && filteredWords.length > 0) {
        soundEngine.playSoftClick();
        setIsDeckFlipped(false);
        setDeckIndex((prev) => (prev - 1 + filteredWords.length) % filteredWords.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        soundEngine.playSoftClick();
        setIsDeckFlipped((prev) => !prev);
      } else if (e.key.toLowerCase() === 's' && filteredWords[deckIndex]) {
        speakEnglishWord(filteredWords[deckIndex].word, false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudyPopupOpen, isWordModalOpen, isImportModalOpen, filteredWords, deckIndex]);

  const handleAutoTagAll = async () => {
    setIsAutoTagging(true);
    try {
      const res = await autoTagExistingVocab();
      if (Array.isArray(res.words) && res.words.length > 0) {
        setWords(res.words);
      } else {
        await loadWords();
      }
      soundEngine.playPentatonicChime(4);
      if (res.updatedCount > 0) {
        notify.success(`Đã tự động phân loại ${res.updatedCount} từ vựng vào các chủ đề tương ứng!`);
      } else {
        notify.success('Tất cả từ vựng đã được gắn chủ đề rõ ràng.');
      }
    } catch (err: any) {
      notify.error(err.message || 'Không thể tự động chia tag lúc này.');
    } finally {
      setIsAutoTagging(false);
    }
  };

  // Build Review Queue when entering Review mode or switching scope/topic
  const startReviewSession = (scope: 'due' | 'all' = reviewScope, topicFilter: string = reviewTopic) => {
    const poolByTopic =
      topicFilter !== 'all'
        ? words.filter((w) => (w.topic?.trim() || 'Chung') === topicFilter)
        : words;
    const now = Date.now();
    const dueInTopic = poolByTopic.filter((w) => !w.nextReviewAt || new Date(w.nextReviewAt).getTime() <= now);
    const base = scope === 'due' ? dueInTopic : poolByTopic;
    const shuffled = [...base].sort(() => Math.random() - 0.5);
    setReviewScope(scope);
    setReviewTopic(topicFilter);
    setReviewQueue(shuffled);
    setReviewPos(0);
    setShowReviewAnswer(false);
    setQuizSelectedIdx(null);
    setSessionReviewedCount(0);
  };

  useEffect(() => {
    if (mode === 'review') {
      startReviewSession(reviewScope, reviewTopic);
    }
  }, [mode]);

  const currentReviewWord = reviewQueue[reviewPos] || null;

  // Build 4-option Quiz choices for current review word
  const quizChoices = useMemo(() => {
    if (!currentReviewWord) return [];
    const others = words
      .filter((w) => w.id !== currentReviewWord.id && w.meaning.trim() !== currentReviewWord.meaning.trim())
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w) => w.meaning);

    const fallbackMeanings = [
      'Sự kiên trì, bền bỉ',
      'Tối ưu hóa quy trình',
      'Trì hoãn công việc',
      'Khả năng thích ứng nhanh',
    ];
    for (const fb of fallbackMeanings) {
      if (others.length >= 3) break;
      if (fb !== currentReviewWord.meaning && !others.includes(fb)) {
        others.push(fb);
      }
    }

    const all = [
      { meaning: currentReviewWord.meaning, isCorrect: true },
      ...others.map((m) => ({ meaning: m, isCorrect: false })),
    ];
    return all.sort(() => Math.random() - 0.5);
  }, [currentReviewWord?.id, reviewPos, words.length]);

  const handleRateReview = async (rating: ReviewRating) => {
    if (!currentReviewWord || isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      const updated = await reviewVocab(currentReviewWord.id, rating);
      setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));

      if (rating === 'good' || rating === 'easy') {
        soundEngine.playPentatonicChime(4);
      } else {
        soundEngine.playSoftClick();
      }

      const nextCount = sessionReviewedCount + 1;
      setSessionReviewedCount(nextCount);

      if (rating === 'again') {
        // Re-queue current word at the end of this session so user practices it again
        setReviewQueue((prev) => [...prev, updated]);
      }

      const nextPos = reviewPos + 1;
      setReviewPos(nextPos);
      setShowReviewAnswer(false);
      setQuizSelectedIdx(null);

      // Celebrate when finishing the queue
      const finalLength = rating === 'again' ? reviewQueue.length + 1 : reviewQueue.length;
      if (nextPos >= finalLength) {
        soundEngine.playPentatonicChime(5);
        try {
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.65 } });
        } catch {}
      }
    } catch (err: any) {
      notify.error(err.message || 'Không thể lưu tiến độ ôn tập');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Single Word Modal handlers
  const openAddWordModal = () => {
    soundEngine.playSoftClick();
    setEditingWord(null);
    setFormWord('');
    setFormPhonetic('');
    setFormPos('');
    setFormMeaning('');
    setFormExample('');
    setFormExampleTrans('');
    setFormTopic(selectedTopic !== 'all' ? selectedTopic : 'Tự động');
    setIsWordModalOpen(true);
  };

  const openEditWordModal = (item: VocabItem) => {
    soundEngine.playSoftClick();
    setEditingWord(item);
    setFormWord(item.word);
    setFormPhonetic(item.phonetic || '');
    setFormPos(item.partOfSpeech || '');
    setFormMeaning(item.meaning);
    setFormExample(item.example || '');
    setFormExampleTrans(item.exampleTranslation || '');
    setFormTopic(item.topic || 'Tự động');
    setIsWordModalOpen(true);
  };

  const handleAiAutoFillSingle = async () => {
    if (!formWord.trim()) {
      notify.warning('Hãy nhập từ tiếng Anh trước để AI điền giúp bạn.');
      return;
    }
    setIsAutoFillingSingle(true);
    try {
      const results = await aiExtractVocab({ text: formWord.trim(), topic: formTopic || 'Tự động' });
      if (results.length > 0) {
        const first = results[0];
        setFormWord(first.word || formWord);
        setFormPhonetic(first.phonetic || '');
        setFormPos(first.partOfSpeech || '');
        setFormMeaning(first.meaning || '');
        setFormExample(first.example || '');
        setFormExampleTrans(first.exampleTranslation || '');
        if (first.topic) setFormTopic(first.topic);
        soundEngine.playPentatonicChime(3);
      }
    } catch (err: any) {
      notify.error(err.message || 'AI chưa phản hồi, bạn có thể nhập tay nhé.');
    } finally {
      setIsAutoFillingSingle(false);
    }
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWord.trim() || !formMeaning.trim()) {
      notify.warning('Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt.');
      return;
    }

    setIsSavingWord(true);
    try {
      if (editingWord) {
        const updated = await updateVocab(editingWord.id, {
          word: formWord,
          phonetic: formPhonetic,
          partOfSpeech: formPos,
          meaning: formMeaning,
          example: formExample,
          exampleTranslation: formExampleTrans,
          topic: formTopic.trim() || 'Tự động',
        });
        setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      } else {
        const created = await createVocab({
          word: formWord,
          phonetic: formPhonetic,
          partOfSpeech: formPos,
          meaning: formMeaning,
          example: formExample,
          exampleTranslation: formExampleTrans,
          topic: formTopic.trim() || 'Tự động',
        });
        setWords((prev) => [created, ...prev]);
      }
      soundEngine.playPentatonicChime(4);
      setIsWordModalOpen(false);
    } catch (err: any) {
      notify.error(err.message || 'Lỗi lưu từ vựng');
    } finally {
      setIsSavingWord(false);
    }
  };

  const handleDeleteWord = async (id: string) => {
    soundEngine.playSoftClick();
    await deleteVocab(id);
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  // Auto-Import Handlers
  const openImportModal = () => {
    soundEngine.playSoftClick();
    setImportText('');
    setImportImagePreview('');
    setExtractedDrafts([]);
    setImportTopic(selectedTopic !== 'all' ? selectedTopic : 'Tự động');
    setIsImportModalOpen(true);
  };

  const handleRunAutoExtract = async (overrideText?: string) => {
    const raw = (overrideText ?? importText).trim();
    if (!raw) {
      notify.warning('Vui lòng dán danh sách từ, đoạn văn tiếng Anh hoặc chọn file.');
      return;
    }

    // Check if text already has structured "word, meaning" or "word - meaning" pairs
    const structured = parseStructuredVocabLines(raw, importTopic);
    if (structured && structured.length > 0) {
      soundEngine.playPentatonicChime(3);
      setExtractedDrafts(structured);
      return;
    }

    setIsExtracting(true);
    try {
      const drafts = await aiExtractVocab({ text: raw, topic: importTopic || 'Tự động' });
      if (drafts.length === 0) {
        notify.warning('Chưa tìm thấy từ vựng phù hợp trong nội dung bạn nhập.');
      } else {
        soundEngine.playPentatonicChime(4);
      }
      setExtractedDrafts(drafts);
    } catch (err: any) {
      notify.error(err.message || 'Lỗi trích xuất tự động bằng AI.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify.warning('File văn bản quá lớn (tối đa 2MB). Vui lòng chia nhỏ danh sách từ.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    try {
      const text = await file.text();
      setImportText(text);
      setImportTab('text');
      await handleRunAutoExtract(text);
    } catch {
      notify.error('Không đọc được nội dung file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify.warning('Vui lòng chọn file ảnh (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      const compressedDataUrl = await compressImageDataUrl(rawDataUrl, 1400, 1400, 0.82);
      setImportImagePreview(compressedDataUrl);
      setIsExtracting(true);
      try {
        const drafts = await aiExtractVocab({
          imageBase64: compressedDataUrl,
          mimeType: 'image/jpeg',
          topic: importTopic || 'Tự động',
        });
        if (drafts.length === 0) {
          notify.warning('AI chưa đọc được từ vựng rõ ràng từ ảnh này.');
        } else {
          soundEngine.playPentatonicChime(4);
        }
        setExtractedDrafts(drafts);
      } catch (err: any) {
        notify.error(err.message || 'Lỗi đọc ảnh từ vựng.');
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSaveExtractedBatch = async () => {
    const selected = extractedDrafts.filter((d) => d.selected !== false && d.word.trim() && d.meaning.trim());
    if (selected.length === 0) {
      notify.warning('Chưa có từ nào được chọn để lưu.');
      return;
    }

    setIsSavingImport(true);
    try {
      const result = await bulkCreateVocab(selected);
      if (result.words?.length > 0) {
        setWords((prev) => [...result.words, ...prev]);
      }
      soundEngine.playPentatonicChime(5);
      setIsImportModalOpen(false);
      setExtractedDrafts([]);
      await notify.success(
        `Đã thêm ${result.insertedCount} từ mới vào kho học!` +
          (result.skippedCount > 0 ? ` (Bỏ qua ${result.skippedCount} từ trùng)` : '')
      );
    } catch (err: any) {
      notify.error(err.message || 'Lỗi lưu danh sách từ vựng.');
    } finally {
      setIsSavingImport(false);
    }
  };

  const getMasteryBadge = (level: number) => {
    if (level >= 4) return { label: 'Thuộc làu', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (level >= 2) return { label: 'Đang nhớ', cls: 'bg-sky-50 text-sky-700 border-sky-200' };
    if (level === 1) return { label: 'Mới ôn', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Từ mới', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  const surfaceCls = isDark
    ? 'bg-[#12151E] border-white/[0.08] text-slate-100'
    : 'bg-white border-slate-200/80 text-slate-900';

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4">
      {/* Top Stats & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        {/* Compact Stats Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${surfaceCls}`}>
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>{words.length} từ trong kho</span>
          </div>
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            dueWords.length > 0
              ? isDark
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-700'
              : surfaceCls
          }`}>
            <Brain className="w-3.5 h-3.5 text-rose-500" />
            <span>{dueWords.length} từ cần Review</span>
          </div>
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${surfaceCls}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{masteredCount} đã nhớ vững</span>
          </div>
        </div>

        {/* 2 Primary Modes + Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`inline-flex items-center p-0.5 rounded-xl border text-xs font-bold ${
              isDark ? 'bg-[#12151E] border-white/[0.08]' : 'bg-slate-200/70 border-slate-200'
            }`}
          >
            <button
              onClick={() => {
                soundEngine.playSoftClick();
                setMode('learn');
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'learn'
                  ? isDark
                    ? 'bg-[#1DB954] text-[#090A0F]'
                    : 'bg-white text-slate-900 shadow-2xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Học & Kho Từ</span>
            </button>
            <button
              onClick={() => {
                soundEngine.playSoftClick();
                setMode('review');
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'review'
                  ? isDark
                    ? 'bg-[#1DB954] text-[#090A0F]'
                    : 'bg-white text-slate-900 shadow-2xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Review ({dueWords.length})</span>
            </button>
          </div>

          <button
            onClick={openImportModal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Import Tự Động</span>
          </button>

          <button
            onClick={openAddWordModal}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all ${surfaceCls}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Từ</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODE 1: LEARN & VOCAB LIBRARY                                         */}
      {/* ===================================================================== */}
      {mode === 'learn' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-3.5">
          {/* Search, Topic Filters & Grid/Deck Toggle */}
          <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 ${surfaceCls}`}>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm từ tiếng Anh hoặc nghĩa..."
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none transition-all ${
                    isDark
                      ? 'bg-[#181C28] border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-indigo-400'
                  }`}
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setSelectedTopic('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
                    selectedTopic === 'all'
                      ? 'bg-indigo-600 text-white'
                      : isDark
                      ? 'bg-white/5 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Tất cả</span>
                  <span className="opacity-75 text-[10px]">({words.length})</span>
                </button>
                {topics.map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setSelectedTopic(tp)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 cursor-pointer flex items-center gap-1 border ${
                      selectedTopic === tp
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : isDark
                        ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        : 'bg-slate-100 border-transparent text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tp}</span>
                    <span className="opacity-70 text-[10px]">({topicCounts[tp] || 0})</span>
                  </button>
                ))}
                {uncategorizedCount > 0 && (
                  <button
                    type="button"
                    disabled={isAutoTagging}
                    onClick={handleAutoTagAll}
                    title="Tự động phân loại các từ đang ở mục Chung / Tự động sang chủ đề chuẩn"
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 cursor-pointer flex items-center gap-1 border ${
                      isDark
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/25'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    } disabled:opacity-50`}
                  >
                    {isAutoTagging ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    <span>Tự chia Tag ({uncategorizedCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Big Centered Study Popup Trigger */}
            <button
              type="button"
              disabled={filteredWords.length === 0}
              onClick={() => openStudyPopupAt((safePage - 1) * pageSize)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark
                  ? 'bg-[#1DB954]/15 border-[#1DB954]/35 text-[#1DB954] hover:bg-[#1DB954]/25'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              }`}
              title="Mở cửa sổ học lật thẻ lớn ở giữa màn hình"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Học Thẻ Lớn (Popup)</span>
            </button>
          </div>

          {/* Empty State */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : filteredWords.length === 0 ? (
            <div className={`flex-1 rounded-2xl border p-8 flex flex-col items-center justify-center text-center space-y-4 ${surfaceCls}`}>
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-extrabold text-base">Kho từ vựng của bạn đang trống</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Chỉ cần dán một danh sách từ, một đoạn văn tiếng Anh, file <code>.csv</code> hoặc ảnh chụp trang sách — <strong>Gencoore AI</strong> sẽ tự động điền phiên âm IPA, nghĩa tiếng Việt và ví dụ cho bạn.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={openImportModal}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Import Tự Động Ngay</span>
                </button>
                <button
                  onClick={openAddWordModal}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer ${surfaceCls}`}
                >
                  + Thêm thủ công
                </button>
              </div>
            </div>
          ) : (
            /* GRID OF VOCAB CARDS + PAGINATION */
            <div className="space-y-4 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {paginatedWords.map((item) => {
                  const isFlipped = Boolean(flippedIds[item.id]);
                  const badge = getMasteryBadge(item.srsLevel);
                  const topicLabel = item.topic?.trim() || 'Chung';

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        soundEngine.playSoftClick();
                        setFlippedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                      }}
                      className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all hover:-translate-y-0.5 select-none ${
                        isDark
                          ? 'bg-[#12151E] border-white/[0.08] hover:border-indigo-400/40'
                          : 'bg-white border-slate-200/80 hover:border-indigo-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTopic(topicLabel);
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border truncate cursor-pointer hover:opacity-80 ${getTopicBadgeCls(
                            topicLabel
                          )}`}
                          title={`Lọc theo chủ đề ${topicLabel}`}
                        >
                          {topicLabel}
                        </button>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-extrabold tracking-tight">{item.word}</h3>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mt-0.5">
                            {item.partOfSpeech && (
                              <span className="text-indigo-500 font-bold">{item.partOfSpeech}</span>
                            )}
                            {item.phonetic && <span>{item.phonetic}</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakEnglishWord(item.word, false);
                          }}
                          className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
                            isDark
                              ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/30'
                              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                          }`}
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isFlipped ? (
                        <div className={`pt-2 mt-2 border-t space-y-1 animate-in fade-in duration-150 ${
                          isDark ? 'border-white/10' : 'border-slate-100'
                        }`}>
                          <p className="text-xs font-bold text-emerald-600">{item.meaning}</p>
                          {item.example && (
                            <p className="text-[11px] text-slate-500 italic leading-relaxed">
                              &ldquo;{item.example}&rdquo;
                            </p>
                          )}
                          {item.exampleTranslation && (
                            <p className="text-[10.5px] text-slate-400">{item.exampleTranslation}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 pt-1 italic">Chạm thẻ để xem nghĩa...</p>
                      )}
                    </div>

                    <div
                      className={`pt-2 border-t flex items-center justify-between text-[10.5px] text-slate-400 ${
                        isDark ? 'border-white/[0.06]' : 'border-slate-100'
                      }`}
                    >
                      <span>Ôn: {item.reviewCount || 0} lần</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const idx = filteredWords.findIndex((w) => w.id === item.id);
                            openStudyPopupAt(idx >= 0 ? idx : 0);
                          }}
                          className={`p-1 rounded-lg cursor-pointer ${
                            isDark
                              ? 'hover:bg-white/10 hover:text-emerald-400'
                              : 'hover:bg-indigo-50 hover:text-indigo-600'
                          }`}
                          title="Mở popup học thẻ lớn"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditWordModal(item);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100 hover:text-indigo-600 cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWord(item.id);
                          }}
                          className="p-1 rounded-lg hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Xóa từ"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>

              {/* Pagination Controls */}
              {filteredWords.length > 0 && (
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs ${
                    isDark
                      ? 'bg-[#12151E] border-white/[0.08] text-slate-300'
                      : 'bg-white border-slate-200/80 text-slate-600 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium">
                      Hiển thị{' '}
                      <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                        {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredWords.length)}
                      </strong>{' '}
                      / <strong className={isDark ? 'text-white' : 'text-slate-900'}>{filteredWords.length}</strong> từ
                    </span>

                    <label className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400">Mỗi trang:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className={`px-2 py-1 rounded-lg border font-bold outline-none cursor-pointer ${
                          isDark
                            ? 'bg-[#181C28] border-white/10 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value={8}>8 từ</option>
                        <option value={12}>12 từ</option>
                        <option value={24}>24 từ</option>
                        <option value={48}>48 từ</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => {
                        soundEngine.playSoftClick();
                        setCurrentPage((p) => Math.max(1, p - 1));
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDark
                          ? 'bg-[#181C28] border-white/10 hover:bg-white/10 text-slate-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Trước</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - safePage) <= 1
                      )
                      .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                        if (idx > 0 && page - arr[idx - 1] > 1) {
                          acc.push('ellipsis');
                        }
                        acc.push(page);
                        return acc;
                      }, [])
                      .map((entry, idx) =>
                        entry === 'ellipsis' ? (
                          <span key={`el-${idx}`} className="px-1.5 text-slate-400 select-none">
                            …
                          </span>
                        ) : (
                          <button
                            key={entry}
                            type="button"
                            onClick={() => {
                              soundEngine.playSoftClick();
                              setCurrentPage(entry);
                            }}
                            className={`min-w-[30px] h-7 px-2 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                              safePage === entry
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : isDark
                                ? 'hover:bg-white/10 text-slate-300'
                                : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            {entry}
                          </button>
                        )
                      )}

                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => {
                        soundEngine.playSoftClick();
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDark
                          ? 'bg-[#181C28] border-white/10 hover:bg-white/10 text-slate-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="hidden sm:inline">Sau</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODE 2: DAILY REVIEW (SRS FLASHCARD + QUICK QUIZ)                     */}
      {/* ===================================================================== */}
      {mode === 'review' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          {/* Review Toolbar */}
          <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${surfaceCls}`}>
            <div className="flex items-center gap-2">
              <div className={`inline-flex p-0.5 rounded-xl border text-xs font-bold ${
                isDark ? 'bg-[#181C28] border-white/10' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => {
                    setReviewStyle('flashcard');
                    setShowReviewAnswer(false);
                  }}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${
                    reviewStyle === 'flashcard' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Lật Thẻ SRS
                </button>
                <button
                  onClick={() => {
                    setReviewStyle('quiz');
                    setQuizSelectedIdx(null);
                  }}
                  className={`px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
                    reviewStyle === 'quiz' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Trắc Nghiệm</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <select
                value={reviewTopic}
                onChange={(e) => startReviewSession(reviewScope, e.target.value)}
                className={`px-3 py-1.5 rounded-xl border font-bold outline-none cursor-pointer ${surfaceCls}`}
                title="Chọn chủ đề ôn tập"
              >
                <option value="all">Tất cả chủ đề ({words.length})</option>
                {topics.map((tp) => (
                  <option key={tp} value={tp}>
                    {tp} ({topicCounts[tp] || 0})
                  </option>
                ))}
              </select>
              <button
                onClick={() => startReviewSession(reviewScope === 'due' ? 'all' : 'due', reviewTopic)}
                className={`px-3 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1.5 ${surfaceCls}`}
              >
                <RefreshCw className="w-3 h-3 text-indigo-500" />
                <span>
                  {reviewScope === 'due'
                    ? `Đang ôn từ đến hạn (${dueWords.length})`
                    : `Đang ôn toàn bộ (${reviewTopic === 'all' ? words.length : topicCounts[reviewTopic] || 0})`}
                </span>
              </button>
            </div>
          </div>

          {/* Review Stage */}
          {words.length === 0 ? (
            <div className={`flex-1 rounded-2xl border p-8 flex flex-col items-center justify-center text-center space-y-3 ${surfaceCls}`}>
              <p className="text-sm font-bold">Chưa có từ vựng nào để ôn tập</p>
              <button
                onClick={() => setMode('learn')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
              >
                Quay lại thêm / import từ vựng
              </button>
            </div>
          ) : !currentReviewWord ? (
            <div className={`flex-1 rounded-2xl border p-8 flex flex-col items-center justify-center text-center space-y-4 ${surfaceCls}`}>
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold">Hoàn thành lượt Review!</h3>
                <p className="text-xs text-slate-500">
                  {sessionReviewedCount > 0
                    ? `Bạn vừa ôn xong ${sessionReviewedCount} lượt từ vựng. Trí nhớ của bạn đã được củng cố!`
                    : 'Hôm nay chưa có từ nào đến hạn cần ôn lại.'}
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                <button
                  onClick={() => startReviewSession('all')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  Ôn tập tự do toàn bộ kho ({words.length} từ)
                </button>
                <button
                  onClick={() => setMode('learn')}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer ${surfaceCls}`}
                >
                  Về Kho Từ Vựng
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <div className="w-full max-w-lg space-y-4">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Tiến độ phiên ôn</span>
                    <span>
                      {Math.min(reviewPos + 1, reviewQueue.length)} / {reviewQueue.length}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{
                        width: `${Math.round(((reviewPos + 1) / Math.max(1, reviewQueue.length)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Flashcard Review Card */}
                {reviewStyle === 'flashcard' ? (
                  <div className={`rounded-3xl border p-6 sm:p-8 shadow-lg space-y-5 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {currentReviewWord.topic || 'Chung'}
                      </span>
                      <button
                        type="button"
                        onClick={() => speakEnglishWord(currentReviewWord.word, false)}
                        className="px-3 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Nghe</span>
                      </button>
                    </div>

                    <div className="text-center py-4 space-y-2">
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                        {currentReviewWord.word}
                      </h2>
                      <p className="text-xs font-mono text-slate-400">
                        {currentReviewWord.partOfSpeech ? `(${currentReviewWord.partOfSpeech}) ` : ''}
                        {currentReviewWord.phonetic}
                      </p>
                    </div>

                    {!showReviewAnswer ? (
                      <button
                        onClick={() => {
                          soundEngine.playSoftClick();
                          setShowReviewAnswer(true);
                        }}
                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all"
                      >
                        Hiện nghĩa & ví dụ
                      </button>
                    ) : (
                      <div className="space-y-4 animate-in fade-in duration-150">
                        <div className={`p-4 rounded-2xl border text-center space-y-2 ${
                          isDark ? 'bg-[#181C28] border-white/10' : 'bg-slate-50 border-slate-200/80'
                        }`}>
                          <p className="text-xl font-extrabold text-emerald-600">
                            {currentReviewWord.meaning}
                          </p>
                          {currentReviewWord.example && (
                            <p className="text-xs italic text-slate-500">
                              &ldquo;{currentReviewWord.example}&rdquo;
                            </p>
                          )}
                          {currentReviewWord.exampleTranslation && (
                            <p className="text-[11px] text-slate-400">
                              {currentReviewWord.exampleTranslation}
                            </p>
                          )}
                        </div>

                        {/* 4 SRS Rating Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            disabled={isSubmittingReview}
                            onClick={() => handleRateReview('again')}
                            className="py-2.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer flex flex-col items-center"
                          >
                            <span>Quên</span>
                            <span className="text-[9.5px] opacity-75">Ôn lại ngay</span>
                          </button>
                          <button
                            disabled={isSubmittingReview}
                            onClick={() => handleRateReview('hard')}
                            className="py-2.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold cursor-pointer flex flex-col items-center"
                          >
                            <span>Mờ mờ</span>
                            <span className="text-[9.5px] opacity-75">1 ngày</span>
                          </button>
                          <button
                            disabled={isSubmittingReview}
                            onClick={() => handleRateReview('good')}
                            className="py-2.5 px-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold cursor-pointer flex flex-col items-center"
                          >
                            <span>Nhớ tốt</span>
                            <span className="text-[9.5px] opacity-75">3–14 ngày</span>
                          </button>
                          <button
                            disabled={isSubmittingReview}
                            onClick={() => handleRateReview('easy')}
                            className="py-2.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer flex flex-col items-center"
                          >
                            <span>Quá dễ</span>
                            <span className="text-[9.5px] opacity-75">Giãn xa</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 4-CHOICE QUIZ REVIEW */
                  <div className={`rounded-3xl border p-6 sm:p-8 shadow-lg space-y-5 ${surfaceCls}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
                        Chọn nghĩa đúng
                      </span>
                      <button
                        type="button"
                        onClick={() => speakEnglishWord(currentReviewWord.word, false)}
                        className="px-3 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Phát âm</span>
                      </button>
                    </div>

                    <div className="text-center py-3 space-y-1">
                      <h2 className="text-3xl font-black">{currentReviewWord.word}</h2>
                      {currentReviewWord.phonetic && (
                        <p className="text-xs font-mono text-slate-400">{currentReviewWord.phonetic}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      {quizChoices.map((choice, idx) => {
                        const isPicked = quizSelectedIdx === idx;
                        const answered = quizSelectedIdx !== null;
                        let btnStyle = isDark
                          ? 'bg-[#181C28] border-white/10 hover:border-indigo-400'
                          : 'bg-slate-50 border-slate-200 hover:border-indigo-300';

                        if (answered) {
                          if (choice.isCorrect) {
                            btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800';
                          } else if (isPicked && !choice.isCorrect) {
                            btnStyle = 'bg-rose-50 border-rose-400 text-rose-800';
                          }
                        }

                        return (
                          <button
                            key={idx}
                            disabled={answered || isSubmittingReview}
                            onClick={() => {
                              setQuizSelectedIdx(idx);
                              setTimeout(() => {
                                handleRateReview(choice.isCorrect ? 'good' : 'again');
                              }, 650);
                            }}
                            className={`w-full p-3.5 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{choice.meaning}</span>
                            {answered && choice.isCorrect && <Check className="w-4 h-4 text-emerald-600" />}
                            {answered && isPicked && !choice.isCorrect && <X className="w-4 h-4 text-rose-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD / EDIT SINGLE VOCAB WORD                                 */}
      {/* ===================================================================== */}
      {isWordModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm">
                {editingWord ? 'Chỉnh Sửa Từ Vựng' : 'Thêm Từ Vựng Mới'}
              </h3>
              <button
                onClick={() => setIsWordModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWord} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-600">Từ tiếng Anh *</label>
                  <button
                    type="button"
                    disabled={isAutoFillingSingle}
                    onClick={handleAiAutoFillSingle}
                    className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isAutoFillingSingle ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>AI Điền Nhanh IPA & Nghĩa</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formWord}
                  onChange={(e) => setFormWord(e.target.value)}
                  placeholder="VD: resilient"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Phiên âm IPA</label>
                  <input
                    type="text"
                    value={formPhonetic}
                    onChange={(e) => setFormPhonetic(e.target.value)}
                    placeholder="/rɪˈzɪl.jənt/"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Loại từ</label>
                  <input
                    type="text"
                    value={formPos}
                    onChange={(e) => setFormPos(e.target.value)}
                    placeholder="adj, noun, verb..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nghĩa tiếng Việt *</label>
                <input
                  type="text"
                  required
                  value={formMeaning}
                  onChange={(e) => setFormMeaning(e.target.value)}
                  placeholder="VD: Kiên cường, mau phục hồi"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Câu ví dụ</label>
                <input
                  type="text"
                  value={formExample}
                  onChange={(e) => setFormExample(e.target.value)}
                  placeholder="VD: She remained resilient despite setbacks."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Dịch ví dụ</label>
                  <input
                    type="text"
                    value={formExampleTrans}
                    onChange={(e) => setFormExampleTrans(e.target.value)}
                    placeholder="Cô ấy vẫn kiên cường..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Chủ đề / Bộ thẻ</label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="Để 'Tự động' để AI tự phân loại..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingWord}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSavingWord ? 'Đang lưu...' : 'Lưu Từ Vựng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: SMART AUTO-IMPORT (TEXT/PARAGRAPH, CSV/TXT, IMAGE OCR)       */}
      {/* ===================================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Import Từ Vựng Tự Động</h3>
                  <p className="text-[11px] text-slate-500">
                    Dán danh sách từ, đoạn văn, file CSV/TXT hoặc ảnh chụp — AI tự động điền đầy đủ nghĩa & IPA
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Source Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setImportTab('text')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                    importTab === 'text' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Dán Chữ / Đoạn Văn</span>
                </button>
                <button
                  onClick={() => setImportTab('file')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                    importTab === 'file' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>File CSV / TXT</span>
                </button>
                <button
                  onClick={() => setImportTab('image')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                    importTab === 'image' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Chụp / Tải Ảnh</span>
                </button>
              </div>

              {/* Topic input */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 shrink-0">Gắn nhãn chủ đề:</label>
                <input
                  type="text"
                  value={importTopic}
                  onChange={(e) => setImportTopic(e.target.value)}
                  placeholder="Để 'Tự động' để hệ thống tự bắt key chia tag theo từng từ..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              {importTab === 'text' && (
                <div className="space-y-2.5">
                  <textarea
                    rows={5}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={`Bạn có thể nhập theo bất kỳ kiểu nào:\n• Danh sách từ: resilient, procrastinate, streamline\n• Dán cả đoạn bài báo tiếng Anh (AI tự lọc từ hay)\n• Hoặc dạng: word - nghĩa tiếng Việt\n• Hoặc yêu cầu AI: "10 từ vựng tiếng Anh chủ đề phỏng vấn IT"`}
                    className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs leading-relaxed outline-none focus:border-indigo-500 resize-none"
                  />
                  <button
                    type="button"
                    disabled={isExtracting || !importText.trim()}
                    onClick={() => handleRunAutoExtract()}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI đang bóc tách từ vựng, phiên âm & ví dụ...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Tự Động Trích Xuất Từ Vựng</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {importTab === 'file' && (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-8 text-center space-y-2 cursor-pointer bg-slate-50/70 hover:bg-indigo-50/30 transition-all"
                  >
                    <Upload className="w-7 h-7 text-indigo-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      Bấm để chọn file <code>.csv</code> hoặc <code>.txt</code>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Hỗ trợ file xuất từ Quizlet, Excel, Google Sheets (hoặc file chỉ có danh sách từ để AI tự dịch).
                    </p>
                  </div>
                </div>
              )}

              {importTab === 'image' && (
                <div className="space-y-3">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-6 text-center space-y-2 cursor-pointer bg-slate-50/70 hover:bg-indigo-50/30 transition-all"
                  >
                    {importImagePreview ? (
                      <img
                        src={importImagePreview}
                        alt="Uploaded vocab source"
                        className="max-h-40 mx-auto rounded-xl object-contain"
                      />
                    ) : (
                      <>
                        <ImageIcon className="w-7 h-7 text-indigo-500 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">
                          Chọn ảnh trang sách, ghi chú hoặc ảnh chụp màn hình
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Gencoore AI Vision sẽ tự đọc ảnh và nhặt ra các từ vựng đáng học.
                        </p>
                      </>
                    )}
                  </div>
                  {isExtracting && (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI đang đọc ảnh và tạo thẻ từ vựng...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Extracted Words */}
              {extractedDrafts.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800">
                      Xem trước ({extractedDrafts.filter((d) => d.selected !== false).length}/{extractedDrafts.length} từ được chọn)
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtractedDrafts([])}
                      className="text-[11px] text-rose-500 font-bold hover:underline cursor-pointer"
                    >
                      Xóa danh sách
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {extractedDrafts.map((draft, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                          draft.selected === false
                            ? 'bg-slate-50 border-slate-200 opacity-50'
                            : 'bg-indigo-50/40 border-indigo-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={draft.selected !== false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setExtractedDrafts((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, selected: checked } : item))
                            );
                          }}
                          className="mt-1 rounded border-slate-300 text-indigo-600"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900">{draft.word}</span>
                            {draft.topic && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
                                {draft.topic}
                              </span>
                            )}
                            {draft.partOfSpeech && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-slate-200 text-indigo-600">
                                {draft.partOfSpeech}
                              </span>
                            )}
                            {draft.phonetic && (
                              <span className="text-[11px] font-mono text-slate-500">{draft.phonetic}</span>
                            )}
                          </div>
                          <p className="font-semibold text-emerald-700">{draft.meaning}</p>
                          {draft.example && (
                            <p className="text-[11px] text-slate-500 italic">&ldquo;{draft.example}&rdquo;</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70"
              >
                Đóng
              </button>
              {extractedDrafts.length > 0 && (
                <button
                  type="button"
                  disabled={isSavingImport}
                  onClick={handleSaveExtractedBatch}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingImport ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Lưu {extractedDrafts.filter((d) => d.selected !== false).length} Từ Vào Kho</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: BIG CENTERED STUDY FLASHCARD POPUP (BLURRED BACKDROP)        */}
      {/* ===================================================================== */}
      {isStudyPopupOpen && filteredWords[deckIndex] && (() => {
        const card = filteredWords[deckIndex];
        const badge = getMasteryBadge(card.srsLevel || 0);
        const topicLabel = card.topic?.trim() || 'Chung';
        const progressPct = Math.round(((deckIndex + 1) / filteredWords.length) * 100);

        return (
          <div
            onClick={() => setIsStudyPopupOpen(false)}
            className="fixed inset-0 z-[115] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
                isDark
                  ? 'bg-[#12151E] border-white/10 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Top Progress Bar */}
              <div className={`h-1.5 w-full ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <div
                  className={`h-full transition-all duration-300 ${
                    isDark ? 'bg-[#1DB954]' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Popup Header */}
              <div
                className={`px-5 sm:px-7 py-4 border-b flex items-center justify-between gap-3 ${
                  isDark ? 'border-white/[0.08] bg-[#181C28]/70' : 'border-slate-100 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${getTopicBadgeCls(
                      topicLabel
                    )}`}
                  >
                    {topicLabel}
                  </span>
                  <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                      isDark ? 'bg-white/5 text-slate-300' : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    {deckIndex + 1} / {filteredWords.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditWordModal(card)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-200/70 text-slate-500'
                    }`}
                    title="Chỉnh sửa từ này"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStudyPopupOpen(false)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-200/70 text-slate-500'
                    }`}
                    title="Đóng (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Card Body (Click anywhere to flip) */}
              <div
                onClick={() => {
                  soundEngine.playSoftClick();
                  setIsDeckFlipped((prev) => !prev);
                }}
                className="min-h-[330px] sm:min-h-[380px] p-6 sm:p-10 flex flex-col justify-between cursor-pointer select-none"
              >
                <div />

                {!isDeckFlipped ? (
                  <div className="text-center space-y-5 animate-in fade-in duration-150">
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight break-words">
                      {card.word}
                    </h2>

                    <div className="flex items-center justify-center gap-2.5 text-sm font-mono">
                      {card.partOfSpeech && (
                        <span
                          className={`px-2.5 py-0.5 rounded-lg font-bold text-xs ${
                            isDark ? 'bg-white/10 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {card.partOfSpeech}
                        </span>
                      )}
                      {card.phonetic && (
                        <span className={isDark ? 'text-slate-300' : 'text-slate-500'}>
                          {card.phonetic}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakEnglishWord(card.word, false);
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/35 border border-indigo-400/30'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Phát âm chuẩn (S)</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakEnglishWord(card.word, true);
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        Đọc chậm
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-extrabold uppercase tracking-wider ${
                          isDark ? 'text-indigo-300' : 'text-indigo-600'
                        }`}
                      >
                        {card.word}
                      </span>
                      {card.phonetic && (
                        <span className="text-xs font-mono text-slate-400">{card.phonetic}</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakEnglishWord(card.word, false);
                        }}
                        className={`p-1.5 rounded-full cursor-pointer ${
                          isDark ? 'hover:bg-white/10 text-indigo-300' : 'hover:bg-indigo-50 text-indigo-600'
                        }`}
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3
                      className={`text-2xl sm:text-4xl font-extrabold leading-snug ${
                        isDark ? 'text-[#1DB954]' : 'text-emerald-600'
                      }`}
                    >
                      {card.meaning}
                    </h3>

                    {card.example && (
                      <div
                        className={`p-4 sm:p-5 rounded-2xl text-left space-y-1.5 border max-w-xl mx-auto ${
                          isDark
                            ? 'bg-[#181C28] border-white/10'
                            : 'bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold italic leading-relaxed">
                            &ldquo;{card.example}&rdquo;
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakEnglishWord(card.example || '', false);
                            }}
                            className={`p-1.5 rounded-xl shrink-0 cursor-pointer ${
                              isDark
                                ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/35'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
                            }`}
                            title="Nghe câu ví dụ"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        {card.exampleTranslation && (
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {card.exampleTranslation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 pt-4">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>
                    {isDeckFlipped
                      ? 'Chạm thẻ để quay về mặt từ vựng'
                      : 'Chạm thẻ hoặc bấm Space để xem nghĩa & ví dụ'}
                  </span>
                </div>
              </div>

              {/* Popup Footer Controls */}
              <div
                className={`px-5 sm:px-7 py-4 border-t flex flex-col gap-2.5 ${
                  isDark ? 'border-white/[0.08] bg-[#181C28]/70' : 'border-slate-100 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setIsDeckFlipped(false);
                      setDeckIndex((prev) => (prev - 1 + filteredWords.length) % filteredWords.length);
                    }}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      isDark
                        ? 'bg-[#12151E] border-white/10 hover:bg-white/10 text-white'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Từ trước</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setIsDeckFlipped((prev) => !prev);
                    }}
                    className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-sm transition-transform active:scale-95 ${
                      isDark
                        ? 'bg-[#1DB954] text-[#090A0F] hover:brightness-110'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{isDeckFlipped ? 'Xem mặt từ' : 'Lật xem nghĩa'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setIsDeckFlipped(false);
                      setDeckIndex((prev) => (prev + 1) % filteredWords.length);
                    }}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      isDark
                        ? 'bg-[#12151E] border-white/10 hover:bg-white/10 text-white'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>Từ tiếp</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <p className="hidden sm:block text-center text-[10.5px] text-slate-400">
                  Phím tắt: <strong>← / →</strong> chuyển từ • <strong>Space</strong> lật thẻ •{' '}
                  <strong>S</strong> phát âm • <strong>Esc</strong> đóng
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

