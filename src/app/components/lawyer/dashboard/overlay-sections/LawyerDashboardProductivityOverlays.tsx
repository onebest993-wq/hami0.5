import React, { Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import AddClientModal from '@/app/components/lawyer/LawyerDashboardParts/components/AddClientModal';
import { FieldTasksBottomSheet } from '@/app/components/lawyer/dashboard/FieldTasksBottomSheet';
import { TasksManagerOverlay } from '@/app/components/lawyer/dashboard/TasksManagerOverlay';
import {
    LazyHamiSettings,
    LazyNotepadModal,
    LazyViewUrgentAndOrdersDashboard,
    LazySmartVaultModal,
    LazySmartContractGenerator,
} from '@/app/utils/lazyComponents';
import { TransactionsThreadingSystem } from '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem';
import { LAWYER_LAZY_FALLBACK } from '@/app/components/lawyer/LawyerDashboardParts/constants';
import type { LawyerDashboardOverlaysHostProps } from '../lawyerDashboardOverlaysHostBundles';

export function LawyerDashboardProductivityOverlays({
    shell,
    data,
    overlays,
    notepad,
    urgent,
    client,
    nav,
}: Pick<
    LawyerDashboardOverlaysHostProps,
    'shell' | 'data' | 'overlays' | 'notepad' | 'urgent' | 'client' | 'nav'
>) {
    const { onLogout, onAppNavigate, userId, shapeClass } = shell;
    const { files, executionFiles, globalNotes } = data;
    const {
        isNotepadOpen,
        setIsNotepadOpen,
        notepadMode,
        setNotepadMode,
        notepadFocusNoteId,
        setNotepadFocusNoteId,
        handleSaveNote,
        handleDeleteNote,
        handleNotepadConvert,
    } = notepad;
    const {
        showUrgentDashboard,
        setShowUrgentDashboard,
        urgentFocusCaseId,
        setUrgentFocusCaseId,
    } = urgent;
    const {
        showAddClientModal,
        setShowAddClientModal,
        newClientName,
        setNewClientName,
        newClientPhone,
        setNewClientPhone,
    } = client;
    const { setActiveTab, refreshAppAlerts } = nav;
    const {
        showSettings,
        setShowSettings,
        enterHomeLayoutEdit,
        openProfileTab,
        showDocs,
        setShowDocs,
        vaultOpenScanner,
        setVaultOpenScanner,
        showContractGenerator,
        setShowContractGenerator,
        fieldTasksSheetOpen,
        setFieldTasksSheetOpen,
        showTasksManager,
        setShowTasksManager,
        tasksManagerFocusTaskId,
        setTasksManagerFocusTaskId,
        openTasksManager,
        showTransactions,
        setShowTransactions,
        transactionsFocusId,
        setTransactionsFocusId,
    } = overlays;

    return (
        <>
            <FieldTasksBottomSheet
                open={fieldTasksSheetOpen}
                onClose={() => setFieldTasksSheetOpen(false)}
                onManageAll={() => {
                    openTasksManager();
                    requestAnimationFrame(() => setFieldTasksSheetOpen(false));
                }}
                lawsuitFiles={files}
                executionFiles={executionFiles}
            />

            <TasksManagerOverlay
                open={showTasksManager}
                onClose={() => {
                    setTasksManagerFocusTaskId(undefined);
                    setShowTasksManager(false);
                }}
                focusTaskId={tasksManagerFocusTaskId}
                lawsuitFiles={files}
                executionFiles={executionFiles}
            />

            <AnimatePresence>
                {showSettings && (
                    <Suspense key="hami-settings" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyHamiSettings
                            onClose={() => setShowSettings(false)}
                            onEnterHomeLayoutEdit={enterHomeLayoutEdit}
                            onLogout={onLogout}
                            onOpenProfile={() => {
                                setShowSettings(false);
                                openProfileTab();
                            }}
                            onOpenPrivacy={() => {
                                setShowSettings(false);
                                onAppNavigate?.('privacy');
                            }}
                            onOpenSupport={() => {
                                setShowSettings(false);
                                onAppNavigate?.('support');
                            }}
                        />
                    </Suspense>
                )}
                {isNotepadOpen && (
                    <Suspense key="notepad" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyNotepadModal
                            isOpen={isNotepadOpen}
                            onClose={() => {
                                setNotepadFocusNoteId(undefined);
                                setIsNotepadOpen(false);
                            }}
                            startMode={notepadMode}
                            focusNoteId={notepadFocusNoteId}
                            notes={globalNotes}
                            onSave={handleSaveNote}
                            onDelete={handleDeleteNote}
                            onConvert={handleNotepadConvert}
                            shapeClass={shapeClass}
                        />
                    </Suspense>
                )}
            </AnimatePresence>

            {showUrgentDashboard && (
                <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                    <motion.div className="fixed inset-0 z-[85] bg-[#05060D]">
                        <LazyViewUrgentAndOrdersDashboard
                            focusCaseId={urgentFocusCaseId}
                            onBack={() => {
                                setShowUrgentDashboard(false);
                                setUrgentFocusCaseId(undefined);
                                void refreshAppAlerts();
                            }}
                        />
                    </motion.div>
                </Suspense>
            )}

            {showTransactions ? (
                <TransactionsThreadingSystem
                    onBack={() => {
                        setTransactionsFocusId(undefined);
                        setShowTransactions(false);
                    }}
                    userId={userId || 'dev-user-uuid-1'}
                    initialTransactionId={transactionsFocusId}
                />
            ) : null}

            <>
                {showDocs && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazySmartVaultModal
                            key="docs"
                            onClose={() => {
                                setShowDocs(false);
                                setVaultOpenScanner(false);
                            }}
                            currentUserId={userId || ''}
                            initialOpenScanner={vaultOpenScanner}
                        />
                    </Suspense>
                )}
                {showContractGenerator && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazySmartContractGenerator onClose={() => setShowContractGenerator(false)} />
                    </Suspense>
                )}
            </>

            <AddClientModal
                isOpen={showAddClientModal}
                onClose={() => setShowAddClientModal(false)}
                clientName={newClientName}
                clientPhone={newClientPhone}
                onNameChange={setNewClientName}
                onPhoneChange={setNewClientPhone}
                onSave={() => {
                    SmartToast.success('✅ تم إضافة الموكل (محاكاة)');
                    setNewClientName('');
                    setNewClientPhone('');
                    setShowAddClientModal(false);
                }}
            />
        </>
    );
}
