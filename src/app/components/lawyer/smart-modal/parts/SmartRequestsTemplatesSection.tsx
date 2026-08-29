import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { Sparkles } from '@/app/components/ui/icons/Sparkles';
import { X } from '@/app/components/ui/icons/X';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { normalizeRequestTypeTemplate } from '../smartFile/fastTrackRequestTemplates';
import { SMART_REQUESTS_FIELD_CLASS } from './smartRequestsPanelTheme';

export type SmartRequestsTemplatesProps = {
    isPearlInline: boolean;
    showPearlTemplates: boolean;
    readOnly: boolean;
    onAddFastTrack?: unknown;
    statsTotal: number;
    showQuickTemplates: boolean;
    templateDraft: string;
    setTemplateDraft: (v: string) => void;
    typeTemplates: string[];
    handleAddTemplate: () => void;
    handleRemoveTemplate: (text: string) => void;
    handleQuickAddFromTemplate: (requestType: string) => void;
};

export function SmartRequestsTemplatesSection({
    isPearlInline,
    showPearlTemplates,
    readOnly,
    onAddFastTrack,
    statsTotal,
    showQuickTemplates,
    templateDraft,
    setTemplateDraft,
    typeTemplates,
    handleAddTemplate,
    handleRemoveTemplate,
    handleQuickAddFromTemplate,
}: SmartRequestsTemplatesProps) {
    if (!isPearlInline) {
        return (
            <div className="px-3 sm:px-4 py-2 space-y-2 border-b border-white/[0.04]">
                {!readOnly && onAddFastTrack && (statsTotal > 0 || showQuickTemplates) ? (
                    <div className="space-y-2 pt-0.5">
                        <span className="text-[8px] font-bold text-white/35 flex items-center gap-1">
                            <Sparkles size={9} aria-hidden />
                            إضافة سريعة — قوالبك اليدوية
                        </span>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                value={templateDraft}
                                onChange={(e) => setTemplateDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTemplate();
                                    }
                                }}
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsTemplateInput}
                                placeholder="نوع الطلب"
                                className={`${SMART_REQUESTS_FIELD_CLASS} flex-1`}
                            />
                            <button
                                type="button"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsTemplateAdd}
                                onClick={handleAddTemplate}
                                disabled={!normalizeRequestTypeTemplate(templateDraft)}
                                className="inline-flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-[#E6C673]/10 border border-[#E6C673]/25 text-[#E6C673] text-[9px] font-bold hover:bg-[#E6C673]/18 transition-all disabled:opacity-40 shrink-0 backdrop-blur-sm"
                            >
                                <Plus size={10} aria-hidden />
                                إضافة قالب
                            </button>
                        </div>
                        {typeTemplates.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {typeTemplates.map((type) => (
                                    <span
                                        key={type}
                                        className="inline-flex items-center max-w-full rounded-md bg-white/[0.03] border border-white/[0.07] overflow-hidden backdrop-blur-sm"
                                    >
                                        <button
                                            type="button"
                                            data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsQuickType(type)}
                                            onClick={() => handleQuickAddFromTemplate(type)}
                                            className="px-2 py-0.5 text-white/45 hover:text-[#E6C673]/90 hover:bg-[#E6C673]/10 text-[8px] font-semibold transition-all truncate text-right"
                                            title={`تسجيل طلب: ${type}`}
                                        >
                                            {type}
                                        </button>
                                        <button
                                            type="button"
                                            data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsTemplateRemove(type)}
                                            onClick={() => handleRemoveTemplate(type)}
                                            className="px-1 py-0.5 text-white/25 hover:text-rose-300 hover:bg-rose-500/10 border-r border-white/[0.06] transition-colors shrink-0"
                                            aria-label={`حذف القالب ${type}`}
                                        >
                                            <X size={9} aria-hidden />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        );
    }

    if (showPearlTemplates && !readOnly && onAddFastTrack) {
        return (
            <div className="space-y-1.5 mb-2 pb-2 border-b border-[#C9B89A]/08">
                <div className="flex gap-1">
                    <input
                        type="text"
                        value={templateDraft}
                        onChange={(e) => setTemplateDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTemplate();
                            }
                        }}
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsTemplateInput}
                        placeholder="قالب طلب"
                        className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.12] rounded-md px-2 py-1 text-[10px] text-[#FFFEF9] outline-none focus:border-white/[0.24]"
                    />
                    <button
                        type="button"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsTemplateAdd}
                        onClick={handleAddTemplate}
                        disabled={!normalizeRequestTypeTemplate(templateDraft)}
                        className="px-2 py-1 rounded-md bg-white/[0.08] border border-white/[0.16] text-[#ECE8E2] text-[9px] font-bold disabled:opacity-40"
                    >
                        +
                    </button>
                </div>
                {typeTemplates.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {typeTemplates.map((type) => (
                            <button
                                key={type}
                                type="button"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsQuickType(type)}
                                onClick={() => handleQuickAddFromTemplate(type)}
                                className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.12] text-[#C9B89A] text-[8px] font-semibold truncate max-w-full"
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        );
    }

    return null;
}
