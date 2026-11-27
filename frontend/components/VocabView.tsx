'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Minimize2,
  Bookmark,
  Highlighter,
  Download,
  Copy,
  PenLine,
  Send,
  BookMarked,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
  RotateCcw,
  Star,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { soundEngine } from '../lib/audio';
import { notify } from '../lib/notificationService';
import { compressImageDataUrl } from '../lib/imageUtils';
import { AppTheme } from '../lib/settingsStorage';
import {
  VocabItem,
  ReviewRating,
  ExtractedVocabDraft,
  getCachedVocab,
  getVocabDeckPosition,
  saveVocabDeckPosition,
  computeOptimisticReview,
  fetchVocab,
  createVocab,
  bulkCreateVocab,
  aiExtractVocab,
  reviewVocab,
  updateVocab,
  deleteVocab,
  clearAllVocab,
  autoTagExistingVocab,
  checkVocabSentence,
  SentenceCheckResult,
  lookupDictionary,
  DictionaryCategory,
  DictionaryEntry,
  sendEnglishTutorMessage,
  TutorChatMessage,
  parseStructuredVocabLines,
  parseVocabRowsMatrix,
  speakEnglishWord,
} from '../lib/vocabApi';

interface VocabViewProps {
  theme?: AppTheme;
  authUserId?: string;
}

export const VocabView: React.FC<VocabViewProps> = ({ theme = 'slate', authUserId }) => {
  const isDark = theme === 'midnight';
  const initialCachedWords = useMemo(() => getCachedVocab(authUserId), [authUserId]);

  const [words, setWords] = useState<VocabItem[]>(initialCachedWords);
  const [isLoading, setIsLoading] = useState(initialCachedWords.length === 0);

  // Main 3 Modes: Học & Kho Từ (learn), Đã Lưu (saved) & Review (review)
  const [mode, setMode] = useState<'learn' | 'saved' | 'review'>('learn');
  const [topicPopupName, setTopicPopupName] = useState<string | null>(null);
  const [isStudyPopupOpen, setIsStudyPopupOpen] = useState(false);

  // Topic Decks Filters & Pagination (for main Học & Kho Từ view)
  const [deckSearchQuery, setDeckSearchQuery] = useState('');
  const [deckFilter, setDeckFilter] = useState<'all' | 'has_due' | 'in_progress' | 'completed'>('all');
  const [deckSort, setDeckSort] = useState<'most_words' | 'most_due' | 'az' | 'progress_desc'>('most_words');
  const [deckPage, setDeckPage] = useState(1);
  const [deckPageSize, setDeckPageSize] = useState(8);

  // Word-level Filters & Pagination (for Đã Lưu & Topic Popup)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'new' | 'learning' | 'mastered'>('all');
  const [posFilter, setPosFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'due_first' | 'az' | 'za' | 'mastery_asc'>('newest');
  const [isMoreTopicsOpen, setIsMoreTopicsOpen] = useState(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [isAutoTagging, setIsAutoTagging] = useState(false);

  // Single Flashcard Deck state (in Learn Deck mode)
  const [deckIndex, setDeckIndex] = useState(0);
  const [isDeckFlipped, setIsDeckFlipped] = useState(false);

  // Sentence Making Practice state inside Study Popup
  const [isSentenceBoxOpen, setIsSentenceBoxOpen] = useState(false);
  const [userSentence, setUserSentence] = useState('');
  const [isCheckingSentence, setIsCheckingSentence] = useState(false);
  const [sentenceFeedback, setSentenceFeedback] = useState<SentenceCheckResult | null>(null);
  const [isSavingSentenceExample, setIsSavingSentenceExample] = useState(false);

  // Smart Dictionary Modal state
  const [isDictOpen, setIsDictOpen] = useState(false);
  const [dictQuery, setDictQuery] = useState('');
  const [dictCategory, setDictCategory] = useState<DictionaryCategory>('auto');
  const [isLookingUpDict, setIsLookingUpDict] = useState(false);
  const [dictResult, setDictResult] = useState<DictionaryEntry | null>(null);
  const [dictError, setDictError] = useState<string | null>(null);
  const [isSavingDictWord, setIsSavingDictWord] = useState(false);
  const dictRequestSeqRef = useRef(0);

type TutorHighlightColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

interface TutorPhraseHighlight {
  id: string;
  phrase: string;
  color: TutorHighlightColor;
}

interface SavedTutorNote {
  id: string;
  sourceMsgId?: string;
  title: string;
  replyEn?: string;
  explanationVi: string;
  highlights: TutorPhraseHighlight[];
  createdAt: string;
}

const TUTOR_NOTES_STORAGE_KEY = 'genncore_tutor_saved_notes_v1';

const TUTOR_HIGHLIGHT_PALETTE: Array<{
  id: TutorHighlightColor;
  label: string;
  swatch: string;
  lightCls: string;
  darkCls: string;
}> = [
  {
    id: 'yellow',
    label: 'Vàng',
    swatch: 'bg-[#FEF08A]',
    lightCls: 'bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]',
    darkCls: 'bg-amber-400/25 text-amber-200 border border-amber-400/40',
  },
  {
    id: 'pink',
    label: 'Hồng',
    swatch: 'bg-[#FFE4E6]',
    lightCls: 'bg-[#FFE4E6] text-[#E11D48] border border-[#0F172A]',
    darkCls: 'bg-rose-400/25 text-rose-200 border border-rose-400/40',
  },
  {
    id: 'blue',
    label: 'Xanh dương',
    swatch: 'bg-[#DBEAFE]',
    lightCls: 'bg-[#DBEAFE] text-[#1D4ED8] border border-[#0F172A]',
    darkCls: 'bg-sky-400/25 text-sky-200 border border-sky-400/40',
  },
  {
    id: 'green',
    label: 'Xanh lá',
    swatch: 'bg-[#DCFCE7]',
    lightCls: 'bg-[#DCFCE7] text-[#15803D] border border-[#0F172A]',
    darkCls: 'bg-emerald-400/25 text-emerald-200 border border-emerald-400/40',
  },
  {
    id: 'purple',
    label: 'Tím',
    swatch: 'bg-[#F3E8FF]',
    lightCls: 'bg-[#F3E8FF] text-[#7E22CE] border border-[#0F172A]',
    darkCls: 'bg-purple-400/25 text-purple-200 border border-purple-400/40',
  },
];

  // Floating Cute IELTS 8.0+ English Tutor Chatbot state
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [isTutorExpanded, setIsTutorExpanded] = useState(false);
  const [tutorViewMode, setTutorViewMode] = useState<'chat' | 'saved'>('chat');
  const [savedTutorNotes, setSavedTutorNotes] = useState<SavedTutorNote[]>([]);
  const [activeHighlighterColor, setActiveHighlighterColor] = useState<TutorHighlightColor>('yellow');
  const [noteHighlightDrafts, setNoteHighlightDrafts] = useState<Record<string, string>>({});
  const [selectedPhraseByNote, setSelectedPhraseByNote] = useState<Record<string, string>>({});
  const [tutorInput, setTutorInput] = useState('');
  const [tutorPendingImage, setTutorPendingImage] = useState<string | null>(null);
  const [isTutorTyping, setIsTutorTyping] = useState(false);
  const [tutorMessages, setTutorMessages] = useState<TutorChatMessage[]>([
    {
      id: 'welcome-tutor',
      role: 'assistant',
      text: 'Chào bạn! Mình là **Gia sư IELTS 8.0+** của Genncore đây 🐱✨',
      replyEn: 'Hi there! Ready to practice English or master a new word together?',
      explanationVi:
        'Bất cứ lúc nào đang học từ mà thấy bí — bạn cứ nhắn tiếng Anh để luyện chat, hỏi ngữ pháp, hoặc **dán ảnh bài tập (Ctrl+V)** lên để mình giải thích giúp nhé!',
      bonusVocab: null,
    },
  ]);
  const tutorScrollRef = useRef<HTMLDivElement>(null);
  const tutorImageInputRef = useRef<HTMLInputElement>(null);

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
    const cached = getCachedVocab(authUserId);
    if (cached.length > 0) {
      setWords(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    try {
      const list = await fetchVocab(authUserId);
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
  const savedCount = useMemo(() => words.filter((w) => Boolean(w.isSaved)).length, [words]);

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
        light: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#0F172A]',
        dark: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
      },
      'Kinh doanh': {
        light: 'bg-[#FFE4E6] text-[#E11D48] border-[#0F172A]',
        dark: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
      },
      'Tài chính': {
        light: 'bg-[#DCFCE7] text-[#15803D] border-[#0F172A]',
        dark: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
      },
      'Cảm xúc & Tâm lý': {
        light: 'bg-[#FFE4E6] text-[#BE123C] border-[#0F172A]',
        dark: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
      },
      'Sức khỏe': {
        light: 'bg-[#DCFCE7] text-[#15803D] border-[#0F172A]',
        dark: 'bg-lime-500/15 text-lime-300 border-lime-400/25',
      },
      'Du lịch': {
        light: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#0F172A]',
        dark: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/25',
      },
      'IELTS & Học thuật': {
        light: 'bg-[#FEF08A] text-[#0F172A] border-[#0F172A]',
        dark: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
      },
      'Giao tiếp': {
        light: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#0F172A]',
        dark: 'bg-blue-500/15 text-blue-300 border-blue-400/25',
      },
      'Đời sống': {
        light: 'bg-[#FEF9C3] text-[#0F172A] border-[#0F172A]',
        dark: 'bg-teal-500/15 text-teal-300 border-teal-400/25',
      },
    };
    const palette = map[key] || {
      light: 'bg-[#FFE4E6] text-[#E11D48] border-[#0F172A]',
      dark: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
    };
    return isDark ? palette.dark : palette.light;
  };

  const partOfSpeechList = useMemo(() => {
    const set = new Set<string>();
    words.forEach((w) => {
      const pos = w.partOfSpeech?.trim();
      if (pos) set.add(pos);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [words]);

  const topTopics = useMemo(() => topics.slice(0, 4), [topics]);
  const extraTopics = useMemo(() => topics.slice(4), [topics]);

  const topicDecks = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, { total: number; mastered: number; due: number; previewWords: string[] }>();

    for (const w of words) {
      const tp = w.topic?.trim() || 'Chung';
      let bucket = map.get(tp);
      if (!bucket) {
        bucket = { total: 0, mastered: 0, due: 0, previewWords: [] };
        map.set(tp, bucket);
      }
      bucket.total++;
      if ((w.srsLevel || 0) >= 3) bucket.mastered++;
      if (!w.nextReviewAt || new Date(w.nextReviewAt).getTime() <= now) bucket.due++;
      if (bucket.previewWords.length < 3) bucket.previewWords.push(w.word);
    }

    return topics.map((tp) => {
      const b = map.get(tp) || { total: 0, mastered: 0, due: 0, previewWords: [] };
      return {
        topic: tp,
        total: b.total,
        mastered: b.mastered,
        due: b.due,
        pct: b.total > 0 ? Math.round((b.mastered / b.total) * 100) : 0,
        previewWords: b.previewWords,
      };
    });
  }, [topics, words]);

  const filteredTopicDecks = useMemo(() => {
    const q = deckSearchQuery.toLowerCase().trim();
    const list = topicDecks.filter((d) => {
      if (q && !d.topic.toLowerCase().includes(q)) return false;
      if (deckFilter === 'has_due' && d.due === 0) return false;
      if (deckFilter === 'in_progress' && d.mastered >= d.total) return false;
      if (deckFilter === 'completed' && d.pct < 100) return false;
      return true;
    });

    if (deckSort === 'most_due') {
      return [...list].sort((a, b) => b.due - a.due || b.total - a.total);
    }
    if (deckSort === 'az') {
      return [...list].sort((a, b) => a.topic.localeCompare(b.topic, 'vi'));
    }
    if (deckSort === 'progress_desc') {
      return [...list].sort((a, b) => b.pct - a.pct || b.total - a.total);
    }
    return list;
  }, [topicDecks, deckSearchQuery, deckFilter, deckSort]);

  const hasDeckFilters =
    deckSearchQuery.trim().length > 0 || deckFilter !== 'all' || deckSort !== 'most_words';

  const deckTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTopicDecks.length / deckPageSize)),
    [filteredTopicDecks.length, deckPageSize]
  );

  const safeDeckPage = Math.min(deckPage, deckTotalPages);

  const paginatedTopicDecks = useMemo(() => {
    const start = (safeDeckPage - 1) * deckPageSize;
    return filteredTopicDecks.slice(start, start + deckPageSize);
  }, [filteredTopicDecks, safeDeckPage, deckPageSize]);

  useEffect(() => {
    setDeckPage(1);
  }, [deckSearchQuery, deckFilter, deckSort, deckPageSize]);

  useEffect(() => {
    if (deckPage > deckTotalPages) {
      setDeckPage(deckTotalPages);
    }
  }, [deckPage, deckTotalPages]);

  const getTopicDeckStyle = (topicName: string) => {
    const palettes = [
      {
        lightCard: 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:bg-[#FFFDF7]',
        darkCard: 'bg-gradient-to-br from-rose-950/60 via-[#12151E] to-rose-900/20 border border-rose-500/25 hover:border-rose-400/60',
        icon: isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-[#FFE4E6] text-[#E11D48] border border-[#E11D48]/30',
        bar: isDark ? 'bg-rose-400' : 'bg-[#E11D48]',
        link: isDark ? 'text-rose-300' : 'text-[#E11D48]',
      },
      {
        lightCard: 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:bg-[#FFFDF7]',
        darkCard: 'bg-gradient-to-br from-sky-950/60 via-[#12151E] to-sky-900/20 border border-sky-500/25 hover:border-sky-400/60',
        icon: isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-[#DBEAFE] text-[#1D4ED8] border border-[#1D4ED8]/25',
        bar: isDark ? 'bg-sky-400' : 'bg-[#1D4ED8]',
        link: isDark ? 'text-sky-300' : 'text-[#E11D48]',
      },
      {
        lightCard: 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:bg-[#FFFDF7]',
        darkCard: 'bg-gradient-to-br from-emerald-950/60 via-[#12151E] to-emerald-900/20 border border-emerald-500/25 hover:border-emerald-400/60',
        icon: isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#DCFCE7] text-[#15803D] border border-[#15803D]/25',
        bar: isDark ? 'bg-[#1DB954]' : 'bg-[#16A34A]',
        link: isDark ? 'text-[#1DB954]' : 'text-[#E11D48]',
      },
      {
        lightCard: 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:bg-[#FFFDF7]',
        darkCard: 'bg-gradient-to-br from-amber-950/60 via-[#12151E] to-amber-900/20 border border-amber-500/25 hover:border-amber-400/60',
        icon: isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]/25',
        bar: isDark ? 'bg-amber-400' : 'bg-[#E11D48]',
        link: isDark ? 'text-amber-300' : 'text-[#E11D48]',
      },
      {
        lightCard: 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:bg-[#FFFDF7]',
        darkCard: 'bg-gradient-to-br from-rose-950/60 via-[#12151E] to-rose-900/20 border border-rose-500/25 hover:border-rose-400/60',
        icon: isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-[#FFE4E6] text-[#E11D48] border border-[#E11D48]/30',
        bar: isDark ? 'bg-rose-400' : 'bg-[#E11D48]',
        link: isDark ? 'text-rose-300' : 'text-[#E11D48]',
      },
      {
        lightCard: 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:bg-[#FFFDF7]',
        darkCard: 'bg-gradient-to-br from-amber-950/60 via-[#12151E] to-amber-900/20 border border-amber-500/25 hover:border-amber-400/60',
        icon: isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-[#FEF9C3] text-[#0F172A] border border-[#0F172A]/25',
        bar: isDark ? 'bg-amber-400' : 'bg-[#F59E0B]',
        link: isDark ? 'text-amber-300' : 'text-[#E11D48]',
      },
      {
        lightCard: 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:bg-[#FFFDF7]',
        darkCard: 'bg-gradient-to-br from-cyan-950/60 via-[#12151E] to-cyan-900/20 border border-cyan-500/25 hover:border-cyan-400/60',
        icon: isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-[#DBEAFE] text-[#1D4ED8] border border-[#1D4ED8]/25',
        bar: isDark ? 'bg-cyan-400' : 'bg-[#0284C7]',
        link: isDark ? 'text-cyan-300' : 'text-[#E11D48]',
      },
      {
        lightCard: 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:bg-[#FFFDF7]',
        darkCard: 'bg-gradient-to-br from-teal-950/60 via-[#12151E] to-teal-900/20 border border-teal-500/25 hover:border-teal-400/60',
        icon: isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-[#DCFCE7] text-[#15803D] border border-[#15803D]/25',
        bar: isDark ? 'bg-teal-400' : 'bg-[#16A34A]',
        link: isDark ? 'text-teal-300' : 'text-[#E11D48]',
      },
    ];

    const namedIndex: Record<string, number> = {
      'IT & Tech': 1,
      'Kinh doanh': 3,
      'Tài chính': 2,
      'Cảm xúc & Tâm lý': 4,
      'Sức khỏe': 2,
      'Du lịch': 6,
      'IELTS & Học thuật': 5,
      'Giao tiếp': 0,
      'Đời sống': 7,
    };

    let idx = namedIndex[topicName];
    if (idx === undefined) {
      let hash = 0;
      for (let i = 0; i < topicName.length; i++) {
        hash = (hash * 31 + topicName.charCodeAt(i)) >>> 0;
      }
      idx = hash % palettes.length;
    }

    const p = palettes[idx];
    return {
      card: isDark ? p.darkCard : p.lightCard,
      icon: p.icon,
      bar: p.bar,
      link: p.link,
    };
  };

  const resetDeckFilters = () => {
    soundEngine.playSoftClick();
    setDeckSearchQuery('');
    setDeckFilter('all');
    setDeckSort('most_words');
  };

  const openTopicPopup = (topicName: string) => {
    soundEngine.playSoftClick();
    setSearchQuery('');
    setStatusFilter('all');
    setPosFilter('all');
    setSortBy('newest');
    setSelectedTopic(topicName);
    setTopicPopupName(topicName);
    setIsMoreTopicsOpen(false);
    setTopicSearchQuery('');
  };

  const closeTopicPopup = () => {
    setTopicPopupName(null);
    setSelectedTopic('all');
    setSearchQuery('');
  };

  const filteredExtraTopics = useMemo(() => {
    const q = topicSearchQuery.toLowerCase().trim();
    if (!q) return extraTopics;
    return extraTopics.filter((tp) => tp.toLowerCase().includes(q));
  }, [extraTopics, topicSearchQuery]);

  const hasActiveFilters =
    selectedTopic !== 'all' ||
    statusFilter !== 'all' ||
    posFilter !== 'all' ||
    sortBy !== 'newest' ||
    searchQuery.trim().length > 0;

  const resetAllFilters = () => {
    soundEngine.playSoftClick();
    setSearchQuery('');
    setSelectedTopic('all');
    setStatusFilter('all');
    setPosFilter('all');
    setSortBy('newest');
    setIsMoreTopicsOpen(false);
    setTopicSearchQuery('');
  };

  const filteredWords = useMemo(() => {
    const now = Date.now();
    const filtered = words.filter((w) => {
      if (mode === 'saved' && !w.isSaved) return false;
      if (selectedTopic !== 'all' && (w.topic?.trim() || 'Chung') !== selectedTopic) return false;

      if (statusFilter === 'due') {
        if (w.nextReviewAt && new Date(w.nextReviewAt).getTime() > now) return false;
      } else if (statusFilter === 'new') {
        if ((w.srsLevel || 0) !== 0) return false;
      } else if (statusFilter === 'learning') {
        const lvl = w.srsLevel || 0;
        if (lvl < 1 || lvl > 2) return false;
      } else if (statusFilter === 'mastered') {
        if ((w.srsLevel || 0) < 3) return false;
      }

      if (posFilter !== 'all' && (w.partOfSpeech?.trim() || '') !== posFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hit =
          w.word.toLowerCase().includes(q) ||
          w.meaning.toLowerCase().includes(q) ||
          (w.topic || '').toLowerCase().includes(q) ||
          (w.example || '').toLowerCase().includes(q) ||
          (w.partOfSpeech || '').toLowerCase().includes(q) ||
          (w.phonetic || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    if (sortBy === 'az') {
      return [...filtered].sort((a, b) => a.word.localeCompare(b.word));
    }
    if (sortBy === 'za') {
      return [...filtered].sort((a, b) => b.word.localeCompare(a.word));
    }
    if (sortBy === 'mastery_asc') {
      return [...filtered].sort((a, b) => (a.srsLevel || 0) - (b.srsLevel || 0));
    }
    if (sortBy === 'due_first') {
      return [...filtered].sort((a, b) => {
        const ta = a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : 0;
        const tb = b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : 0;
        return ta - tb;
      });
    }
    return filtered;
  }, [words, mode, selectedTopic, statusFilter, posFilter, sortBy, searchQuery]);

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
    const savedPos = getVocabDeckPosition(selectedTopic, authUserId);
    setDeckIndex(savedPos);
    setIsDeckFlipped(false);
  }, [mode, selectedTopic, authUserId, statusFilter, posFilter, sortBy, searchQuery, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Keep deck index bounded and persist flashcard position per user ID & topic
  useEffect(() => {
    if (deckIndex >= filteredWords.length && filteredWords.length > 0) {
      setDeckIndex(0);
      setIsDeckFlipped(false);
      return;
    }
    if (isStudyPopupOpen || topicPopupName) {
      saveVocabDeckPosition(selectedTopic, deckIndex, authUserId);
    }
  }, [filteredWords.length, deckIndex, selectedTopic, authUserId, isStudyPopupOpen, topicPopupName]);

  const openStudyPopupAt = (index?: number) => {
    if (filteredWords.length === 0) return;
    soundEngine.playSoftClick();
    const targetIndex =
      typeof index === 'number' ? index : getVocabDeckPosition(selectedTopic, authUserId);
    const bounded = Math.max(0, Math.min(targetIndex, filteredWords.length - 1));
    setDeckIndex(bounded);
    setIsDeckFlipped(false);
    setUserSentence('');
    setSentenceFeedback(null);
    setIsStudyPopupOpen(true);
  };

  useEffect(() => {
    setUserSentence('');
    setSentenceFeedback(null);
  }, [deckIndex]);

  const handleCheckSentence = async (card: VocabItem) => {
    const trimmed = userSentence.trim();
    if (!trimmed) {
      notify.warning(`Hãy viết 1 câu tiếng Anh có chứa từ "${card.word}" nhé!`);
      return;
    }
    setIsCheckingSentence(true);
    setSentenceFeedback(null);
    try {
      const result = await checkVocabSentence({
        word: card.word,
        meaning: card.meaning,
        partOfSpeech: card.partOfSpeech,
        userSentence: trimmed,
      });
      setSentenceFeedback(result);
      soundEngine.playPentatonicChime(result.isCorrect ? 5 : 3);
    } catch (err: any) {
      notify.error(err.message || 'Không thể chấm câu lúc này.');
    } finally {
      setIsCheckingSentence(false);
    }
  };

  const handleSaveSentenceAsExample = async (card: VocabItem) => {
    if (!sentenceFeedback?.correctedSentence) return;
    setIsSavingSentenceExample(true);
    try {
      const updated = await updateVocab(card.id, {
        example: sentenceFeedback.correctedSentence,
        exampleTranslation: sentenceFeedback.naturalTranslationVi || card.exampleTranslation || '',
      });
      setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      soundEngine.playPentatonicChime(4);
      notify.success('Đã lưu câu này làm câu ví dụ của thẻ!');
    } catch (err: any) {
      notify.error(err.message || 'Không thể lưu câu ví dụ.');
    } finally {
      setIsSavingSentenceExample(false);
    }
  };

  const DICT_QUICK_CHIPS: Record<DictionaryCategory, string[]> = {
    auto: ['resilient', 'must have', 'break a leg', 'give up', 'put off'],
    word: ['ubiquitous', 'mitigate', 'procrastinate', 'eloquent', 'ambiguous'],
    modal_verb: ['must / have to', 'should / ought to', 'may / might', 'could have', 'had better'],
    idiom: ['piece of cake', 'under the weather', 'hit the nail on the head', 'bite the bullet', 'once in a blue moon'],
    phrasal_verb: ['give up', 'look forward to', 'put off', 'run out of', 'figure out'],
  };

  const handleLookupDictionary = async (overrideQuery?: string, overrideCat?: DictionaryCategory) => {
    const q = (overrideQuery ?? dictQuery).trim();
    const cat = overrideCat ?? dictCategory;
    if (!q) {
      notify.warning('Nhập từ, Modal Verb, Idiom hoặc Phrasal Verb để tra cứu.');
      return;
    }
    const seq = ++dictRequestSeqRef.current;
    setDictQuery(q);
    setDictCategory(cat);
    setDictError(null);
    setIsLookingUpDict(true);
    try {
      const entry = await lookupDictionary({ query: q, category: cat });
      if (seq !== dictRequestSeqRef.current) return;
      setDictResult(entry);
      if (entry.found !== false) {
        soundEngine.playPentatonicChime(4);
      }
    } catch (err: any) {
      if (seq !== dictRequestSeqRef.current) return;
      const errMsg = err?.message || 'Chưa tra cứu được lúc này.';
      setDictError(errMsg);
      setDictResult(null);
    } finally {
      if (seq === dictRequestSeqRef.current) {
        setIsLookingUpDict(false);
      }
    }
  };

  const handleSaveDictEntryToVocab = async () => {
    if (!dictResult || dictResult.found === false) return;
    setIsSavingDictWord(true);
    try {
      const existing = words.find((w) => w.word.toLowerCase() === dictResult.term.toLowerCase());
      if (existing) {
        const updated = await updateVocab(existing.id, { isSaved: true });
        setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        soundEngine.playPentatonicChime(5);
        notify.success(`Đã ghim "${dictResult.term}" vào mục Đã Lưu ⭐!`);
        return;
      }

      const firstEx = dictResult.examples?.[0];
      const created = await createVocab({
        word: dictResult.term,
        phonetic: dictResult.phonetic,
        partOfSpeech: dictResult.partOfSpeech,
        meaning: dictResult.shortMeaningVi || dictResult.detailedExplanationVi,
        example: firstEx?.en || '',
        exampleTranslation: firstEx?.vi || '',
        topic: dictResult.suggestedTopic || 'Đời sống',
        isSaved: true,
      });
      setWords((prev) => [created, ...prev]);
      soundEngine.playPentatonicChime(5);
      notify.success(`Đã lưu "${dictResult.term}" vào mục Đã Lưu ⭐!`);
    } catch (err: any) {
      notify.error(err.message || 'Không thể lưu từ này.');
    } finally {
      setIsSavingDictWord(false);
    }
  };

  useEffect(() => {
    if (isTutorOpen && tutorScrollRef.current) {
      tutorScrollRef.current.scrollTop = tutorScrollRef.current.scrollHeight;
    }
  }, [tutorMessages, isTutorOpen, isTutorTyping, tutorPendingImage]);

  const attachTutorImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify.warning('Vui lòng chọn hoặc dán file hình ảnh (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      if (!rawDataUrl) return;
      const compressed = await compressImageDataUrl(rawDataUrl, 1280, 1280, 0.82);
      setTutorPendingImage(compressed);
      soundEngine.playSoftClick();
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!isTutorOpen || tutorViewMode !== 'chat') return;
    const handleTutorPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            attachTutorImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handleTutorPaste);
    return () => window.removeEventListener('paste', handleTutorPaste);
  }, [isTutorOpen, tutorViewMode]);

  const handleSendTutorMessage = async (overrideMsg?: string) => {
    const msg = (overrideMsg ?? tutorInput).trim();
    const attachedImage = !overrideMsg ? tutorPendingImage : null;
    if ((!msg && !attachedImage) || isTutorTyping) return;

    const userMsg: TutorChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: msg || 'Giải thích hình ảnh này giúp mình nhé',
      imageUrl: attachedImage || undefined,
    };

    const nextHistory = tutorMessages
      .filter((m) => m.id !== 'welcome-tutor')
      .slice(-6)
      .map((m) => ({
        role: m.role,
        text: m.role === 'user' ? m.text : [m.replyEn, m.explanationVi].filter(Boolean).join(' — '),
      }));

    setTutorMessages((prev) => [...prev, userMsg]);
    if (!overrideMsg) {
      setTutorInput('');
      setTutorPendingImage(null);
    }
    setIsTutorTyping(true);
    soundEngine.playSoftClick();

    const activeCard = isStudyPopupOpen && filteredWords[deckIndex] ? filteredWords[deckIndex] : null;

    try {
      const res = await sendEnglishTutorMessage({
        message: msg,
        imageBase64: attachedImage || undefined,
        mimeType: attachedImage ? 'image/jpeg' : undefined,
        history: nextHistory,
        activeWord: activeCard
          ? { word: activeCard.word, meaning: activeCard.meaning, partOfSpeech: activeCard.partOfSpeech }
          : null,
      });

      const explanationText =
        attachedImage && !res.visionUsed
          ? '⚠️ Ảnh đã gửi từ giao diện, nhưng **server backend đang chạy bản cũ** chưa cập nhật tính năng đọc ảnh. Bạn hãy khởi động lại backend (`npm run dev` hoặc `npm start`) hoặc deploy bản mới rồi gửi lại ảnh nhé!'
          : res.explanationVi;

      const botMsg: TutorChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: explanationText || res.replyEn,
        primaryMode: attachedImage && !res.visionUsed ? 'vi_explain' : res.primaryMode || 'vi_explain',
        replyEn: attachedImage && !res.visionUsed ? '' : res.replyEn,
        explanationVi: explanationText,
        bonusVocab: attachedImage && !res.visionUsed ? null : res.bonusVocab,
      };
      setTutorMessages((prev) => [...prev, botMsg]);
      soundEngine.playPentatonicChime(4);
    } catch (err: any) {
      setTutorMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: err.message || 'Mình đang hơi bận một xíu, bạn nhắn lại giúp mình nhé!',
          explanationVi: err.message || 'Mình đang hơi bận một xíu, bạn nhắn lại giúp mình nhé!',
        },
      ]);
    } finally {
      setIsTutorTyping(false);
    }
  };

  const handleSaveBonusVocabFromTutor = async (bonus: NonNullable<TutorChatMessage['bonusVocab']>) => {
    try {
      const existing = words.find((w) => w.word.toLowerCase() === bonus.word.toLowerCase());
      if (existing) {
        const updated = await updateVocab(existing.id, { isSaved: true });
        setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        soundEngine.playPentatonicChime(5);
        notify.success(`Đã ghim "${bonus.word}" vào mục Đã Lưu ⭐!`);
        return;
      }

      const created = await createVocab({
        word: bonus.word,
        phonetic: bonus.phonetic || '',
        meaning: bonus.meaning,
        topic: bonus.topic || 'IELTS & Học thuật',
        isSaved: true,
      });
      setWords((prev) => [created, ...prev]);
      soundEngine.playPentatonicChime(5);
      notify.success(`Đã lưu "${bonus.word}" vào mục Đã Lưu ⭐!`);
    } catch (err: any) {
      notify.error(err.message || 'Từ này đã có hoặc chưa lưu được.');
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TUTOR_NOTES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedTutorNotes(parsed);
      }
    } catch {}
  }, []);

  const persistSavedTutorNotes = (updater: (prev: SavedTutorNote[]) => SavedTutorNote[]) => {
    setSavedTutorNotes((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(TUTOR_NOTES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSaveTutorExplanation = (msg: TutorChatMessage, msgIdx: number) => {
    const explanation = (msg.explanationVi || msg.text || '').trim();
    if (!explanation) return;
    const alreadySaved = savedTutorNotes.some((n) => n.sourceMsgId === msg.id);
    if (alreadySaved) {
      setTutorViewMode('saved');
      return;
    }

    // Infer clean title from preceding user message or first line
    const prevUserMsg = [...tutorMessages.slice(0, msgIdx)].reverse().find((m) => m.role === 'user');
    const rawTitle = prevUserMsg?.text?.trim() || explanation.split(/\r?\n/)[0].replace(/[*#`]/g, '').trim();
    const title = rawTitle.length > 64 ? rawTitle.slice(0, 61) + '...' : rawTitle || 'Lời giải thích IELTS';

    const newNote: SavedTutorNote = {
      id: `tnote-${Date.now()}`,
      sourceMsgId: msg.id,
      title,
      replyEn: msg.replyEn,
      explanationVi: explanation,
      highlights: [],
      createdAt: new Date().toISOString(),
    };
    persistSavedTutorNotes((prev) => [newNote, ...prev]);
    soundEngine.playPentatonicChime(5);
    notify.success('Đã lưu lời giải thích vào sổ tay Gia sư AI!');
  };

  const handleAddHighlightToNote = (noteId: string, phraseRaw: string, color: TutorHighlightColor) => {
    const phrase = phraseRaw.trim().replace(/\*+/g, '');
    if (phrase.length < 2) return;
    soundEngine.playSoftClick();
    persistSavedTutorNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) return note;
        const filtered = note.highlights.filter((h) => h.phrase.toLowerCase() !== phrase.toLowerCase());
        return {
          ...note,
          highlights: [...filtered, { id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, phrase, color }],
        };
      })
    );
    setNoteHighlightDrafts((prev) => ({ ...prev, [noteId]: '' }));
    setSelectedPhraseByNote((prev) => ({ ...prev, [noteId]: '' }));
  };

  const handleRemoveHighlightFromNote = (noteId: string, highlightId: string) => {
    soundEngine.playSoftClick();
    persistSavedTutorNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, highlights: note.highlights.filter((h) => h.id !== highlightId) }
          : note
      )
    );
  };

  const handleDeleteSavedTutorNote = (noteId: string) => {
    soundEngine.playSoftClick();
    persistSavedTutorNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const renderHighlightedTutorText = (
    content: string,
    customHighlights: TutorPhraseHighlight[] = []
  ) => {
    const renderPlainWithCustomHighlights = (plainText: string, keyPrefix: string) => {
      const cleanPlain = plainText.replace(/\*+/g, '');
      if (!customHighlights.length || !cleanPlain) {
        return <React.Fragment key={keyPrefix}>{cleanPlain}</React.Fragment>;
      }

      const escaped = customHighlights
        .map((h) => h.phrase.trim())
        .filter((p) => p.length >= 2)
        .sort((a, b) => b.length - a.length)
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

      if (escaped.length === 0) {
        return <React.Fragment key={keyPrefix}>{cleanPlain}</React.Fragment>;
      }

      const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
      const segs = cleanPlain.split(regex);
      return segs.map((seg, sIdx) => {
        const matched = customHighlights.find((h) => h.phrase.toLowerCase() === seg.toLowerCase());
        if (!matched) return <React.Fragment key={`${keyPrefix}-${sIdx}`}>{seg}</React.Fragment>;
        const colorSpec = TUTOR_HIGHLIGHT_PALETTE.find((c) => c.id === matched.color) || TUTOR_HIGHLIGHT_PALETTE[0];
        return (
          <mark
            key={`${keyPrefix}-${sIdx}`}
            className={`px-1.5 py-0.5 rounded-md font-bold mx-0.5 ${
              isDark ? colorSpec.darkCls : colorSpec.lightCls
            }`}
          >
            {seg}
          </mark>
        );
      });
    };

    let autoColorCursor = 0;

    const renderInline = (line: string) => {
      const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g);
      return tokens.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          const inner = part.slice(2, -2).trim();
          const matchedCustom = customHighlights.find((h) => h.phrase.toLowerCase() === inner.toLowerCase());
          const paletteItem = matchedCustom
            ? TUTOR_HIGHLIGHT_PALETTE.find((c) => c.id === matchedCustom.color) || TUTOR_HIGHLIGHT_PALETTE[0]
            : TUTOR_HIGHLIGHT_PALETTE[autoColorCursor++ % TUTOR_HIGHLIGHT_PALETTE.length];
          return (
            <mark
              key={idx}
              className={`px-1.5 py-0.5 rounded-md font-extrabold mx-0.5 ${
                isDark ? paletteItem.darkCls : paletteItem.lightCls
              }`}
            >
              {inner}
            </mark>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**') && part.length > 2) {
          const inner = part.slice(1, -1).trim();
          const matchedCustom = customHighlights.find((h) => h.phrase.toLowerCase() === inner.toLowerCase());
          const paletteItem = matchedCustom
            ? TUTOR_HIGHLIGHT_PALETTE.find((c) => c.id === matchedCustom.color) || TUTOR_HIGHLIGHT_PALETTE[2]
            : TUTOR_HIGHLIGHT_PALETTE[(autoColorCursor++ + 2) % TUTOR_HIGHLIGHT_PALETTE.length];
          return (
            <mark
              key={idx}
              className={`px-1.5 py-0.5 rounded-md font-bold mx-0.5 ${
                isDark ? paletteItem.darkCls : paletteItem.lightCls
              }`}
            >
              {inner}
            </mark>
          );
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code
              key={idx}
              className={`px-1.5 py-0.5 rounded-md font-mono font-bold text-[11px] mx-0.5 ${
                isDark
                  ? 'bg-rose-500/25 text-rose-300'
                  : 'bg-[#FFE4E6] text-[#E11D48] border border-[#0F172A]'
              }`}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return renderPlainWithCustomHighlights(part, `p-${idx}`);
      });
    };

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    return (
      <div className="space-y-2">
        {lines.map((line, i) => {
          const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
          if (headingMatch) {
            return (
              <p key={i} className="font-black text-[12.5px] text-[#E11D48] pt-1">
                {renderInline(headingMatch[1])}
              </p>
            );
          }

          const numbered = line.match(/^(\d+)\.\s+(.+)$/);
          if (numbered) {
            return (
              <div key={i} className="flex items-start gap-2">
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5 ${
                    isDark ? 'bg-emerald-500/25 text-emerald-300' : 'bg-[#FFE4E6] text-[#E11D48] border border-[#0F172A]'
                  }`}
                >
                  {numbered[1]}
                </span>
                <p className="flex-1 leading-relaxed">{renderInline(numbered[2])}</p>
              </div>
            );
          }

          const bulleted = line.match(/^[-•*]\s+(.+)$/);
          if (bulleted) {
            return (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] shrink-0 mt-1.5" />
                <p className="flex-1 leading-relaxed">{renderInline(bulleted[1])}</p>
              </div>
            );
          }

          return (
            <p key={i} className="leading-relaxed">
              {renderInline(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const handleToggleSaved = async (item: VocabItem) => {
    const nextSaved = !item.isSaved;
    soundEngine.playSoftClick();
    setWords((prev) => prev.map((w) => (w.id === item.id ? { ...w, isSaved: nextSaved } : w)));
    try {
      await updateVocab(item.id, { isSaved: nextSaved });
    } catch {
      setWords((prev) => prev.map((w) => (w.id === item.id ? { ...w, isSaved: !nextSaved } : w)));
      notify.error('Không thể cập nhật trạng thái lưu.');
    }
  };

  useEffect(() => {
    if (mode !== 'review' || isWordModalOpen || isImportModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode('learn');
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [mode, isWordModalOpen, isImportModalOpen]);

  useEffect(() => {
    if (!topicPopupName || isStudyPopupOpen || isWordModalOpen || isImportModalOpen || isDictOpen) return;
    const handleEscTopic = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTopicPopup();
    };
    window.addEventListener('keydown', handleEscTopic);
    return () => window.removeEventListener('keydown', handleEscTopic);
  }, [topicPopupName, isStudyPopupOpen, isWordModalOpen, isImportModalOpen, isDictOpen]);

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

  const handleRateReview = (rating: ReviewRating) => {
    if (!currentReviewWord || isSubmittingReview) return;
    const targetWord = currentReviewWord;
    const optimistic = computeOptimisticReview(targetWord, rating);

    // 0ms optimistic update of SRS progress & cache
    setWords((prev) => prev.map((w) => (w.id === optimistic.id ? optimistic : w)));

    if (rating === 'good' || rating === 'easy') {
      soundEngine.playPentatonicChime(4);
    } else {
      soundEngine.playSoftClick();
    }

    const nextCount = sessionReviewedCount + 1;
    setSessionReviewedCount(nextCount);

    if (rating === 'again') {
      setReviewQueue((prev) => [...prev, optimistic]);
    }

    const nextPos = reviewPos + 1;
    setReviewPos(nextPos);
    setShowReviewAnswer(false);
    setQuizSelectedIdx(null);

    const finalLength = rating === 'again' ? reviewQueue.length + 1 : reviewQueue.length;
    if (nextPos >= finalLength) {
      soundEngine.playPentatonicChime(5);
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.65 } });
      } catch {}
    }

    // Background sync with backend scoped by authUserId
    reviewVocab(targetWord.id, rating, authUserId)
      .then((synced) => {
        setWords((prev) => prev.map((w) => (w.id === synced.id ? synced : w)));
      })
      .catch(() => {
        // Already preserved in optimistic local cache
      });
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

  const handleClearAllWords = async () => {
    if (words.length === 0) return;
    const confirmed = await notify.confirm(
      `Thao tác này sẽ xóa sạch ${words.length} từ vựng hiện có và không thể hoàn tác.`,
      {
        title: 'Xóa toàn bộ kho từ vựng?',
        confirmText: 'Xóa hết',
        cancelText: 'Hủy',
        type: 'warning',
      }
    );
    if (!confirmed) return;

    soundEngine.playSoftClick();
    await clearAllVocab(authUserId);
    setWords([]);
    setSelectedTopic('all');
    setSearchQuery('');
    setIsStudyPopupOpen(false);
    setMode('learn');
    notify.success('Đã xóa toàn bộ dữ liệu từ vựng.');
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
    if (file.size > 4 * 1024 * 1024) {
      notify.warning('File quá lớn (tối đa 4MB). Vui lòng chia nhỏ danh sách từ.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    try {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
        const structured = parseVocabRowsMatrix(rows, importTopic);
        if (structured && structured.length > 0) {
          soundEngine.playPentatonicChime(3);
          setExtractedDrafts(structured);
          return;
        }
        // Fallback: single-column Excel list -> send words to AI extraction
        const rawWords = rows
          .map((r) => (Array.isArray(r) ? String(r[0] ?? '').trim() : ''))
          .filter((w) => w && !/^(word|term|tu|từ|english)$/i.test(w))
          .join('\n');
        if (rawWords) {
          setImportText(rawWords);
          setImportTab('text');
          await handleRunAutoExtract(rawWords);
          return;
        }
        notify.warning('Không tìm thấy dữ liệu từ vựng hợp lệ trong file Excel.');
        return;
      }

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

  const processImageFile = (file: File) => {
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
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  useEffect(() => {
    if (!isImportModalOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            setImportTab('image');
            processImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isImportModalOpen, importTopic]);

  const TEMPLATE_ROWS: string[][] = [
    ['word', 'meaning', 'phonetic', 'partOfSpeech', 'example', 'exampleTranslation', 'topic'],
    ['resilient', 'Kiên cường, mau phục hồi', '/rɪˈzɪliənt/', 'adj', 'She remained resilient despite setbacks.', 'Cô ấy vẫn kiên cường dù gặp nhiều trở ngại.', 'Cảm xúc & Tâm lý'],
    ['latency', 'Độ trễ mạng, độ trễ xử lý', '/ˈleɪtənsi/', 'noun', 'Caching significantly reduces API latency.', 'Bộ nhớ đệm giúp giảm đáng kể độ trễ API.', 'IT & Tech'],
    ['negotiate', 'Đàm phán, thương lượng', '/nɪˈɡəʊʃieɪt/', 'verb', 'We need to negotiate the contract terms.', 'Chúng ta cần thương lượng các điều khoản hợp đồng.', 'Kinh doanh'],
  ];

  const handleDownloadExcelTemplate = () => {
    soundEngine.playSoftClick();
    const ws = XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 16 },
      { wch: 14 },
      { wch: 44 },
      { wch: 44 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VocabTemplate');
    XLSX.writeFile(wb, 'genncore-vocab-template.xlsx');
    notify.success('Đã tải file Excel mẫu genncore-vocab-template.xlsx (chia sẵn 7 cột)');
  };

  const handleCopySpreadsheetSample = async () => {
    soundEngine.playSoftClick();
    const tsv = TEMPLATE_ROWS.map((row) => row.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      notify.success('Đã sao chép bảng mẫu — dán vào Excel hoặc Google Sheets sẽ tự chia 7 cột!');
    } catch {
      notify.warning('Không thể tự copy, bạn hãy tải file Excel mẫu (.xlsx) bên cạnh nhé.');
    }
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
    if (level >= 4) {
      return {
        label: 'Thuộc làu',
        cls: isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : 'bg-[#DCFCE7] text-[#15803D] border-[#0F172A]',
      };
    }
    if (level >= 2) {
      return {
        label: 'Đang nhớ',
        cls: isDark ? 'bg-sky-500/15 text-sky-300 border-sky-400/30' : 'bg-[#DBEAFE] text-[#1D4ED8] border-[#0F172A]',
      };
    }
    if (level === 1) {
      return {
        label: 'Mới ôn',
        cls: isDark ? 'bg-amber-500/15 text-amber-300 border-amber-400/30' : 'bg-[#FEF08A] text-[#0F172A] border-[#0F172A]',
      };
    }
    return {
      label: 'Từ mới',
      cls: isDark ? 'bg-white/10 text-slate-300 border-white/15' : 'bg-[#FFE4E6] text-[#E11D48] border-[#0F172A]',
    };
  };

  const surfaceCls = isDark
    ? 'bg-[#12151E] border border-white/[0.08] text-slate-100'
    : 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A]';

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3">
      {/* Row 1: Primary Mode Switcher (Left) & Actions Cluster (Right) on 1 balanced bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div
          className={`inline-flex items-center p-0.5 rounded-xl border text-xs font-bold ${
            isDark
              ? 'bg-[#12151E] border-white/[0.1]'
              : 'bg-white border-[#0F172A]/20 shadow-xs'
          }`}
        >
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setMode('learn');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              mode === 'learn'
                ? isDark
                  ? 'bg-[#1DB954] text-[#090A0F]'
                  : 'bg-[#E11D48] text-white font-black'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-[#0F172A] hover:bg-[#FFF1F2]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Học & Kho Từ</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setMode('saved');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              mode === 'saved'
                ? isDark
                  ? 'bg-amber-400 text-[#090A0F]'
                  : 'bg-[#FEF08A] text-[#0F172A] font-black'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-[#0F172A] hover:bg-[#FEF9C3]'
            }`}
            title="Xem riêng các từ đã đánh dấu sao hoặc lưu từ Từ Điển / Gia sư AI"
          >
            <Star className={`w-3.5 h-3.5 ${mode === 'saved' ? 'fill-current text-[#E11D48]' : 'text-amber-500'}`} />
            <span>Đã Lưu ({savedCount})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setMode('review');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              mode === 'review'
                ? isDark
                  ? 'bg-[#1DB954] text-[#090A0F]'
                  : 'bg-[#E11D48] text-white font-black'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-[#0F172A] hover:bg-[#FFF1F2]'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Review ({dueWords.length})</span>
          </button>
        </div>

        {/* Actions Cluster: clear visual hierarchy (primary CTA stands out, secondary buttons quiet) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              soundEngine.playSoftClick();
              setIsDictOpen(true);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all whitespace-nowrap ${
              isDark
                ? 'bg-amber-500/15 border-amber-400/30 text-amber-300 hover:bg-amber-500/25'
                : 'bg-[#FEF9C3] border-[#0F172A]/25 hover:border-[#0F172A] text-[#0F172A] hover:bg-[#FEF08A]'
            }`}
            title="Tra từ điển, Modal Verbs, Idioms (IDM) & Phrasal Verbs"
          >
            <BookMarked className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>Từ Điển</span>
          </button>

          <button
            onClick={openImportModal}
            className="px-3.5 py-1.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-black border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Import Tự Động</span>
          </button>

          <button
            onClick={openAddWordModal}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all whitespace-nowrap ${
              isDark
                ? surfaceCls
                : 'bg-white hover:bg-[#FFF1F2] text-[#0F172A] border border-[#0F172A]/25 hover:border-[#0F172A]'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>Thêm Từ</span>
          </button>

          {words.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllWords}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all whitespace-nowrap ${
                isDark
                  ? 'bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20'
                  : 'bg-white hover:bg-[#FFE4E6] border border-[#E11D48]/25 hover:border-[#E11D48] text-[#E11D48]'
              }`}
              title="Xóa toàn bộ dữ liệu từ vựng"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Xóa tất cả</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODE 1: LEARN & VOCAB LIBRARY (Always visible behind blur modals)     */}
      {/* ===================================================================== */}
      <div className="flex-1 min-h-0 flex flex-col space-y-3">
          {/* Quiet Control Dock: calm wrapper border so inner Cartoon CTAs & deck cards stand out cleanly */}
          <div
            className={`p-2.5 sm:p-3 rounded-2xl flex flex-col gap-2 shrink-0 min-w-0 w-full relative z-20 ${
              isDark
                ? 'bg-[#12151E] border border-white/[0.08] text-slate-100'
                : 'bg-white border border-[#0F172A]/20 shadow-xs text-[#0F172A]'
            }`}
          >
            {mode === 'learn' ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={deckSearchQuery}
                      onChange={(e) => setDeckSearchQuery(e.target.value)}
                      placeholder="Tìm tên chủ đề (vd: IT, IELTS, Kinh doanh...)"
                      className={`w-full pl-8 pr-7 py-1.5 rounded-xl text-xs font-semibold outline-none transition-all ${
                        isDark
                          ? 'bg-[#181C28] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500'
                          : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A] placeholder:text-slate-400 focus:border-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                      }`}
                    />
                    {deckSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setDeckSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-[#E11D48] cursor-pointer"
                        title="Xóa từ khóa"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Topic Status Filter */}
                  <div className="flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                    <select
                      value={deckFilter}
                      onChange={(e) => setDeckFilter(e.target.value as any)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold outline-none cursor-pointer ${
                        isDark
                          ? 'bg-[#181C28] border border-white/10 text-slate-200'
                          : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A] focus:border-[#0F172A] focus:outline-none'
                      }`}
                      title="Lọc chủ đề theo tiến độ"
                    >
                      <option value="all">Tất cả chủ đề ({topicDecks.length})</option>
                      <option value="has_due">Có từ cần ôn</option>
                      <option value="in_progress">Đang học dở</option>
                      <option value="completed">Đã thuộc hết</option>
                    </select>
                  </div>

                  {/* Topic Sort Dropdown */}
                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                    <select
                      value={deckSort}
                      onChange={(e) => setDeckSort(e.target.value as any)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold outline-none cursor-pointer ${
                        isDark
                          ? 'bg-[#181C28] border border-white/10 text-slate-200'
                          : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A] focus:border-[#0F172A] focus:outline-none'
                      }`}
                      title="Sắp xếp chủ đề"
                    >
                      <option value="most_words">Nhiều từ nhất</option>
                      <option value="most_due">Cần ôn nhiều nhất</option>
                      <option value="az">Tên chủ đề A → Z</option>
                      <option value="progress_desc">Tiến độ cao → thấp</option>
                    </select>
                  </div>

                  {hasDeckFilters && (
                    <button
                      type="button"
                      onClick={resetDeckFilters}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer ${
                        isDark
                          ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                          : 'bg-white hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Đặt lại</span>
                    </button>
                  )}
                </div>

                {/* Big Centered Study Popup Trigger */}
                <button
                  type="button"
                  disabled={words.length === 0}
                  onClick={() => openStudyPopupAt()}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-[#1DB954]/15 border border-[#1DB954]/35 text-[#1DB954] hover:bg-[#1DB954]/25'
                      : 'bg-[#FEF9C3] hover:bg-[#FDE047] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                  }`}
                  title="Mở cửa sổ học lật thẻ lớn ở giữa màn hình"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#E11D48]" />
                  <span>Học Thẻ Lớn (Popup)</span>
                </button>
              </div>
            ) : (
            /* Row 1 (Saved mode): Search + Status + POS + Sort + Study Popup CTA */
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm từ, nghĩa, ví dụ, phiên âm..."
                    className={`w-full pl-8 pr-7 py-1.5 rounded-xl text-xs font-semibold outline-none transition-all ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500'
                        : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A] placeholder:text-slate-400 focus:border-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-[#E11D48] cursor-pointer"
                      title="Xóa từ khóa"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* SRS Status Filter */}
                <div className="flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold outline-none cursor-pointer ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-slate-200'
                        : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A] focus:border-[#0F172A] focus:outline-none'
                    }`}
                    title="Lọc theo mức độ ghi nhớ"
                  >
                    <option value="all">Mọi trạng thái</option>
                    <option value="due">Cần Review ({dueWords.length})</option>
                    <option value="new">Từ mới</option>
                    <option value="learning">Đang nhớ</option>
                    <option value="mastered">Thuộc làu ({masteredCount})</option>
                  </select>
                </div>

                {/* Part of Speech Filter */}
                {partOfSpeechList.length > 0 && (
                  <select
                    value={posFilter}
                    onChange={(e) => setPosFilter(e.target.value)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold outline-none cursor-pointer ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-slate-200'
                        : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A] focus:border-[#0F172A] focus:outline-none'
                    }`}
                    title="Lọc theo từ loại"
                  >
                    <option value="all">Mọi từ loại</option>
                    {partOfSpeechList.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                )}

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold outline-none cursor-pointer ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-slate-200'
                        : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A] focus:border-[#0F172A] focus:outline-none'
                    }`}
                    title="Sắp xếp danh sách"
                  >
                    <option value="newest">Mới thêm nhất</option>
                    <option value="due_first">Ưu tiên cần ôn</option>
                    <option value="az">Từ A → Z</option>
                    <option value="za">Từ Z → A</option>
                    <option value="mastery_asc">Từ yếu nhớ trước</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer ${
                      isDark
                        ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                        : 'bg-white hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                    }`}
                    title="Đặt lại tất cả bộ lọc"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>

              {/* Big Centered Study Popup Trigger */}
              <button
                type="button"
                disabled={filteredWords.length === 0}
                onClick={() => openStudyPopupAt((safePage - 1) * pageSize)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-[#1DB954]/15 border border-[#1DB954]/35 text-[#1DB954] hover:bg-[#1DB954]/25'
                    : 'bg-[#FEF9C3] hover:bg-[#FDE047] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                }`}
                title="Mở cửa sổ học lật thẻ lớn ở giữa màn hình"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#E11D48]" />
                <span>Học Thẻ Lớn (Popup)</span>
              </button>
            </div>
            )}

            {/* Row 2: Single-line Smart Topic Pills (scrollable horizontally with soft edge) + Overflow Popover */}
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-0.5 pr-3">
                <button
                  onClick={() => {
                    setSelectedTopic('all');
                    setIsMoreTopicsOpen(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all shrink-0 cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    selectedTopic === 'all'
                      ? isDark
                        ? 'bg-[#1DB954] text-[#090A0F]'
                        : 'bg-[#E11D48] text-white border border-[#0F172A]'
                      : isDark
                      ? 'bg-white/5 text-slate-400 hover:text-white'
                      : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A] hover:bg-[#FFF1F2]'
                  }`}
                >
                  <span>Tất cả</span>
                  <span className="opacity-80 text-[10px]">({words.length})</span>
                </button>

                {topTopics.map((tp) => (
                  <button
                    key={tp}
                    title={`${tp} (${topicCounts[tp] || 0})`}
                    onClick={() => openTopicPopup(tp)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 max-w-[185px] whitespace-nowrap ${
                      selectedTopic === tp
                        ? isDark
                          ? 'bg-[#1DB954] text-[#090A0F] border border-[#1DB954]'
                          : 'bg-[#E11D48] text-white border border-[#0F172A] font-black'
                        : isDark
                        ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                        : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A] hover:bg-[#FEF9C3]'
                    }`}
                  >
                    <span className="truncate">{tp}</span>
                    <span className="opacity-75 text-[10px] shrink-0">({topicCounts[tp] || 0})</span>
                  </button>
                ))}

                {/* If user picked a topic from extraTopics, show it visibly as an active chip */}
                {selectedTopic !== 'all' && extraTopics.includes(selectedTopic) && (
                  <button
                    type="button"
                    onClick={() => setSelectedTopic('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 cursor-pointer flex items-center gap-1 max-w-[185px] whitespace-nowrap ${
                      isDark
                        ? 'bg-[#1DB954] text-[#090A0F]'
                        : 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                    }`}
                    title="Bấm để bỏ lọc chủ đề này"
                  >
                    <span className="truncate">{selectedTopic}</span>
                    <span className="opacity-80 text-[10px] shrink-0">({topicCounts[selectedTopic] || 0})</span>
                    <X className="w-3 h-3 ml-0.5 shrink-0" />
                  </button>
                )}
              </div>

              {extraTopics.length > 0 && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMoreTopicsOpen((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors shrink-0 cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      isDark
                        ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                        : 'bg-[#FEF9C3] hover:bg-[#FDE047] border border-[#0F172A] text-[#0F172A]'
                    }`}
                  >
                    <span>+{extraTopics.length} chủ đề</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isMoreTopicsOpen && (
                    <div
                      className={`absolute right-0 top-full mt-1.5 w-64 rounded-2xl p-2.5 space-y-2 z-40 ${
                        isDark
                          ? 'bg-[#181C28] border border-white/15 shadow-xl text-white'
                          : 'bg-[#FFFDF7] border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] text-[#0F172A]'
                      }`}
                    >
                      <input
                        type="text"
                        value={topicSearchQuery}
                        onChange={(e) => setTopicSearchQuery(e.target.value)}
                        placeholder="Tìm chủ đề..."
                        className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold outline-none ${
                          isDark
                            ? 'bg-[#12151E] border border-white/10 text-white placeholder:text-slate-500'
                            : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                        }`}
                      />
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredExtraTopics.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-2">Không thấy chủ đề phù hợp</p>
                        ) : (
                          filteredExtraTopics.map((tp) => (
                            <button
                              key={tp}
                              type="button"
                              onClick={() => openTopicPopup(tp)}
                              className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between cursor-pointer ${
                                selectedTopic === tp
                                  ? isDark
                                    ? 'bg-[#1DB954] text-[#090A0F]'
                                    : 'bg-[#E11D48] text-white border border-[#0F172A]'
                                  : isDark
                                  ? 'hover:bg-white/10 text-slate-200'
                                  : 'hover:bg-[#FFF1F2] text-[#0F172A]'
                              }`}
                            >
                              <span className="truncate">{tp}</span>
                              <span className="text-[10px] opacity-75 shrink-0 ml-2">
                                {topicCounts[tp] || 0}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {uncategorizedCount > 0 && (
                <button
                  type="button"
                  disabled={isAutoTagging}
                  onClick={handleAutoTagAll}
                  title="Tự động phân loại các từ đang ở mục Chung / Tự động sang chủ đề chuẩn"
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors shrink-0 cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isDark
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/25'
                      : 'bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#15803D] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
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

          {/* Sub-header Bar: Section context (Left) + Compact Progress Stats Pills (Right) */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <p className="text-xs font-bold text-slate-500">
              {mode === 'learn' ? (
                <>
                  Chọn một <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>chủ đề</strong> để mở popup từ vựng ({filteredTopicDecks.length}/{topicDecks.length} chủ đề)
                </>
              ) : (
                <>
                  Từ đã đánh dấu sao ({filteredWords.length} từ)
                </>
              )}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border whitespace-nowrap ${
                  isDark ? 'bg-[#12151E] border-white/[0.08] text-slate-200' : 'bg-white border-[#0F172A]/20 text-[#0F172A]'
                }`}
              >
                <BookOpen className="w-3 h-3 text-[#E11D48]" />
                <span>{words.length} từ trong kho</span>
              </div>
              <div
                className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap ${
                  dueWords.length > 0
                    ? isDark
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      : 'bg-[#FFE4E6] border-[#E11D48]/35 text-[#E11D48]'
                    : isDark
                    ? 'bg-[#12151E] border-white/[0.08] text-slate-200'
                    : 'bg-white border-[#0F172A]/20 text-[#0F172A]'
                }`}
              >
                <Brain className="w-3 h-3 text-[#E11D48]" />
                <span>{dueWords.length} cần Review</span>
              </div>
              <div
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border whitespace-nowrap ${
                  isDark ? 'bg-[#12151E] border-white/[0.08] text-slate-200' : 'bg-white border-[#0F172A]/20 text-[#0F172A]'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{masteredCount} nhớ vững</span>
              </div>
            </div>
          </div>

          {/* Empty State / Empty Filter State */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#E11D48]" />
            </div>
          ) : mode === 'saved' && filteredWords.length === 0 && !hasActiveFilters ? (
            <div className={`flex-1 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 ${surfaceCls}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-[#FEF08A] text-[#0F172A] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
              }`}>
                <Star className="w-7 h-7 fill-amber-400 text-amber-500" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-extrabold text-base">Kho Đã Lưu của bạn đang trống</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hãy bấm biểu tượng ngôi sao <strong>⭐</strong> trên bất kỳ thẻ từ nào, hoặc bấm <strong>Lưu vào kho</strong> khi tra <strong>Từ Điển</strong> / hỏi <strong>Gia sư AI</strong> để tách riêng các từ quan trọng vào đây.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode('learn')}
                className="px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black cursor-pointer"
              >
                Quay lại Học & Kho Từ
              </button>
            </div>
          ) : words.length > 0 && filteredWords.length === 0 ? (
            <div className={`flex-1 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 ${surfaceCls}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-[#FEF08A] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
              }`}>
                <Search className="w-6 h-6" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="font-extrabold text-sm">Không tìm thấy từ vựng khớp bộ lọc</h3>
                <p className="text-xs text-slate-500">
                  Hãy thử đổi từ khóa tìm kiếm, trạng thái ôn tập hoặc chọn chủ đề khác.
                </p>
              </div>
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa tất cả bộ lọc</span>
              </button>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className={`flex-1 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 ${surfaceCls}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-[#FFE4E6] text-[#E11D48] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
              }`}>
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-extrabold text-base">Kho từ vựng của bạn đang trống</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Chỉ cần dán một danh sách từ, một đoạn văn tiếng Anh, file <code>.csv</code> hoặc ảnh chụp trang sách — <strong>Genncore AI</strong> sẽ tự động điền phiên âm IPA, nghĩa tiếng Việt và ví dụ cho bạn.
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                <button
                  onClick={openImportModal}
                  className="px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Import Tự Động Ngay</span>
                </button>
                <button
                  onClick={openAddWordModal}
                  className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    isDark
                      ? surfaceCls
                      : 'bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                  }`}
                >
                  + Thêm thủ công
                </button>
              </div>
            </div>
          ) : mode === 'learn' && words.length > 0 ? (
            /* TOPIC DECKS GRID (Click any topic card to open its Vocabulary Popup) */
            <div className="space-y-3 pb-6">
              {filteredTopicDecks.length === 0 ? (
                <div className={`rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 ${surfaceCls}`}>
                  <p className="text-sm font-bold">Không tìm thấy chủ đề phù hợp</p>
                  <button
                    type="button"
                    onClick={resetDeckFilters}
                    className="px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xóa bộ lọc chủ đề</span>
                  </button>
                </div>
              ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {paginatedTopicDecks.map((deck) => {
                  const deckTheme = getTopicDeckStyle(deck.topic);
                  return (
                  <div
                    key={deck.topic}
                    onClick={() => openTopicPopup(deck.topic)}
                    className={`rounded-2xl p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all hover:-translate-y-0.5 group ${deckTheme.card}`}
                  >
                    {/* Header: Folder Icon + Flush-Left Topic Title + Single Word Count Pill */}
                    <div className="flex items-start gap-2.5 text-left">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${deckTheme.icon}`}
                      >
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="text-[13.5px] font-black leading-snug text-left break-words"
                            title={deck.topic}
                          >
                            {deck.topic}
                          </h3>
                          <span
                            className={`text-[10.5px] font-mono font-black px-2 py-0.5 rounded-lg shrink-0 ${
                              isDark
                                ? 'bg-white/10 text-slate-200'
                                : 'bg-[#FFF8F1] border border-[#0F172A]/20 text-[#0F172A]'
                            }`}
                          >
                            {deck.total} từ
                          </span>
                        </div>
                        <p className={`text-[11px] truncate mt-1 text-left ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {deck.previewWords.join(', ')}
                          {deck.total > deck.previewWords.length ? '...' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {/* Single Clean Progress Row (eliminates duplicate top counter) */}
                      <div className="space-y-1">
                        <div className={`flex items-center justify-between gap-2 text-[11px] font-bold ${
                          isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <span>Thuộc {deck.mastered}/{deck.total}</span>
                            {deck.due > 0 && (
                              <span className="text-[#E11D48] font-black">• {deck.due} cần ôn</span>
                            )}
                          </div>
                          <span className="font-mono font-black shrink-0">{deck.pct}%</span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[#FFF1F2] border border-[#0F172A]/30'}`}>
                          <div
                            className={`h-full rounded-full transition-all ${deckTheme.bar}`}
                            style={{ width: `${deck.pct}%` }}
                          />
                        </div>
                      </div>

                      <div
                        className={`pt-2 border-t flex items-center justify-between text-[11px] font-black ${
                          isDark ? 'border-white/[0.08]' : 'border-[#0F172A]/12'
                        }`}
                      >
                        <span className={`inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform ${deckTheme.link}`}>
                          <span>Mở bộ từ</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMode('review');
                            startReviewSession('all', deck.topic);
                          }}
                          className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-black cursor-pointer transition-colors ${
                            isDark
                              ? 'bg-white/10 hover:bg-white/15 text-slate-200'
                              : 'bg-[#FEF9C3] hover:bg-[#FEF08A] border border-[#0F172A]/30 hover:border-[#0F172A] text-[#0F172A]'
                          }`}
                        >
                          Ôn tập
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Topic Decks Pagination Bar */}
              {filteredTopicDecks.length > 0 && (
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs ${
                    isDark
                      ? 'bg-[#12151E] border border-white/[0.08] text-slate-300'
                      : 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A]'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold">
                      Hiển thị{' '}
                      <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>
                        {(safeDeckPage - 1) * deckPageSize + 1}–{Math.min(safeDeckPage * deckPageSize, filteredTopicDecks.length)}
                      </strong>{' '}
                      / <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>{filteredTopicDecks.length}</strong> chủ đề
                    </span>

                    <label className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500 font-semibold">Mỗi trang:</span>
                      <select
                        value={deckPageSize}
                        onChange={(e) => setDeckPageSize(Number(e.target.value))}
                        className={`px-2 py-1 rounded-xl font-bold outline-none cursor-pointer ${
                          isDark
                            ? 'bg-[#181C28] border border-white/10 text-white'
                            : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                        }`}
                      >
                        <option value={8}>8 chủ đề</option>
                        <option value={12}>12 chủ đề</option>
                        <option value={16}>16 chủ đề</option>
                        <option value={24}>24 chủ đề</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safeDeckPage <= 1}
                      onClick={() => {
                        soundEngine.playSoftClick();
                        setDeckPage((p) => Math.max(1, p - 1));
                      }}
                      className={`px-2.5 py-1.5 rounded-xl font-black flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDark
                          ? 'bg-[#181C28] border border-white/10 hover:bg-white/10 text-slate-200'
                          : 'bg-white hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                      }`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Trước</span>
                    </button>

                    {Array.from({ length: deckTotalPages }, (_, idx) => idx + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === deckTotalPages ||
                          Math.abs(page - safeDeckPage) <= 1
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
                          <span key={`deck-el-${idx}`} className="px-1.5 text-slate-400 select-none">
                            …
                          </span>
                        ) : (
                          <button
                            key={entry}
                            type="button"
                            onClick={() => {
                              soundEngine.playSoftClick();
                              setDeckPage(entry);
                            }}
                            className={`min-w-[30px] h-7 px-2 rounded-xl font-black text-xs cursor-pointer transition-colors ${
                              safeDeckPage === entry
                                ? isDark
                                  ? 'bg-[#1DB954] text-[#090A0F]'
                                  : 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                                : isDark
                                ? 'hover:bg-white/10 text-slate-300'
                                : 'hover:bg-[#FFF1F2] text-[#0F172A]'
                            }`}
                          >
                            {entry}
                          </button>
                        )
                      )}

                    <button
                      type="button"
                      disabled={safeDeckPage >= deckTotalPages}
                      onClick={() => {
                        soundEngine.playSoftClick();
                        setDeckPage((p) => Math.min(deckTotalPages, p + 1));
                      }}
                      className={`px-2.5 py-1.5 rounded-xl font-black flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDark
                          ? 'bg-[#181C28] border border-white/10 hover:bg-white/10 text-slate-200'
                          : 'bg-white hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                      }`}
                    >
                      <span className="hidden sm:inline">Sau</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          ) : (
            /* GRID OF VOCAB CARDS + PAGINATION */
            <div className="space-y-4 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {paginatedWords.map((item) => {
                  const isFlipped = Boolean(flippedIds[item.id]);
                  const badge = getMasteryBadge(item.srsLevel);
                  const topicLabel = item.topic?.trim() || 'Chung';

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        const idx = filteredWords.findIndex((w) => w.id === item.id);
                        openStudyPopupAt(idx >= 0 ? idx : 0);
                      }}
                      className={`rounded-2xl p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all hover:-translate-y-0.5 select-none ${
                        isDark
                          ? 'bg-[#12151E] border border-white/[0.08] hover:border-rose-400/40'
                          : 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:bg-[#FFFDF7] text-[#0F172A]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTopicPopup(topicLabel);
                          }}
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md border truncate cursor-pointer hover:opacity-85 ${getTopicBadgeCls(
                            topicLabel
                          )}`}
                          title={`Lọc theo chủ đề ${topicLabel}`}
                        >
                          {topicLabel}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSaved(item);
                            }}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              item.isSaved
                                ? 'text-amber-500 hover:bg-[#FEF9C3]'
                                : isDark
                                ? 'text-slate-500 hover:text-amber-400 hover:bg-white/10'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-[#FEF9C3]'
                            }`}
                            title={item.isSaved ? 'Bỏ khỏi Kho Đã Lưu' : 'Lưu vào Kho Đã Lưu ⭐'}
                          >
                            <Star className={`w-3.5 h-3.5 ${item.isSaved ? 'fill-amber-400 text-amber-500' : ''}`} />
                          </button>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>

                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-extrabold tracking-tight">{item.word}</h3>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mt-0.5">
                            {item.partOfSpeech && (
                              <span className="text-[#E11D48] font-black">{item.partOfSpeech}</span>
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
                              ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/30'
                              : 'bg-[#FFE4E6] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FECDD3]'
                          }`}
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isFlipped ? (
                        <div className={`pt-2 mt-2 border-t space-y-1 animate-in fade-in duration-150 ${
                          isDark ? 'border-white/10' : 'border-[#0F172A]/15'
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
                        <p className="text-[11px] text-slate-500 pt-1 italic">Chạm thẻ để xem nghĩa...</p>
                      )}
                    </div>

                    <div
                      className={`pt-2 border-t flex items-center justify-between text-[10.5px] font-semibold text-slate-500 ${
                        isDark ? 'border-white/[0.06]' : 'border-[#0F172A]/15'
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
                              : 'hover:bg-[#FEF9C3] hover:text-[#0F172A]'
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
                          className={`p-1 rounded-lg cursor-pointer ${
                            isDark ? 'hover:bg-white/10 hover:text-sky-400' : 'hover:bg-[#DBEAFE] hover:text-[#1D4ED8]'
                          }`}
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
                          className={`p-1 rounded-lg cursor-pointer ${
                            isDark ? 'hover:bg-rose-500/20 hover:text-rose-400' : 'hover:bg-[#FFE4E6] hover:text-[#E11D48]'
                          }`}
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
                  className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs ${
                    isDark
                      ? 'bg-[#12151E] border border-white/[0.08] text-slate-300'
                      : 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A]'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold">
                      Hiển thị{' '}
                      <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>
                        {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredWords.length)}
                      </strong>{' '}
                      / <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>{filteredWords.length}</strong> từ
                    </span>

                    <label className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500 font-semibold">Mỗi trang:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className={`px-2 py-1 rounded-xl font-bold outline-none cursor-pointer ${
                          isDark
                            ? 'bg-[#181C28] border border-white/10 text-white'
                            : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
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
                      className={`px-2.5 py-1.5 rounded-xl font-black flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDark
                          ? 'bg-[#181C28] border border-white/10 hover:bg-white/10 text-slate-200'
                          : 'bg-white hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
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
                            className={`min-w-[30px] h-7 px-2 rounded-xl font-black text-xs cursor-pointer transition-colors ${
                              safePage === entry
                                ? isDark
                                  ? 'bg-[#1DB954] text-[#090A0F]'
                                  : 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                                : isDark
                                ? 'hover:bg-white/10 text-slate-300'
                                : 'hover:bg-[#FFF1F2] text-[#0F172A]'
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
                      className={`px-2.5 py-1.5 rounded-xl font-black flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDark
                          ? 'bg-[#181C28] border border-white/10 hover:bg-white/10 text-slate-200'
                          : 'bg-white hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
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

      {/* ===================================================================== */}
      {/* MODE 2: DAILY REVIEW POPUP (CENTERED OVER BLURRED BACKDROP)           */}
      {/* ===================================================================== */}
      {typeof document !== 'undefined' && mode === 'review' && createPortal(
        <div
          onClick={() => setMode('learn')}
          className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[92dvh] overflow-hidden rounded-3xl flex flex-col ${
              isDark
                ? 'bg-[#12151E] border border-white/10 shadow-2xl text-white'
                : 'bg-[#FFFDF7] border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] text-[#0F172A]'
            }`}
          >
            {/* Review Popup Header & Toolbar */}
            <div className={`px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${
              isDark ? 'bg-[#181C28]/80 border-b border-white/[0.08]' : 'bg-[#FFF1F2] border-b-2 border-[#0F172A]'
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`inline-flex p-1 rounded-xl text-xs font-black ${
                  isDark ? 'bg-[#181C28] border border-white/10' : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                }`}>
                  <button
                    onClick={() => {
                      setReviewStyle('flashcard');
                      setShowReviewAnswer(false);
                    }}
                    className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                      reviewStyle === 'flashcard'
                        ? isDark
                          ? 'bg-[#1DB954] text-[#090A0F]'
                          : 'bg-[#E11D48] text-white border border-[#0F172A]'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-[#0F172A] hover:bg-[#FFF1F2]'
                    }`}
                  >
                    Lật Thẻ SRS
                  </button>
                  <button
                    onClick={() => {
                      setReviewStyle('quiz');
                      setQuizSelectedIdx(null);
                    }}
                    className={`px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-colors ${
                      reviewStyle === 'quiz'
                        ? isDark
                          ? 'bg-[#1DB954] text-[#090A0F]'
                          : 'bg-[#E11D48] text-white border border-[#0F172A]'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-[#0F172A] hover:bg-[#FFF1F2]'
                    }`}
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Trắc Nghiệm</span>
                  </button>
                </div>

                <select
                  value={reviewTopic}
                  onChange={(e) => startReviewSession(reviewScope, e.target.value)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black outline-none cursor-pointer ${
                    isDark
                      ? 'bg-[#181C28] border border-white/10 text-slate-200'
                      : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                  }`}
                  title="Chọn chủ đề ôn tập"
                >
                  <option value="all">Tất cả ({words.length})</option>
                  {topics.map((tp) => (
                    <option key={tp} value={tp}>
                      {tp} ({topicCounts[tp] || 0})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => startReviewSession(reviewScope === 'due' ? 'all' : 'due', reviewTopic)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 ${
                    isDark
                      ? surfaceCls
                      : 'bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                  }`}
                >
                  <RefreshCw className="w-3 h-3 text-[#E11D48]" />
                  <span>
                    {reviewScope === 'due'
                      ? `Đến hạn (${dueWords.length})`
                      : `Toàn bộ (${reviewTopic === 'all' ? words.length : topicCounts[reviewTopic] || 0})`}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMode('learn')}
                className={`p-2 transition-colors cursor-pointer ${
                  isDark
                    ? 'rounded-xl hover:bg-white/10 text-slate-300'
                    : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FFE4E6] text-[#0F172A] rounded-xl'
                }`}
                title="Đóng phòng ôn tập (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Review Stage */}
          {words.length === 0 ? (
            <div className={`flex-1 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 ${surfaceCls}`}>
              <p className="text-sm font-bold">Chưa có từ vựng nào để ôn tập</p>
              <button
                onClick={() => setMode('learn')}
                className="px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black cursor-pointer"
              >
                Quay lại thêm / import từ vựng
              </button>
            </div>
          ) : !currentReviewWord ? (
            <div className={`flex-1 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 ${surfaceCls}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isDark
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-[#DCFCE7] text-[#15803D] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
              }`}>
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
                  className="px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black cursor-pointer"
                >
                  Ôn tập tự do toàn bộ kho ({words.length} từ)
                </button>
                <button
                  onClick={() => setMode('learn')}
                  className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    isDark
                      ? surfaceCls
                      : 'bg-white hover:bg-[#FFF1F2] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                  }`}
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
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-600">
                    <span>Tiến độ phiên ôn</span>
                    <span>
                      {Math.min(reviewPos + 1, reviewQueue.length)} / {reviewQueue.length}
                    </span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden ${
                    isDark ? 'bg-white/10' : 'bg-white border-2 border-[#0F172A]'
                  }`}>
                    <div
                      className={`h-full transition-all duration-300 ${isDark ? 'bg-[#1DB954]' : 'bg-[#E11D48]'}`}
                      style={{
                        width: `${Math.round(((reviewPos + 1) / Math.max(1, reviewQueue.length)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Flashcard Review Card */}
                {reviewStyle === 'flashcard' ? (
                  <div className={`rounded-3xl p-6 sm:p-8 space-y-5 ${
                    isDark
                      ? 'bg-[#12151E] border border-white/10 shadow-lg text-slate-100'
                      : 'bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] text-[#0F172A]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${getTopicBadgeCls(currentReviewWord.topic || 'Chung')}`}>
                        {currentReviewWord.topic || 'Chung'}
                      </span>
                      <button
                        type="button"
                        onClick={() => speakEnglishWord(currentReviewWord.word, false)}
                        className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                          isDark
                            ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300'
                            : 'bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#E11D48]" />
                        <span>Nghe</span>
                      </button>
                    </div>

                    <div className="text-center py-4 space-y-2">
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                        {currentReviewWord.word}
                      </h2>
                      <p className="text-xs font-mono text-slate-500">
                        {currentReviewWord.partOfSpeech ? `(${currentReviewWord.partOfSpeech}) ` : ''}
                        {currentReviewWord.phonetic}
                      </p>
                    </div>

                    {!showReviewAnswer ? (
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => {
                            soundEngine.playSoftClick();
                            setShowReviewAnswer(true);
                          }}
                          className="flex-1 py-3 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black cursor-pointer transition-all"
                        >
                          Hiện nghĩa & ví dụ
                        </button>
                        {reviewQueue.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playSoftClick();
                              setShowReviewAnswer(false);
                              setReviewPos((prev) => (prev + 1) % reviewQueue.length);
                            }}
                            className={`px-4 py-3 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 ${
                              isDark
                                ? surfaceCls
                                : 'bg-white hover:bg-[#FFF1F2] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                            }`}
                            title="Chuyển sang từ tiếp theo"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in duration-150">
                        <div className={`p-4 rounded-2xl text-center space-y-2 ${
                          isDark
                            ? 'bg-[#181C28] border border-white/10'
                            : 'bg-[#FFFDF7] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        }`}>
                          <p className="text-xl font-extrabold text-emerald-600">
                            {currentReviewWord.meaning}
                          </p>
                          {currentReviewWord.example && (
                            <p className="text-xs italic text-slate-600">
                              &ldquo;{currentReviewWord.example}&rdquo;
                            </p>
                          )}
                          {currentReviewWord.exampleTranslation && (
                            <p className="text-[11px] text-slate-500">
                              {currentReviewWord.exampleTranslation}
                            </p>
                          )}
                        </div>

                        {/* 4 SRS Rating Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            disabled={isSubmittingReview}
                            onClick={() => handleRateReview('again')}
                            className={`py-2.5 px-2 rounded-xl text-xs font-black cursor-pointer flex flex-col items-center ${
                              isDark
                                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-400/30'
                                : 'bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                            }`}
                          >
                            <span>Quên</span>
                            <span className="text-[9.5px] opacity-80">Ôn lại ngay</span>
                          </button>
                          <button
                            disabled={isSubmittingReview}
                            onClick={() => handleRateReview('hard')}
                            className={`py-2.5 px-2 rounded-xl text-xs font-black cursor-pointer flex flex-col items-center ${
                              isDark
                                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30'
                                : 'bg-[#FEF08A] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                            }`}
                          >
                            <span>Mờ mờ</span>
                            <span className="text-[9.5px] opacity-80">1 ngày</span>
                          </button>
                          <button
                            disabled={isSubmittingReview}
                            onClick={() => handleRateReview('good')}
                            className={`py-2.5 px-2 rounded-xl text-xs font-black cursor-pointer flex flex-col items-center ${
                              isDark
                                ? 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30'
                                : 'bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#1D4ED8] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                            }`}
                          >
                            <span>Nhớ tốt</span>
                            <span className="text-[9.5px] opacity-80">3–14 ngày</span>
                          </button>
                          <button
                            disabled={isSubmittingReview}
                            onClick={() => handleRateReview('easy')}
                            className={`py-2.5 px-2 rounded-xl text-xs font-black cursor-pointer flex flex-col items-center ${
                              isDark
                                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/30'
                                : 'bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#15803D] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                            }`}
                          >
                            <span>Quá dễ</span>
                            <span className="text-[9.5px] opacity-80">Giãn xa</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 4-CHOICE QUIZ REVIEW */
                  <div className={`rounded-3xl p-6 sm:p-8 space-y-5 ${
                    isDark
                      ? 'bg-[#12151E] border border-white/10 shadow-lg text-slate-100'
                      : 'bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] text-[#0F172A]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#E11D48] uppercase tracking-wider">
                        Chọn nghĩa đúng
                      </span>
                      <button
                        type="button"
                        onClick={() => speakEnglishWord(currentReviewWord.word, false)}
                        className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                          isDark
                            ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300'
                            : 'bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#E11D48]" />
                        <span>Phát âm</span>
                      </button>
                    </div>

                    <div className="text-center py-3 space-y-1">
                      <h2 className="text-3xl font-black">{currentReviewWord.word}</h2>
                      {currentReviewWord.phonetic && (
                        <p className="text-xs font-mono text-slate-500">{currentReviewWord.phonetic}</p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {quizChoices.map((choice, idx) => {
                        const isPicked = quizSelectedIdx === idx;
                        const answered = quizSelectedIdx !== null;
                        let btnStyle = isDark
                          ? 'bg-[#181C28] border border-white/10 hover:border-emerald-400 text-slate-100'
                          : 'bg-white hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]';

                        if (answered) {
                          if (choice.isCorrect) {
                            btnStyle = isDark
                              ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                              : 'bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#15803D]';
                          } else if (isPicked && !choice.isCorrect) {
                            btnStyle = isDark
                              ? 'bg-rose-500/20 border border-rose-400 text-rose-300'
                              : 'bg-[#FFE4E6] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#E11D48]';
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
                            className={`w-full p-3.5 rounded-2xl text-left text-xs font-black transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{choice.meaning}</span>
                            {answered && choice.isCorrect && <Check className="w-4 h-4 text-emerald-600" />}
                            {answered && isPicked && !choice.isCorrect && <X className="w-4 h-4 text-[#E11D48]" />}
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
          </div>
        </div>,
        document.body
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD / EDIT SINGLE VOCAB WORD                                 */}
      {/* ===================================================================== */}
      {typeof document !== 'undefined' && isWordModalOpen && createPortal(
        <div className="fixed inset-0 z-[160] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`rounded-3xl max-w-md w-full overflow-hidden ${
              isDark
                ? 'bg-[#12151E] border border-white/10 shadow-2xl text-white'
                : 'bg-[#FFFDF7] border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] text-[#0F172A]'
            }`}
          >
            <div
              className={`px-6 py-4 flex items-center justify-between ${
                isDark ? 'bg-[#181C28] border-b border-white/10' : 'bg-[#FFF1F2] border-b-2 border-[#0F172A]'
              }`}
            >
              <h3 className="font-black text-sm">
                {editingWord ? 'Chỉnh Sửa Từ Vựng' : 'Thêm Từ Vựng Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsWordModalOpen(false)}
                className={`p-1.5 cursor-pointer transition-colors ${
                  isDark
                    ? 'rounded-xl hover:bg-white/10 text-slate-300'
                    : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FFE4E6] text-[#0F172A] rounded-xl'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWord} className="p-6 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-black ${isDark ? 'text-slate-300' : 'text-[#0F172A]'}`}>
                    Từ tiếng Anh *
                  </label>
                  <button
                    type="button"
                    disabled={isAutoFillingSingle}
                    onClick={handleAiAutoFillSingle}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/25'
                        : 'bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                    }`}
                  >
                    {isAutoFillingSingle ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#E11D48]" />
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
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold outline-none ${
                    isDark
                      ? 'bg-[#181C28] border border-white/10 text-white focus:border-[#1DB954]'
                      : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`text-xs font-black block mb-1 ${isDark ? 'text-slate-300' : 'text-[#0F172A]'}`}>
                    Phiên âm IPA
                  </label>
                  <input
                    type="text"
                    value={formPhonetic}
                    onChange={(e) => setFormPhonetic(e.target.value)}
                    placeholder="/rɪˈzɪl.jənt/"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono outline-none ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-white focus:border-[#1DB954]'
                        : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-black block mb-1 ${isDark ? 'text-slate-300' : 'text-[#0F172A]'}`}>
                    Loại từ
                  </label>
                  <input
                    type="text"
                    value={formPos}
                    onChange={(e) => setFormPos(e.target.value)}
                    placeholder="adj, noun, verb..."
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-white focus:border-[#1DB954]'
                        : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-black block mb-1 ${isDark ? 'text-slate-300' : 'text-[#0F172A]'}`}>
                  Nghĩa tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  value={formMeaning}
                  onChange={(e) => setFormMeaning(e.target.value)}
                  placeholder="VD: Kiên cường, mau phục hồi"
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold outline-none ${
                    isDark
                      ? 'bg-[#181C28] border border-white/10 text-white focus:border-[#1DB954]'
                      : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-black block mb-1 ${isDark ? 'text-slate-300' : 'text-[#0F172A]'}`}>
                  Câu ví dụ
                </label>
                <input
                  type="text"
                  value={formExample}
                  onChange={(e) => setFormExample(e.target.value)}
                  placeholder="VD: She remained resilient despite setbacks."
                  className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none ${
                    isDark
                      ? 'bg-[#181C28] border border-white/10 text-white focus:border-[#1DB954]'
                      : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`text-xs font-black block mb-1 ${isDark ? 'text-slate-300' : 'text-[#0F172A]'}`}>
                    Dịch ví dụ
                  </label>
                  <input
                    type="text"
                    value={formExampleTrans}
                    onChange={(e) => setFormExampleTrans(e.target.value)}
                    placeholder="Cô ấy vẫn kiên cường..."
                    className={`w-full px-3 py-2 rounded-xl text-xs outline-none ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-white focus:border-[#1DB954]'
                        : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-black block mb-1 ${isDark ? 'text-slate-300' : 'text-[#0F172A]'}`}>
                    Chủ đề / Bộ thẻ
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="Để 'Tự động' để AI tự phân loại..."
                    className={`w-full px-3 py-2 rounded-xl text-xs outline-none ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-white focus:border-[#1DB954]'
                        : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsWordModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${
                    isDark
                      ? 'text-slate-300 hover:bg-white/10'
                      : 'bg-white hover:bg-[#FFF1F2] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingWord}
                  className="px-5 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black cursor-pointer disabled:opacity-50"
                >
                  {isSavingWord ? 'Đang lưu...' : 'Lưu Từ Vựng'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: SMART AUTO-IMPORT (TEXT/PARAGRAPH, CSV/TXT, IMAGE OCR)       */}
      {/* ===================================================================== */}
      {typeof document !== 'undefined' && isImportModalOpen && createPortal(
        <div className="fixed inset-0 z-[160] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div
            className={`rounded-3xl max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden ${
              isDark
                ? 'bg-[#12151E] border border-white/10 shadow-2xl text-white'
                : 'bg-[#FFFDF7] border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] text-[#0F172A]'
            }`}
          >
            {/* Header */}
            <div
              className={`px-5 py-4 flex items-center justify-between shrink-0 ${
                isDark ? 'bg-[#181C28] border-b border-white/10' : 'bg-[#FFF1F2] border-b-2 border-[#0F172A]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Import Từ Vựng Tự Động</h3>
                  <p className="text-[11px] text-slate-500">
                    Dán danh sách từ, đoạn văn, file CSV/TXT hoặc ảnh chụp — AI tự động điền đầy đủ nghĩa & IPA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className={`p-1.5 cursor-pointer transition-colors ${
                  isDark
                    ? 'rounded-xl hover:bg-white/10 text-slate-300'
                    : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FFE4E6] text-[#0F172A] rounded-xl'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              {/* Source Tabs */}
              <div
                className={`flex items-center gap-1.5 p-1 rounded-xl text-xs font-black ${
                  isDark
                    ? 'bg-[#181C28] border border-white/10'
                    : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setImportTab('text')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    importTab === 'text'
                      ? isDark
                        ? 'bg-[#1DB954] text-[#090A0F]'
                        : 'bg-[#E11D48] text-white border border-[#0F172A]'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-[#0F172A] hover:bg-[#FFF1F2]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Dán Chữ / Đoạn Văn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('file')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    importTab === 'file'
                      ? isDark
                        ? 'bg-[#1DB954] text-[#090A0F]'
                        : 'bg-[#E11D48] text-white border border-[#0F172A]'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-[#0F172A] hover:bg-[#FFF1F2]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>File CSV / TXT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('image')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    importTab === 'image'
                      ? isDark
                        ? 'bg-[#1DB954] text-[#090A0F]'
                        : 'bg-[#E11D48] text-white border border-[#0F172A]'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-[#0F172A] hover:bg-[#FFF1F2]'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Chụp / Tải Ảnh</span>
                </button>
              </div>

              {/* Topic input */}
              <div className="flex items-center gap-2">
                <label className={`text-xs font-black shrink-0 ${isDark ? 'text-slate-300' : 'text-[#0F172A]'}`}>
                  Gắn nhãn chủ đề:
                </label>
                <input
                  type="text"
                  value={importTopic}
                  onChange={(e) => setImportTopic(e.target.value)}
                  placeholder="Để 'Tự động' để hệ thống tự bắt key chia tag theo từng từ..."
                  className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-semibold outline-none ${
                    isDark
                      ? 'bg-[#181C28] border border-white/10 text-white focus:border-[#1DB954]'
                      : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                  }`}
                />
              </div>

              {importTab === 'text' && (
                <div className="space-y-2.5">
                  <textarea
                    rows={5}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={`Bạn có thể nhập theo bất kỳ kiểu nào:\n• Danh sách từ: resilient, procrastinate, streamline\n• Dán cả đoạn bài báo tiếng Anh (AI tự lọc từ hay)\n• Hoặc dạng: word - nghĩa tiếng Việt\n• Hoặc yêu cầu AI: "10 từ vựng tiếng Anh chủ đề phỏng vấn IT"`}
                    className={`w-full p-3.5 rounded-2xl text-xs leading-relaxed outline-none resize-none ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-white focus:border-[#1DB954]'
                        : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isExtracting || !importText.trim()}
                    onClick={() => handleRunAutoExtract()}
                    className="w-full py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt,.tsv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-2 cursor-pointer transition-all ${
                      isDark
                        ? 'border-white/20 hover:border-emerald-400 bg-[#181C28]/60 hover:bg-[#181C28]'
                        : 'border-[#0F172A] bg-white hover:bg-[#FFF1F2]'
                    }`}
                  >
                    <Upload className="w-7 h-7 text-[#E11D48] mx-auto" />
                    <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                      Bấm để chọn file <code>.xlsx</code>, <code>.csv</code> hoặc <code>.txt</code>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Hỗ trợ trực tiếp file Excel (<code>.xlsx</code>), Google Sheets, Quizlet (hoặc file chỉ có danh sách từ để AI tự dịch).
                    </p>
                  </div>

                  {/* Excel / CSV Column Guide */}
                  <div
                    className={`rounded-2xl p-3.5 space-y-2.5 ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10'
                        : 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                        Cấu trúc 7 cột chuẩn trên Excel / Google Sheets
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopySpreadsheetSample}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 cursor-pointer ${
                            isDark
                              ? 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
                              : 'bg-[#FEF9C3] hover:bg-[#FDE047] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                          }`}
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy bảng mẫu</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadExcelTemplate}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 cursor-pointer ${
                            isDark
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-[#DCFCE7] hover:bg-[#BBF7D0] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#15803D]'
                          }`}
                        >
                          <Download className="w-3 h-3" />
                          <span>Tải file Excel mẫu (.xlsx)</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                      <div className={`px-2.5 py-1.5 rounded-lg border ${isDark ? 'bg-[#12151E] border-white/10' : 'bg-[#FFFDF7] border-[#0F172A]'}`}>
                        <code className="font-black text-[#E11D48]">word</code>{' '}
                        <span className="text-[#E11D48] font-black">*</span>{' '}
                        <span className="text-slate-600">— Từ tiếng Anh (VD: resilient)</span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-lg border ${isDark ? 'bg-[#12151E] border-white/10' : 'bg-[#FFFDF7] border-[#0F172A]'}`}>
                        <code className="font-black text-[#E11D48]">meaning</code>{' '}
                        <span className="text-[#E11D48] font-black">*</span>{' '}
                        <span className="text-slate-600">— Nghĩa tiếng Việt</span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-lg border ${isDark ? 'bg-[#12151E] border-white/10' : 'bg-[#FFFDF7] border-[#0F172A]'}`}>
                        <code className={`font-bold ${isDark ? 'text-slate-200' : 'text-[#0F172A]'}`}>phonetic</code>{' '}
                        <span className="text-slate-500">— Phiên âm IPA (VD: /rɪˈzɪliənt/)</span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-lg border ${isDark ? 'bg-[#12151E] border-white/10' : 'bg-[#FFFDF7] border-[#0F172A]'}`}>
                        <code className={`font-bold ${isDark ? 'text-slate-200' : 'text-[#0F172A]'}`}>partOfSpeech</code>{' '}
                        <span className="text-slate-500">— Từ loại (noun, verb, adj...)</span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-lg border ${isDark ? 'bg-[#12151E] border-white/10' : 'bg-[#FFFDF7] border-[#0F172A]'}`}>
                        <code className={`font-bold ${isDark ? 'text-slate-200' : 'text-[#0F172A]'}`}>example</code>{' '}
                        <span className="text-slate-500">— Câu ví dụ tiếng Anh</span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-lg border ${isDark ? 'bg-[#12151E] border-white/10' : 'bg-[#FFFDF7] border-[#0F172A]'}`}>
                        <code className={`font-bold ${isDark ? 'text-slate-200' : 'text-[#0F172A]'}`}>exampleTranslation</code>{' '}
                        <span className="text-slate-500">— Dịch nghĩa ví dụ</span>
                      </div>
                      <div className={`sm:col-span-2 px-2.5 py-1.5 rounded-lg border ${isDark ? 'bg-[#12151E] border-white/10' : 'bg-[#FFFDF7] border-[#0F172A]'}`}>
                        <code className={`font-bold ${isDark ? 'text-slate-200' : 'text-[#0F172A]'}`}>topic</code>{' '}
                        <span className="text-slate-500">
                          — Chủ đề / Tag (để trống hệ thống sẽ tự động bắt keyword chia chủ đề)
                        </span>
                      </div>
                    </div>

                    <p className="text-[10.5px] text-slate-500 leading-relaxed">
                      Mẹo: Bạn chỉ cần tối thiểu 2 cột <code>word, meaning</code> là đã import thẳng vào đúng cột không cần AI; hoặc file chỉ có 1 cột từ tiếng Anh để AI tự điền phần còn lại.
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
                    className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-2 cursor-pointer transition-all ${
                      isDark
                        ? 'border-white/20 hover:border-emerald-400 bg-[#181C28]/60 hover:bg-[#181C28]'
                        : 'border-[#0F172A] bg-white hover:bg-[#FFF1F2]'
                    }`}
                  >
                    {importImagePreview ? (
                      <img
                        src={importImagePreview}
                        alt="Uploaded vocab source"
                        className="max-h-40 mx-auto rounded-xl object-contain"
                      />
                    ) : (
                      <>
                        <ImageIcon className="w-7 h-7 text-[#E11D48] mx-auto" />
                        <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                          Bấm chọn ảnh hoặc nhấn{' '}
                          <kbd className="px-1.5 py-0.5 rounded bg-[#FEF9C3] border border-[#0F172A] text-[#0F172A] font-mono font-black text-[11px]">
                            Ctrl + V
                          </kbd>{' '}
                          để dán ảnh chụp màn hình
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Chụp nhanh bằng <code>Win + Shift + S</code> rồi bấm <code>Ctrl + V</code> ngay vào cửa sổ này — AI tự đọc và trích xuất từ vựng.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>Hỗ trợ JPG, PNG, WebP hoặc ảnh copy từ clipboard.</span>
                    {importImagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setImportImagePreview('');
                          setExtractedDrafts([]);
                        }}
                        className="text-[#E11D48] font-black hover:underline cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                  {isExtracting && (
                    <div className="flex items-center justify-center gap-2 text-xs font-black text-[#E11D48]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI đang đọc ảnh và tạo thẻ từ vựng...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Extracted Words */}
              {extractedDrafts.length > 0 && (
                <div className={`space-y-2.5 pt-3 border-t-2 ${isDark ? 'border-white/10' : 'border-[#0F172A]/15'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                      Xem trước ({extractedDrafts.filter((d) => d.selected !== false).length}/{extractedDrafts.length} từ được chọn)
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtractedDrafts([])}
                      className="text-[11px] text-[#E11D48] font-black hover:underline cursor-pointer"
                    >
                      Xóa danh sách
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {extractedDrafts.map((draft, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                          draft.selected === false
                            ? isDark
                              ? 'bg-[#181C28]/50 border border-white/10 opacity-50'
                              : 'bg-slate-100 border-2 border-[#0F172A]/40 opacity-60'
                            : isDark
                            ? 'bg-[#181C28] border border-emerald-400/30'
                            : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
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
                          className="mt-1 rounded border-[#0F172A] accent-[#E11D48]"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-extrabold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>{draft.word}</span>
                            {draft.topic && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#DCFCE7] border border-[#0F172A] text-[#15803D]">
                                {draft.topic}
                              </span>
                            )}
                            {draft.partOfSpeech && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FFE4E6] border border-[#0F172A] text-[#E11D48]">
                                {draft.partOfSpeech}
                              </span>
                            )}
                            {draft.phonetic && (
                              <span className="text-[11px] font-mono text-slate-500">{draft.phonetic}</span>
                            )}
                          </div>
                          <p className="font-bold text-emerald-700">{draft.meaning}</p>
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
            <div
              className={`px-5 py-3.5 flex items-center justify-end gap-2 shrink-0 ${
                isDark ? 'border-t border-white/10 bg-[#181C28]' : 'border-t-2 border-[#0F172A] bg-[#FFF1F2]'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${
                  isDark
                    ? 'text-slate-300 hover:bg-white/10'
                    : 'bg-white hover:bg-[#FFE4E6] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                }`}
              >
                Đóng
              </button>
              {extractedDrafts.length > 0 && (
                <button
                  type="button"
                  disabled={isSavingImport}
                  onClick={handleSaveExtractedBatch}
                  className="px-5 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
        </div>,
        document.body
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: BIG CENTERED STUDY FLASHCARD POPUP (BLURRED BACKDROP)        */}
      {/* ===================================================================== */}
      {typeof document !== 'undefined' && isStudyPopupOpen && filteredWords[deckIndex] && createPortal((() => {
        const card = filteredWords[deckIndex];
        const badge = getMasteryBadge(card.srsLevel || 0);
        const topicLabel = card.topic?.trim() || 'Chung';
        const progressPct = Math.round(((deckIndex + 1) / filteredWords.length) * 100);

        return (
          <div
            onClick={() => setIsStudyPopupOpen(false)}
            className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl max-h-[90dvh] rounded-3xl overflow-hidden flex flex-col transition-all ${
                isDark
                  ? 'bg-[#12151E] border border-white/10 shadow-2xl text-white'
                  : 'bg-[#FFFDF7] border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] text-[#0F172A]'
              }`}
            >
              {/* Top Progress Bar */}
              <div className={`h-2 w-full shrink-0 ${isDark ? 'bg-white/5' : 'bg-white border-b-2 border-[#0F172A]'}`}>
                <div
                  className={`h-full transition-all duration-300 ${
                    isDark ? 'bg-[#1DB954]' : 'bg-[#E11D48]'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Popup Header */}
              <div
                className={`px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0 ${
                  isDark ? 'border-b border-white/[0.08] bg-[#181C28]/70' : 'border-b-2 border-[#0F172A] bg-[#FFF1F2]'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${getTopicBadgeCls(
                      topicLabel
                    )}`}
                  >
                    {topicLabel}
                  </span>
                  <span className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setIsDeckFlipped(false);
                      setDeckIndex((prev) => (prev - 1 + filteredWords.length) % filteredWords.length);
                    }}
                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                      isDark
                        ? 'border border-white/10 hover:bg-white/10 text-slate-300'
                        : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FEF9C3] text-[#0F172A]'
                    }`}
                    title="Từ trước (←)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span
                    className={`text-xs font-mono font-black px-2.5 py-1 rounded-xl ${
                      isDark
                        ? 'bg-white/5 text-slate-300'
                        : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                    }`}
                  >
                    {deckIndex + 1} / {filteredWords.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setIsDeckFlipped(false);
                      setDeckIndex((prev) => (prev + 1) % filteredWords.length);
                    }}
                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                      isDark
                        ? 'border border-white/10 hover:bg-white/10 text-slate-300'
                        : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FEF9C3] text-[#0F172A]'
                    }`}
                    title="Từ tiếp / Next (→)"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSaved(card)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      card.isSaved
                        ? isDark
                          ? 'text-amber-400 bg-amber-500/15'
                          : 'bg-[#FEF08A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-amber-600'
                        : isDark
                        ? 'hover:bg-white/10 text-slate-300'
                        : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FEF9C3] text-[#0F172A]'
                    }`}
                    title={card.isSaved ? 'Bỏ khỏi Kho Đã Lưu' : 'Lưu vào Kho Đã Lưu ⭐'}
                  >
                    <Star className={`w-4 h-4 ${card.isSaved ? 'fill-amber-400 text-amber-500' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditWordModal(card)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isDark
                        ? 'hover:bg-white/10 text-slate-300'
                        : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FEF9C3] text-[#0F172A]'
                    }`}
                    title="Chỉnh sửa từ này"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStudyPopupOpen(false)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isDark
                        ? 'hover:bg-white/10 text-slate-300'
                        : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FFE4E6] text-[#0F172A]'
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
                className="flex-1 min-h-[240px] sm:min-h-[280px] overflow-y-auto p-6 sm:p-8 flex flex-col justify-between cursor-pointer select-none"
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
                          className={`px-2.5 py-0.5 rounded-lg font-black text-xs ${
                            isDark
                              ? 'bg-white/10 text-rose-300'
                              : 'bg-[#FFE4E6] text-[#E11D48] border border-[#0F172A]'
                          }`}
                        >
                          {card.partOfSpeech}
                        </span>
                      )}
                      {card.phonetic && (
                        <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
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
                        className={`px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/35 border border-rose-400/30'
                            : 'bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        }`}
                      >
                        <Volume2 className="w-4 h-4 text-[#E11D48]" />
                        <span>Phát âm chuẩn (S)</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakEnglishWord(card.word, true);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                            : 'bg-white hover:bg-[#FFF1F2] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
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
                        className={`text-sm font-black uppercase tracking-wider ${
                          isDark ? 'text-rose-300' : 'text-[#E11D48]'
                        }`}
                      >
                        {card.word}
                      </span>
                      {card.phonetic && (
                        <span className="text-xs font-mono text-slate-500">{card.phonetic}</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakEnglishWord(card.word, false);
                        }}
                        className={`p-1.5 rounded-xl cursor-pointer ${
                          isDark
                            ? 'hover:bg-white/10 text-rose-300'
                            : 'bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border border-[#0F172A]'
                        }`}
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3
                      className={`text-2xl sm:text-4xl font-extrabold leading-snug ${
                        isDark ? 'text-[#1DB954]' : 'text-emerald-700'
                      }`}
                    >
                      {card.meaning}
                    </h3>

                    {card.example && (
                      <div
                        className={`p-4 sm:p-5 rounded-2xl text-left space-y-1.5 max-w-xl mx-auto ${
                          isDark
                            ? 'bg-[#181C28] border border-white/10'
                            : 'bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-bold italic leading-relaxed">
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
                                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/35'
                                : 'bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                            }`}
                            title="Nghe câu ví dụ"
                          >
                            <Volume2 className="w-4 h-4 text-[#E11D48]" />
                          </button>
                        </div>
                        {card.exampleTranslation && (
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {card.exampleTranslation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5 pt-4">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>
                    {isDeckFlipped
                      ? 'Chạm thẻ để quay về mặt từ vựng'
                      : 'Chạm thẻ hoặc bấm Space để xem nghĩa & ví dụ'}
                  </span>
                </div>

                {/* Sentence Making Practice Section */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`mt-5 pt-4 border-t-2 ${
                    isDark ? 'border-white/[0.08]' : 'border-[#0F172A]/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playSoftClick();
                        setIsSentenceBoxOpen((prev) => !prev);
                      }}
                      className={`text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                        isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-[#E11D48] hover:text-[#BE123C]'
                      }`}
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      <span>Luyện đặt câu với &ldquo;{card.word}&rdquo;</span>
                    </button>
                    <span className="text-[10.5px] font-semibold text-slate-500">
                      {isSentenceBoxOpen ? 'Thu gọn' : 'Bấm để tự đặt câu & nhờ AI sửa'}
                    </span>
                  </div>

                  {isSentenceBoxOpen && (
                    <div className="mt-3 space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={userSentence}
                          onChange={(e) => setUserSentence(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCheckSentence(card);
                            }
                          }}
                          placeholder={`Viết 1 câu tiếng Anh có dùng từ "${card.word}"...`}
                          className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none transition-all ${
                            isDark
                              ? 'bg-[#181C28] border border-white/10 text-white placeholder:text-slate-500 focus:border-[#1DB954]'
                              : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                          }`}
                        />
                        <button
                          type="button"
                          disabled={isCheckingSentence || !userSentence.trim()}
                          onClick={() => handleCheckSentence(card)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 ${
                            isDark
                              ? 'bg-[#1DB954] text-[#090A0F] hover:brightness-110'
                              : 'bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
                          }`}
                        >
                          {isCheckingSentence ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>AI Chấm</span>
                        </button>
                      </div>

                      {sentenceFeedback && (
                        <div
                          className={`p-3.5 rounded-2xl text-xs space-y-2 ${
                            sentenceFeedback.isCorrect
                              ? isDark
                                ? 'bg-emerald-500/10 border border-emerald-500/25'
                                : 'bg-[#DCFCE7] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
                              : isDark
                              ? 'bg-amber-500/10 border border-amber-500/25'
                              : 'bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`font-black ${
                                sentenceFeedback.isCorrect
                                  ? isDark
                                    ? 'text-emerald-300'
                                    : 'text-[#15803D]'
                                  : isDark
                                  ? 'text-amber-300'
                                  : 'text-[#0F172A]'
                              }`}
                            >
                              {sentenceFeedback.isCorrect ? '✨ Đặt câu rất tự nhiên!' : '💡 Góp ý chỉnh nhẹ:'}
                            </span>
                            <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-full bg-white text-[#0F172A] border border-[#0F172A]">
                              {sentenceFeedback.score}/10
                            </span>
                          </div>

                          <p className={`leading-relaxed font-medium ${isDark ? 'text-slate-200' : 'text-[#0F172A]'}`}>
                            {sentenceFeedback.feedbackVi}
                          </p>

                          <div
                            className={`p-2.5 rounded-xl space-y-1 ${
                              isDark ? 'bg-[#12151E] border border-white/10' : 'bg-white border-2 border-[#0F172A]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-black text-[#E11D48] leading-relaxed">
                                &ldquo;{sentenceFeedback.correctedSentence}&rdquo;
                              </p>
                              <button
                                type="button"
                                onClick={() => speakEnglishWord(sentenceFeedback.correctedSentence, false)}
                                className="p-1 rounded-lg bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border border-[#0F172A] shrink-0 cursor-pointer"
                                title="Nghe phát âm câu gợi ý"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {sentenceFeedback.naturalTranslationVi && (
                              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                {sentenceFeedback.naturalTranslationVi}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={isSavingSentenceExample}
                              onClick={() => handleSaveSentenceAsExample(card)}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                                isDark
                                  ? 'bg-white/10 hover:bg-white/15 text-white'
                                  : 'bg-white hover:bg-[#FFF1F2] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                              }`}
                            >
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>{isSavingSentenceExample ? 'Đang lưu...' : 'Lưu làm ví dụ của thẻ'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Popup Footer Controls */}
              <div
                className={`px-4 sm:px-6 py-3.5 flex flex-col gap-2 shrink-0 ${
                  isDark ? 'border-t border-white/[0.08] bg-[#181C28]/70' : 'border-t-2 border-[#0F172A] bg-[#FFF1F2]'
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
                    className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                      isDark
                        ? 'bg-[#12151E] border border-white/10 hover:bg-white/10 text-white'
                        : 'bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
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
                    className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-transform active:scale-95 ${
                      isDark
                        ? 'bg-[#1DB954] text-[#090A0F] hover:brightness-110'
                        : 'bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
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
                    className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                      isDark
                        ? 'bg-[#12151E] border border-white/10 hover:bg-white/10 text-white'
                        : 'bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                    }`}
                  >
                    <span>Từ tiếp</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <p className="hidden sm:block text-center text-[10.5px] font-semibold text-slate-500">
                  Phím tắt: <strong>← / →</strong> chuyển từ • <strong>Space</strong> lật thẻ •{' '}
                  <strong>S</strong> phát âm • <strong>Esc</strong> đóng
                </p>
              </div>
            </div>
          </div>
        );
      })(), document.body)}

      {/* ===================================================================== */}
      {/* MODAL 4: SMART DICTIONARY (WORDS, MODAL VERBS, IDIOMS, PHRASAL VERBS) */}
      {/* ===================================================================== */}
      {typeof document !== 'undefined' && isDictOpen && createPortal(
        <div
          onClick={() => setIsDictOpen(false)}
          className="fixed inset-0 z-[155] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[90dvh] rounded-3xl overflow-hidden flex flex-col ${
              isDark
                ? 'bg-[#12151E] border border-white/10 shadow-2xl text-white'
                : 'bg-[#FFFDF7] border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] text-[#0F172A]'
            }`}
          >
            {/* Header */}
            <div
              className={`px-5 py-4 flex items-center justify-between gap-3 shrink-0 ${
                isDark ? 'border-b border-white/[0.08] bg-[#181C28]/80' : 'border-b-2 border-[#0F172A] bg-[#FFF1F2]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FEF08A] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center justify-center shrink-0">
                  <BookMarked className="w-4 h-4 text-[#E11D48]" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Từ Điển Song Ngữ Thông Minh (Anh ↔ Việt)</h3>
                  <p className="text-[11px] text-slate-500">
                    Tra 2 chiều Anh-Việt & Việt-Anh cho Từ vựng, Modal Verbs, Idioms (IDM) & Phrasal Verbs
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDictOpen(false)}
                className={`p-1.5 cursor-pointer transition-colors ${
                  isDark
                    ? 'rounded-xl hover:bg-white/10 text-slate-300'
                    : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FFE4E6] text-[#0F172A] rounded-xl'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: 'auto', label: 'Tự nhận diện' },
                    { id: 'word', label: 'Từ vựng' },
                    { id: 'modal_verb', label: 'Modal Verbs' },
                    { id: 'idiom', label: 'Idioms (IDM)' },
                    { id: 'phrasal_verb', label: 'Phrasal Verbs' },
                  ] as Array<{ id: DictionaryCategory; label: string }>
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setDictCategory(tab.id);
                      if (dictQuery.trim() && (dictResult || dictError)) {
                        handleLookupDictionary(dictQuery, tab.id);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      dictCategory === tab.id
                        ? isDark
                          ? 'bg-[#1DB954] text-[#090A0F]'
                          : 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        : isDark
                        ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                        : 'bg-white hover:bg-[#FEF9C3] text-[#0F172A] border-2 border-[#0F172A]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLookupDictionary();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={dictQuery}
                    onChange={(e) => setDictQuery(e.target.value)}
                    placeholder="Nhập tiếng Anh hoặc tiếng Việt (vd: resilient, bỏ cuộc, nên làm gì, may mắn)..."
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-bold outline-none ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-white placeholder:text-slate-500 focus:border-[#1DB954]'
                        : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLookingUpDict || !dictQuery.trim()}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 ${
                    isDark
                      ? 'bg-[#1DB954] text-[#090A0F] hover:brightness-110'
                      : 'bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
                  }`}
                >
                  {isLookingUpDict ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Tra ngay</span>
                </button>
              </form>

              {/* Quick Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black text-slate-500 mr-1">Gợi ý nhanh:</span>
                {DICT_QUICK_CHIPS[dictCategory].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleLookupDictionary(chip, dictCategory)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                        : 'bg-[#FEF9C3] hover:bg-[#FDE047] border border-[#0F172A] text-[#0F172A]'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Lookup Result Card */}
              {isLookingUpDict && (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-[#E11D48]" />
                  <span>Đang tra cứu chi tiết nghĩa, công thức và ví dụ...</span>
                </div>
              )}

              {!isLookingUpDict && dictError && (
                <div
                  className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDark
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-200'
                      : 'bg-[#FFE4E6] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A]'
                  }`}
                >
                  <div className="space-y-0.5 text-xs">
                    <p className="font-black text-[#E11D48]">Chưa tra cứu được từ này</p>
                    <p className={isDark ? 'text-rose-200/85' : 'text-[#0F172A]/80 font-semibold'}>{dictError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLookupDictionary()}
                    className="px-3.5 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-xs font-black shrink-0 cursor-pointer"
                  >
                    Thử tra lại
                  </button>
                </div>
              )}

              {!isLookingUpDict && dictResult && dictResult.found === false && (
                <div
                  className={`rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-150 ${
                    isDark
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-100'
                      : 'bg-[#FFFBEB] border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isDark
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-[#FEF08A] border-2 border-[#0F172A] text-[#0F172A]'
                      }`}
                    >
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm sm:text-base font-black tracking-tight">
                        Không tìm thấy &ldquo;{dictResult.term}&rdquo; trong từ điển chuẩn
                      </h4>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-100/85' : 'text-[#0F172A]/80 font-medium'}`}>
                        {dictResult.notFoundReasonVi ||
                          'Từ hoặc cụm từ bạn nhập không có trong từ điển tiếng Anh chuẩn. Hãy kiểm tra lại chính tả hoặc thử các gợi ý tự nhiên bên dưới.'}
                      </p>
                    </div>
                  </div>

                  {Array.isArray(dictResult.suggestions) && dictResult.suggestions.length > 0 && (
                    <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-black text-slate-500 mr-1">Có phải bạn muốn tìm:</span>
                      {dictResult.suggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleLookupDictionary(sug, dictCategory)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                            isDark
                              ? 'bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10'
                              : 'bg-white hover:bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]/30'
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isLookingUpDict && dictResult && dictResult.found !== false && (
                <div
                  className={`rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150 ${
                    isDark
                      ? 'bg-[#181C28] border border-white/10'
                      : 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xl sm:text-2xl font-black tracking-tight">{dictResult.term}</h4>
                        <span className="text-[10.5px] font-black px-2 py-0.5 rounded-full bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]">
                          {dictResult.partOfSpeech || dictResult.category}
                        </span>
                      </div>
                      {dictResult.phonetic && (
                        <p className="text-xs font-mono text-slate-500 mt-0.5">{dictResult.phonetic}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => speakEnglishWord(dictResult.term, false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                          isDark
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/35'
                            : 'bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#E11D48]" />
                        <span>Phát âm</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSavingDictWord}
                        onClick={handleSaveDictEntryToVocab}
                        className="px-3 py-1.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingDictWord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>Lưu vào kho</span>
                      </button>
                    </div>
                  </div>

                  {/* Meanings */}
                  <div className="space-y-1.5">
                    <p className={`text-base font-extrabold ${isDark ? 'text-[#1DB954]' : 'text-emerald-700'}`}>
                      {dictResult.shortMeaningVi}
                    </p>
                    {dictResult.detailedExplanationVi && (
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {dictResult.detailedExplanationVi}
                      </p>
                    )}
                  </div>

                  {/* Grammar Formula / Usage Notes */}
                  {(dictResult.grammarFormula || dictResult.usageNotesVi) && (
                    <div
                      className={`p-3 rounded-xl text-xs space-y-1.5 ${
                        isDark ? 'bg-[#12151E] border border-white/10' : 'bg-[#FFFDF7] border-2 border-[#0F172A]'
                      }`}
                    >
                      {dictResult.grammarFormula && (
                        <p>
                          <strong className="text-[#E11D48]">Cấu trúc / Cách dùng:</strong>{' '}
                          <span className="font-mono font-bold text-[11.5px]">{dictResult.grammarFormula}</span>
                        </p>
                      )}
                      {dictResult.usageNotesVi && (
                        <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                          <strong className="text-amber-600">Lưu ý ngữ cảnh:</strong> {dictResult.usageNotesVi}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Synonyms & Antonyms */}
                  {(dictResult.synonyms.length > 0 || dictResult.antonyms.length > 0) && (
                    <div className="flex flex-wrap gap-3 text-[11px]">
                      {dictResult.synonyms.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-black text-slate-500">Đồng nghĩa:</span>
                          {dictResult.synonyms.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleLookupDictionary(s, 'auto')}
                              className={`px-2 py-0.5 rounded-md font-bold hover:underline cursor-pointer ${
                                isDark
                                  ? 'bg-sky-500/15 text-sky-300'
                                  : 'bg-[#DBEAFE] text-[#1D4ED8] border border-[#0F172A]'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                      {dictResult.antonyms.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-black text-slate-500">Trái nghĩa:</span>
                          {dictResult.antonyms.map((a) => (
                            <button
                              key={a}
                              type="button"
                              onClick={() => handleLookupDictionary(a, 'auto')}
                              className={`px-2 py-0.5 rounded-md font-bold hover:underline cursor-pointer ${
                                isDark
                                  ? 'bg-rose-500/15 text-rose-300'
                                  : 'bg-[#FFE4E6] text-[#E11D48] border border-[#0F172A]'
                              }`}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bilingual Examples */}
                  {dictResult.examples.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Ví dụ thực tế
                      </span>
                      {dictResult.examples.map((ex, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-xl flex items-start justify-between gap-2 text-xs ${
                            isDark
                              ? 'bg-[#12151E] border border-white/10'
                              : 'bg-[#FFFDF7] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold italic">&ldquo;{ex.en}&rdquo;</p>
                            {ex.vi && <p className="text-[11px] text-slate-500">{ex.vi}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => speakEnglishWord(ex.en, false)}
                            className={`p-1.5 rounded-lg shrink-0 cursor-pointer ${
                              isDark
                                ? 'hover:bg-white/10 text-rose-300'
                                : 'bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border border-[#0F172A]'
                            }`}
                            title="Nghe câu ví dụ"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: TOPIC WORDS POPUP (SHOWS WORDS WHEN CLICKING A TOPIC DECK)   */}
      {/* ===================================================================== */}
      {typeof document !== 'undefined' && topicPopupName && createPortal(
        <div
          onClick={closeTopicPopup}
          className="fixed inset-0 z-[140] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-5xl max-h-[90dvh] rounded-3xl overflow-hidden flex flex-col ${
              isDark
                ? 'bg-[#0E1118] border border-white/10 shadow-2xl text-white'
                : 'bg-[#FFFDF7] border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] text-[#0F172A]'
            }`}
          >
            {/* Topic Popup Header */}
            <div
              className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                isDark ? 'bg-[#12151E] border-b border-white/[0.08]' : 'bg-[#FFF1F2] border-b-2 border-[#0F172A]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`text-xs font-black px-3 py-1 rounded-xl border ${getTopicBadgeCls(
                    topicPopupName
                  )}`}
                >
                  {topicPopupName}
                </span>
                <span className="text-xs font-black text-slate-500">
                  ({filteredWords.length} từ)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={filteredWords.length === 0}
                  onClick={() => openStudyPopupAt()}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                    isDark
                      ? 'bg-[#1DB954]/15 border border-[#1DB954]/35 text-[#1DB954] hover:bg-[#1DB954]/25'
                      : 'bg-[#FEF9C3] hover:bg-[#FDE047] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A]'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#E11D48]" />
                  <span>Học Thẻ Lớn</span>
                </button>
                <button
                  type="button"
                  disabled={filteredWords.length === 0}
                  onClick={() => {
                    const tp = topicPopupName;
                    closeTopicPopup();
                    setMode('review');
                    startReviewSession('all', tp);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Ôn chủ đề này</span>
                </button>
                <button
                  type="button"
                  onClick={closeTopicPopup}
                  className={`p-2 cursor-pointer transition-colors ${
                    isDark
                      ? 'rounded-xl hover:bg-white/10 text-slate-300'
                      : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FFE4E6] text-[#0F172A] rounded-xl'
                  }`}
                  title="Đóng (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Topic Popup Quick Filter Bar */}
            <div
              className={`px-5 py-2.5 flex flex-wrap items-center gap-2 shrink-0 ${
                isDark ? 'bg-[#12151E]/60 border-b border-white/[0.06]' : 'bg-white border-b-2 border-[#0F172A]'
              }`}
            >
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Tìm từ trong chủ đề ${topicPopupName}...`}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold outline-none ${
                    isDark
                      ? 'bg-[#181C28] border border-white/10 text-white placeholder:text-slate-500'
                      : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                  }`}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold outline-none cursor-pointer ${
                  isDark
                    ? 'bg-[#181C28] border border-white/10 text-slate-200'
                    : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                }`}
              >
                <option value="all">Mọi trạng thái</option>
                <option value="due">Cần Review</option>
                <option value="new">Từ mới</option>
                <option value="learning">Đang nhớ</option>
                <option value="mastered">Thuộc làu</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold outline-none cursor-pointer ${
                  isDark
                    ? 'bg-[#181C28] border border-white/10 text-slate-200'
                    : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                }`}
              >
                <option value="newest">Mới thêm nhất</option>
                <option value="due_first">Ưu tiên cần ôn</option>
                <option value="az">Từ A → Z</option>
                <option value="za">Từ Z → A</option>
                <option value="mastery_asc">Từ yếu nhớ trước</option>
              </select>
            </div>

            {/* Topic Popup Scrollable Cards + Pagination */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
              {paginatedWords.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-slate-500">
                  Không có từ vựng nào khớp bộ lọc trong chủ đề này.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {paginatedWords.map((item) => {
                      const badge = getMasteryBadge(item.srsLevel);
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            const idx = filteredWords.findIndex((w) => w.id === item.id);
                            openStudyPopupAt(idx >= 0 ? idx : 0);
                          }}
                          className={`rounded-2xl p-4 flex flex-col justify-between gap-2.5 cursor-pointer transition-all hover:-translate-y-0.5 select-none ${
                            isDark
                              ? 'bg-[#12151E] border border-white/[0.08] hover:border-emerald-400/40'
                              : 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:bg-[#FFFDF7] text-[#0F172A]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-base font-extrabold tracking-tight truncate">{item.word}</h4>
                              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mt-0.5">
                                {item.partOfSpeech && (
                                  <span className="text-[#E11D48] font-black">{item.partOfSpeech}</span>
                                )}
                                {item.phonetic && <span className="truncate">{item.phonetic}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSaved(item);
                                }}
                                className={`p-1 rounded-lg cursor-pointer ${
                                  item.isSaved ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                                }`}
                                title={item.isSaved ? 'Bỏ khỏi Đã Lưu' : 'Lưu vào Đã Lưu ⭐'}
                              >
                                <Star className={`w-3.5 h-3.5 ${item.isSaved ? 'fill-amber-400 text-amber-500' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakEnglishWord(item.word, false);
                                }}
                                className={`p-1.5 rounded-xl cursor-pointer ${
                                  isDark
                                    ? 'bg-rose-500/15 text-rose-300'
                                    : 'bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border border-[#0F172A]'
                                }`}
                                title="Nghe phát âm"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className={`text-xs font-bold line-clamp-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            {item.meaning}
                          </p>

                          <div className={`pt-2 border-t flex items-center justify-between text-[10.5px] text-slate-500 ${
                            isDark ? 'border-white/[0.06]' : 'border-[#0F172A]/15'
                          }`}>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditWordModal(item);
                                }}
                                className={`p-1 rounded-lg cursor-pointer ${
                                  isDark ? 'hover:bg-white/10 hover:text-sky-400' : 'hover:bg-[#FEF9C3] hover:text-[#0F172A]'
                                }`}
                                title="Sửa"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWord(item.id);
                                }}
                                className={`p-1 rounded-lg cursor-pointer ${
                                  isDark ? 'hover:bg-rose-500/20 hover:text-rose-400' : 'hover:bg-[#FFE4E6] hover:text-[#E11D48]'
                                }`}
                                title="Xóa"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Topic Popup Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <span className="text-xs font-semibold text-slate-500">
                        Trang <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>{safePage}</strong> / {totalPages}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safePage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-40 ${surfaceCls}`}
                        >
                          ← Trước
                        </button>
                        <button
                          type="button"
                          disabled={safePage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-40 ${surfaceCls}`}
                        >
                          Sau →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================================================================== */}
      {/* FLOATING CUTE ENGLISH TUTOR ICON & RIGHT-SIDE MINI CHAT POPUP         */}
      {/* ===================================================================== */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Cute Floating Icon-Only Trigger Button (Bottom-Right Corner) */}
          {!isTutorOpen && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playSoftClick();
                setIsTutorOpen(true);
              }}
              className="fixed bottom-20 md:bottom-4 right-4 z-[165] w-12 h-12 rounded-2xl bg-[#FFF1F2] hover:bg-[#FFE4E6] border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0F172A] active:scale-95 transition-all cursor-pointer flex items-center justify-center p-2"
              title="Mở Gia sư Tiếng Anh IELTS 8.0+"
              aria-label="Mở Gia sư Tiếng Anh IELTS 8.0+"
            >
              <img src="/images/logo-mark.png" alt="Tutor" className="w-full h-full object-contain" />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0F172A]" />
            </button>
          )}

          {/* Mini Friendly Chat Popup on Right Side (Expandable to Fullscreen) */}
          {isTutorOpen && (
            <div
              className={`fixed z-[165] rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200 transition-all ${
                isTutorExpanded
                  ? 'inset-3 sm:inset-6 w-auto h-auto max-w-5xl mx-auto'
                  : 'bottom-20 md:bottom-5 right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[410px] h-[540px] max-h-[78dvh]'
              } ${
                isDark
                  ? 'bg-[#12151E] border border-white/15 shadow-2xl text-white'
                  : 'bg-[#FFFDF7] border-2 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] text-[#0F172A]'
              }`}
            >
              {/* Cute Header */}
              <div
                className={`px-4 py-3 flex items-center justify-between gap-2 shrink-0 ${
                  isDark
                    ? 'bg-[#181C28] border-b border-white/[0.08]'
                    : 'bg-[#FFF1F2] border-b-2 border-[#0F172A]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-9 h-9 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] p-1.5 shrink-0">
                    <img src="/images/logo-mark.png" alt="Genncore Tutor" className="w-full h-full object-contain" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0F172A]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-black truncate">Genncore English Tutor</h4>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]">
                        IELTS 8.0+
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">Hỏi ngữ pháp, từ vựng & luyện chat 1-1</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setIsTutorExpanded((prev) => !prev);
                    }}
                    className={`p-1.5 cursor-pointer ${
                      isDark
                        ? 'rounded-xl hover:bg-white/10 text-slate-300'
                        : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#DBEAFE] text-[#0F172A] rounded-xl'
                    }`}
                    title={isTutorExpanded ? 'Thu gọn về góc phải' : 'Phóng to toàn màn hình'}
                  >
                    {isTutorExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setTutorMessages((prev) => prev.slice(0, 1));
                    }}
                    className={`p-1.5 text-[10px] font-black cursor-pointer ${
                      isDark
                        ? 'rounded-xl hover:bg-white/10 text-slate-400'
                        : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FEF9C3] text-[#0F172A] rounded-xl'
                    }`}
                    title="Làm mới cuộc trò chuyện"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTutorOpen(false);
                      setIsTutorExpanded(false);
                    }}
                    className={`p-1.5 cursor-pointer ${
                      isDark
                        ? 'rounded-xl hover:bg-white/10 text-slate-300'
                        : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] hover:bg-[#FFE4E6] text-[#0F172A] rounded-xl'
                    }`}
                    title="Đóng"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mode Switcher: Chat vs Saved Explanations with Multi-Color Highlighter */}
              <div
                className={`px-3.5 py-2 flex items-center justify-between gap-2 shrink-0 ${
                  isDark ? 'bg-[#12151E] border-b border-white/[0.08]' : 'bg-[#FFF8F1] border-b-2 border-[#0F172A]/15'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setTutorViewMode('chat');
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer transition-all ${
                      tutorViewMode === 'chat'
                        ? isDark
                          ? 'bg-[#1DB954] text-[#090A0F]'
                          : 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        : isDark
                        ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                        : 'bg-white text-[#0F172A] border border-[#0F172A] hover:bg-[#FEF9C3]'
                    }`}
                  >
                    Trò chuyện
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSoftClick();
                      setTutorViewMode('saved');
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                      tutorViewMode === 'saved'
                        ? isDark
                          ? 'bg-amber-400 text-[#090A0F]'
                          : 'bg-[#FEF08A] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                        : isDark
                        ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                        : 'bg-white text-[#0F172A] border border-[#0F172A] hover:bg-[#FEF9C3]'
                    }`}
                  >
                    <Bookmark className="w-3 h-3 text-[#E11D48]" />
                    <span>Đã lưu ({savedTutorNotes.length})</span>
                  </button>
                </div>

                {tutorViewMode === 'saved' && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500 hidden sm:inline mr-0.5">Bút nhớ:</span>
                    {TUTOR_HIGHLIGHT_PALETTE.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveHighlighterColor(c.id)}
                        title={`Màu highlight: ${c.label}`}
                        className={`w-4 h-4 rounded-full border-2 border-[#0F172A] cursor-pointer transition-transform ${
                          c.swatch
                        } ${activeHighlighterColor === c.id ? 'scale-125 ring-2 ring-[#E11D48]' : 'opacity-80 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Messages Feed OR Saved Explanations Notebook */}
              {tutorViewMode === 'saved' ? (
                <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5">
                  {savedTutorNotes.length === 0 ? (
                    <div className="py-12 px-4 text-center space-y-2 rounded-2xl bg-white border-2 border-dashed border-[#0F172A]/40">
                      <Highlighter className="w-7 h-7 text-[#E11D48] mx-auto" />
                      <p className="text-xs font-black">Chưa có lời giải thích nào được lưu</p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        Trong tab Trò chuyện, bấm <strong>Lưu giải thích</strong> dưới câu trả lời của Gia sư AI rồi quay lại đây để bôi màu highlight nhiều cụm từ quan trọng!
                      </p>
                    </div>
                  ) : (
                    savedTutorNotes.map((note) => {
                      const selectedText = selectedPhraseByNote[note.id] || '';
                      const draftPhrase = noteHighlightDrafts[note.id] || '';
                      return (
                        <div
                          key={note.id}
                          className={`rounded-2xl p-3.5 space-y-2.5 ${
                            isDark
                              ? 'bg-[#181C28] border border-white/10'
                              : 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#0F172A]/10">
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-[#E11D48] leading-snug">{note.title}</h5>
                              <p className="text-[10px] text-slate-400 font-semibold">
                                {new Date(note.createdAt).toLocaleDateString('vi-VN')} • Bôi đen cụm từ bên dưới để tô màu
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedTutorNote(note.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-[#FFE4E6] cursor-pointer shrink-0"
                              title="Xóa ghi chú này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Selectable Explanation Content */}
                          <div
                            onMouseUp={() => {
                              const sel = window.getSelection()?.toString().trim() || '';
                              if (sel.length >= 2 && sel.length <= 80) {
                                setSelectedPhraseByNote((prev) => ({ ...prev, [note.id]: sel }));
                              }
                            }}
                            className={`space-y-2 leading-relaxed select-text ${
                              isTutorExpanded ? 'text-[13px]' : 'text-xs'
                            }`}
                          >
                            {note.replyEn && (
                              <div className="p-2 rounded-xl bg-[#FFFDF7] border border-[#0F172A]/25 flex items-start justify-between gap-2">
                                <p className="font-bold italic">&ldquo;{note.replyEn}&rdquo;</p>
                                <button
                                  type="button"
                                  onClick={() => speakEnglishWord(note.replyEn || '', false)}
                                  className="p-1 rounded-lg bg-[#FFE4E6] text-[#E11D48] border border-[#0F172A] shrink-0 cursor-pointer"
                                >
                                  <Volume2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            {renderHighlightedTutorText(note.explanationVi, note.highlights)}
                          </div>

                          {/* Instant Selection Color Picker when user highlights text with mouse */}
                          {selectedText && (
                            <div className="p-2 rounded-xl bg-[#FEF9C3] border-2 border-[#0F172A] flex items-center justify-between gap-2 flex-wrap animate-in fade-in duration-100">
                              <span className="text-[11px] font-black text-[#0F172A] truncate max-w-[180px]">
                                Tô màu: &ldquo;{selectedText}&rdquo;
                              </span>
                              <div className="flex items-center gap-1.5">
                                {TUTOR_HIGHLIGHT_PALETTE.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleAddHighlightToNote(note.id, selectedText, c.id)}
                                    className={`px-2 py-0.5 rounded-lg border border-[#0F172A] text-[10px] font-black text-[#0F172A] cursor-pointer ${c.swatch} hover:scale-105 transition-transform`}
                                  >
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quick Phrase Highlighter Input + Active Highlights List */}
                          <div className="pt-2 border-t border-[#0F172A]/10 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={draftPhrase}
                                onChange={(e) =>
                                  setNoteHighlightDrafts((prev) => ({ ...prev, [note.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && draftPhrase.trim()) {
                                    e.preventDefault();
                                    handleAddHighlightToNote(note.id, draftPhrase, activeHighlighterColor);
                                  }
                                }}
                                placeholder="Gõ cụm từ cần highlight..."
                                className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold outline-none ${
                                  isDark
                                    ? 'bg-[#12151E] border border-white/10 text-white'
                                    : 'bg-[#FFFDF7] border border-[#0F172A] text-[#0F172A]'
                                }`}
                              />
                              <div className="flex items-center gap-1">
                                {TUTOR_HIGHLIGHT_PALETTE.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    disabled={!draftPhrase.trim()}
                                    onClick={() => handleAddHighlightToNote(note.id, draftPhrase, c.id)}
                                    title={`Highlight cụm từ màu ${c.label}`}
                                    className={`w-5 h-5 rounded-md border border-[#0F172A] cursor-pointer disabled:opacity-40 ${c.swatch}`}
                                  />
                                ))}
                              </div>
                            </div>

                            {note.highlights.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {note.highlights.map((hl) => {
                                  const colorSpec =
                                    TUTOR_HIGHLIGHT_PALETTE.find((c) => c.id === hl.color) || TUTOR_HIGHLIGHT_PALETTE[0];
                                  return (
                                    <span
                                      key={hl.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        isDark ? colorSpec.darkCls : colorSpec.lightCls
                                      }`}
                                    >
                                      <span>{hl.phrase}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveHighlightFromNote(note.id, hl.id)}
                                        className="hover:opacity-70 cursor-pointer"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div ref={tutorScrollRef} className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
                  {tutorMessages.map((msg, msgIdx) => {
                    const isSavedMsg = savedTutorNotes.some((n) => n.sourceMsgId === msg.id);
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-6 h-6 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] p-1 shrink-0 mt-0.5">
                            <img src="/images/logo-mark.png" alt="" className="w-full h-full object-contain" />
                          </div>
                        )}

                        <div
                          className={`${
                            isTutorExpanded ? 'max-w-[82%] text-[13px]' : 'max-w-[86%] text-xs'
                          } rounded-2xl px-3.5 py-2.5 leading-relaxed space-y-2 ${
                            msg.role === 'user'
                              ? isDark
                                ? 'bg-[#1DB954] text-[#090A0F] font-semibold rounded-tr-sm'
                                : 'bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-bold rounded-tr-sm'
                              : isDark
                              ? 'bg-[#181C28] border border-white/10 text-slate-200 rounded-tl-sm'
                              : 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A] rounded-tl-sm'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <div className="space-y-1.5">
                              {msg.imageUrl && (
                                <img
                                  src={msg.imageUrl}
                                  alt="Ảnh bạn đã gửi"
                                  className="max-h-48 w-auto max-w-full rounded-xl border border-white/30 object-contain bg-black/10"
                                />
                              )}
                              {msg.text && <p>{msg.text}</p>}
                            </div>
                          ) : (
                            <>
                              {msg.primaryMode === 'en_chat' ? (
                                <>
                                  {msg.replyEn && (
                                    <div
                                      className={`p-2.5 rounded-xl flex items-start justify-between gap-2 ${
                                        isDark
                                          ? 'bg-[#12151E] border border-emerald-400/25 text-emerald-300'
                                          : 'bg-[#FFFDF7] border-2 border-[#0F172A] text-[#0F172A]'
                                      }`}
                                    >
                                      <p className="font-bold leading-relaxed">{msg.replyEn}</p>
                                      <button
                                        type="button"
                                        onClick={() => speakEnglishWord(msg.replyEn || '', false)}
                                        className="p-1 rounded-lg bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border border-[#0F172A] shrink-0 cursor-pointer"
                                        title="Nghe phát âm"
                                      >
                                        <Volume2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                  {msg.explanationVi && renderHighlightedTutorText(msg.explanationVi)}
                                </>
                              ) : (
                                <>
                                  {msg.explanationVi && renderHighlightedTutorText(msg.explanationVi)}
                                  {msg.replyEn && (
                                    <div
                                      className={`p-2.5 rounded-xl flex items-start justify-between gap-2 ${
                                        isDark
                                          ? 'bg-[#12151E] border border-white/10 text-emerald-300'
                                          : 'bg-[#FFFDF7] border-2 border-[#0F172A] text-[#0F172A]'
                                      }`}
                                    >
                                      <div className="space-y-0.5">
                                        <span className="text-[9.5px] font-black uppercase tracking-wider text-[#E11D48] block">
                                          Ví dụ minh họa
                                        </span>
                                        <p className="font-bold italic leading-relaxed">&ldquo;{msg.replyEn}&rdquo;</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => speakEnglishWord(msg.replyEn || '', false)}
                                        className="p-1 rounded-lg bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border border-[#0F172A] shrink-0 cursor-pointer mt-1"
                                        title="Nghe phát âm"
                                      >
                                        <Volume2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}

                              {msg.bonusVocab && (
                                <div
                                  className={`p-2 rounded-xl flex items-center justify-between gap-2 ${
                                    isDark
                                      ? 'bg-emerald-500/10 border border-emerald-500/25'
                                      : 'bg-[#FEF9C3] border-2 border-[#0F172A] text-[#0F172A]'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="font-black text-[11px] truncate">
                                      ✨ {msg.bonusVocab.word}{' '}
                                      {msg.bonusVocab.phonetic && (
                                        <span className="font-mono font-normal opacity-75">{msg.bonusVocab.phonetic}</span>
                                      )}
                                    </p>
                                    <p className="text-[10.5px] font-semibold opacity-90 truncate">{msg.bonusVocab.meaning}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveBonusVocabFromTutor(msg.bonusVocab!)}
                                    className="px-2.5 py-1 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white border border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[10px] font-black shrink-0 cursor-pointer"
                                  >
                                    + Lưu
                                  </button>
                                </div>
                              )}

                              {/* Save Explanation & Highlight CTA */}
                              {msg.id !== 'welcome-tutor' && (msg.explanationVi || msg.text) && (
                                <div className="pt-1 flex items-center justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveTutorExplanation(msg, msgIdx)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-all ${
                                      isSavedMsg
                                        ? 'bg-[#DCFCE7] text-[#15803D] border border-[#0F172A]'
                                        : isDark
                                        ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                                        : 'bg-[#FFFDF7] hover:bg-[#FEF08A] text-[#0F172A] border border-[#0F172A] shadow-[1px_1px_0px_#0F172A]'
                                    }`}
                                    title="Lưu lời giải thích để tô màu highlight cụm từ"
                                  >
                                    {isSavedMsg ? <Check className="w-3 h-3" /> : <Bookmark className="w-3 h-3 text-[#E11D48]" />}
                                    <span>{isSavedMsg ? 'Đã lưu • Tô màu' : 'Lưu giải thích'}</span>
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isTutorTyping && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-6 h-6 rounded-xl bg-white border-2 border-[#0F172A] p-1">
                        <img src="/images/logo-mark.png" alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className={`px-3 py-2 rounded-2xl flex items-center gap-1.5 ${
                        isDark
                          ? 'bg-[#181C28] border border-white/10'
                          : 'bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                      }`}>
                        <Loader2 className="w-3 h-3 animate-spin text-[#E11D48]" />
                        <span className="text-[11px] font-semibold">Gia sư đang soạn câu trả lời...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tutorViewMode === 'chat' && (
                <>
                  {/* Pending Pasted / Selected Image Preview */}
                  {tutorPendingImage && (
                    <div
                      className={`px-3 py-2 flex items-center justify-between gap-2 shrink-0 ${
                        isDark
                          ? 'border-t border-white/10 bg-[#181C28]/80'
                          : 'border-t border-[#0F172A]/15 bg-[#FFFDF7]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={tutorPendingImage}
                          alt="Preview ảnh đính kèm"
                          className="h-12 w-16 rounded-xl object-cover border-2 border-[#0F172A] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-black truncate">Ảnh đã đính kèm</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Nhập thêm câu hỏi hoặc bấm Gửi ngay để Gia sư giải thích
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTutorPendingImage(null)}
                        className="p-1.5 rounded-lg bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border border-[#0F172A]/25 shrink-0 cursor-pointer"
                        title="Bỏ ảnh đính kèm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Input Bar with Ctrl+V Image Paste & Upload Button */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendTutorMessage();
                    }}
                    className={`p-3 flex items-center gap-2 shrink-0 ${
                      isDark ? 'border-t border-white/[0.08] bg-[#181C28]/60' : 'border-t-2 border-[#0F172A] bg-[#FFF1F2]'
                    }`}
                  >
                    <input
                      ref={tutorImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) attachTutorImageFile(file);
                        if (e.target) e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => tutorImageInputRef.current?.click()}
                      className={`p-2 rounded-xl cursor-pointer shrink-0 transition-colors ${
                        isDark
                          ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
                          : 'bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] text-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                      }`}
                      title="Đính kèm ảnh (hoặc bấm Ctrl+V để dán trực tiếp)"
                    >
                      <ImageIcon className="w-4 h-4 text-[#E11D48]" />
                    </button>
                    <input
                      type="text"
                      value={tutorInput}
                      onChange={(e) => setTutorInput(e.target.value)}
                      placeholder="Hỏi ngữ pháp, từ vựng hoặc Ctrl+V dán ảnh..."
                      className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none ${
                        isDark
                          ? 'bg-[#12151E] border border-white/10 text-white placeholder:text-slate-500 focus:border-[#1DB954]'
                          : 'bg-white border-2 border-[#0F172A] text-[#0F172A] focus:bg-[#FFF1F2] focus:outline-none'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isTutorTyping || (!tutorInput.trim() && !tutorPendingImage)}
                      className={`p-2 rounded-xl cursor-pointer disabled:opacity-45 shrink-0 ${
                        isDark
                          ? 'bg-[#1DB954] text-[#090A0F] hover:brightness-110'
                          : 'bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]'
                      }`}
                      title="Gửi"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
};

