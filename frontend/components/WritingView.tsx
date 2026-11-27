'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  PenTool,
  Sparkles,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Layers,
  History,
  Trash2,
  Plus,
  Check,
  Image as ImageIcon,
  X,
  Volume2,
  ArrowRight,
  Wand2,
  ShieldAlert,
  TrendingUp,
  Eye,
  Loader2,
  Calculator,
  ChevronRight,
  Copy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppTheme } from '../lib/settingsStorage';
import { soundEngine } from '../lib/audio';
import { notify } from '../lib/notificationService';
import { compressImageDataUrl } from '../lib/imageUtils';
import { createVocab, speakEnglishWord } from '../lib/vocabApi';
import {
  WritingAttempt,
  WritingAnnotation,
  WritingUpgradeHighlight,
  WritingTaskType,
  PersonalVocabHint,
  WeaknessRadarSummary,
  SAMPLE_WRITING_PROMPTS,
  computeLiveWritingStats,
  getCachedWritingHistory,
  getCachedWritingRadar,
  fetchWritingPrep,
  fetchWritingHistory,
  fetchWritingAttemptById,
  gradeWritingEssay,
  generateWritingUpgrade,
  evaluateWritingRewrites,
  deleteWritingAttempt,
  roundIeltsBand,
} from '../lib/writingApi';

interface WritingViewProps {
  theme?: AppTheme;
  authUserId?: string;
}

const ESSAY_TYPES_BY_TASK: Record<WritingTaskType, Array<{ value: string; label: string }>> = {
  task2: [
    { value: 'opinion', label: 'Opinion (Agree / Disagree)' },
    { value: 'discussion', label: 'Discussion (Both views + Opinion)' },
    { value: 'problem_solution', label: 'Causes & Solutions / Problem' },
    { value: 'advantages_disadvantages', label: 'Advantages & Disadvantages' },
    { value: 'two_part', label: 'Two-part Question' },
  ],
  task1: [
    { value: 'chart_graph', label: 'Biểu đồ (Line / Bar / Pie / Table)' },
    { value: 'mixed_charts', label: 'Mixed Charts (Biểu đồ kết hợp)' },
    { value: 'map', label: 'Map (Bản đồ thay đổi)' },
    { value: 'process', label: 'Process / Diagram (Quy trình)' },
  ],
};

const ANNOTATION_STYLE = {
  strength: {
    label: 'Điểm hay',
    dot: 'bg-[#16A34A]',
    lightMark: 'bg-[#DCFCE7]/85 text-[#14532D] border-b-2 border-[#16A34A]',
    darkMark: 'bg-emerald-500/25 text-emerald-200 border-b-2 border-emerald-400',
    badgeLight: 'bg-[#DCFCE7] text-[#15803D] border-[#16A34A]/40',
    badgeDark: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  },
  grammar: {
    label: 'Ngữ pháp',
    dot: 'bg-[#E11D48]',
    lightMark: 'bg-[#FFE4E6] text-[#9F1239] border-b-2 border-[#E11D48]',
    darkMark: 'bg-rose-500/25 text-rose-200 border-b-2 border-rose-400',
    badgeLight: 'bg-[#FFE4E6] text-[#E11D48] border-[#E11D48]/40',
    badgeDark: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  },
  lexical: {
    label: 'Từ vựng',
    dot: 'bg-[#D97706]',
    lightMark: 'bg-[#FEF08A] text-[#0F172A] border-b-2 border-[#D97706]',
    darkMark: 'bg-amber-500/25 text-amber-200 border-b-2 border-amber-400',
    badgeLight: 'bg-[#FEF9C3] text-[#B45309] border-[#D97706]/40',
    badgeDark: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  },
  cohesion: {
    label: 'Mạch lạc',
    dot: 'bg-[#1D4ED8]',
    lightMark: 'bg-[#DBEAFE] text-[#1E40AF] border-b-2 border-[#1D4ED8]',
    darkMark: 'bg-sky-500/25 text-sky-200 border-b-2 border-sky-400',
    badgeLight: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#1D4ED8]/40',
    badgeDark: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  },
  logic: {
    label: 'Ý & Logic',
    dot: 'bg-[#7E22CE]',
    lightMark: 'bg-[#F3E8FF] text-[#6B21A8] border-b-2 border-[#7E22CE]',
    darkMark: 'bg-purple-500/25 text-purple-200 border-b-2 border-purple-400',
    badgeLight: 'bg-[#F3E8FF] text-[#7E22CE] border-[#7E22CE]/40',
    badgeDark: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
  },
} as const;

export const WritingView: React.FC<WritingViewProps> = ({ theme = 'slate', authUserId }) => {
  const isDark = theme === 'midnight';

  // Primary View: Compose | Result | History
  const [subView, setSubView] = useState<'compose' | 'result' | 'history'>('compose');
  const [resultTab, setResultTab] = useState<'xray' | 'criteria' | 'rewrite' | 'upgrade'>('xray');

  // Compose State
  const [taskType, setTaskType] = useState<WritingTaskType>('task2');
  const [essayType, setEssayType] = useState<string>('opinion');
  const [prompt, setPrompt] = useState<string>(SAMPLE_WRITING_PROMPTS[0].prompt);
  const [promptImage, setPromptImage] = useState<string>('');
  const [essay, setEssay] = useState<string>('');
  const [isGrading, setIsGrading] = useState(false);

  // Timer State (20m for Task 1, 40m for Task 2)
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // History, Radar & Prep State (cached per userId for 0ms mount)
  const [history, setHistory] = useState<WritingAttempt[]>(() => getCachedWritingHistory(authUserId));
  const [radar, setRadar] = useState<WeaknessRadarSummary | null>(() => getCachedWritingRadar(authUserId));
  const [personalVocab, setPersonalVocab] = useState<PersonalVocabHint[]>([]);

  // Active Result State
  const [activeAttempt, setActiveAttempt] = useState<WritingAttempt | null>(null);
  const [xrayFilter, setXrayFilter] = useState<'all' | 'strength' | 'grammar' | 'lexical' | 'cohesion' | 'logic'>('all');
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [savedVocabSet, setSavedVocabSet] = useState<Record<string, boolean>>({});

  // Lazy Upgrade & Rewrite Lab State
  const [upgradeMode, setUpgradeMode] = useState<'preserve_voice' | 'band_85'>('preserve_voice');
  const [isGeneratingUpgrade, setIsGeneratingUpgrade] = useState(false);
  const [selectedUpgradeHighlightId, setSelectedUpgradeHighlightId] = useState<string | null>(null);
  const [showOriginalInUpgrade, setShowOriginalInUpgrade] = useState(false);
  const [upgradeStaleBackendWarn, setUpgradeStaleBackendWarn] = useState(false);
  const [rewriteDrafts, setRewriteDrafts] = useState<Record<string, string>>({});
  const [isCheckingRewrites, setIsCheckingRewrites] = useState(false);

  // Mock Overall Band Calculator
  const [calcTask1, setCalcTask1] = useState<string>('6.0');
  const [calcTask2, setCalcTask2] = useState<string>('6.5');

  const essayTextareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const targetMinutes = taskType === 'task1' ? 20 : 40;
  const minTargetWords = taskType === 'task1' ? 150 : 250;

  // Live 0-token diagnostics while typing
  const liveStats = useMemo(
    () => computeLiveWritingStats(prompt, essay, taskType),
    [prompt, essay, taskType]
  );

  // Sync timer
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  // Initial load & account switch hydration
  useEffect(() => {
    const cachedHist = getCachedWritingHistory(authUserId);
    const cachedRadar = getCachedWritingRadar(authUserId);
    if (cachedHist.length > 0) setHistory(cachedHist);
    if (cachedRadar) setRadar(cachedRadar);

    fetchWritingHistory(authUserId).then((items) => {
      setHistory(items);
      const latestT1 = items.find((i) => i.taskType === 'task1');
      const latestT2 = items.find((i) => i.taskType === 'task2');
      if (latestT1) setCalcTask1(latestT1.scores.overall.toFixed(1));
      if (latestT2) setCalcTask2(latestT2.scores.overall.toFixed(1));
    });
  }, [authUserId]);

  // Debounced 0-token prep fetch (Personal Vocab Injection + Weakness Radar) when prompt changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWritingPrep(prompt, authUserId)
        .then((res) => {
          setPersonalVocab(res.personalVocab);
          if (res.radar) setRadar(res.radar);
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [prompt, authUserId]);

  // Paste image listener for Task 1 charts / prompt screenshots
  const handlePromptImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify.warning('Vui lòng chọn file hình ảnh (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      if (!raw) return;
      const compressed = await compressImageDataUrl(raw, 1280, 1280, 0.82);
      setPromptImage(compressed);
      setTaskType('task1');
      setEssayType('chart_graph');
      soundEngine.playSoftClick();
      notify.success('Đã đính kèm ảnh đề Task 1 — AI sẽ đọc trực tiếp biểu đồ khi chấm!');
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    if (subView !== 'compose') return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handlePromptImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [subView, handlePromptImageFile]);

  const handleTaskTypeSwitch = (nextTask: WritingTaskType) => {
    soundEngine.playSoftClick();
    setTaskType(nextTask);
    setEssayType(ESSAY_TYPES_BY_TASK[nextTask][0].value);
    const matchingSample = SAMPLE_WRITING_PROMPTS.find((p) => p.taskType === nextTask);
    if (matchingSample && SAMPLE_WRITING_PROMPTS.some((s) => s.prompt === prompt)) {
      setPrompt(matchingSample.prompt);
    }
  };

  const insertWordIntoEssay = (word: string) => {
    soundEngine.playSoftClick();
    const ta = essayTextareaRef.current;
    if (!ta) {
      setEssay((prev) => (prev ? `${prev} ${word}` : word));
      return;
    }
    const start = ta.selectionStart ?? essay.length;
    const end = ta.selectionEnd ?? essay.length;
    const before = essay.slice(0, start);
    const after = essay.slice(end);
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const insertion = `${needsLeadingSpace ? ' ' : ''}${word} `;
    const next = `${before}${insertion}${after}`;
    setEssay(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + insertion.length;
      ta.setSelectionRange(pos, pos);
    }, 10);
  };

  const handleGradeEssay = async () => {
    if (isGrading) return;
    if (!essay.trim() || liveStats.wordCount < 15) {
      notify.warning('Hãy viết ít nhất 15 từ để Giám khảo AI chấm bài chính xác nhé.');
      return;
    }
    if (!prompt.trim() && !promptImage) {
      notify.warning('Vui lòng nhập đề bài hoặc dán ảnh biểu đồ Task 1 trước khi chấm.');
      return;
    }

    setIsGrading(true);
    setTimerRunning(false);
    soundEngine.playSoftClick();

    try {
      const graded = await gradeWritingEssay(
        {
          taskType,
          essayType,
          prompt,
          promptImage: promptImage || undefined,
          essay,
          elapsedSeconds,
        },
        authUserId
      );

      setActiveAttempt(graded);
      setHistory((prev) => [graded, ...prev.filter((h) => h.id !== graded.id)]);
      setSelectedAnnId(graded.annotations?.[0]?.id || null);
      setXrayFilter('all');
      setResultTab('xray');
      setSubView('result');

      const draftInit: Record<string, string> = {};
      graded.weakSentences?.forEach((w) => {
        draftInit[w.id] = w.userRewrite || '';
      });
      setRewriteDrafts(draftInit);

      if (graded.taskType === 'task1') setCalcTask1(graded.scores.overall.toFixed(1));
      else setCalcTask2(graded.scores.overall.toFixed(1));

      // Refresh 0-token radar asynchronously
      fetchWritingPrep(prompt, authUserId)
        .then((prep) => {
          if (prep.radar) setRadar(prep.radar);
        })
        .catch(() => {});

      soundEngine.playPentatonicChime(5);
      if (graded.scores.overall >= 6.5) {
        try {
          confetti({ particleCount: 50, spread: 65, origin: { y: 0.65 } });
        } catch {}
      }
    } catch (err: any) {
      notify.error(err.message || 'Chưa thể chấm bài Writing lúc này.');
    } finally {
      setIsGrading(false);
    }
  };

  const handleTriggerUpgrade = async (mode: 'preserve_voice' | 'band_85', force = false) => {
    if (!activeAttempt || isGeneratingUpgrade) return;
    setUpgradeMode(mode);
    setUpgradeStaleBackendWarn(false);
    const existing =
      mode === 'preserve_voice'
        ? activeAttempt.upgradedVersions?.preserveVoiceEssay
        : activeAttempt.upgradedVersions?.band85Essay;
    const existingHighlights =
      mode === 'preserve_voice'
        ? activeAttempt.upgradedVersions?.preserveVoiceHighlights
        : activeAttempt.upgradedVersions?.band85Highlights;
    if (!force && existing && existingHighlights && existingHighlights.length > 0) {
      setSelectedUpgradeHighlightId(existingHighlights[0]?.id || null);
      return;
    }

    setIsGeneratingUpgrade(true);
    soundEngine.playSoftClick();
    try {
      const res = await generateWritingUpgrade(
        activeAttempt.id,
        mode,
        authUserId,
        force || Boolean(existing && (!existingHighlights || existingHighlights.length === 0))
      );
      setActiveAttempt((prev) => {
        if (!prev) return prev;
        const upgradedVersions = { ...(prev.upgradedVersions || {}) };
        if (mode === 'preserve_voice') {
          upgradedVersions.preserveVoiceEssay = res.essay;
          upgradedVersions.preserveVoiceNotesVi = res.notesVi;
          upgradedVersions.preserveVoiceHighlights = res.highlights;
        } else {
          upgradedVersions.band85Essay = res.essay;
          upgradedVersions.band85NotesVi = res.notesVi;
          upgradedVersions.band85Highlights = res.highlights;
        }
        return { ...prev, upgradedVersions };
      });
      if (!res.highlights || res.highlights.length === 0) {
        setUpgradeStaleBackendWarn(true);
      }
      setSelectedUpgradeHighlightId(res.highlights?.[0]?.id || null);
      soundEngine.playPentatonicChime(4);
    } catch (err: any) {
      notify.error(err.message || 'Không thể tạo bài nâng cấp.');
    } finally {
      setIsGeneratingUpgrade(false);
    }
  };

  const handleSubmitRewriteLab = async () => {
    if (!activeAttempt || isCheckingRewrites) return;
    const payload = activeAttempt.weakSentences
      .map((ws) => ({ id: ws.id, userRewrite: (rewriteDrafts[ws.id] || '').trim() }))
      .filter((r) => r.userRewrite.length > 5);

    if (payload.length === 0) {
      notify.warning('Hãy tự viết lại ít nhất 1 câu ở bên dưới trước khi bấm chấm nhé!');
      return;
    }

    setIsCheckingRewrites(true);
    soundEngine.playSoftClick();
    try {
      const updatedWeak = await evaluateWritingRewrites(activeAttempt.id, payload, authUserId);
      setActiveAttempt((prev) => (prev ? { ...prev, weakSentences: updatedWeak } : prev));
      soundEngine.playPentatonicChime(5);
      notify.success('Đã chấm câu tự sửa xong!');
    } catch (err: any) {
      notify.error(err.message || 'Chưa thể chấm câu viết lại.');
    } finally {
      setIsCheckingRewrites(false);
    }
  };

  const handleSaveRecommendedVocab = async (item: WritingAttempt['recommendedVocab'][number]) => {
    try {
      await createVocab({
        word: item.word,
        phonetic: item.phonetic || '',
        partOfSpeech: item.partOfSpeech || '',
        meaning: item.meaning,
        example: item.example,
        exampleTranslation: item.exampleTranslation || '',
        topic: item.topic || 'IELTS & Học thuật',
        isSaved: true,
      });
      setSavedVocabSet((prev) => ({ ...prev, [item.word]: true }));
      soundEngine.playPentatonicChime(4);
      notify.success(`Đã lưu "${item.word}" vào mục Đã Lưu của Từ Vựng!`);
    } catch (err: any) {
      if (String(err?.message || '').includes('đã có')) {
        setSavedVocabSet((prev) => ({ ...prev, [item.word]: true }));
        notify.warning(`Từ "${item.word}" đã có trong kho từ vựng của bạn.`);
      } else {
        notify.error(err.message || 'Không thể lưu từ vựng.');
      }
    }
  };

  const handleOpenHistoryAttempt = async (item: WritingAttempt) => {
    soundEngine.playSoftClick();
    setActiveAttempt(item);
    setSelectedAnnId(item.annotations?.[0]?.id || null);
    setXrayFilter('all');
    setResultTab('xray');
    setSubView('result');

    const drafts: Record<string, string> = {};
    item.weakSentences?.forEach((w) => {
      drafts[w.id] = w.userRewrite || '';
    });
    setRewriteDrafts(drafts);

    // Fetch full item (including promptImage if Task 1) if needed
    const full = await fetchWritingAttemptById(item.id);
    if (full) setActiveAttempt(full);
  };

  const handleDeleteHistoryAttempt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await notify.confirm('Xóa bài chấm Writing này khỏi lịch sử?', {
      title: 'Xóa bài Writing',
      confirmText: 'Xóa',
      type: 'warning',
    });
    if (!ok) return;
    await deleteWritingAttempt(id, authUserId);
    setHistory((prev) => prev.filter((a) => a.id !== id));
    if (activeAttempt?.id === id) {
      setActiveAttempt(null);
      setSubView('compose');
    }
    notify.success('Đã xóa bài Writing.');
  };

  // Interactive Essay X-Ray Segmenter
  const filteredAnnotations = useMemo(() => {
    if (!activeAttempt) return [];
    if (xrayFilter === 'all') return activeAttempt.annotations;
    return activeAttempt.annotations.filter((a) => a.category === xrayFilter);
  }, [activeAttempt, xrayFilter]);

  const activeAnnotation = useMemo(() => {
    if (!filteredAnnotations.length) return null;
    return filteredAnnotations.find((a) => a.id === selectedAnnId) || filteredAnnotations[0];
  }, [filteredAnnotations, selectedAnnId]);

  const renderInteractiveParagraph = (paraText: string, paraIdx: number) => {
    if (!filteredAnnotations.length) {
      return (
        <p key={paraIdx} className="leading-relaxed">
          {paraText}
        </p>
      );
    }

    type Segment = { text: string; ann?: WritingAnnotation };
    let segments: Segment[] = [{ text: paraText }];

    filteredAnnotations.forEach((ann) => {
      const quote = ann.quote.trim();
      if (quote.length < 3) return;
      const nextSegments: Segment[] = [];
      // Fallback regex tolerant of extra internal spaces if AI subtly normalized spacing
      const spaceTolerantRegex = new RegExp(
        quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
        'i'
      );

      for (const seg of segments) {
        if (seg.ann) {
          nextSegments.push(seg);
          continue;
        }
        let matchIdx = seg.text.toLowerCase().indexOf(quote.toLowerCase());
        let matchLen = quote.length;

        if (matchIdx === -1) {
          const rxMatch = spaceTolerantRegex.exec(seg.text);
          if (rxMatch) {
            matchIdx = rxMatch.index;
            matchLen = rxMatch[0].length;
          }
        }

        if (matchIdx === -1) {
          nextSegments.push(seg);
        } else {
          if (matchIdx > 0) nextSegments.push({ text: seg.text.slice(0, matchIdx) });
          nextSegments.push({ text: seg.text.slice(matchIdx, matchIdx + matchLen), ann });
          if (matchIdx + matchLen < seg.text.length) {
            nextSegments.push({ text: seg.text.slice(matchIdx + matchLen) });
          }
        }
      }
      segments = nextSegments;
    });

    return (
      <p key={paraIdx} className="leading-relaxed">
        {segments.map((seg, idx) => {
          if (!seg.ann) return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
          const styleSpec = ANNOTATION_STYLE[seg.ann.category] || ANNOTATION_STYLE.grammar;
          const isSelected = activeAnnotation?.id === seg.ann.id;
          return (
            <mark
              key={idx}
              onClick={() => {
                soundEngine.playSoftClick();
                setSelectedAnnId(seg.ann!.id);
              }}
              className={`px-1 py-0.5 rounded-md cursor-pointer transition-all font-medium ${
                isDark ? styleSpec.darkMark : styleSpec.lightMark
              } ${isSelected ? 'ring-2 ring-[#E11D48] font-bold shadow-xs' : 'hover:opacity-90'}`}
            >
              {seg.text}
            </mark>
          );
        })}
      </p>
    );
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const mockOverallScore = useMemo(() => {
    const t1 = parseFloat(calcTask1);
    const t2 = parseFloat(calcTask2);
    if (!Number.isFinite(t1) || !Number.isFinite(t2)) return 0;
    return roundIeltsBand((t1 + 2 * t2) / 3);
  }, [calcTask1, calcTask2]);

  const cardBaseCls = isDark
    ? 'bg-[#12151E] border border-white/[0.08] text-slate-100'
    : 'bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] text-[#0F172A]';

  const quietPanelCls = isDark
    ? 'bg-[#12151E] border border-white/[0.08] text-slate-100'
    : 'bg-white border border-[#0F172A]/20 shadow-xs text-[#0F172A]';

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3.5 pb-8">
      {/* Top Bar: Sub-view Switcher (Left) + Task Mode / Timer Controls (Right) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div
          className={`inline-flex items-center p-0.5 rounded-xl border text-xs font-bold ${
            isDark ? 'bg-[#12151E] border-white/[0.1]' : 'bg-white border-[#0F172A]/20'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              soundEngine.playSoftClick();
              setSubView('compose');
            }}
            className={`px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all whitespace-nowrap ${
              subView === 'compose'
                ? isDark
                  ? 'bg-[#1DB954] text-[#090A0F]'
                  : 'bg-[#E11D48] text-white font-black'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-[#0F172A] hover:bg-[#FFF1F2]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Luyện Viết</span>
          </button>

          {activeAttempt && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playSoftClick();
                setSubView('result');
              }}
              className={`px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all whitespace-nowrap ${
                subView === 'result'
                  ? isDark
                    ? 'bg-[#1DB954] text-[#090A0F]'
                    : 'bg-[#E11D48] text-white font-black'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-[#0F172A] hover:bg-[#FFF1F2]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Kết Quả ({activeAttempt.scores.overall.toFixed(1)})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playSoftClick();
              setSubView('history');
            }}
            className={`px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all whitespace-nowrap ${
              subView === 'history'
                ? isDark
                  ? 'bg-[#1DB954] text-[#090A0F]'
                  : 'bg-[#E11D48] text-white font-black'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-[#0F172A] hover:bg-[#FFF1F2]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch Sử & Radar ({history.length})</span>
          </button>
        </div>

        {/* Task Type + Optional Timer */}
        {subView === 'compose' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`inline-flex items-center p-0.5 rounded-xl border text-xs font-bold ${
                isDark ? 'bg-[#12151E] border-white/[0.1]' : 'bg-white border-[#0F172A]/20'
              }`}
            >
              <button
                type="button"
                onClick={() => handleTaskTypeSwitch('task1')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  taskType === 'task1'
                    ? isDark
                      ? 'bg-amber-400 text-[#090A0F]'
                      : 'bg-[#FEF08A] text-[#0F172A] font-black'
                    : 'text-slate-500 hover:text-[#0F172A]'
                }`}
              >
                Task 1 (150+ từ)
              </button>
              <button
                type="button"
                onClick={() => handleTaskTypeSwitch('task2')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  taskType === 'task2'
                    ? isDark
                      ? 'bg-[#1DB954] text-[#090A0F]'
                      : 'bg-[#E11D48] text-white font-black'
                    : 'text-slate-500 hover:text-[#0F172A]'
                }`}
              >
                Task 2 (250+ từ)
              </button>
            </div>

            {/* Timer Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono font-bold ${
                isDark ? 'bg-[#12151E] border-white/10 text-slate-200' : 'bg-[#FFFDF7] border-[#0F172A]/20 text-[#0F172A]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#E11D48]" />
              <span>
                {formatTimer(elapsedSeconds)} / {targetMinutes}:00
              </span>
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                className="p-1 rounded-md hover:bg-[#FFE4E6] text-[#E11D48] cursor-pointer"
                title={timerRunning ? 'Tạm dừng' : 'Bắt đầu bấm giờ'}
              >
                {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              {elapsedSeconds > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setElapsedSeconds(0);
                  }}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer"
                  title="Đặt lại đồng hồ"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: COMPOSE WORKSPACE (EDITOR + 0-TOKEN PERSONAL VOCAB & RADAR)   */}
      {/* ===================================================================== */}
      {subView === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left 8 Columns: Prompt + Essay Writing Sheet */}
          <div className="lg:col-span-8 space-y-3.5">
            {/* Prompt Box */}
            <div className={`rounded-2xl p-4 space-y-3 ${quietPanelCls}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#FFE4E6] text-[#E11D48] border border-[#E11D48]/30 shrink-0 whitespace-nowrap">
                    Đề bài {taskType === 'task1' ? 'Task 1' : 'Task 2'}
                  </span>
                  <select
                    value={essayType}
                    onChange={(e) => setEssayType(e.target.value)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold outline-none cursor-pointer max-w-[185px] truncate ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-slate-200'
                        : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A]'
                    }`}
                  >
                    {ESSAY_TYPES_BY_TASK[taskType].map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value=""
                    onChange={(e) => {
                      const picked = SAMPLE_WRITING_PROMPTS.find((s) => s.id === e.target.value);
                      if (!picked) return;
                      setTaskType(picked.taskType);
                      setEssayType(picked.essayType);
                      setPrompt(picked.prompt);
                      soundEngine.playSoftClick();
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold outline-none cursor-pointer w-[132px] truncate ${
                      isDark
                        ? 'bg-[#181C28] border border-white/10 text-slate-200'
                        : 'bg-[#FEF9C3] border border-[#0F172A]/25 text-[#0F172A]'
                    }`}
                  >
                    <option value="">✨ Chọn đề mẫu</option>
                    {SAMPLE_WRITING_PROMPTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePromptImageFile(file);
                      if (e.target) e.target.value = '';
                    }}
                    className="hidden"
                  />
                  {taskType === 'task1' && (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                        isDark
                          ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200'
                          : 'bg-white hover:bg-[#FFF1F2] border border-[#0F172A]/25 text-[#0F172A]'
                      }`}
                      title="Tải hoặc dán (Ctrl+V) ảnh biểu đồ Task 1"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#E11D48]" />
                      <span>Ảnh (Ctrl+V)</span>
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Dán đề bài IELTS Writing vào đây (với Task 1 có thể nhấn Ctrl+V dán ảnh biểu đồ)..."
                className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] font-medium leading-relaxed outline-none resize-y min-h-[84px] ${
                  isDark
                    ? 'bg-[#181C28] border border-white/10 text-white placeholder:text-slate-500'
                    : 'bg-[#FFFDF7] border border-[#0F172A]/15 text-[#0F172A] focus:border-[#0F172A]'
                }`}
              />

              {promptImage && (
                <div className="relative inline-block rounded-xl overflow-hidden border-2 border-[#0F172A] bg-[#FFF8F1] max-w-full">
                  <img
                    src={promptImage}
                    alt="Task 1 Diagram"
                    className="max-h-52 w-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setPromptImage('')}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-[#E11D48] text-white border border-[#0F172A] cursor-pointer"
                    title="Gỡ ảnh biểu đồ"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Essay Writing Area + Live 0-Token Diagnostics */}
            <div className={`rounded-2xl p-4 space-y-3 ${cardBaseCls}`}>
              {/* Live 0-Token Telemetry Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#0F172A]/10">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg font-black border ${
                      liveStats.effectiveWordCount >= minTargetWords
                        ? 'bg-[#DCFCE7] text-[#15803D] border-[#15803D]/30'
                        : 'bg-[#FFF1F2] text-[#E11D48] border-[#E11D48]/30'
                    }`}
                  >
                    {liveStats.effectiveWordCount}/{minTargetWords} từ
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {liveStats.paragraphCount} đoạn • {liveStats.sentenceCount} câu
                    {liveStats.avgSentenceLength > 0 ? ` (~${liveStats.avgSentenceLength} từ/câu)` : ''}
                  </span>
                  {liveStats.promptOverlapRatio >= 12 && (
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                      Trùng đề {liveStats.promptOverlapRatio}%
                    </span>
                  )}
                </div>

                {liveStats.repeatedWords.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10.5px] font-bold text-slate-400">Lặp:</span>
                    {liveStats.repeatedWords.slice(0, 3).map((rw) => (
                      <span
                        key={rw.word}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FEF9C3] text-[#0F172A] border border-[#0F172A]/20"
                      >
                        {rw.word} ({rw.count}×)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                ref={essayTextareaRef}
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                rows={13}
                placeholder={`Viết bài ${taskType === 'task1' ? 'Task 1 (Intro -> Overview -> Body 1 -> Body 2)' : 'Task 2 (Intro -> Body 1 -> Body 2 -> Conclusion)'} tại đây...\n\nMẹo: Bấm vào từ vựng bên cột phải để chèn nhanh vào bài viết!`}
                className={`w-full p-4 rounded-2xl text-sm leading-relaxed outline-none resize-y font-serif ${
                  isDark
                    ? 'bg-[#0E1118] border border-white/10 text-slate-100 placeholder:text-slate-600'
                    : 'bg-[#FFFDF7] border border-[#0F172A]/20 text-[#0F172A] focus:border-[#0F172A] placeholder:text-slate-400'
                }`}
              />

              {/* Live 0-token Warnings + Submit CTA */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex-1 min-w-[200px] space-y-1">
                  {liveStats.warnings.slice(0, 2).map((w, i) => (
                    <p key={i} className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{w}</span>
                    </p>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={isGrading}
                  onClick={handleGradeEssay}
                  className="px-5 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-black border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-55 shrink-0"
                >
                  {isGrading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Giám khảo AI đang chấm & soi lỗi...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Chấm Điểm Chuẩn IELTS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right 4 Columns: 0-Token Personal Vocab Injection + Weakness Radar + Overall Calc */}
          <div className="lg:col-span-4 space-y-3.5">
            {/* Personal Vocab Injector */}
            <div className={`rounded-2xl p-4 space-y-2.5 ${quietPanelCls}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#E11D48]" />
                  <span>Từ Vựng Kho Bạn Gợi Ý</span>
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#15803D]">
                  0 Token
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Lọc từ kho Từ Vựng cá nhân khớp chủ đề bài này. Bấm để chèn vào bài viết:
              </p>

              {personalVocab.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#FFF8F1] border border-[#0F172A]/15 text-[11px] text-slate-500">
                  Thêm từ vào tab <strong>Từ Vựng</strong> để AI ưu tiên gợi ý từ của chính bạn vào bài Writing.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {personalVocab.map((v) => {
                    const isUsed = essay.toLowerCase().includes(v.word.toLowerCase());
                    return (
                      <div
                        key={v.id}
                        onClick={() => insertWordIntoEssay(v.word)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isUsed
                            ? 'bg-[#DCFCE7] border-[#15803D]/40 text-[#15803D]'
                            : isDark
                            ? 'bg-white/5 border-white/10 hover:bg-white/10'
                            : 'bg-[#FFFDF7] border-[#0F172A]/15 hover:border-[#0F172A] hover:bg-[#FEF9C3]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black truncate">{v.word}</span>
                            {isUsed && <Check className="w-3 h-3 shrink-0" />}
                          </div>
                          <p className="text-[10.5px] opacity-80 truncate">{v.meaning}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakEnglishWord(v.word, false);
                          }}
                          className="p-1 rounded-lg hover:bg-white/70 text-[#E11D48] shrink-0 cursor-pointer"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pre-write Weakness Radar */}
            <div className={`rounded-2xl p-4 space-y-2.5 ${quietPanelCls}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#E11D48]" />
                  <span>Nhắc Lỗi Cố Hữu Của Bạn</span>
                </h3>
                {radar && radar.totalAttempts > 0 && (
                  <span className="text-[10.5px] font-mono font-black text-[#E11D48]">
                    TB {radar.avgOverall.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {(radar?.preWriteChecklist || [
                  'Task 1 nhớ viết rõ Overview tổng quan xu hướng.',
                  'Task 2 giữ quan điểm (position) xuyên suốt Mở–Thân–Kết.',
                  'Soát lỗi chia thì, mạo từ a/an/the trước khi nộp.',
                ]).map((tip, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl text-[11px] font-medium flex items-start gap-2 ${
                      isDark ? 'bg-white/5 text-slate-300' : 'bg-[#FFF8F1] border border-[#0F172A]/12 text-[#0F172A]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]/30 text-[9.5px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Task 1 + Task 2 Mock Overall Calculator */}
            <div className={`rounded-2xl p-4 space-y-2.5 ${quietPanelCls}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-[#E11D48]" />
                  <span>Tính Điểm Tổng Writing</span>
                </h3>
                <span className="text-sm font-black px-2.5 py-0.5 rounded-lg bg-[#E11D48] text-white border border-[#0F172A]">
                  {mockOverallScore.toFixed(1)}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Công thức IDP: (Task 1 + 2 × Task 2) / 3, làm tròn 0.5 band.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Task 1 (1/3)</label>
                  <select
                    value={calcTask1}
                    onChange={(e) => setCalcTask1(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-black outline-none ${
                      isDark ? 'bg-[#181C28] border border-white/10' : 'bg-[#FFFDF7] border border-[#0F172A]/20'
                    }`}
                  >
                    {['4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Task 2 (2/3)</label>
                  <select
                    value={calcTask2}
                    onChange={(e) => setCalcTask2(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-black outline-none ${
                      isDark ? 'bg-[#181C28] border border-white/10' : 'bg-[#FFFDF7] border border-[#0F172A]/20'
                    }`}
                  >
                    {['4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: EXAMINER RESULT + INTERACTIVE X-RAY + REWRITE LAB + UPGRADE   */}
      {/* ===================================================================== */}
      {subView === 'result' && activeAttempt && (
        <div className="space-y-4">
          {/* Scoreboard + Examiner Band Ceiling Banner */}
          <div className={`rounded-2xl p-4 sm:p-5 space-y-4 ${cardBaseCls}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#E11D48] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">Overall</span>
                  <span className="text-2xl font-black leading-none">{activeAttempt.scores.overall.toFixed(1)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]">
                      {activeAttempt.taskType === 'task1' ? 'Task 1' : 'Task 2'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {activeAttempt.localDiagnostics.effectiveWordCount} từ thực chất • {activeAttempt.localDiagnostics.paragraphCount} đoạn
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                    {activeAttempt.overallSummaryVi}
                  </p>
                </div>
              </div>

              {/* 4 Criterion Scores */}
              <div className="grid grid-cols-4 gap-2 shrink-0">
                {[
                  { label: activeAttempt.taskType === 'task1' ? 'TA' : 'TR', val: activeAttempt.scores.taskAchievement },
                  { label: 'CC', val: activeAttempt.scores.coherenceCohesion },
                  { label: 'LR', val: activeAttempt.scores.lexicalResource },
                  { label: 'GRA', val: activeAttempt.scores.grammaticalRange },
                ].map((c) => (
                  <div
                    key={c.label}
                    className={`px-3 py-2 rounded-xl text-center border ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-[#FFFDF7] border-[#0F172A]/20'
                    }`}
                  >
                    <span className="text-[10px] font-black text-slate-500 block">{c.label}</span>
                    <span className="text-base font-black text-[#E11D48]">
                      {Number.isInteger(c.val) ? c.val : c.val.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Examiner Ceiling Audit + Unlock +0.5 Actions */}
            {(activeAttempt.bandCeilings?.length > 0 || activeAttempt.unlockNextBand?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#0F172A]/12">
                {activeAttempt.bandCeilings?.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#FFF1F2] border border-[#E11D48]/30 space-y-1.5">
                    <h4 className="text-[11px] font-black text-[#E11D48] uppercase flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Lỗi Chặn Trần Band (Ceiling Audit)</span>
                    </h4>
                    {activeAttempt.bandCeilings.map((c, idx) => (
                      <p key={idx} className="text-xs text-[#0F172A] leading-snug">
                        <strong className="text-[#E11D48]">[{c.criterion} • {c.cappedAt}]</strong> {c.reasonVi}
                      </p>
                    ))}
                  </div>
                )}

                {activeAttempt.unlockNextBand?.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#DCFCE7]/60 border border-[#15803D]/25 space-y-1.5">
                    <h4 className="text-[11px] font-black text-[#15803D] uppercase flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Cách Phá Trần Lên +0.5 Band Ngay</span>
                    </h4>
                    {activeAttempt.unlockNextBand.map((u, idx) => (
                      <p key={idx} className="text-xs text-[#0F172A] leading-snug flex items-start gap-1.5">
                        <span className="font-black text-[#15803D] shrink-0">{u.estimatedGain}:</span>
                        <span>{u.actionVi}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Result Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className={`inline-flex items-center p-0.5 rounded-xl border text-xs font-bold flex-wrap ${
                isDark ? 'bg-[#12151E] border-white/10' : 'bg-white border-[#0F172A]/20'
              }`}
            >
              {[
                { id: 'xray' as const, label: `Soi X-Quang Bài (${activeAttempt.annotations.length})` },
                { id: 'criteria' as const, label: '4 Tiêu Chí & Từ Vựng' },
                { id: 'rewrite' as const, label: `Rewrite Lab (${activeAttempt.weakSentences.length})` },
                { id: 'upgrade' as const, label: 'Nâng Cấp Band' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playSoftClick();
                    setResultTab(t.id);
                    if (t.id === 'upgrade') handleTriggerUpgrade(upgradeMode);
                  }}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    resultTab === t.id
                      ? isDark
                        ? 'bg-[#1DB954] text-[#090A0F]'
                        : 'bg-[#E11D48] text-white font-black'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-[#0F172A] hover:bg-[#FFF1F2]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setSubView('compose');
                soundEngine.playSoftClick();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#FEF9C3] hover:bg-[#FEF08A] text-[#0F172A] border border-[#0F172A]/30 text-xs font-black cursor-pointer"
            >
              ✏️ Sửa & Chấm Lại Bài Này
            </button>
          </div>

          {/* RESULT TAB 1: INTERACTIVE ESSAY X-RAY */}
          {resultTab === 'xray' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left: Highlighted Essay */}
              <div className={`lg:col-span-7 rounded-2xl p-4 sm:p-5 space-y-3 ${cardBaseCls}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#0F172A]/10">
                  <span className="text-xs font-black">Bấm vào cụm tô màu để xem cách sửa:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setXrayFilter('all')}
                      className={`px-2 py-0.5 rounded-lg text-[10.5px] font-black border cursor-pointer ${
                        xrayFilter === 'all'
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-white border-[#0F172A]/20 text-[#0F172A]'
                      }`}
                    >
                      Tất cả ({activeAttempt.annotations.length})
                    </button>
                    {(['strength', 'grammar', 'lexical', 'cohesion', 'logic'] as const).map((cat) => {
                      const count = activeAttempt.annotations.filter((a) => a.category === cat).length;
                      const st = ANNOTATION_STYLE[cat];
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setXrayFilter(cat)}
                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold border flex items-center gap-1 cursor-pointer ${
                            xrayFilter === cat
                              ? isDark
                                ? st.badgeDark
                                : st.badgeLight
                              : 'bg-white border-[#0F172A]/15 text-slate-600'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                          <span>
                            {st.label} ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 text-sm font-serif select-text">
                  {activeAttempt.essay
                    .split(/\r?\n\s*\r?\n|\r?\n/)
                    .filter((p) => p.trim())
                    .map((para, idx) => renderInteractiveParagraph(para, idx))}
                </div>
              </div>

              {/* Right: Annotation Inspector */}
              <div className="lg:col-span-5 space-y-3">
                {activeAnnotation ? (
                  <div className={`rounded-2xl p-4 space-y-2.5 ${cardBaseCls}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10.5px] font-black px-2 py-0.5 rounded-md border ${
                          isDark
                            ? ANNOTATION_STYLE[activeAnnotation.category].badgeDark
                            : ANNOTATION_STYLE[activeAnnotation.category].badgeLight
                        }`}
                      >
                        {ANNOTATION_STYLE[activeAnnotation.category].label}
                      </span>
                      {activeAnnotation.bandImpact && (
                        <span className="text-[10.5px] font-mono font-black text-[#15803D]">
                          {activeAnnotation.bandImpact}
                        </span>
                      )}
                    </div>

                    {activeAnnotation.category === 'strength' ? (
                      <div className="p-3 rounded-xl bg-[#DCFCE7] border border-[#16A34A]/35 text-xs font-semibold text-[#14532D] space-y-1">
                        <div className="text-[10.5px] font-black uppercase tracking-wider text-[#15803D] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Điểm sáng ăn điểm trong bài</span>
                        </div>
                        <p className="italic font-serif text-[#0F172A]">&ldquo;{activeAnnotation.quote}&rdquo;</p>
                      </div>
                    ) : (
                      <>
                        <div className="p-2.5 rounded-xl bg-[#FFF1F2] border border-[#E11D48]/20 text-xs text-[#9F1239] line-through">
                          {activeAnnotation.quote}
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#DCFCE7] border border-[#15803D]/30 text-xs font-bold text-[#14532D] flex items-start justify-between gap-2">
                          <span>→ {activeAnnotation.suggestion}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(activeAnnotation.suggestion);
                              notify.success('Đã sao chép gợi ý sửa!');
                            }}
                            className="p-1 rounded hover:bg-white/70 shrink-0 cursor-pointer"
                            title="Sao chép"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                    <p className="text-xs text-slate-600 leading-relaxed">{activeAnnotation.explanationVi}</p>
                  </div>
                ) : (
                  <div className={`rounded-2xl p-4 text-xs text-slate-500 ${cardBaseCls}`}>
                    Không có lỗi nổi bật ở bộ lọc này.
                  </div>
                )}

                {/* Quick list of all annotations */}
                <div className={`rounded-2xl p-3 space-y-1.5 max-h-72 overflow-y-auto ${quietPanelCls}`}>
                  {filteredAnnotations.map((ann) => {
                    const st = ANNOTATION_STYLE[ann.category];
                    const active = activeAnnotation?.id === ann.id;
                    return (
                      <button
                        key={ann.id}
                        type="button"
                        onClick={() => setSelectedAnnId(ann.id)}
                        className={`w-full text-left p-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-[#FFF1F2] border-[#E11D48] font-bold'
                            : 'bg-[#FFFDF7] border-[#0F172A]/10 hover:border-[#0F172A]/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                          <span className="truncate">{ann.quote}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* RESULT TAB 2: 4 CRITERIA BREAKDOWN + PERSONAL/RECOMMENDED VOCAB */}
          {resultTab === 'criteria' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[
                  {
                    title: activeAttempt.taskType === 'task1' ? 'Task Achievement (TA)' : 'Task Response (TR)',
                    score: activeAttempt.scores.taskAchievement,
                    detail: activeAttempt.criteriaDetails.taskAchievement,
                  },
                  {
                    title: 'Coherence & Cohesion (CC)',
                    score: activeAttempt.scores.coherenceCohesion,
                    detail: activeAttempt.criteriaDetails.coherenceCohesion,
                  },
                  {
                    title: 'Lexical Resource (LR)',
                    score: activeAttempt.scores.lexicalResource,
                    detail: activeAttempt.criteriaDetails.lexicalResource,
                  },
                  {
                    title: 'Grammatical Range & Accuracy (GRA)',
                    score: activeAttempt.scores.grammaticalRange,
                    detail: activeAttempt.criteriaDetails.grammaticalRange,
                  },
                ].map((c) => (
                  <div key={c.title} className={`rounded-2xl p-4 space-y-2.5 ${cardBaseCls}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-black">{c.title}</h4>
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#FFE4E6] text-[#E11D48] font-black text-xs border border-[#E11D48]/30">
                        Band {Number.isInteger(c.score) ? c.score : c.score.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.detail?.summaryVi}</p>
                    {c.detail?.strengthsVi?.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10.5px] font-black text-[#15803D] uppercase">Điểm tốt</span>
                        {c.detail.strengthsVi.map((s, i) => (
                          <p key={i} className="text-xs text-[#14532D] flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#16A34A]" />
                            <span>{s}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {c.detail?.weaknessesVi?.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10.5px] font-black text-[#E11D48] uppercase">Cần khắc phục</span>
                        {c.detail.weaknessesVi.map((w, i) => (
                          <p key={i} className="text-xs text-[#9F1239] flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#E11D48]" />
                            <span>{w}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Recommended Vocab -> 1-Click Save to Vocab Bank */}
              <div className={`rounded-2xl p-4 space-y-3 ${cardBaseCls}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#E11D48]" />
                    <span>Từ Vựng & Collocation Ăn Điểm Từ Bài Này</span>
                  </h4>
                  {activeAttempt.injectedVocabUsed?.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">Đã dùng từ kho của bạn:</span>
                      {activeAttempt.injectedVocabUsed.map((iv, idx) => (
                        <span
                          key={idx}
                          title={iv.noteVi || (iv.usedCorrectly ? 'Dùng đúng ngữ cảnh & collocation (+1 SRS)' : 'Chưa tự nhiên / sai ngữ cảnh')}
                          className={`text-[10.5px] font-black px-2 py-0.5 rounded-md border ${
                            iv.usedCorrectly
                              ? 'bg-[#DCFCE7] text-[#15803D] border-[#15803D]/30'
                              : 'bg-[#FEF9C3] text-[#B45309] border-amber-400/40'
                          }`}
                        >
                          {iv.word} {iv.usedCorrectly ? '✓ +SRS' : '⚠ Cần chỉnh'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeAttempt.recommendedVocab.map((v, idx) => {
                    const isSaved = Boolean(savedVocabSet[v.word]);
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                          isDark ? 'bg-white/5 border-white/10' : 'bg-[#FFFDF7] border-[#0F172A]/15'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-black truncate">{v.word}</span>
                              {v.phonetic && <span className="text-[10.5px] font-mono text-slate-400">{v.phonetic}</span>}
                              <button
                                type="button"
                                onClick={() => speakEnglishWord(v.word, false)}
                                className="p-0.5 text-[#E11D48] cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              disabled={isSaved}
                              onClick={() => handleSaveRecommendedVocab(v)}
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer shrink-0 ${
                                isSaved
                                  ? 'bg-[#DCFCE7] text-[#15803D] border border-[#15803D]/30'
                                  : 'bg-[#E11D48] hover:bg-[#BE123C] text-white border border-[#0F172A]'
                              }`}
                            >
                              {isSaved ? 'Đã lưu ✓' : '+ Lưu vào kho'}
                            </button>
                          </div>
                          <p className="text-xs font-bold text-[#E11D48]">{v.meaning}</p>
                          {v.example && <p className="text-[11px] italic text-slate-600">"{v.example}"</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* RESULT TAB 3: REWRITE LAB (ACTIVE RECALL SENTENCE FIXING) */}
          {resultTab === 'rewrite' && (
            <div className={`rounded-2xl p-4 sm:p-5 space-y-4 ${cardBaseCls}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-[#E11D48]" />
                    <span>Rewrite Lab — Tự Sửa 3 Câu Yếu Nhất Để Nhảy Band</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thay vì đọc bài mẫu rồi quên, hãy tự viết lại từng câu theo gợi ý dưới đây rồi chấm nhanh!
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isCheckingRewrites}
                  onClick={handleSubmitRewriteLab}
                  className="px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-black border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCheckingRewrites ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Chấm Câu Tự Sửa</span>
                </button>
              </div>

              <div className="space-y-3">
                {activeAttempt.weakSentences.map((ws, idx) => (
                  <div
                    key={ws.id}
                    className={`p-3.5 rounded-2xl border space-y-2.5 ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-[#FFFDF7] border-[#0F172A]/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-[#FFE4E6] text-[#E11D48]">
                        Câu #{idx + 1} cần nâng cấp
                      </span>
                      {ws.rewriteScore && (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#15803D]">
                          {ws.rewriteScore}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-serif p-2.5 rounded-xl bg-white border border-[#0F172A]/15 text-[#0F172A]">
                      &ldquo;{ws.original}&rdquo;
                    </p>
                    <p className="text-[11px] font-semibold text-amber-700">💡 Gợi ý: {ws.hintVi}</p>
                    <textarea
                      value={rewriteDrafts[ws.id] || ''}
                      onChange={(e) => setRewriteDrafts((prev) => ({ ...prev, [ws.id]: e.target.value }))}
                      rows={2}
                      placeholder="Viết lại câu mới hay hơn tại đây..."
                      className={`w-full p-2.5 rounded-xl text-xs font-medium outline-none resize-y ${
                        isDark
                          ? 'bg-[#12151E] border border-white/10 text-white'
                          : 'bg-white border border-[#0F172A]/25 text-[#0F172A] focus:border-[#0F172A]'
                      }`}
                    />
                    {ws.rewriteFeedbackVi && (
                      <p className="text-xs font-semibold text-[#15803D] bg-[#DCFCE7]/50 p-2 rounded-lg">
                        ✓ {ws.rewriteFeedbackVi}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULT TAB 4: LAZY-GENERATED UPGRADE WITH INTERACTIVE HIGHLIGHTS */}
          {resultTab === 'upgrade' && (
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className={`inline-flex items-center p-0.5 rounded-xl border text-xs font-bold ${
                  isDark ? 'bg-[#12151E] border-white/10' : 'bg-white border-[#0F172A]/20'
                }`}>
                  <button
                    type="button"
                    onClick={() => handleTriggerUpgrade('preserve_voice')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                      upgradeMode === 'preserve_voice' ? 'bg-[#E11D48] text-white font-black' : 'text-[#0F172A]'
                    }`}
                  >
                    Sửa Giữ Giọng Văn (+1.0 Band)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerUpgrade('band_85')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                      upgradeMode === 'band_85' ? 'bg-[#E11D48] text-white font-black' : 'text-[#0F172A]'
                    }`}
                  >
                    Bài Mẫu Band 8.5+
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isGeneratingUpgrade}
                    onClick={() => handleTriggerUpgrade(upgradeMode, true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#E11D48]/35 bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Tạo lại bản nâng cấp kèm highlight & giải thích chi tiết"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tạo & Tô sáng lại</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOriginalInUpgrade((v) => !v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                      showOriginalInUpgrade
                        ? 'bg-[#FEF08A] border-[#0F172A] text-[#0F172A] font-black'
                        : 'bg-white border-[#0F172A]/20 text-slate-600 hover:border-[#0F172A]'
                    }`}
                  >
                    {showOriginalInUpgrade ? 'Ẩn bài gốc' : 'So sánh bài gốc'}
                  </button>
                </div>
              </div>

              {isGeneratingUpgrade ? (
                <div className={`rounded-2xl p-12 flex items-center justify-center gap-2 text-xs font-bold text-[#E11D48] ${cardBaseCls}`}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang viết bản nâng cấp & phân tích từng điểm ăn điểm...</span>
                </div>
              ) : (
                (() => {
                  const text =
                    upgradeMode === 'preserve_voice'
                      ? activeAttempt.upgradedVersions?.preserveVoiceEssay
                      : activeAttempt.upgradedVersions?.band85Essay;
                  const notes =
                    upgradeMode === 'preserve_voice'
                      ? activeAttempt.upgradedVersions?.preserveVoiceNotesVi
                      : activeAttempt.upgradedVersions?.band85NotesVi;
                  const highlights: WritingUpgradeHighlight[] =
                    (upgradeMode === 'preserve_voice'
                      ? activeAttempt.upgradedVersions?.preserveVoiceHighlights
                      : activeAttempt.upgradedVersions?.band85Highlights) || [];

                  if (!text) return null;

                  const activeHighlight =
                    highlights.find((h) => h.id === selectedUpgradeHighlightId) || highlights[0] || null;

                  const renderHighlightedUpgradePara = (paraText: string, pIdx: number) => {
                    if (!highlights.length) {
                      return (
                        <p key={pIdx} className="leading-relaxed">
                          {paraText}
                        </p>
                      );
                    }
                    type Seg = { text: string; hl?: WritingUpgradeHighlight };
                    let segments: Seg[] = [{ text: paraText }];
                    highlights.forEach((hl) => {
                      const phrase = hl.upgradedPhrase.trim();
                      if (phrase.length < 3) return;
                      const rx = new RegExp(
                        phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
                        'i'
                      );
                      const nextSegs: Seg[] = [];
                      for (const seg of segments) {
                        if (seg.hl) {
                          nextSegs.push(seg);
                          continue;
                        }
                        let idx = seg.text.toLowerCase().indexOf(phrase.toLowerCase());
                        let len = phrase.length;
                        if (idx === -1) {
                          const m = rx.exec(seg.text);
                          if (m) {
                            idx = m.index;
                            len = m[0].length;
                          }
                        }
                        if (idx === -1) {
                          nextSegs.push(seg);
                        } else {
                          if (idx > 0) nextSegs.push({ text: seg.text.slice(0, idx) });
                          nextSegs.push({ text: seg.text.slice(idx, idx + len), hl });
                          if (idx + len < seg.text.length) {
                            nextSegs.push({ text: seg.text.slice(idx + len) });
                          }
                        }
                      }
                      segments = nextSegs;
                    });

                    return (
                      <p key={pIdx} className="leading-relaxed">
                        {segments.map((seg, i) => {
                          if (!seg.hl) return <React.Fragment key={i}>{seg.text}</React.Fragment>;
                          const st = ANNOTATION_STYLE[seg.hl.category] || ANNOTATION_STYLE.lexical;
                          const isSelected = activeHighlight?.id === seg.hl.id;
                          return (
                            <mark
                              key={i}
                              onClick={() => {
                                soundEngine.playSoftClick();
                                setSelectedUpgradeHighlightId(seg.hl!.id);
                              }}
                              className={`px-1 py-0.5 rounded-md cursor-pointer transition-all font-medium ${
                                isDark ? st.darkMark : st.lightMark
                              } ${isSelected ? 'ring-2 ring-[#E11D48] font-bold shadow-xs' : 'hover:opacity-90'}`}
                            >
                              {seg.text}
                            </mark>
                          );
                        })}
                      </p>
                    );
                  };

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* Left: Highlighted Upgraded Essay */}
                        <div className={`lg:col-span-7 rounded-2xl p-4 sm:p-5 space-y-3 ${cardBaseCls}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#0F172A]/10">
                            <span className="text-xs font-black text-[#15803D]">
                              {upgradeMode === 'preserve_voice'
                                ? 'Bản sửa giữ ý (+1.0 Band) — Bấm cụm tô màu để hiểu vì sao ăn điểm:'
                                : 'Bản tham khảo Band 8.5+ — Bấm cụm tô màu để xem giải thích:'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(text);
                                notify.success('Đã sao chép bài nâng cấp!');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#FFF8F1] hover:bg-[#FEF08A] border border-[#0F172A]/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </button>
                          </div>

                          <div className="space-y-3 text-sm font-serif select-text">
                            {text
                              .split(/\r?\n\s*\r?\n|\r?\n/)
                              .filter((p) => p.trim())
                              .map((para, idx) => renderHighlightedUpgradePara(para, idx))}
                          </div>

                          {notes && (
                            <div className="pt-3 border-t border-[#0F172A]/10 text-xs text-slate-600 leading-relaxed">
                              <strong className="text-[#0F172A]">Tổng quan nâng cấp:</strong> {notes}
                            </div>
                          )}
                        </div>

                        {/* Right: Interactive Inspector ("Tại sao phần này quan trọng & giúp lên band?") */}
                        <div className="lg:col-span-5 space-y-3">
                          {activeHighlight ? (
                            <div className={`rounded-2xl p-4 space-y-2.5 ${cardBaseCls}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-[10.5px] font-black px-2 py-0.5 rounded-md border ${
                                    isDark
                                      ? ANNOTATION_STYLE[activeHighlight.category].badgeDark
                                      : ANNOTATION_STYLE[activeHighlight.category].badgeLight
                                  }`}
                                >
                                  {ANNOTATION_STYLE[activeHighlight.category].label}
                                </span>
                                {activeHighlight.bandBoost && (
                                  <span className="text-[10.5px] font-mono font-black text-[#15803D]">
                                    {activeHighlight.bandBoost}
                                  </span>
                                )}
                              </div>

                              {activeHighlight.originalPhrase && (
                                <div className="p-2.5 rounded-xl bg-[#FFF1F2] border border-[#E11D48]/20 text-xs text-[#9F1239]">
                                  <span className="text-[10px] font-black uppercase block mb-0.5">Cách viết cũ:</span>
                                  <span className="line-through">{activeHighlight.originalPhrase}</span>
                                </div>
                              )}

                              <div className="p-2.5 rounded-xl bg-[#DCFCE7] border border-[#15803D]/30 text-xs font-bold text-[#14532D]">
                                <span className="text-[10px] font-black uppercase block mb-0.5 text-[#15803D]">
                                  Nâng cấp thành:
                                </span>
                                <span>{activeHighlight.upgradedPhrase}</span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-[#FFFDF7] border border-[#0F172A]/12 space-y-1">
                                <span className="text-[10px] font-black uppercase text-[#E11D48] block">
                                  Vì sao phần này quan trọng & giúp tăng band:
                                </span>
                                <p className="text-xs text-[#0F172A] leading-relaxed">
                                  {activeHighlight.importanceVi}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className={`rounded-2xl p-4 text-xs space-y-2 ${cardBaseCls}`}>
                              <p className="text-slate-600 leading-relaxed">
                                {upgradeStaleBackendWarn
                                  ? '⚠️ Server backend đang chạy bản cũ chưa trả về dữ liệu highlight. Hãy khởi động lại terminal backend (npm run dev / npm start) rồi bấm "Tạo & Tô sáng lại"!'
                                  : 'Chưa có dữ liệu highlight cho bản nâng cấp cũ này. Bấm nút bên dưới để tạo highlight & giải thích chi tiết ngay:'}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleTriggerUpgrade(upgradeMode, true)}
                                className="px-3.5 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-black border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center gap-1.5 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Tạo & Tô Sáng Ngay</span>
                              </button>
                            </div>
                          )}

                          {highlights.length > 0 && (
                            <div className={`rounded-2xl p-3 space-y-1.5 max-h-72 overflow-y-auto ${quietPanelCls}`}>
                              {highlights.map((hl) => {
                                const st = ANNOTATION_STYLE[hl.category] || ANNOTATION_STYLE.lexical;
                                const active = activeHighlight?.id === hl.id;
                                return (
                                  <button
                                    key={hl.id}
                                    type="button"
                                    onClick={() => setSelectedUpgradeHighlightId(hl.id)}
                                    className={`w-full text-left p-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                      active
                                        ? 'bg-[#FFF1F2] border-[#E11D48] font-bold'
                                        : 'bg-[#FFFDF7] border-[#0F172A]/10 hover:border-[#0F172A]/30'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                                      <span className="truncate">{hl.upgradedPhrase}</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-black text-[#15803D] shrink-0">
                                      {hl.bandBoost}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {showOriginalInUpgrade && (
                        <div className={`rounded-2xl p-4 space-y-2 ${cardBaseCls}`}>
                          <span className="text-[10.5px] font-black uppercase text-slate-500">
                            Bài gốc của bạn (đối chiếu)
                          </span>
                          <div className="text-xs sm:text-sm font-serif leading-relaxed whitespace-pre-line text-slate-700">
                            {activeAttempt.essay}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: HISTORY & PERSONAL WEAKNESS RADAR                             */}
      {/* ===================================================================== */}
      {subView === 'history' && (
        <div className="space-y-4">
          {radar && radar.totalAttempts > 0 && (
            <div className={`rounded-2xl p-4 sm:p-5 space-y-3 ${cardBaseCls}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-black flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#E11D48]" />
                  <span>Radar Tiến Bộ & Bệnh Hay Mắc Cá Nhân</span>
                </h3>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#FFE4E6] text-[#E11D48]">
                  TB {radar.avgOverall.toFixed(1)} • {radar.totalAttempts} bài đã chấm
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#FFFDF7] border border-[#0F172A]/15 space-y-1.5">
                  <span className="text-[10.5px] font-black text-[#E11D48] uppercase">Tiêu chí cần kéo nhất</span>
                  <p className="text-xs font-bold">
                    {radar.weakestCriterion
                      ? `${radar.weakestCriterion.label} (TB ${radar.weakestCriterion.avgScore})`
                      : 'Chưa đủ dữ liệu'}
                  </p>
                  {radar.recurringPatterns.map((rp, i) => (
                    <p key={i} className="text-[11px] text-slate-600">
                      • {rp.label} ({rp.count} lần)
                    </p>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-[#FFFDF7] border border-[#0F172A]/15 space-y-2">
                  <span className="text-[10.5px] font-black text-slate-500 uppercase">Biểu đồ điểm gần đây</span>
                  <div className="flex items-end gap-2 h-20 pt-2">
                    {radar.recentTrend.map((pt) => (
                      <div key={pt.id} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-[#E11D48]">{pt.overall.toFixed(1)}</span>
                        <div
                          className="w-full max-w-[26px] rounded-t-md bg-[#E11D48] border border-[#0F172A]"
                          style={{ height: `${Math.max(18, (pt.overall / 9) * 52)}px` }}
                        />
                        <span className="text-[9px] font-mono text-slate-400">{pt.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <div className={`rounded-2xl p-10 text-center space-y-3 ${cardBaseCls}`}>
              <PenTool className="w-8 h-8 text-[#E11D48] mx-auto" />
              <p className="text-sm font-black">Chưa có bài Writing nào được chấm</p>
              <button
                type="button"
                onClick={() => setSubView('compose')}
                className="px-4 py-2 rounded-xl bg-[#E11D48] text-white text-xs font-black border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] cursor-pointer"
              >
                Viết bài đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenHistoryAttempt(item)}
                  className={`rounded-2xl p-4 space-y-2.5 cursor-pointer hover:-translate-y-0.5 transition-all ${cardBaseCls}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-[#E11D48] text-white">
                        Band {item.scores.overall.toFixed(1)}
                      </span>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-[#FEF9C3] text-[#0F172A] border border-[#0F172A]/20">
                        {item.taskType === 'task1' ? 'Task 1' : 'Task 2'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-mono text-slate-400">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryAttempt(item.id, e)}
                        className="p-1 rounded-lg hover:bg-[#FFE4E6] text-slate-400 hover:text-[#E11D48] cursor-pointer"
                        title="Xóa bài"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-bold line-clamp-2 text-[#0F172A]">{item.prompt}</p>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1 border-t border-[#0F172A]/10">
                    <span>
                      TA/TR {Number.isInteger(item.scores.taskAchievement) ? item.scores.taskAchievement : item.scores.taskAchievement.toFixed(1)} • CC{' '}
                      {Number.isInteger(item.scores.coherenceCohesion) ? item.scores.coherenceCohesion : item.scores.coherenceCohesion.toFixed(1)} • LR{' '}
                      {Number.isInteger(item.scores.lexicalResource) ? item.scores.lexicalResource : item.scores.lexicalResource.toFixed(1)} • GRA{' '}
                      {Number.isInteger(item.scores.grammaticalRange) ? item.scores.grammaticalRange : item.scores.grammaticalRange.toFixed(1)}
                    </span>
                    <span className="text-[#E11D48] font-black inline-flex items-center gap-0.5">
                      Xem <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
