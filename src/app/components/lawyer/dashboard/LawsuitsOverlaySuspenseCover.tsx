import React, { useLayoutEffect, useState } from 'react';
import { LazyLawsuitsWorkspaceInstantChrome } from '@/app/components/lawyer/dashboard/overlayInstantChromeLazy';
import { LawsuitsWorkspaceInstantPaintFrame } from '@/app/components/lawyer/dashboard/LawsuitsWorkspaceInstantPaintFrame';

type LawsuitsOverlaySuspenseCoverProps = {
    onExitToHome?: () => void;
    defaultTab?: 'civil' | 'urgent';
    filesHydrating?: boolean;
};

/**
 * غطاء OverlayHosts لمساحة الدعاوى: InstantChrome إن اكتمل التسخين، وإلا إطار خفيف.
 * بلا استيراد ساكن لـ LawsuitsWorkspaceInstantChrome على سطح MainView.
 */
export function LawsuitsOverlaySuspenseCover(
    props: LawsuitsOverlaySuspenseCoverProps,
): React.ReactElement {
    const [chromeReady, setChromeReady] = useState(() =>
        LazyLawsuitsWorkspaceInstantChrome.isPreloaded(),
    );

    useLayoutEffect(() => {
        if (LazyLawsuitsWorkspaceInstantChrome.isPreloaded()) {
            setChromeReady(true);
            return;
        }
        void LazyLawsuitsWorkspaceInstantChrome.preload().then(() => {
            setChromeReady(LazyLawsuitsWorkspaceInstantChrome.isPreloaded());
        });
    }, []);

    if (chromeReady) {
        return <LazyLawsuitsWorkspaceInstantChrome {...props} />;
    }
    return <LawsuitsWorkspaceInstantPaintFrame {...props} />;
}
