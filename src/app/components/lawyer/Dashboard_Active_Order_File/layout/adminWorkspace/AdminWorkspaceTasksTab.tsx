import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { DatePickerField } from '../../components/DatePickerField';
import { formatDateText } from '../../utils/formatters';
import type { AdminWorkspacePanelProps } from '../AdminWorkspacePanelProps';
import { URGENT_DOSSIER_BTN_PRIMARY, URGENT_DOSSIER_INPUT } from '../urgentDossierUi';
import { AdminWorkspaceEmptyState } from './AdminWorkspaceEmptyState';

export type AdminWorkspaceTasksTabProps = Pick<
    AdminWorkspacePanelProps,
    | 'isFinalized'
    | 'newFollowupTitle'
    | 'setNewFollowupTitle'
    | 'newFollowupDate'
    | 'setNewFollowupDate'
    | 'requestDateYmd'
    | 'addFollowup'
    | 'caseFollowups'
    | 'todayYmdValue'
    | 'toggleFollowupCompleted'
    | 'deleteFollowup'
>;

export function AdminWorkspaceTasksTab({
    isFinalized,
    newFollowupTitle,
    setNewFollowupTitle,
    newFollowupDate,
    setNewFollowupDate,
    requestDateYmd,
    addFollowup,
    caseFollowups,
    todayYmdValue,
    toggleFollowupCompleted,
    deleteFollowup,
}: AdminWorkspaceTasksTabProps) {
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <input
                    type="text"
                    value={newFollowupTitle}
                    onChange={(e) => setNewFollowupTitle(e.target.value)}
                    disabled={isFinalized}
                    placeholder="عنوان المهمة..."
                    className={URGENT_DOSSIER_INPUT}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                    <DatePickerField
                        value={newFollowupDate || ''}
                        onValueChange={(v) => setNewFollowupDate(v)}
                        min={requestDateYmd || undefined}
                        disabled={isFinalized}
                        inputClassName={`flex-1 ${URGENT_DOSSIER_INPUT}`}
                    />
                    <button
                        type="button"
                        onClick={addFollowup}
                        disabled={
                            isFinalized ||
                            (!!requestDateYmd && !!newFollowupDate && newFollowupDate < requestDateYmd)
                        }
                        className={`${URGENT_DOSSIER_BTN_PRIMARY} sm:min-w-[7rem]`}
                    >
                        <Plus size={16} aria-hidden />
                        إضافة
                    </button>
                </div>
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto">
                {caseFollowups.length === 0 ? (
                    <AdminWorkspaceEmptyState text="لا توجد مهام" />
                ) : (
                    caseFollowups.map((f) => (
                        <div
                            key={f.id}
                            className={`bg-black/20 border rounded-lg p-2.5 ${
                                !f.completed && f.date && f.date < todayYmdValue
                                    ? 'border-red-500/30'
                                    : 'border-white/10'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <label className="flex items-start gap-2.5 cursor-pointer min-w-0">
                                    <input
                                        type="checkbox"
                                        checked={f.completed}
                                        onChange={() => toggleFollowupCompleted(f.id)}
                                        disabled={isFinalized}
                                        className="mt-0.5 accent-[#E6C673] w-4 h-4 shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <div
                                            className={`text-sm font-bold break-words ${
                                                f.completed ? 'text-white/50 line-through' : 'text-white'
                                            }`}
                                        >
                                            {f.title}
                                        </div>
                                        <div
                                            className={`text-xs mt-0.5 ${
                                                !f.completed && f.date && f.date < todayYmdValue
                                                    ? 'text-red-300'
                                                    : 'text-white/60'
                                            }`}
                                        >
                                            الاستحقاق: {formatDateText(f.date)}
                                        </div>
                                    </div>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => deleteFollowup(f.id)}
                                    disabled={isFinalized}
                                    className="text-red-300 hover:text-red-200 text-xs font-bold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
