import React, { useEffect, useState, type ReactElement } from 'react';

import '@/app/bootstrap/lawyerAuth/authGateSurface.css';
import type { AccountLegalDocument } from '@/app/components/lawyer/HamiSettings/account/accountLegalContent';
import {
    loadAccountLegalDocuments,
    prefetchAccountLegalDocuments,
} from '@/app/components/lawyer/HamiSettings/account/accountLegalContentLoad';
import { exitApplicationAfterTermsDecline } from '@/app/services/auth/exitApplicationAfterTermsDecline';
import { markLegalTermsAccepted } from '@/app/services/auth/legalTermsAcceptance';
import {
    authGateGhostBtnClass,
    authGateHintClass,
    authGatePanelClass,
    authGatePrimaryBtnClass,
    authGateSecondaryBtnClass,
    authGateShellClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';
import { useBootGateSurfaceReady } from '@/app/bootstrap/useBootGateSurfaceReady';

prefetchAccountLegalDocuments();

const TERMS_TITLE = 'الشروط والأحكام وسياسة الاستخدام والخصوصية';
const TERMS_SUBTITLE =
    'اقرأ الوثيقة كاملة ثم وافق للمتابعة. الموافقة لمرة واحدة على هذا الجهاز.';

type View = 'consent' | 'declined';

type LegalTermsConsentGateProps = {
    onAccepted: () => void;
    /** رجوع لبطاقة الاختيار دون قبول — اختياري */
    onBack?: () => void;
};

/**
 * وثيقة الشروط كاملة مباشرة — بلا بطاقة «عرض» الوسطية.
 * تُستدعى بعد اختيار مسار (تسجيل / دخول / ضيف) أو عند وجود جلسة بلا قبول.
 */
export function LegalTermsConsentGate({
    onAccepted,
    onBack,
}: LegalTermsConsentGateProps): ReactElement {
    useBootGateSurfaceReady();
    const [view, setView] = useState<View>('consent');
    const [exiting, setExiting] = useState(false);
    const [doc, setDoc] = useState<AccountLegalDocument | null>(null);

    useEffect(() => {
        let cancelled = false;
        prefetchAccountLegalDocuments();
        void loadAccountLegalDocuments()
            .then((documents) => {
                if (!cancelled) setDoc(documents['terms-and-usage'] ?? null);
            })
            .catch(() => {
                if (!cancelled) setDoc(null);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const canAccept = doc !== null;

    const onAccept = () => {
        if (!canAccept) return;
        markLegalTermsAccepted();
        onAccepted();
    };

    const onDecline = () => {
        setView('declined');
    };

    const onExit = async () => {
        setExiting(true);
        try {
            await exitApplicationAfterTermsDecline();
        } finally {
            setExiting(false);
        }
    };

    return (
        <div
            className={authGateShellClass}
            data-testid="legal-terms-consent-gate"
            data-hami-auth-gate=""
            data-hami-legal-terms-gate=""
            role="main"
            aria-label="الموافقة على الشروط والأحكام"
        >
            <div className={`${authGatePanelClass} hami-legal-terms-panel hami-legal-terms-panel--document`}>
                {view === 'declined' ? (
                    <div className="hami-auth-gate-card hami-legal-terms-declined" data-testid="legal-terms-declined">
                        <h1 className={authGateTitleClass}>لا يمكن المتابعة</h1>
                        <p className={authGateHintClass}>
                            استخدام تطبيق «حامي» مشروط بالموافقة على وثيقة الشروط والأحكام وسياسة الاستخدام
                            والخصوصية والامتثال. يمكنك التراجع والموافقة، أو الخروج من التطبيق.
                        </p>
                        <button
                            type="button"
                            className={authGatePrimaryBtnClass}
                            onClick={() => setView('consent')}
                            data-testid="legal-terms-reconsider"
                        >
                            التراجع والموافقة على الشروط
                        </button>
                        <button
                            type="button"
                            className={authGateSecondaryBtnClass}
                            disabled={exiting}
                            onClick={() => void onExit()}
                            data-testid="legal-terms-exit-app"
                        >
                            {exiting ? 'جاري الخروج…' : 'الخروج من التطبيق'}
                        </button>
                        {onBack ? (
                            <button
                                type="button"
                                className={authGateGhostBtnClass}
                                disabled={exiting}
                                onClick={onBack}
                                data-testid="legal-terms-back-choice"
                            >
                                العودة للاختيار
                            </button>
                        ) : null}
                    </div>
                ) : (
                    <div
                        className="hami-auth-gate-card hami-legal-terms-card"
                        data-testid="legal-terms-consent"
                    >
                        <h1 className={authGateTitleClass}>{TERMS_TITLE}</h1>
                        <p className={authGateHintClass}>{TERMS_SUBTITLE}</p>
                        <div
                            className="hami-legal-terms-scroll"
                            data-testid="legal-terms-document-body"
                            tabIndex={0}
                            role="region"
                            aria-label="نص الشروط والأحكام"
                            aria-busy={!doc}
                        >
                            {doc?.sections.map((section) => (
                                <section key={section.title} className="hami-legal-terms-section">
                                    <h2 className="hami-legal-terms-section-title">{section.title}</h2>
                                    {section.paragraphs?.map((paragraph) => (
                                        <p key={paragraph} className="hami-legal-terms-paragraph">
                                            {paragraph}
                                        </p>
                                    ))}
                                    {section.bullets?.length ? (
                                        <ul className="hami-legal-terms-bullets">
                                            {section.bullets.map((bullet) => (
                                                <li key={bullet}>{bullet}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </section>
                            ))}
                        </div>
                        <p className={authGateHintClass}>
                            بالموافقة تُقر بأنك قرأت الوثيقة وتلتزم بها دون قيد أو شرط.
                        </p>
                        <button
                            type="button"
                            className={authGatePrimaryBtnClass}
                            onClick={onAccept}
                            disabled={!canAccept}
                            aria-disabled={!canAccept}
                            data-testid="legal-terms-accept"
                        >
                            أوافق على الشروط والأحكام
                        </button>
                        <button
                            type="button"
                            className={authGateGhostBtnClass}
                            onClick={onDecline}
                            data-testid="legal-terms-decline"
                        >
                            عدم الموافقة
                        </button>
                        {onBack ? (
                            <button
                                type="button"
                                className={authGateGhostBtnClass}
                                onClick={onBack}
                                data-testid="legal-terms-back-choice"
                            >
                                العودة
                            </button>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
