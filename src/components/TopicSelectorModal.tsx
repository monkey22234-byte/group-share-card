import React, { useState } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  Calendar, 
  Check, 
  Plus, 
  Layers, 
  ArrowRight,
  FileSpreadsheet,
  User,
  Database
} from 'lucide-react';
import { WeeklyTopic } from '../types';

interface TopicSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: WeeklyTopic[];
  currentTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onOpenSheetDatabase: () => void;
  onOpenManualAdd: () => void;
}

export const TopicSelectorModal: React.FC<TopicSelectorModalProps> = ({
  isOpen,
  onClose,
  topics,
  currentTopicId,
  onSelectTopic,
  onOpenSheetDatabase,
  onOpenManualAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredTopics = topics.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.title.toLowerCase().includes(term) ||
      t.mainScripture.toLowerCase().includes(term) ||
      t.summary.toLowerCase().includes(term) ||
      (t.speaker && t.speaker.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                選擇聚會分享主題
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                已連動雲端資料庫 (Firestore)
              </span>
              <span className="text-xs text-stone-400 hidden sm:inline">
                即時同步主日信息與聚會題目
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenSheetDatabase();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>動態同步 Google 試算表 CSV</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenManualAdd();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>新增題目卡片</span>
            </button>
          </div>

          <div className="text-xs text-stone-600 font-medium bg-white border border-stone-200 px-3 py-1.5 rounded-xl shadow-2xs">
            資料庫收錄：<strong className="text-stone-900">{topics.length}</strong> 週主題
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3.5 border-b border-stone-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋主題名稱、經文、講員..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Topic List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-stone-50/50">
          {filteredTopics.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <p className="text-sm font-medium mb-1">找不到符合的聚會主題</p>
              <p className="text-xs">您可以點擊上方「同步 Google 試算表」更新資料庫</p>
            </div>
          ) : (
            filteredTopics.map((topic) => {
              const isSelected = topic.id === currentTopicId;
              return (
                <div
                  key={topic.id}
                  onClick={() => {
                    onSelectTopic(topic.id);
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-500 shadow-sm'
                      : 'bg-white border-stone-200/90 hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-900 text-white font-bold">
                        {topic.id}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold">
                        {topic.date}
                      </span>
                      {topic.speaker && (
                        <span className="text-[11px] font-medium text-stone-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <User className="w-3 h-3 text-amber-600" />
                          <span>{topic.speaker}</span>
                        </span>
                      )}
                      <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        {topic.mainScripture}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-stone-900 mb-1 leading-snug">
                      {topic.title}
                    </h3>

                    {topic.summary && (
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {topic.summary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span className="text-xs text-stone-600 font-medium bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                      {topic.questions.length} 題卡片
                    </span>

                    {isSelected ? (
                      <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center group-hover:bg-emerald-100 group-hover:text-emerald-700 transition">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-100 border-t border-stone-200 text-center text-xs text-stone-500">
          點擊任一主題即可載入卡片；所有題目與分頁皆與 Cloud Firestore 雲端資料庫保持即時連動。
        </div>
      </div>
    </div>
  );
};
