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
  const [learnLayout, setLearnLayout] = useState<'grid' | 'deck'>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});

  // Single Flashcard Deck state (in Learn Deck mode)
  const [deckIndex, setDeckIndex] = useState(0);
  const [isDeckFlipped, setIsDeckFlipped] = useState(false);

  // Review Mode State
  const [reviewStyle, setReviewStyle] = useState<'flashcard' | 'quiz'>('flashcard');
  const [reviewScope, setReviewScope] = useState<'due' | 'all'>('due');
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
  const [formTopic, setFormTopic] = useState('Chung');
  const [isAutoFillingSingle, setIsAutoFillingSingle] = useState(false);
  const [isSavingWord, setIsSavingWord] = useState(false);

  // Auto-Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'text' | 'file' | 'image'>('text');
  const [importText, setImportText] = useState('');
  const [importTopic, setImportTopic] = useState('Chung');
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

  const topics = useMemo(() => {
    const set = new Set<string>();
    words.forEach((w) => {
      if (w.topic?.trim()) set.add(w.topic.trim());
    });
    return Array.from(set);
  }, [words]);

  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (selectedTopic !== 'all' && w.topic !== selectedTopic) return false;
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

  // Keep deck index bounded
  useEffect(() => {
    if (deckIndex >= filteredWords.length) {
      setDeckIndex(0);
      setIsDeckFlipped(false);
    }
  }, [filteredWords.length, deckIndex]);

  // Build Review Queue when entering Review mode or switching scope
  const startReviewSession = (scope: 'due' | 'all' = reviewScope) => {
    const base = scope === 'due' ? dueWords : filteredWords.length > 0 ? filteredWords : words;
    const shuffled = [...base].sort(() => Math.random() - 0.5);
    setReviewScope(scope);
    setReviewQueue(shuffled);
    setReviewPos(0);
    setShowReviewAnswer(false);
    setQuizSelectedIdx(null);
    setSessionReviewedCount(0);
  };

  useEffect(() => {
    if (mode === 'review') {
      startReviewSession(reviewScope);
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
    setFormTopic(selectedTopic !== 'all' ? selectedTopic : 'Chung');
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
    setFormTopic(item.topic || 'Chung');
    setIsWordModalOpen(true);
  };

  const handleAiAutoFillSingle = async () => {
    if (!formWord.trim()) {
      notify.warning('Hãy nhập từ tiếng Anh trước để AI điền giúp bạn.');
      return;
    }
    setIsAutoFillingSingle(true);
    try {
      const results = await aiExtractVocab({ text: formWord.trim(), topic: formTopic || 'Chung' });
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
          topic: formTopic || 'Chung',
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
          topic: formTopic || 'Chung',
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
    setImportTopic(selectedTopic !== 'all' ? selectedTopic : 'Chung');
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
      const drafts = await aiExtractVocab({ text: raw, topic: importTopic || 'Chung' });
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
          topic: importTopic || 'Từ ảnh',
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

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setSelectedTopic('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 cursor-pointer ${
                    selectedTopic === 'all'
                      ? 'bg-indigo-600 text-white'
                      : isDark
                      ? 'bg-white/5 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                {topics.map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setSelectedTopic(tp)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 cursor-pointer ${
                      selectedTopic === tp
                        ? 'bg-indigo-600 text-white'
                        : isDark
                        ? 'bg-white/5 text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tp}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid vs Deck toggle */}
            <div className={`inline-flex p-0.5 rounded-xl border text-[11px] font-bold shrink-0 ${
              isDark ? 'bg-[#181C28] border-white/10' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setLearnLayout('grid')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  learnLayout === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Danh sách thẻ
              </button>
              <button
                onClick={() => setLearnLayout('deck')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  learnLayout === 'deck' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Lật thẻ lớn
              </button>
            </div>
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
          ) : learnLayout === 'deck' ? (
            /* LARGE INTERACTIVE FLASHCARD DECK */
            <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-5">
              {(() => {
                const card = filteredWords[deckIndex];
                if (!card) return null;
                const badge = getMasteryBadge(card.srsLevel);

                return (
                  <div className="w-full max-w-lg space-y-4">
                    <div
                      onClick={() => {
                        soundEngine.playSoftClick();
                        setIsDeckFlipped(!isDeckFlipped);
                      }}
                      className={`min-h-[290px] rounded-3xl border p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all shadow-lg select-none ${
                        isDark
                          ? 'bg-[#12151E] border-white/10 hover:border-indigo-400/40'
                          : 'bg-white border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {card.topic || 'Chung'}
                        </span>
                        <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {!isDeckFlipped ? (
                        <div className="py-6 text-center space-y-3">
                          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{card.word}</h2>
                          <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                            {card.partOfSpeech && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                                {card.partOfSpeech}
                              </span>
                            )}
                            {card.phonetic && <span>{card.phonetic}</span>}
                          </div>
                          <div className="pt-2 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakEnglishWord(card.word, false);
                              }}
                              className="px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Phát âm</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakEnglishWord(card.word, true);
                              }}
                              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              Đọc chậm
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center space-y-3 animate-in fade-in duration-150">
                          <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">{card.word}</p>
                          <h3 className="text-2xl font-extrabold text-emerald-600">{card.meaning}</h3>
                          {card.example && (
                            <div className={`p-3.5 rounded-2xl text-left space-y-1 border ${
                              isDark ? 'bg-[#181C28] border-white/10' : 'bg-slate-50 border-slate-200/80'
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold italic">&ldquo;{card.example}&rdquo;</p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    speakEnglishWord(card.example || '', false);
                                  }}
                                  className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-500 shrink-0 cursor-pointer"
                                  title="Nghe câu ví dụ"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {card.exampleTranslation && (
                                <p className="text-[11px] text-slate-500">{card.exampleTranslation}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                        <RotateCw className="w-3 h-3" />
                        <span>{isDeckFlipped ? 'Chạm để quay về mặt từ' : 'Chạm thẻ để xem nghĩa & ví dụ'}</span>
                      </div>
                    </div>

                    {/* Deck Navigation */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setIsDeckFlipped(false);
                          setDeckIndex((prev) => (prev - 1 + filteredWords.length) % filteredWords.length);
                        }}
                        className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer ${surfaceCls}`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Trước</span>
                      </button>

                      <span className="text-xs font-mono font-bold text-slate-500">
                        {deckIndex + 1} / {filteredWords.length}
                      </span>

                      <button
                        onClick={() => {
                          setIsDeckFlipped(false);
                          setDeckIndex((prev) => (prev + 1) % filteredWords.length);
                        }}
                        className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer ${surfaceCls}`}
                      >
                        <span>Tiếp</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* GRID OF VOCAB CARDS */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-6">
              {filteredWords.map((item) => {
                const isFlipped = Boolean(flippedIds[item.id]);
                const badge = getMasteryBadge(item.srsLevel);

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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 truncate">
                        {item.topic || 'Chung'}
                      </span>
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

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => startReviewSession(reviewScope === 'due' ? 'all' : 'due')}
                className={`px-3 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1.5 ${surfaceCls}`}
              >
                <RefreshCw className="w-3 h-3 text-indigo-500" />
                <span>
                  {reviewScope === 'due'
                    ? `Đang ôn từ đến hạn (${dueWords.length})`
                    : `Đang ôn toàn bộ (${words.length})`}
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
                    placeholder="IELTS, IT, Chung..."
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
                  placeholder="VD: IELTS, IT & Dev, Giao tiếp..."
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
    </div>
  );
};

