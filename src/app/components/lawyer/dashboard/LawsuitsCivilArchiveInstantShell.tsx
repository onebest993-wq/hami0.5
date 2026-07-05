import React, { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { ArchivePortalLifecycleBars } from '@/app/components/lawyer/ArchivePortal/components/ArchivePortalLifecycleBars';
import { ArchiveDossierToolbar } from '@/app/components/lawyer/ArchivePortal/components/ArchiveDossierToolbar';

const noop = () => undefined;

type LawsuitsCivilArchiveInstantShellProps = {
    initialJurisdictionTab?: LawsuitJurisdictionTab;
};

/**
 * غلاف فوري لمخزن الدعاوى المضمّن — نفس هيكل ArchivePortal بدون انتظار chunk.
 * يُستبدل بالمحتوى الحي عند اكتمال التحميل دون قفزة بصرية في الرأس.
 */
export function LawsuitsCivilArchiveInstantShell({
    initialJurisdictionTab = 'all',
}: LawsuitsCivilArchiveInstantShellProps): React.ReactElement {
    const [jurisdictionTab, setJurisdictionTab] = useState<LawsuitJurisdictionTab>(initialJurisdictionTab);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');

    const lifecycleProps = useMemo(
        () => ({
            hasExecutionLifecycle: false,
            executionViewMode: 'active' as const,
            setExecutionViewMode: noop,
            executionTrashedCountTotal: 0,
            executionArchivedCount: 0,
            hasLawsuitLifecycle: true,
            lawsuitViewMode: 'active' as const,
            setLawsuitViewMode: noop,
            unifiedArchivedCount: 0,
            lawsuitTrashedCount: 0,
        }),
        [],
    );

    return (
        <div
            className="relative flex h-full min-h-0 flex-col bg-black/90 backdrop-blur-md font-['Tajawal']"
            aria-busy="true"
            data-testid="lawsuits-civil-archive-instant-shell"
        >
            <ArchivePortalLifecycleBars {...lifecycleProps} />

            <ArchiveDossierToolbar
                showJurisdictionTabs
                jurisdictionTab={jurisdictionTab}
                onJurisdictionTabChange={setJurisdictionTab}
                searchOpen={searchOpen}
                onToggleSearch={() => setSearchOpen((value) => !value)}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            <div className="flex-1 overflow-y-auto p-8 pb-[max(2rem,calc(5.5rem+env(safe-area-inset-bottom)))]">
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                    <AlertCircle size={64} className="text-white/10 mb-4" aria-hidden />
                    <h3 className="text-white/40 text-2xl font-bold mb-2">لا توجد ملفات</h3>
                    <p className="text-white/30 text-sm">ابدأ بإضافة ملف جديد</p>
                </div>
            </div>
        </div>
    );
}
