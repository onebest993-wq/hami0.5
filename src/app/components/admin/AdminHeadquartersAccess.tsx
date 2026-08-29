import React, { useEffect, useState, type ReactElement } from 'react';

import '@/app/bootstrap/lawyerAuth/authGateSurface.css';
import { useBootGateSurfaceReady } from '@/app/bootstrap/useBootGateSurfaceReady';
import { LawyerSignInForm } from '@/app/bootstrap/lawyerAuth/LawyerSignInForm';
import {
    authGateCardClass,
    authGateGhostBtnClass,
    authGateHintClass,
    authGatePanelClass,
    authGatePrimaryBtnClass,
    authGateShellClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { isHeadquartersMasterMailbox } from '@/app/services/admin/adminHqIdentity';

export type AdminAccessDenyInfo = {
    userId: string | null;
    userEmail: string | null;
    isGuest: boolean;
    verifyReason: string | null;
    profileRole: string | null;
    uuidMatches: boolean | null;
    verifyFailed: boolean;
};

export { isHeadquartersMasterMailbox } from '@/app/services/admin/adminHqIdentity';

export function adminAccessDeniedBody(info: AdminAccessDenyInfo): string {
    if (info.isGuest) {
        return 'لفتح مقر القيادة سجّل الدخول بحساب المدير المعتمد، ثم أعد فتح /admin.';
    }
    const master = isHeadquartersMasterMailbox(info.userEmail);
    if (info.verifyFailed) {
        return master
            ? 'تعذّر التحقق من صلاحيات الإدارة مع الخادم رغم أن الجلسة على بريد المدير. حدّث الصفحة ثم أعد فتح /admin.'
            : 'تعذّر التحقق من صلاحيات الإدارة مع الخادم. حدّث الصفحة ثم أعد المحاولة.';
    }
    if (master) {
        return 'هذا البريد هو حساب المدير المعتمد، لكن الخادم لم يمنح صلاحية المقر بعد. حدّث الصفحة أو أعد تسجيل الدخول.';
    }
    return 'أنت مسجّل بحساب آخر. اخرج منه وادخل بحساب المدير المرتبط بصلاحيات الإدارة.';
}

type LoginProps = {
    onBack: () => void;
    onLoggedIn?: () => void;
};

/** بوابة دخول مخصّصة لمقر القيادة — بدل شاشة الرفض عند غياب الجلسة */
export function AdminHeadquartersLoginGate({ onBack, onLoggedIn }: LoginProps): ReactElement {
    useBootGateSurfaceReady();

    useEffect(() => {
        removeStaticBootShell({ force: true, instant: true });
        try {
            document.body.style.pointerEvents = 'auto';
        } catch {
            /* ignore */
        }
    }, []);

    return (
        <div
            className={authGateShellClass}
            data-testid="admin-hq-login-gate"
            data-hami-auth-gate=""
            data-hami-hq-gate=""
            role="main"
            aria-label="دخول مقر القيادة"
            style={{ pointerEvents: 'auto' }}
        >
            <div className={authGatePanelClass}>
                <LawyerSignInForm
                    onBack={onBack}
                    onSuccess={onLoggedIn}
                    title={null}
                    hint={null}
                    showCharsetHint={false}
                />
            </div>
        </div>
    );
}

type DeniedProps = {
    onBack: () => void;
    onSwitchAccount: () => void;
    info: AdminAccessDenyInfo;
};

/** رفض واضح لحساب غير إداري — بدون حشو تقني في الإنتاج */
export function AdminPcAccessDenied({ onBack, onSwitchAccount, info }: DeniedProps): ReactElement {
    useBootGateSurfaceReady();
    const [showDiag, setShowDiag] = useState(false);
    const isDev = import.meta.env.DEV;

    useEffect(() => {
        removeStaticBootShell({ force: true, instant: true });
    }, []);

    const title = info.isGuest
        ? 'يلزم تسجيل الدخول'
        : info.verifyFailed
          ? 'تعذّر التحقق من صلاحية الإدارة'
          : 'هذا الحساب ليس مدير المنصّة';

    const body = adminAccessDeniedBody(info);

    return (
        <div
            className={authGateShellClass}
            data-testid="admin-pc-access-denied"
            data-hami-auth-gate=""
            role="main"
            aria-label="وصول مرفوض لمقر القيادة"
        >
            <div className={authGatePanelClass}>
                <div className={authGateCardClass}>
                    <h1 className={authGateTitleClass}>{title}</h1>
                    <p className={authGateHintClass}>{body}</p>
                    {info.userEmail ? (
                        <p className={authGateHintClass} dir="ltr" style={{ textAlign: 'left' }}>
                            الجلسة الحالية: {info.userEmail}
                        </p>
                    ) : null}

                    <button
                        type="button"
                        onClick={onSwitchAccount}
                        className={authGatePrimaryBtnClass}
                        data-testid="admin-denied-switch-account"
                    >
                        تسجيل الدخول بحساب المدير
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        className={authGateGhostBtnClass}
                        data-testid="admin-denied-back"
                    >
                        العودة للتطبيق
                    </button>

                    {isDev ? (
                        <>
                            <button
                                type="button"
                                className={authGateGhostBtnClass}
                                onClick={() => setShowDiag((v) => !v)}
                                data-testid="admin-denied-toggle-diag"
                            >
                                {showDiag ? 'إخفاء التشخيص' : 'تشخيص (تطوير)'}
                            </button>
                            {showDiag ? (
                                <div
                                    dir="ltr"
                                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-left text-xs text-gray-400"
                                    data-testid="admin-denied-diag"
                                >
                                    <div>userId: {info.userId || '(none)'}</div>
                                    <div>email: {info.userEmail || '(none)'}</div>
                                    <div>profileRole: {info.profileRole ?? '(unknown)'}</div>
                                    <div>
                                        uuidMatches:{' '}
                                        {info.uuidMatches == null
                                            ? '(unknown)'
                                            : String(info.uuidMatches)}
                                    </div>
                                    <div>
                                        verify:{' '}
                                        {info.verifyFailed
                                            ? 'request_failed'
                                            : info.verifyReason || '(none)'}
                                    </div>
                                </div>
                            ) : null}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
