import React, { memo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
    CaseShareSectionMode,
    CaseShareVisibleFields,
    ShareCatalogSection,
    ShareSectionKey,
} from '@/app/services/caseShare/caseShareTypes';
import {
    DEFAULT_SECTION_VISIBILITY,
    hiddenIdsForSectionHideAll,
    hiddenIdsForSectionShowAll,
    isShareItemVisible,
    toggleHiddenItem,
} from '@/app/services/caseShare/caseShareVisibility';

type Props = {
    catalog: ShareCatalogSection[];
    fields: CaseShareVisibleFields;
    onChange: (next: CaseShareVisibleFields) => void;
};

function SectionModeButtons({
    mode,
    onPick,
}: {
    mode: CaseShareSectionMode;
    onPick: (m: CaseShareSectionMode) => void;
}) {
    const opts: Array<{ id: CaseShareSectionMode; label: string }> = [
        { id: 'all', label: 'الكل' },
        { id: 'pick', label: 'اختيار' },
        { id: 'none', label: 'إخفاء' },
    ];
    return (
        <div className="flex gap-1 shrink-0">
            {opts.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    onClick={() => onPick(o.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                        mode === o.id
                            ? 'bg-[#E6C673]/15 text-[#E6C673] border-[#E6C673]/35'
                            : 'text-white/40 border-white/10'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export const ColleagueShareCatalogPicker = memo(function ColleagueShareCatalogPicker({
    catalog,
    fields,
    onChange,
}: Props) {
    const sectionMode = { ...DEFAULT_SECTION_VISIBILITY, ...fields.sectionMode };
    const hiddenItemIds = fields.hiddenItemIds ?? [];
    const [expanded, setExpanded] = useState<Partial<Record<ShareSectionKey, boolean>>>({});

    const setSectionMode = (key: ShareSectionKey, mode: CaseShareSectionMode) => {
        const section = catalog.find((s) => s.key === key);
        let nextHidden = hiddenItemIds;
        if (section) {
            if (mode === 'none') nextHidden = hiddenIdsForSectionHideAll(section, nextHidden);
            if (mode === 'all') nextHidden = hiddenIdsForSectionShowAll(section, nextHidden);
        }
        onChange({
            ...fields,
            sectionMode: { ...sectionMode, [key]: mode },
            hiddenItemIds: nextHidden,
        });
        if (mode === 'pick') setExpanded((e) => ({ ...e, [key]: true }));
    };

    const toggleItem = (sectionKey: ShareSectionKey, itemId: string, visible: boolean) => {
        onChange({
            ...fields,
            sectionMode: { ...sectionMode, [sectionKey]: 'pick' },
            hiddenItemIds: toggleHiddenItem(hiddenItemIds, itemId, visible),
        });
    };

    if (!catalog.length) {
        return (
            <p className="text-white/45 text-xs text-center py-4">لا يوجد محتوى قابل للمشاركة في هذه الإضبارة</p>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-white/55 text-xs mb-2">
                اختر ما يصل للزميل — قسم كامل، عنصر بعينه، أو إخفاء الكل
            </p>
            {catalog.map((section) => {
                const mode = sectionMode[section.key] ?? 'all';
                const isOpen = expanded[section.key] ?? mode === 'pick';
                const visibleCount = section.items.filter((item) =>
                    isShareItemVisible(section.key, item.id, sectionMode, hiddenItemIds),
                ).length;

                return (
                    <div
                        key={section.key}
                        className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
                    >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                            <button
                                type="button"
                                className="flex-1 min-w-0 text-right flex items-center gap-2"
                                onClick={() =>
                                    mode === 'pick'
                                        ? setExpanded((e) => ({ ...e, [section.key]: !isOpen }))
                                        : undefined
                                }
                            >
                                <span className="text-white text-sm font-bold truncate">{section.title}</span>
                                <span className="text-[10px] text-white/40 shrink-0">
                                    {mode === 'none' ? 'مخفي' : `${visibleCount}/${section.items.length}`}
                                </span>
                                {mode === 'pick' ? (
                                    isOpen ? (
                                        <ChevronUp size={14} className="text-white/40 shrink-0" />
                                    ) : (
                                        <ChevronDown size={14} className="text-white/40 shrink-0" />
                                    )
                                ) : null}
                            </button>
                            <SectionModeButtons mode={mode} onPick={(m) => setSectionMode(section.key, m)} />
                        </div>

                        {mode === 'pick' && isOpen ? (
                            <div className="border-t border-white/5 px-2 py-1 max-h-48 overflow-y-auto">
                                {section.items.map((item) => {
                                    const visible = isShareItemVisible(
                                        section.key,
                                        item.id,
                                        sectionMode,
                                        hiddenItemIds,
                                    );
                                    return (
                                        <label
                                            key={item.id}
                                            className="flex items-start gap-2 py-2 px-1 border-b border-white/5 last:border-0 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={visible}
                                                onChange={(e) =>
                                                    toggleItem(section.key, item.id, e.target.checked)
                                                }
                                                className="mt-0.5 w-4 h-4 accent-[#E6C673] shrink-0"
                                            />
                                            <span className="flex-1 min-w-0 text-right">
                                                <span className="block text-white text-xs font-bold truncate">
                                                    {item.label}
                                                </span>
                                                {item.preview ? (
                                                    <span className="block text-white/40 text-[10px] mt-0.5 line-clamp-2">
                                                        {item.preview}
                                                    </span>
                                                ) : null}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
});
