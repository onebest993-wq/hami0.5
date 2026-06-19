import React from 'react';
import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ThemeKey, ShapeKey } from '../LawyerShared';
import {
    LawyerHomeHubCard,
    LegalCommandCenterDock,
    UnifiedCommandHub,
} from './lawyerHomeShell';
import { prefetchArchivePortal, prefetchExecutionDashboard } from '@/app/utils/lazyComponents';
import type { CommandCenterNote } from '../commandCenterTypes';
import { LawyerHomeAmbient } from './LawyerHomeAmbient';
import { HOME_FORUM_CHIP, HOME_SCROLL } from './lawyerHomeTheme';
import './lawyerHomeFx.css';
import type { ClusterScanSources } from '@/app/workspace/useClusterScanSources';

export type LawyerDashboardHomeTabProps = {
    visible: boolean;
    homeSectionOrder: readonly string[];
    calendarUserId: string | null;
    clusterScanSources: ClusterScanSources;
    secretaryAlerts: SecretaryAlert[];
    alertsLoading: boolean;
    alertsError: string | null;
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onDismissAlert: (alertId: string) => void;
    onAlertResolved: (alert: SecretaryAlert) => void;
    onAcceptedConvertToCase: (alert: SecretaryAlert) => void;
    onOpenCommunity: () => void;
    theme: (typeof import('../LawyerShared').THEMES)[ThemeKey];
    shapeClass: (typeof import('../LawyerShared').SHAPES)[ShapeKey];
    onOpenArchive: (id: string) => void;
    userId: string;
    onOpenCalendar: () => void;
    onOpenFieldTasksSheet: () => void;
    pendingFieldTasksCount: number;
    onOpenFullNotepad: () => void;
    onAddNote: (note: CommandCenterNote) => void;
};

export function LawyerDashboardHomeTab({
    visible,
    homeSectionOrder,
    calendarUserId,
    clusterScanSources,
    secretaryAlerts,
    alertsLoading,
    alertsError,
    onNavigateRoute,
    onOpenEntity,
    onDismissAlert,
    onAlertResolved,
    onAcceptedConvertToCase,
    onOpenCommunity,
    theme,
    shapeClass,
    onOpenArchive,
    userId,
    onOpenCalendar,
    onOpenFieldTasksSheet,
    pendingFieldTasksCount,
    onOpenFullNotepad,
    onAddNote,
}: LawyerDashboardHomeTabProps) {
    const showHub = homeSectionOrder.includes('hub');
    const showNotepad = homeSectionOrder.includes('notepad');
    const showAlerts = homeSectionOrder.includes('alerts');

    return (
        <div className={visible ? 'relative flex flex-col h-[100dvh] pt-[84px] pb-[100px] overflow-hidden' : 'hidden'}>
            <LawyerHomeAmbient />

            <div className={HOME_SCROLL}>
                <motion.header
                    className="pt-1 pb-1"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                    <h1 className="font-['Cairo'] font-bold text-[1.65rem] leading-tight text-[#F5F0E6]">
                        لوحة القيادة
                    </h1>
                </motion.header>

                {showAlerts ? (
                    <LawyerHomeHubCard
                        lawyerId={calendarUserId}
                        clusterScanSources={clusterScanSources}
                        secretaryAlerts={secretaryAlerts}
                        alertsLoading={alertsLoading}
                        alertsError={alertsError}
                        onNavigateRoute={onNavigateRoute}
                        onOpenEntity={onOpenEntity}
                        onDismissAlert={onDismissAlert}
                        onResolved={onAlertResolved}
                        onAcceptedConvertToCase={onAcceptedConvertToCase}
                    />
                ) : null}

                {showHub ? (
                    <section aria-label="مركز العمل">
                        <UnifiedCommandHub
                            theme={theme}
                            shapeClass={shapeClass}
                            onPrefetchExecution={() => {
                                prefetchArchivePortal();
                                prefetchExecutionDashboard();
                            }}
                            onOpenArchive={onOpenArchive}
                        />
                    </section>
                ) : null}

                <motion.button
                    type="button"
                    onClick={onOpenCommunity}
                    className={HOME_FORUM_CHIP}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.15 }}
                >
                    <div className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none" aria-hidden />
                    <div
                        className="absolute inset-0 pointer-events-none opacity-50"
                        style={{
                            background:
                                'radial-gradient(ellipse 90% 120% at 100% 50%, rgba(212,165,116,0.12), transparent 55%)',
                        }}
                        aria-hidden
                    />
                    <div className="relative flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center hami-home-forum-icon">
                            <MessageCircle size={18} strokeWidth={1.6} />
                        </div>
                        <div className="text-right min-w-0">
                            <p className="text-[#F0D4BC] font-bold text-sm leading-tight">المنتدى القانوني</p>
                        </div>
                    </div>
                </motion.button>
            </div>

            {showNotepad ? (
                <LegalCommandCenterDock
                    userId={userId}
                    onOpenCalendar={onOpenCalendar}
                    onOpenFieldTasksSheet={onOpenFieldTasksSheet}
                    pendingFieldTasksCount={pendingFieldTasksCount}
                    onOpenFullNotepad={onOpenFullNotepad}
                    onAddNote={onAddNote}
                />
            ) : null}
        </div>
    );
}
