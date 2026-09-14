import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Shuffle, 
  Sparkles, 
  BookOpen, 
  Lightbulb, 
  Clock, 
  Tag, 
  Send,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  PenLine,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Eye,
  Heart
} from 'lucide-react';
import { QuestionCard, QuestionStage, WeeklyTopic, ActionCommitment } from '../types';
import { STAGES_CONFIG } from '../data/defaultTopics';
import { 
  playCardFlipSound, 
  playStageChime, 
  playCorrectAnswerSound, 
  playWrongAnswerSound 
} from '../utils/audio';

interface CardDeckProps {
  currentStage: QuestionStage;
  currentCardIndex: number;
  cardsInStage: QuestionCard[];
  onNextCard: () => void;
  onPrevCard: () => void;
  onSelectCardIndex: (index: number) => void;
  onRandomCard: () => void;
  onGoToNextStage: () => void;
  topic: WeeklyTopic | null;
  onAddActionCommitment: (action: Omit<ActionCommitment, 'id' | 'timestamp'>) => void;
  actionCount: number;
  actions?: ActionCommitment[];
  currentUserName?: string;
  onSetCurrentUserName?: (name: string) => void;
}

export const CardDeck: React.FC<CardDeckProps> = ({
  currentStage,
  currentCardIndex,
  cardsInStage,
  onNextCard,
  onPrevCard,
  onSelectCardIndex,
  onRandomCard,
  onGoToNextStage,
  topic,
  onAddActionCommitment,
  actionCount,
  actions = [],
  currentUserName,
  onSetCurrentUserName,
}) => {
  const [showHint, setShowHint] = useState(false);
  const [showScripture, setShowScripture] = useState(true);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev

  // Quiz Interaction State (saved across cards in this session)
  const [userSelectedOptions, setUserSelectedOptions] = useState<Record<string, number>>({});
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});

  // Inline fast action submission for Stage 4 (Application) - directly prefill with room ID/name
  const [memberName, setMemberName] = useState(() => currentUserName?.trim() || '');
  const [actionText, setActionText] = useState('');
  const [prayerNeeds, setPrayerNeeds] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSubmittedSuccess, setActionSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (currentUserName && currentUserName.trim()) {
      setMemberName(currentUserName.trim());
    }
  }, [currentUserName]);

  const stageMeta = STAGES_CONFIG[currentStage] || STAGES_CONFIG.icebreaker;
  const currentCard = cardsInStage[currentCardIndex] || cardsInStage[0];

  useEffect(() => {
    // Reset hint toggle when card changes
    setShowHint(false);
  }, [currentCardIndex, currentStage]);

  // Keyboard navigation (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setDirection(1);
        playCardFlipSound();
        onNextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setDirection(-1);
        playCardFlipSound();
        onPrevCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNextCard, onPrevCard]);

  const handleNext = () => {
    setDirection(1);
    playCardFlipSound();
    onNextCard();
  };

  const handlePrev = () => {
    setDirection(-1);
    playCardFlipSound();
    onPrevCard();
  };

  const handleSelectOption = (cardId: string, optIndex: number, correctIndex?: number) => {
    setUserSelectedOptions((prev) => ({
      ...prev,
      [cardId]: optIndex,
    }));
    setRevealedCards((prev) => ({
      ...prev,
      [cardId]: true,
    }));

    if (correctIndex !== undefined) {
      if (optIndex === correctIndex) {
        playCorrectAnswerSound();
      } else {
        playWrongAnswerSound();
      }
    }
  };

  const handleToggleReveal = (cardId: string) => {
    setRevealedCards((prev) => {
      const isCurrentlyRevealed = !!prev[cardId];
      if (!isCurrentlyRevealed) {
        playCorrectAnswerSound();
      }
      return {
        ...prev,
        [cardId]: !isCurrentlyRevealed,
      };
    });
  };

  const handleResetCardQuiz = (cardId: string) => {
    setUserSelectedOptions((prev) => {
      const copy = { ...prev };
      delete copy[cardId];
      return copy;
    });
    setRevealedCards((prev) => {
      const copy = { ...prev };
      delete copy[cardId];
      return copy;
    });
  };

  const handleSubmitInlineAction = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = memberName.trim() || currentUserName?.trim() || '組員';
    if (!actionText.trim()) return;

    if (onSetCurrentUserName && finalName) {
      onSetCurrentUserName(finalName);
    }

    setIsSubmittingAction(true);
    onAddActionCommitment({
      memberName: finalName,
      actionText: actionText.trim(),
      prayerNeeds: prayerNeeds.trim() || undefined,
    });

    playStageChime();
    setActionSubmittedSuccess(true);
    setActionText('');
    setPrayerNeeds('');
    setTimeout(() => {
      setActionSubmittedSuccess(false);
      setIsSubmittingAction(false);
    }, 1500);
  };

  if (!currentCard || cardsInStage.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto my-8 p-8 bg-white rounded-3xl border border-stone-200 text-center shadow-sm">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
          <BookOpen className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-stone-800 mb-1">此階段試算表未填寫題目</h4>
        <p className="text-stone-500 mb-6 text-xs leading-relaxed">
          Google 試算表中尚未填寫本階段的題目。<br />
          （APP 100% 只載入試算表內容，不使用任何預設或自創題目）
        </p>
        <button
          onClick={onGoToNextStage}
          className="w-full py-3 rounded-2xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition text-xs sm:text-sm active:scale-95 shadow-sm"
        >
          前往下一階段
        </button>
      </div>
    );
  }

  const isLastCardInStage = currentCardIndex === cardsInStage.length - 1;
  const isQuizCard = currentStage === 'review' && Array.isArray(currentCard.options) && currentCard.options.length > 0;
  const selectedOptionIdx = userSelectedOptions[currentCard.id];
  const isAnswerRevealed = !!revealedCards[currentCard.id];
  const isAnswerCorrect = selectedOptionIdx !== undefined && currentCard.correctAnswerIndex !== undefined && selectedOptionIdx === currentCard.correctAnswerIndex;

  return (
    <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl mx-auto px-3 sm:px-4 py-2 sm:py-4 flex flex-col items-center">
      {/* Stage Header Info Banner */}
      <div className="w-full mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border shrink-0 ${stageMeta.badgeBg} ${stageMeta.badgeBorder} ${stageMeta.badgeText}`}
          >
            <span className="w-2 h-2 rounded-full bg-current shrink-0" />
            {stageMeta.name}
          </span>
          <span className="text-xs sm:text-sm text-stone-600 truncate hidden xs:inline font-medium">
            {stageMeta.subtitle}
          </span>
        </div>

        {/* Card index indicators & Shuffle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {cardsInStage.map((c, idx) => {
              const isAnswered = revealedCards[c.id] || userSelectedOptions[c.id] !== undefined;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentCardIndex ? 1 : -1);
                    playCardFlipSound();
                    onSelectCardIndex(idx);
                  }}
                  className={`h-3 rounded-full transition-all duration-300 flex items-center justify-center ${
                    idx === currentCardIndex
                      ? `w-7 ${stageMeta.accentBg}`
                      : isAnswered
                      ? 'w-3 bg-emerald-400'
                      : 'w-2.5 bg-stone-300 hover:bg-stone-400'
                  }`}
                  title={`第 ${idx + 1} 題 ${isAnswered ? '(已回答)' : ''}`}
                />
              );
            })}
          </div>

          <button
            onClick={() => {
              playCardFlipSound();
              onRandomCard();
            }}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-200/70 transition-colors"
            title="隨機抽題"
          >
            <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* 3D Stack / Card Container with AnimatePresence */}
      <div className="w-full relative min-h-[380px] sm:min-h-[420px] flex flex-col">
        {/* Background Visual Depth Layers */}
        <div className="absolute inset-0 top-2.5 bg-stone-200/60 rounded-3xl transform rotate-0.5 scale-[0.99] pointer-events-none -z-10 shadow-xs" />
        <div className="absolute inset-0 top-1 bg-stone-100/90 rounded-3xl transform -rotate-0.5 scale-[0.995] pointer-events-none -z-10 shadow-xs" />

        {/* Active Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${currentStage}-${currentCard.id}`}
            custom={direction}
            initial={{ opacity: 0, x: direction * 35, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -direction * 35, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full bg-white rounded-3xl border border-stone-200/90 shadow-lg p-5 sm:p-7 md:p-8 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Stage Decorative Subtle Top Strip */}
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                currentStage === 'icebreaker'
                  ? 'from-sky-400 to-blue-500'
                  : currentStage === 'review'
                  ? 'from-emerald-400 to-teal-500'
                  : currentStage === 'reflection'
                  ? 'from-amber-400 to-orange-500'
                  : 'from-rose-400 to-pink-500'
              }`}
            />

            {/* Card Content Top Meta */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-mono font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200/70">
                    #{currentCardIndex + 1} / {cardsInStage.length}
                  </span>
                  {isQuizCard && (
                    <span className="text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      複習選擇題
                    </span>
                  )}
                  {currentCard.timeSuggestionMinutes && !isQuizCard && (
                    <span className="flex items-center gap-1 text-xs sm:text-sm text-stone-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      約 {currentCard.timeSuggestionMinutes} 分鐘
                    </span>
                  )}
                </div>

                {/* Card Title */}
                <h4 className="text-xs sm:text-sm font-semibold text-stone-500 truncate max-w-[180px] text-right">
                  {currentCard.title}
                </h4>
              </div>

              {/* Main Question Text */}
              <div className="my-2 sm:my-3">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-stone-900 leading-snug tracking-tight">
                  {currentCard.question}
                </h3>

                {currentCard.subtitle && (
                  <p className="mt-2 text-sm sm:text-base md:text-lg text-stone-600 leading-relaxed font-normal">
                    {currentCard.subtitle}
                  </p>
                )}
              </div>

              {/* ===== REVIEW STAGE: MULTIPLE CHOICE QUIZ (選擇題互動區) ===== */}
              {isQuizCard && currentCard.options && (
                <div className="mt-4 sm:mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-stone-600 uppercase tracking-wider">
                      請點選答案選項：
                    </span>
                    {isAnswerRevealed && (
                      <button
                        onClick={() => handleResetCardQuiz(currentCard.id)}
                        className="text-xs sm:text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 transition font-medium"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>重新作答</span>
                      </button>
                    )}
                  </div>

                  {/* 4 Option Buttons */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentCard.options.map((optionText, optIdx) => {
                      const isSelected = selectedOptionIdx === optIdx;
                      const isCorrect = currentCard.correctAnswerIndex === optIdx;
                      
                      let btnStyle = 'bg-stone-50 hover:bg-stone-100/90 border-stone-200/80 text-stone-800 active:scale-[0.99]';
                      let badgeStyle = 'bg-stone-200 text-stone-700';

                      if (isAnswerRevealed) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-2 ring-emerald-300 shadow-xs';
                          badgeStyle = 'bg-emerald-600 text-white';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'bg-rose-50 border-rose-300 text-rose-900 line-through opacity-85';
                          badgeStyle = 'bg-rose-500 text-white';
                        } else {
                          btnStyle = 'bg-stone-50/60 border-stone-200 text-stone-400 opacity-60';
                          badgeStyle = 'bg-stone-200 text-stone-400';
                        }
                      } else if (isSelected) {
                        btnStyle = 'bg-amber-50 border-amber-300 text-stone-900 font-semibold ring-2 ring-amber-300';
                        badgeStyle = 'bg-amber-500 text-white';
                      }

                      const optionLetters = ['A', 'B', 'C', 'D'];
                      const letter = optionLetters[optIdx] || `${optIdx + 1}`;
                      // Clean leading "A. ", "B. " if present in text
                      const cleanText = optionText.replace(/^[A-D]\.\s*/i, '');

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectOption(currentCard.id, optIdx, currentCard.correctAnswerIndex)}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 flex items-start gap-3 shadow-xs ${btnStyle}`}
                        >
                          <span
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 transition-colors ${badgeStyle}`}
                          >
                            {letter}
                          </span>
                          <span className="text-sm sm:text-base md:text-lg leading-relaxed flex-1 pt-0.5">
                            {cleanText}
                          </span>
                          {isAnswerRevealed && isCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
                          )}
                          {isAnswerRevealed && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Immediate Feedback Box & Reveal Button */}
                  <div className="flex items-center justify-between pt-1.5 gap-2">
                    <button
                      onClick={() => handleToggleReveal(currentCard.id)}
                      className="text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/90 px-3.5 py-2 rounded-xl border border-emerald-200 transition flex items-center gap-1.5 active:scale-95"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{isAnswerRevealed ? '隱藏正解與解析' : '👁️ 直接揭曉正解與解析'}</span>
                    </button>

                    {isAnswerRevealed && (
                      <span className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${isAnswerCorrect ? 'text-emerald-600' : 'text-stone-700'}`}>
                        {isAnswerCorrect ? '🎉 答對了！' : selectedOptionIdx !== undefined ? '💡 正解已揭曉' : '📖 正解已揭曉'}
                      </span>
                    )}
                  </div>

                  {/* Explanation Card (Expanded when revealed) */}
                  <AnimatePresence>
                    {isAnswerRevealed && (currentCard.explanation || currentCard.scriptureText) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 shadow-xs">
                          <div className="flex items-center gap-2 text-sm font-bold text-emerald-900 mb-2">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span>✨ 真理解析與經文亮光：</span>
                          </div>
                          
                          {currentCard.explanation && (
                            <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-normal">
                              {currentCard.explanation}
                            </p>
                          )}

                          {currentCard.scriptureText && (
                            <div className="mt-3 pt-2.5 border-t border-emerald-200/80 text-sm text-stone-700">
                              <span className="font-semibold text-emerald-900 block mb-1">
                                📖 出處：{currentCard.scriptureReference}
                              </span>
                              <p className="italic pl-2.5 border-l-2 border-emerald-400 text-stone-800 leading-relaxed">
                                「{currentCard.scriptureText}」
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Scripture Highlight Drawer (for non-quiz cards or open reflection) */}
              {!isQuizCard && (currentCard.scriptureReference || currentCard.scriptureText || (currentStage === 'review' && topic?.mainScripture)) && (
                <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-stone-800">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-900">
                      <BookOpen className="w-4 h-4 text-amber-700" />
                      <span>經文依據：{currentCard.scriptureReference || topic?.mainScripture}</span>
                    </div>
                    <button
                      onClick={() => setShowScripture(!showScripture)}
                      className="text-xs sm:text-sm text-amber-800 hover:text-amber-950 font-semibold"
                    >
                      {showScripture ? '收合' : '展開'}
                    </button>
                  </div>
                  {showScripture && (
                    <p className="text-sm sm:text-base text-stone-800 italic leading-relaxed pl-2.5 border-l-2 border-amber-400">
                      {currentCard.scriptureText || topic?.scriptureExcerpt || '請翻開聖經對照本段經文'}
                    </p>
                  )}
                </div>
              )}

              {/* Facilitator's Heart Hints (Toggle / Accordion) */}
              {currentCard.hint && (
                <div className="mt-3.5">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200/80 px-3.5 py-2 rounded-xl transition-all"
                  >
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>{isQuizCard ? '💡 查看複習小提示' : '小組長引導心法與提示'}</span>
                    {showHint ? <ChevronUp className="w-4 h-4 ml-0.5" /> : <ChevronDown className="w-4 h-4 ml-0.5" />}
                  </button>

                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2.5 p-3.5 sm:p-4 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-700 leading-relaxed">
                          <p className="font-bold text-stone-800 mb-1">💡 提示引導：</p>
                          {currentCard.hint}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Tags */}
              {currentCard.tags && currentCard.tags.length > 0 && !isQuizCard && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {currentCard.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200/60"
                    >
                      <Tag className="w-2.5 h-2.5 text-stone-400" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Special Feature: In-card Action Input for Stage 4 (Application) */}
            {currentStage === 'application' && (
              <div className="mt-5 pt-4 border-t border-rose-100 bg-rose-50/50 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 md:-mx-7 md:-mb-7 p-4 sm:p-5 rounded-b-3xl">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <PenLine className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                      📝 本週行動方案直接打字
                    </h4>
                  </div>
                  <span className="text-xs text-rose-700 font-medium">
                    已登記 {actionCount} 人
                  </span>
                </div>

                <form onSubmit={handleSubmitInlineAction} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <input
                        type="text"
                        placeholder="你的姓名 / 房間 ID"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-rose-300 bg-rose-50/40 text-stone-900 font-bold placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-xs"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="這週具體行動 (例: 每天早晨默禱5分鐘)"
                        value={actionText}
                        onChange={(e) => setActionText(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="為你代禱事項 (選填，例: 為工作面試求信心)"
                      value={prayerNeeds}
                      onChange={(e) => setPrayerNeeds(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={!memberName.trim() || !actionText.trim() || isSubmittingAction}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
                    >
                      {actionSubmittedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          已記錄！
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          送出行動
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Live list of responses already submitted */}
                {actions && actions.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-rose-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                      <span className="flex items-center gap-1.5 text-rose-800">
                        <CheckCircle2 className="w-4 h-4 text-rose-600" />
                        已回應夥伴行動方案 ({actions.length} 筆)
                      </span>
                      <button
                        type="button"
                        onClick={onGoToNextStage}
                        className="text-xs text-rose-700 hover:text-rose-850 font-bold underline transition"
                      >
                        前往完整 LINE 彙整 →
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {actions.map((act) => {
                        const displayName = act.memberName?.trim() || '小組夥伴';
                        return (
                          <div
                            key={act.id}
                            className="p-2.5 sm:p-3 rounded-xl bg-white border border-rose-200/80 shadow-2xs flex items-start justify-between gap-2.5 text-left"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center shrink-0">
                                {displayName.slice(0, 1)}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-stone-900">
                                    {displayName}
                                  </span>
                                  {act.targetDate && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                                      {act.targetDate}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-stone-800 font-medium mt-0.5">
                                  📌 {act.actionText}
                                </p>
                                {act.prayerNeeds && (
                                  <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-rose-500 shrink-0" />
                                    <span>代禱：{act.prayerNeeds}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Controls */}
      <div className="w-full mt-5 flex items-center justify-between gap-3">
        <button
          id="btn-prev-card"
          onClick={handlePrev}
          disabled={currentCardIndex === 0}
          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-stone-200/90 hover:bg-stone-300/80 disabled:opacity-40 disabled:cursor-not-allowed text-stone-800 text-sm sm:text-base font-bold transition active:scale-95 shadow-xs"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>上一題</span>
        </button>

        {/* Center quick card jumper pills for mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[150px] sm:max-w-none px-1">
          {cardsInStage.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentCardIndex ? 1 : -1);
                playCardFlipSound();
                onSelectCardIndex(idx);
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center transition-all ${
                idx === currentCardIndex
                  ? `${stageMeta.accentBg} text-white shadow-xs scale-110`
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {isLastCardInStage ? (
          <button
            id="btn-next-stage"
            onClick={() => {
              playStageChime();
              onGoToNextStage();
            }}
            className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition active:scale-95"
          >
            <span>
              {currentStage === 'application' ? '前往 LINE 彙整' : '進入下一階段'}
            </span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        ) : (
          <button
            id="btn-next-card"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-5 sm:px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-sm sm:text-base font-bold shadow-md transition active:scale-95"
          >
            <span>下一題</span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>

      {/* Keyboard Shortcut Hint */}
      <p className="mt-3 text-xs text-stone-500 hidden sm:block font-medium">
        💡 小撇步：按鍵盤 <kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-stone-800 font-mono text-xs">←</kbd> 或 <kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-stone-800 font-mono text-xs">→</kbd> 可切換卡片
      </p>
    </div>
  );
};
