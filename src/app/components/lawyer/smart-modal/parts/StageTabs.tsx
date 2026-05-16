import React from 'react';
import { Lock } from 'lucide-react';
import type { CaseStage } from '../../LawyerShared';

export const StageTabs = ({ 
    stages, 
    currentStageId, 
    onSelect, 
    stageHistory 
}: { 
    stages: CaseStage[], 
    currentStageId: string, 
    onSelect: (id: string) => void,
    stageHistory?: Array<{ stageName: string; [key: string]: unknown }>
}) => {
    return (
        <div className="flex items-center gap-2 bg-[#1A1E2E] p-1.5 rounded-xl mb-4 border border-white/5 overflow-x-auto no-scrollbar shadow-inner shadow-black/20">
            {stages.map((stage) => {
                const isActive = stage.id === currentStageId;
                const isLocked = stage.status === 'locked';
                
                // ✅ Check if this stage exists in archived history
                const isArchived = stageHistory?.some(h => h.stageName === stage.name);
                
                return (
                    <button type="button"
                        key={stage.id}
                        onClick={() => onSelect(stage.id)}
                        disabled={stage.status === 'future'}
                        className={`
                            relative px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 flex-1 justify-center
                            ${isActive 
                                ? 'bg-[#E6C673] text-[#0F172A] shadow-lg shadow-[#E6C673]/20' 
                                : isLocked 
                                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 cursor-pointer border border-green-500/30' 
                                    : 'text-white/20 cursor-not-allowed'
                            }
                        `}
                    >
                        {isLocked && <Lock size={12} />}
                        {stage.name}
                        {stage.extraordinaryAppealType && stage.extraordinaryAppealType !== 'بدون طعن' && (
                             <span className="text-[10px] opacity-80 font-normal mr-1">
                                 ({stage.extraordinaryAppealType})
                             </span>
                        )}
                        {isArchived && <span className="text-[10px] font-bold">(حُسمت ✔️)</span>}
                    </button>
                );
            })}
        </div>
    );
};
