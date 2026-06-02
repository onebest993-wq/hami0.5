import React, { Suspense, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import {
    LazyArchivePortal,
    LazyViewUrgentAndOrdersDashboard,
    prefetchUrgentOrdersView,
    resetUrgentOrdersViewPrefetch,
} from '@/app/utils/lazyComponents';
import { resetActiveOrderFilePanelCache } from '@/app/components/lawyer/DeferredActiveOrderFile';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import type { ThemeConfig } from '@/app/types/common';
import type { FileData } from './LawyerShared';
import type { ArchiveType } from '@/app/types/common';
import {
    allLawsuitFilesForArchive,
    lawsuitFilesToArchiveRows,
} from '@/app/domain/lawsuit/lawsuitFileFactory';
import type { CaseFile } from '@/app/types/common';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';

type TabKey = 'civil' | 'urgent';

type Props = {
    files: FileData[];
    criminalCases: unknown[];
    theme: ThemeConfig;
    shapeClass: string;
    onClose: () => void;
    onOpenFile: (file: unknown) => void;
    onOpenCriminalCase: (caseId: string) => void;
    onDeleteCriminalCase?: (caseId: string) => void;
    onAddNewCase: () => void;
    defaultTab?: TabKey;
    /** تبويب الاختصاص داخل مخزن الدعاوى (مثلاً جزائي) */
    initialDossierSection?: LawsuitJurisdictionTab;
    onMoveLawsuitToTrash?: (fileId: string | number) => void;
    onRestoreLawsuitFromTrash?: (fileId: string | number) => void;
    onArchiveLawsuit?: (fileId: string | number) => void;
    onRestoreArchivedLawsuit?: (fileId: string | number) => void;
    onPermanentlyDeleteLawsuits?: (fileIds: Array<string | number>) => void;
};

export const LawsuitsWorkspace: React.FC<Props> = ({
    files,
    criminalCases,
    theme,
    shapeClass,
    onClose,
    onOpenFile,
    onOpenCriminalCase,
    onDeleteCriminalCase,
    onAddNewCase,
    defaultTab = 'civil',
    initialDossierSection = 'all',
    onMoveLawsuitToTrash,
    onRestoreLawsuitFromTrash,
    onArchiveLawsuit,
    onRestoreArchivedLawsuit,
    onPermanentlyDeleteLawsuits,
}) => {
    const [tab, setTab] = useState<TabKey>(defaultTab);
    const [urgentPanelKey, setUrgentPanelKey] = useState(0);

    const lawsuitArchiveFiles = useMemo(() => allLawsuitFilesForArchive(files), [files]);
    const archiveRows = useMemo(
        () => lawsuitFilesToArchiveRows(lawsuitArchiveFiles) as unknown as CaseFile[],
        [lawsuitArchiveFiles],
    );

    const archiveType: ArchiveType = 'lawsuits';

    const tabLoadErrorFallback = (
        <motion.div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-red-400 font-bold text-sm">تعذّر تحميل هذا القسم</p>
            <p className="text-white/40 text-xs">تحقق من الاتصال ثم أعد المحاولة</p>
            <div className="flex flex-wrap gap-2 justify-center">
                <button
                    type="button"
                    onClick={() => {
                        resetUrgentOrdersViewPrefetch();
                        resetActiveOrderFilePanelCache();
                        setUrgentPanelKey((k) => k + 1);
                    }}
                    className="text-xs font-bold rounded-xl px-4 py-2 border border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/10"
                >
                    إعادة المحاولة
                </button>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="text-xs font-bold rounded-xl px-4 py-2 border border-white/20 text-white/80 hover:bg-white/10"
                >
                    إعادة تحميل التطبيق
                </button>
            </div>
        </motion.div>
    );

    return (
        <div
            className="fixed inset-0 z-[70] bg-[#0B1021] font-['Tajawal'] flex flex-col"
            data-testid={CIVIL_LAWSUIT_TEST_IDS.workspace}
        >
            <motion.div className="shrink-0 border-b border-white/10 bg-[#0B1021]">
                <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                    <div className="text-right">
                        <h2 className="text-white font-extrabold text-lg">مخزن الإضابير</h2>
                        <p className="text-white/40 text-xs mt-0.5">دعاوى · مستعجل</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div dir="rtl" className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5">
                        <button
                            type="button"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.tabCivil}
                            onClick={() => setTab('civil')}
                            className={`h-11 rounded-xl text-xs font-bold transition-all ${
                                tab === 'civil'
                                    ? 'bg-[#E6C673] text-[#0B1021]'
                                    : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            ⚖️ الدعاوى
                        </button>
                        <button
                            type="button"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.tabUrgent}
                            onPointerEnter={() => prefetchUrgentOrdersView()}
                            onFocus={() => prefetchUrgentOrdersView()}
                            onClick={() => setTab('urgent')}
                            className={`h-11 rounded-xl text-xs font-bold transition-all ${
                                tab === 'urgent'
                                    ? 'bg-[#E6C673] text-[#0B1021]'
                                    : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            ⚡ مستعجل
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="flex-1 min-h-0 overflow-hidden">
                {tab === 'civil' && (
                    <div className="h-full overflow-hidden">
                        <ErrorBoundary fallback={tabLoadErrorFallback}>
                            <Suspense
                                fallback={
                                    <div className="h-full flex items-center justify-center">
                                        <motion.div className="text-white/50 text-sm font-bold">
                                            جاري تحميل الدعاوى...
                                        </motion.div>
                                    </div>
                                }
                            >
                                <LazyArchivePortal
                                    type={archiveType}
                                    files={archiveRows}
                                    criminalCases={criminalCases}
                                    theme={theme}
                                    shapeClass={shapeClass}
                                    onClose={onClose}
                                    onFileClick={onOpenFile}
                                    onAddAction={onAddNewCase}
                                    embedded={true}
                                    hideHeader={true}
                                    hideTopActionBar={false}
                                    initialLawsuitJurisdictionTab={initialDossierSection}
                                    onOpenCriminalCase={onOpenCriminalCase}
                                    onDeleteCriminalCase={onDeleteCriminalCase}
                                    onMoveLawsuitToTrash={onMoveLawsuitToTrash}
                                    onRestoreLawsuitFromTrash={onRestoreLawsuitFromTrash}
                                    onArchiveLawsuit={onArchiveLawsuit}
                                    onRestoreArchivedLawsuit={onRestoreArchivedLawsuit}
                                    onPermanentlyDeleteLawsuits={onPermanentlyDeleteLawsuits}
                                />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                )}

                {tab === 'urgent' && (
                    <div className="h-full overflow-y-auto">
                        <ErrorBoundary fallback={tabLoadErrorFallback}>
                            <Suspense
                                fallback={
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-white/50 text-sm font-bold">
                                            جاري تحميل الطلبات المستعجلة...
                                        </div>
                                    </div>
                                }
                            >
                                <LazyViewUrgentAndOrdersDashboard
                                    key={urgentPanelKey}
                                    onBack={onClose}
                                    embeddedInWorkspace
                                />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                )}
            </div>
        </div>
    );
};
