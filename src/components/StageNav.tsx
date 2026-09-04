import React from 'react';
import { 
  Sparkles, 
  BookOpenCheck, 
  HeartHandshake, 
  Compass, 
  ClipboardList, 
  CheckCircle2 
} from 'lucide-react';
import { QuestionStage } from '../types';
import { STAGES_CONFIG } from '../data/defaultTopics';

interface StageNavProps {
  currentStage: QuestionStage | 'summary';
  onSelectStage: (stage: QuestionStage | 'summary') => void;
  stageProgress: Record<QuestionStage, { current: number; total: number }>;
  actionCount: number;
}

export const StageNav: React.FC<StageNavProps> = ({
  currentStage,
  onSelectStage,
  stageProgress,
  actionCount,
}) => {
  const stages: Array<{ id: QuestionStage | 'summary'; label: string; icon: React.ElementType; sub: string }> = [
    { id: 'icebreaker', label: '1. 破冰暖身', icon: Sparkles, sub: '輕鬆破冰' },
    { id: 'review', label: '2. 主題回顧', icon: BookOpenCheck, sub: 'What問答' },
    { id: 'reflection', label: '3. 真理思想', icon: HeartHandshake, sub: 'Why心靈反思' },
    { id: 'application', label: '4. 生活應用', icon: Compass, sub: 'How具體行動' },
    { id: 'summary', label: '5. LINE彙整', icon: ClipboardList, sub: '行動輸出' },
  ];

  return (
    <div className="w-full bg-stone-100/90 border-b border-stone-200/80 sticky top-[53px] z-20 backdrop-blur-sm shadow-xs">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2">
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {stages.map((stg) => {
            const Icon = stg.icon;
            const isActive = currentStage === stg.id;
            const isSummary = stg.id === 'summary';
            const progress = !isSummary ? stageProgress[stg.id as QuestionStage] : null;

            return (
              <button
                key={stg.id}
                id={`stage-tab-${stg.id}`}
                onClick={() => onSelectStage(stg.id)}
                className={`relative flex flex-col items-center justify-center py-2 px-1 sm:px-2 rounded-xl transition-all duration-200 text-center ${
                  isActive
                    ? 'bg-white shadow-sm border border-stone-300 text-stone-900 font-semibold ring-2 ring-amber-400/40 scale-[1.02]'
                    : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
                  <Icon
                    className={`w-4 h-4 sm:w-4 sm:h-4 ${
                      isActive
                        ? stg.id === 'icebreaker'
                          ? 'text-sky-600'
                          : stg.id === 'review'
                          ? 'text-emerald-600'
                          : stg.id === 'reflection'
                          ? 'text-amber-600'
                          : stg.id === 'application'
                          ? 'text-rose-600'
                          : 'text-teal-600'
                        : 'text-stone-400'
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-medium tracking-tight truncate">
                    <span className="hidden sm:inline">{stg.label}</span>
                    <span className="inline sm:hidden">
                      {stg.id === 'icebreaker' ? '破冰' : stg.id === 'review' ? '回顧' : stg.id === 'reflection' ? '思想' : stg.id === 'application' ? '應用' : '彙整'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {!isSummary && progress ? (
                    <span className="text-[10px] text-stone-400 font-mono">
                      {progress.total > 0 ? `${progress.current + 1}/${progress.total}題` : '0題'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {actionCount > 0 ? `${actionCount} 方案` : 'LINE格式'}
                    </span>
                  )}
                </div>

                {isActive && (
                  <span
                    className={`absolute -bottom-2 w-6 sm:w-8 h-1 rounded-full ${
                      stg.id === 'icebreaker'
                        ? 'bg-sky-500'
                        : stg.id === 'review'
                        ? 'bg-emerald-500'
                        : stg.id === 'reflection'
                        ? 'bg-amber-500'
                        : stg.id === 'application'
                        ? 'bg-rose-500'
                        : 'bg-teal-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
