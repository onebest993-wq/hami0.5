import React, { useEffect, useMemo, useState } from 'react';
import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import type { CivilLawCodeType } from '@/app/constants/iraqiLawCatalog';
import type { PersonalStatusLawCodeType } from '@/app/constants/personalStatusLawCatalog';
import {
    PERSONAL_APPLICABLE_LAW_SOURCES,
    type PersonalApplicableLawSource,
} from '@/app/components/lawyer/personal-status/personalStatusLawRegistry';
import { CivilLawReferencePanel } from '@/app/components/lawyer/smart-modal/parts/CivilLawReferencePanel';
import { PersonalStatusSubstantiveLawArticles } from '@/app/components/lawyer/personal-status/PersonalStatusSubstantiveLawArticles';
import { prefetchCivilLawArticles } from '@/app/utils/civilLawRemoteCache';
import { prefetchPersonalStatusLawArticles } from '@/app/utils/personalStatusLawRemoteCache';
import { loadPersonalStatusLawArticles } from '@/app/utils/personalStatusLawRemoteCache';
import { PS_TAB_ACTIVE, PS_TAB_IDLE } from '@/app/components/lawyer/personal-status/personalStatusDossierTheme';

type ProceduralTab = { kind: 'procedural'; id: CivilLawCodeType; label: string };
type SubstantiveTab = { kind: 'substantive'; id: PersonalStatusLawCodeType; label: string };
type PersonalLawTab = ProceduralTab | SubstantiveTab;

function tabBtn(active: boolean): string {
    return [
        'rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors',
        active ? PS_TAB_ACTIVE : PS_TAB_IDLE,
    ].join(' ');
}

interface PersonalStatusLawReferencePanelProps {
    applicableLaw: PersonalApplicableLaw | '' | undefined;
}

export function PersonalStatusLawReferencePanel({
    applicableLaw,
}: PersonalStatusLawReferencePanelProps) {
    const substantiveSources = useMemo(() => {
        if (!applicableLaw) return [] as PersonalApplicableLawSource[];
        return [...PERSONAL_APPLICABLE_LAW_SOURCES[applicableLaw]];
    }, [applicableLaw]);

    const [visibleSubstantive, setVisibleSubstantive] = useState<PersonalApplicableLawSource[]>([]);

    useEffect(() => {
        prefetchCivilLawArticles(['civil_procedure', 'evidence']);
        if (substantiveSources.length === 0) {
            setVisibleSubstantive([]);
            return;
        }
        prefetchPersonalStatusLawArticles(substantiveSources.map((s) => s.codeType));
        let cancelled = false;
        void Promise.all(
            substantiveSources.map(async (source) => {
                const rows = await loadPersonalStatusLawArticles(source.codeType);
                return { source, count: rows.length };
            }),
        )
            .then((results) => {
                if (cancelled) return;
                const next = results
                    .filter(({ source, count }) => !source.hideWhenEmpty || count > 0)
                    .map(({ source }) => source);
                setVisibleSubstantive(next.length > 0 ? next : substantiveSources.slice(0, 1));
            })
            .catch(() => {
                if (!cancelled) setVisibleSubstantive(substantiveSources);
            });
        return () => {
            cancelled = true;
        };
    }, [substantiveSources]);

    const tabs = useMemo<PersonalLawTab[]>(() => {
        const base: PersonalLawTab[] = [
            { kind: 'procedural', id: 'civil_procedure', label: 'المرافعات المدنية' },
            { kind: 'procedural', id: 'evidence', label: 'قانون الإثبات' },
        ];
        for (const src of visibleSubstantive) {
            base.push({ kind: 'substantive', id: src.codeType, label: src.label });
        }
        return base;
    }, [visibleSubstantive]);

    const [activeTab, setActiveTab] = useState<PersonalLawTab>(() => tabs[0] ?? {
        kind: 'procedural',
        id: 'civil_procedure',
        label: 'المرافعات المدنية',
    });

    useEffect(() => {
        if (tabs.length === 0) return;
        const stillValid = tabs.some(
            (t) => t.kind === activeTab.kind && t.id === activeTab.id,
        );
        if (!stillValid) setActiveTab(tabs[0]);
    }, [tabs, activeTab.kind, activeTab.id]);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4" dir="rtl">
            <div className="flex shrink-0 flex-wrap gap-2">
                {tabs.map((tab) => {
                    const active = tab.kind === activeTab.kind && tab.id === activeTab.id;
                    return (
                        <button
                            key={`${tab.kind}-${tab.id}`}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={tabBtn(active)}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {activeTab.kind === 'procedural' ? (
                    <CivilLawReferencePanel
                        visualVariant="personal"
                        forcedTab={activeTab.id}
                        hideTabBar
                        embedded
                    />
                ) : (
                    <PersonalStatusSubstantiveLawArticles codeType={activeTab.id} />
                )}
            </div>
        </div>
    );
}
