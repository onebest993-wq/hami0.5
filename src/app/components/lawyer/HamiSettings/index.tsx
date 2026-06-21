import React, { Suspense, lazy, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { SettingsSectionId } from '@/app/services/settings';
import { SettingsShell } from './SettingsShell';
import { SETTING_GLASS_INNER } from './settings-ui';

const AppearanceSection = lazy(() =>
    import('./AppearanceSection').then((m) => ({ default: m.AppearanceSection })),
);
const SecuritySection = lazy(() =>
    import('./SecuritySection').then((m) => ({ default: m.SecuritySection })),
);
const DataSection = lazy(() => import('./DataSection').then((m) => ({ default: m.DataSection })));
const AccountSection = lazy(() =>
    import('./AccountSection').then((m) => ({ default: m.AccountSection })),
);

export interface HamiSettingsProps {
    onClose: () => void;
    onEnterHomeLayoutEdit?: () => void;
    onLogout?: () => void;
    onOpenProfile?: () => void;
    onOpenPrivacy?: () => void;
    onOpenSupport?: () => void;
}

function SectionFallback() {
    return (
        <div className={`rounded-2xl p-8 text-center text-sm text-white/40 ${SETTING_GLASS_INNER}`}>
            جاري التحميل…
        </div>
    );
}

function SettingsSectionRouter({
    activeSection,
    onClose,
    onEnterHomeLayoutEdit,
    accountProps,
}: {
    activeSection: SettingsSectionId;
    onClose: () => void;
    onEnterHomeLayoutEdit?: () => void;
    accountProps: Pick<HamiSettingsProps, 'onLogout' | 'onOpenProfile' | 'onOpenPrivacy' | 'onOpenSupport'>;
}) {
    switch (activeSection) {
        case 'appearance':
            return <AppearanceSection onEnterHomeLayoutEdit={onEnterHomeLayoutEdit} />;
        case 'security':
            return <SecuritySection />;
        case 'data':
            return <DataSection />;
        case 'account':
            return (
                <AccountSection
                    onClose={onClose}
                    onLogout={accountProps.onLogout}
                    onOpenProfile={accountProps.onOpenProfile}
                    onOpenPrivacy={accountProps.onOpenPrivacy}
                    onOpenSupport={accountProps.onOpenSupport}
                />
            );
        default:
            return null;
    }
}

export const HamiSettings = ({
    onClose,
    onEnterHomeLayoutEdit,
    onLogout,
    onOpenProfile,
    onOpenPrivacy,
    onOpenSupport,
}: HamiSettingsProps) => {
    const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance');

    return (
        <SettingsShell onClose={onClose} activeSection={activeSection} onSectionChange={setActiveSection}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                >
                    <Suspense fallback={<SectionFallback />}>
                        <SettingsSectionRouter
                            activeSection={activeSection}
                            onClose={onClose}
                            onEnterHomeLayoutEdit={onEnterHomeLayoutEdit}
                            accountProps={{ onLogout, onOpenProfile, onOpenPrivacy, onOpenSupport }}
                        />
                    </Suspense>
                </motion.div>
            </AnimatePresence>
        </SettingsShell>
    );
};
