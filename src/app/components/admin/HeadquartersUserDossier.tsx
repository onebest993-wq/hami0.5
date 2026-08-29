import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy } from '@/app/components/ui/icons/Copy';
import { formatHqDateTime, formatHqFreezeCaption, formatHqLockCaption } from '@/app/components/admin/hqFormat';
import { HQ_FREEZE_DURATION_OPTIONS, type HqFreezeHours } from '@/app/components/admin/hqFreeze';
import { composeLawyerDirectoryName, type AdminUser } from '@/app/domain/admin/AdminUser';
import { isHqAccountLoginLocked, isHqUserMutationLocked } from '@/app/domain/admin/hqUserActions';
import { fetchLawyerPersonnelDossier } from '@/app/services/auth/lawyerVerificationRemote';
import { validateHeadquartersAccountPassword } from '@/app/services/admin/hqAccountPassword';
import { isHqAbortError, stripHqControlChars } from '@/app/domain/admin/hqSafeText';
import { sanitizeHqDossierImage } from '@/app/components/admin/hqDossierMedia';
import { HqNameMismatchAlert } from '@/app/components/admin/HqNameMismatchAlert';
import { HeadquartersUserActivity } from '@/app/components/admin/HeadquartersUserActivity';
import { HqVerificationDocPeek } from '@/app/components/admin/HqVerificationDocPeek';
import type { HqAccountActivity } from '@/app/domain/admin/HqAccountActivity';
import { SmartToast } from '@/app/components/ui/SmartToast';

type DossierImages = {
    idFrontPreview: string | null;
    idBackPreview: string | null;
    faceSelfiePreview: string | null;
};

type DossierFields = {
    fullName: string;
    familyName: string;
    phone: string;
    governorate: string;
    lawyerBarRoom: string;
    email: string;
};

type FreezeHours = HqFreezeHours;

function asText(value: unknown): string {
    return stripHqControlChars(value, 160);
}

export function HeadquartersUserDossier({
    user,
    busy = false,
    onClose,
    onFreeze,
    onUnfreeze,
    onRevokeSessions,
    onSetPassword,
    onLockLogin,
    onUnlockLogin,
    onSoftDelete,
    onRestore,
    onBanForum,
    onUnbanForum,
    onTogglePublicBadge,
    onLoadActivity,
}: {
    user: AdminUser;
    busy?: boolean;
    onClose: () => void;
    onFreeze?: (durationHours: FreezeHours) => Promise<boolean>;
    onUnfreeze?: () => Promise<boolean>;
    onRevokeSessions?: () => Promise<boolean>;
    onSetPassword?: (password: string) => Promise<boolean>;
    onLockLogin?: (durationHours: FreezeHours) => Promise<boolean>;
    onUnlockLogin?: () => Promise<boolean>;
    onSoftDelete?: () => Promise<boolean>;
    onRestore?: () => Promise<boolean>;
    onBanForum?: (reason: string, durationHours?: FreezeHours) => Promise<boolean>;
    onUnbanForum?: () => Promise<boolean>;
    onTogglePublicBadge?: (shown: boolean) => Promise<boolean>;
    onLoadActivity?: (signal: AbortSignal) => Promise<HqAccountActivity | null>;
}) {
    const [images, setImages] = useState<DossierImages>({
        idFrontPreview: null,
        idBackPreview: null,
        faceSelfiePreview: null,
    });
    const [fields, setFields] = useState<DossierFields>({
        fullName: user.fullName,
        familyName: user.familyName,
        phone: user.phone,
        governorate: user.governorate,
        lawyerBarRoom: user.lawyerBarRoom,
        email: user.email,
    });
    const [loadError, setLoadError] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [forumReason, setForumReason] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [activity, setActivity] = useState<HqAccountActivity | null>(null);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState(false);
    const [kycSubmittedName, setKycSubmittedName] = useState('');
    const [activityNonce, setActivityNonce] = useState(0);
    const [docPeek, setDocPeek] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const displayName = composeLawyerDirectoryName(fields.fullName, fields.familyName, fields.email);
    const locked = isHqUserMutationLocked(user);
    const frozen = user.status === 'suspended' && !user.isDeleted;
    const loginLocked = isHqAccountLoginLocked(user);
    const freezeLabel = formatHqFreezeCaption(user.freezeUntil, frozen);
    const loginLabel = formatHqLockCaption(user.loginUntil ?? null, loginLocked && !user.isDeleted);
    const peekSlots = useMemo(
        () => [
            { src: images.idFrontPreview, label: 'وجه الهوية' },
            { src: images.idBackPreview, label: 'ظهر الهوية' },
            { src: images.faceSelfiePreview, label: 'صورة إضافية' },
        ],
        [images],
    );

    useEffect(() => {
        const el = rootRef.current;
        if (!el || typeof el.scrollIntoView !== 'function') return;
        const reduce =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }, [user.id]);

    useEffect(() => {
        const ac = new AbortController();
        setLoadError(false);
        setPassword('');
        setPasswordConfirm('');
        setForumReason('');
        setConfirmDelete(false);
        setActivity(null);
        setActivityError(false);
        setActivityNonce(0);
        setFields({
            fullName: user.fullName,
            familyName: user.familyName,
            phone: user.phone,
            governorate: user.governorate,
            lawyerBarRoom: user.lawyerBarRoom,
            email: user.email,
        });
        setImages({
            idFrontPreview: null,
            idBackPreview: null,
            faceSelfiePreview: null,
        });
        void fetchLawyerPersonnelDossier(user.id, ac.signal)
            .then((record) => {
                if (ac.signal.aborted) return;
                setImages({
                    idFrontPreview: sanitizeHqDossierImage(record?.idFrontPreview),
                    idBackPreview: sanitizeHqDossierImage(record?.idBackPreview),
                    faceSelfiePreview: sanitizeHqDossierImage(record?.faceSelfiePreview),
                });
                setKycSubmittedName(asText(record?.fullName) || user.kycSubmittedName || '');
                setFields({
                    fullName: user.fullName,
                    familyName: asText(record?.familyName) || user.familyName,
                    phone: asText(record?.phone) || user.phone,
                    governorate: asText(record?.governorate) || user.governorate,
                    lawyerBarRoom: asText(record?.lawyerBarRoom) || user.lawyerBarRoom,
                    email: asText(record?.email) || user.email,
                });
            })
            .catch((error: unknown) => {
                if (ac.signal.aborted || isHqAbortError(error, ac.signal)) return;
                setLoadError(true);
            });
        return () => {
            ac.abort();
        };
    }, [user.id, user.fullName, user.familyName, user.phone, user.governorate, user.lawyerBarRoom, user.email]);

    useEffect(() => {
        if (!onLoadActivity) {
            setActivity(null);
            setActivityLoading(false);
            setActivityError(false);
            return;
        }
        const ac = new AbortController();
        setActivityLoading(true);
        setActivityError(false);
        void onLoadActivity(ac.signal)
            .then((record) => {
                if (ac.signal.aborted) return;
                setActivity(record);
                setActivityError(!record);
            })
            .catch((error: unknown) => {
                if (ac.signal.aborted || isHqAbortError(error, ac.signal)) return;
                setActivity(null);
                setActivityError(true);
            })
            .finally(() => {
                if (!ac.signal.aborted) setActivityLoading(false);
            });
        return () => {
            ac.abort();
        };
    }, [user.id, onLoadActivity, activityNonce]);

    const runFreeze = async (hours: FreezeHours) => {
        if (!onFreeze || locked || busy) return;
        const ok = await onFreeze(hours);
        if (ok) {
            SmartToast.success(
                hours > 0 ? 'تم التجميد المؤقت، وأُرسل إشعار للمستخدم.' : 'تم التجميد الدائم، وأُرسل إشعار للمستخدم.',
            );
        }
    };

    const runUnfreeze = async () => {
        if (!onUnfreeze || locked || busy) return;
        const ok = await onUnfreeze();
        if (ok) SmartToast.success('تم إعادة تفعيل الحساب، وأُرسل إشعار للمستخدم.');
    };

    const runRevoke = async () => {
        if (!onRevokeSessions || locked || busy) return;
        const ok = await onRevokeSessions();
        if (ok) SmartToast.success('تم إنهاء جلسات الحساب');
    };

    const runPassword = async () => {
        if (!onSetPassword || locked || busy) return;
        if (password !== passwordConfirm) {
            SmartToast.error('تأكيد كلمة المرور غير متطابق');
            return;
        }
        const passwordError = validateHeadquartersAccountPassword(password);
        if (passwordError) {
            SmartToast.error(passwordError);
            return;
        }
        const ok = await onSetPassword(password);
        if (ok) {
            setPassword('');
            setPasswordConfirm('');
            SmartToast.success('تم تحديث كلمة المرور وإنهاء الجلسات');
        }
    };

    const runLockLogin = async (hours: FreezeHours) => {
        if (!onLockLogin || locked || busy || user.isDeleted) return;
        const ok = await onLockLogin(hours);
        if (ok) {
            SmartToast.success(
                hours > 0 ? 'قُفل الدخول مؤقتاً، وأُرسل إشعار للمستخدم.' : 'قُفل الدخول بشكل دائم، وأُرسل إشعار للمستخدم.',
            );
        }
    };

    const runUnlockLogin = async () => {
        if (!onUnlockLogin || locked || busy || user.isDeleted) return;
        const ok = await onUnlockLogin();
        if (ok) SmartToast.success('فُتح الدخول إلى الحساب، وأُرسل إشعار للمستخدم.');
    };

    const runBanForum = async (hours?: FreezeHours) => {
        if (!onBanForum || locked || busy) return;
        const reason = forumReason.trim();
        if (reason.length < 3) {
            SmartToast.error('سبب حظر المنتدى مطلوب (٣ أحرف على الأقل)');
            return;
        }
        const ok = await onBanForum(reason, hours);
        if (ok) {
            setForumReason('');
            SmartToast.success('حُظر الحساب من المنتدى، وأُرسل إشعار للمستخدم.');
            setActivityNonce((n) => n + 1);
        }
    };

    const runUnbanForum = async () => {
        if (!onUnbanForum || locked || busy) return;
        const ok = await onUnbanForum();
        if (ok) {
            SmartToast.success('رُفع حظر المنتدى، وأُرسل إشعار للمستخدم.');
            setActivityNonce((n) => n + 1);
        }
    };

    const runPublicBadge = async (shown: boolean) => {
        if (!onTogglePublicBadge || locked || busy || user.isDeleted || user.role !== 'lawyer') return;
        const ok = await onTogglePublicBadge(shown);
        if (ok) {
            SmartToast.success(
                shown
                    ? 'وُضعت علامة التوثيق — تظهر لصاحب الحساب ولمن يرى صورته.'
                    : 'أُزيلت علامة التوثيق من الصورة.',
            );
        }
    };

    const runSoftDelete = async () => {
        if (!onSoftDelete || locked || busy || user.isDeleted) return;
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        const ok = await onSoftDelete();
        if (ok) {
            setConfirmDelete(false);
            SmartToast.success('أُقفل الحساب وأُخفي من الدليل. الدعاوى لم تُحذف.');
        }
    };

    const runRestore = async () => {
        if (!onRestore || locked || busy || !user.isDeleted) return;
        const ok = await onRestore();
        if (ok) {
            setConfirmDelete(false);
            SmartToast.success('أُعيد الحساب إلى الدليل وفُتح الدخول.');
        }
    };

    const copyUserId = async () => {
        try {
            await navigator.clipboard.writeText(user.id);
            SmartToast.success('تم نسخ المعرّف');
        } catch {
            SmartToast.error('تعذّر نسخ المعرّف');
        }
    };

    return (
        <div className="hq-panel p-5" data-testid="hq-user-dossier" ref={rootRef}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="hq-kicker">إضبارة الحساب</p>
                    <h3 className="text-lg font-bold text-white">{displayName}</h3>
                    <p className="mt-1 text-xs text-white/40" dir="ltr">
                        {fields.email || user.id}
                    </p>
                    <button
                        type="button"
                        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/70"
                        onClick={() => void copyUserId()}
                    >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                        نسخ المعرّف
                    </button>
                    {freezeLabel ? (
                        <p className="mt-1 text-xs text-amber-400">{freezeLabel.startsWith('حتى') ? `تجميد ${freezeLabel}` : freezeLabel}</p>
                    ) : null}
                    {loginLabel && !user.isDeleted ? (
                        <p className="mt-1 text-xs text-amber-400">
                            {loginLabel.startsWith('حتى') ? `قفل الدخول ${loginLabel}` : loginLabel}
                        </p>
                    ) : null}
                    {user.isDeleted ? (
                        <p className="mt-1 text-xs text-red-300">محذوف من الدليل — الدخول مقفل. الدعاوى لم تُحذف.</p>
                    ) : null}
                </div>
                <button
                    type="button"
                    className="min-h-11 rounded-lg border border-white/15 px-3 text-sm text-white/80"
                    onClick={onClose}
                    data-testid="hq-user-dossier-close"
                >
                    إغلاق
                </button>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                    <dt className="text-xs text-gray-500">الاسم الثلاثي</dt>
                    <dd className="text-white">{fields.fullName || '—'}</dd>
                    <HqNameMismatchAlert
                        liveName={user.fullName}
                        kycName={kycSubmittedName || user.kycSubmittedName || ''}
                    />
                    {user.previousLegalDisplayName ? (
                        <>
                            <dt className="text-xs text-gray-500">الاسم السابق</dt>
                            <dd className="text-white/80" data-testid="hq-user-previous-name">
                                {user.previousLegalDisplayName}
                                {user.legalDisplayNameCorrectedAt
                                    ? ` · ${formatHqDateTime(user.legalDisplayNameCorrectedAt)}`
                                    : ''}
                            </dd>
                        </>
                    ) : null}
                </div>
                <div>
                    <dt className="text-xs text-gray-500">اللقب</dt>
                    <dd className="text-white">{fields.familyName || '—'}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">رقم الهاتف</dt>
                    <dd className="text-white" dir="ltr">
                        {fields.phone || '—'}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">المحافظة</dt>
                    <dd className="text-white">{fields.governorate || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                    <dt className="text-xs text-gray-500">غرفة المحامين</dt>
                    <dd className="text-white">{fields.lawyerBarRoom || '—'}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">تاريخ الإنشاء</dt>
                    <dd className="text-white">{user.createdAt ? formatHqDateTime(user.createdAt) : '—'}</dd>
                </div>
            </dl>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {peekSlots.map((slot) => (
                    <div key={slot.label} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                        {slot.src ? (
                            <button
                                type="button"
                                className="hq-verify-slot"
                                onClick={() => setDocPeek(true)}
                                aria-label={`عرض ${slot.label} بالحجم الكامل`}
                            >
                                <img
                                    src={slot.src}
                                    alt={slot.label}
                                    className="hq-verify-frame-img"
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                />
                            </button>
                        ) : (
                            <div className="hq-verify-frame-empty">
                                {loadError ? 'تعذّر جلب الصورة' : `لا ${slot.label}`}
                            </div>
                        )}
                        <p className="px-2 py-1 text-center text-[11px] text-white/60">{slot.label}</p>
                    </div>
                ))}
            </div>
            {docPeek ? (
                <HqVerificationDocPeek
                    userId={user.id}
                    preloaded={peekSlots}
                    onClose={() => setDocPeek(false)}
                />
            ) : null}

            {locked ? (
                <p className="mt-5 text-xs text-white/50">حساب الإدارة محمي من التجميد وتغيير كلمة المرور.</p>
            ) : (
                <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
                    {user.isDeleted ? (
                        <div>
                            <p className="mb-2 text-sm font-semibold text-[#E6C673]">استعادة الحساب</p>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void runRestore()}
                                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-600/50 bg-emerald-600/15 px-3 text-sm font-bold text-emerald-400 transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                                استعادة الحساب
                            </button>
                        </div>
                    ) : (
                        <>
                    {user.role === 'lawyer' ? (
                    <div>
                        <p className="mb-2 text-sm font-semibold text-[#E6C673]">علامة التوثيق العامة</p>
                        <button
                            type="button"
                            disabled={busy}
                            data-testid="hq-dossier-public-badge"
                            aria-pressed={user.publicVerifiedBadge === true}
                            onClick={() => void runPublicBadge(user.publicVerifiedBadge !== true)}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#E6C673]/50 bg-[#E6C673]/15 px-3 text-sm font-bold text-[#E6C673] transition hover:bg-[#E6C673] hover:text-[#0A0F1C] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            {user.publicVerifiedBadge === true ? 'إزالة العلامة' : 'وضع العلامة'}
                        </button>
                    </div>
                    ) : null}
                    <div>
                        <p className="mb-2 text-sm font-semibold text-[#E6C673]">تجميد الشبكة</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {HQ_FREEZE_DURATION_OPTIONS.map((option) => (
                                <button
                                    key={option.hours}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void runFreeze(option.hours)}
                                    className="min-h-11 rounded-lg border border-amber-600/50 bg-amber-600/15 px-3 text-sm font-bold text-amber-400 transition hover:bg-amber-600 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {frozen ? (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void runUnfreeze()}
                                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-600/50 bg-emerald-600/15 px-3 text-sm font-bold text-emerald-400 transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                                إلغاء التجميد
                            </button>
                        ) : null}
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-semibold text-[#E6C673]">قفل الدخول</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {HQ_FREEZE_DURATION_OPTIONS.map((option) => (
                                <button
                                    key={`login-${option.hours}`}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void runLockLogin(option.hours)}
                                    className="min-h-11 rounded-lg border border-amber-600/50 bg-amber-600/15 px-3 text-sm font-bold text-amber-400 transition hover:bg-amber-600 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {loginLocked ? (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void runUnlockLogin()}
                                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-600/50 bg-emerald-600/15 px-3 text-sm font-bold text-emerald-400 transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                                فتح الدخول
                            </button>
                        ) : null}
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-semibold text-[#E6C673]">حظر المنتدى</p>
                        <input
                            type="text"
                            value={forumReason}
                            onChange={(e) => setForumReason(e.target.value.slice(0, 200))}
                            placeholder="سبب الحظر (٣ أحرف على الأقل)"
                            className="min-h-11 w-full rounded-lg border border-[#E6C673]/20 bg-[#0A0F1C] px-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#E6C673]"
                            aria-label="سبب حظر المنتدى"
                        />
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {HQ_FREEZE_DURATION_OPTIONS.map((option) => (
                                <button
                                    key={`forum-${option.hours}`}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void runBanForum(option.hours)}
                                    className="min-h-11 rounded-lg border border-amber-600/50 bg-amber-600/15 px-3 text-sm font-bold text-amber-400 transition hover:bg-amber-600 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void runUnbanForum()}
                            className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-600/50 bg-emerald-600/15 px-3 text-sm font-bold text-emerald-400 transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            رفع حظر المنتدى
                        </button>
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-semibold text-[#E6C673]">الجلسات</p>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void runRevoke()}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 px-3 text-sm font-bold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            إنهاء كل الجلسات
                        </button>
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-semibold text-[#E6C673]">كلمة المرور</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="كلمة مرور جديدة"
                                autoComplete="new-password"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void runPassword();
                                }}
                                className="min-h-11 rounded-lg border border-[#E6C673]/20 bg-[#0A0F1C] px-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#E6C673]"
                                aria-label="كلمة مرور جديدة"
                            />
                            <input
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="تأكيد كلمة المرور"
                                autoComplete="new-password"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void runPassword();
                                }}
                                className="min-h-11 rounded-lg border border-[#E6C673]/20 bg-[#0A0F1C] px-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#E6C673]"
                                aria-label="تأكيد كلمة المرور"
                            />
                        </div>
                        <button
                            type="button"
                            disabled={busy || !password}
                            onClick={() => void runPassword()}
                            className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#E6C673]/35 bg-[#E6C673]/10 px-3 text-sm font-bold text-[#E6C673] transition hover:bg-[#E6C673]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            حفظ كلمة المرور
                        </button>
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-semibold text-[#E6C673]">حذف نهائي من الدليل</p>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void runSoftDelete()}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-red-600/50 bg-red-600/15 px-3 text-sm font-bold text-red-400 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            {confirmDelete ? 'تأكيد الحذف من الدليل' : 'حذف من الدليل'}
                        </button>
                    </div>
                        </>
                    )}
                </div>
            )}
            {onLoadActivity ? (
                <HeadquartersUserActivity activity={activity} loading={activityLoading} error={activityError} />
            ) : null}
        </div>
    );
}
