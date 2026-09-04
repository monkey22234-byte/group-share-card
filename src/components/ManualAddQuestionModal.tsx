import React, { useState } from 'react';
import { X, Plus, Sparkles, BookOpenCheck, HeartHandshake, Compass } from 'lucide-react';
import { QuestionCard, QuestionStage } from '../types';

interface ManualAddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
  onAddQuestion: (card: Omit<QuestionCard, 'id'>) => void;
}

export const ManualAddQuestionModal: React.FC<ManualAddQuestionModalProps> = ({
  isOpen,
  onClose,
  topicTitle,
  onAddQuestion,
}) => {
  const [stage, setStage] = useState<QuestionStage>('reflection');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [hint, setHint] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<string>('0');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    let parsedOptions: string[] | undefined = undefined;
    let correctIdx: number | undefined = undefined;

    if (stage === 'review' && optionsText.trim()) {
      const lines = optionsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 0) {
        parsedOptions = lines;
        const parsed = parseInt(correctAnswer, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < lines.length) {
          correctIdx = parsed;
        }
      }
    }

    onAddQuestion({
      stage,
      title: title.trim() || (stage === 'icebreaker' ? '暖身題' : stage === 'review' ? '信息回顧' : stage === 'reflection' ? '真理思想' : '生活應用'),
      question: question.trim(),
      hint: hint.trim() || undefined,
      options: parsedOptions,
      correctAnswerIndex: correctIdx,
      timeSuggestionMinutes: stage === 'review' ? 2 : stage === 'reflection' ? 4 : 3,
    });

    setTitle('');
    setQuestion('');
    setHint('');
    setOptionsText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-stone-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>手動新增題目卡片</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5 truncate max-w-sm">
              即時加入至本週主題：{topicTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Stage selection tabs */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              選擇題目的討論階段：
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setStage('icebreaker')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                  stage === 'icebreaker'
                    ? 'bg-sky-50 border-sky-400 text-sky-800'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>1. 破冰</span>
              </button>

              <button
                type="button"
                onClick={() => setStage('review')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                  stage === 'review'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <BookOpenCheck className="w-3.5 h-3.5" />
                <span>2. 回顧</span>
              </button>

              <button
                type="button"
                onClick={() => setStage('reflection')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                  stage === 'reflection'
                    ? 'bg-amber-50 border-amber-400 text-amber-800'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>3. 思想</span>
              </button>

              <button
                type="button"
                onClick={() => setStage('application')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                  stage === 'application'
                    ? 'bg-rose-50 border-rose-400 text-rose-800'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>4. 應用</span>
              </button>
            </div>
          </div>

          {/* Subtitle / Label */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              卡片小標題 (選填)
            </label>
            <input
              type="text"
              placeholder="例如：生活暖身、經文省察、行動出擊..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              題目內容 <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="輸入討論題目或提問內容..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Optional Review Stage Options */}
          {stage === 'review' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  選擇題選項（一行一個選項）：
                </label>
                <textarea
                  rows={3}
                  placeholder={`A. 第一個選項\nB. 第二個選項\nC. 第三個選項\nD. 第四個選項`}
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-emerald-950 shrink-0">
                  正確答案：
                </label>
                <select
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-emerald-300 bg-white font-medium"
                >
                  <option value="0">A (第 1 項)</option>
                  <option value="1">B (第 2 項)</option>
                  <option value="2">C (第 3 項)</option>
                  <option value="3">D (第 4 項)</option>
                </select>
              </div>
            </div>
          )}

          {/* Hint / Explanation */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              帶領者引導提示 / 解釋 (選填)
            </label>
            <input
              type="text"
              placeholder="例如：提示組員從最近一週的生活細節著手..."
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!question.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>新增至卡片庫</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
