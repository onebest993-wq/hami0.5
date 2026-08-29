import React from 'react';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { Eye } from '@/app/components/ui/icons/Eye';
import { Lock } from '@/app/components/ui/icons/Lock';
import { User } from '@/app/components/ui/icons/User';
import { XCircle } from '@/app/components/ui/icons/XCircle';
import { formatHqDateTime, formatHqWaitingSince } from '@/app/components/admin/hqFormat';
import { HqNameMismatchAlert } from '@/app/components/admin/HqNameMismatchAlert';
import {
    hqVerificationCanApprove,
    hqVerificationHasDocuments,
    hqVerificationStatusLabel,
    type HqVerificationQueueRow,
} from '@/app/components/admin/hqVerificationQueue';

function Seal({ present, label }: { present: boolean; label: string }) {
    return (
        <span className={present ? 'hq-verify-seal hq-verify-seal-on' : 'hq-verify-seal'} title={label}>
            <Lock className="h-3 w-3" aria-hidden />
            {label}
            <span className="hq-verify-seal-state">{present ? 'مرفق' : 'غير مرفق'}</span>
        </span>
    );
}

export function HqVerificationRequestCard({
    lawyer,
    busy,
    rejectOpen,
    rejectDraft,
    onRejectDraft,
    onToggleReject,
    onApprove,
    onReject,
    onInspect,
    onPeekDocs,
}: {
    lawyer: HqVerificationQueueRow;
    busy: boolean;
    rejectOpen: boolean;
    rejectDraft: string;
    onRejectDraft: (value: string) => void;
    onToggleReject: () => void;
    onApprove: () => void;
    onReject: () => void;
    onInspect?: () => void;
    onPeekDocs: () => void;
}) {
    const displayName = `${lawyer.fullName || lawyer.email || 'محامٍ'} ${lawyer.familyName}`.trim();
    const hasDocs = hqVerificationHasDocuments(lawyer);
    const canApprove = hqVerificationCanApprove(lawyer);
    const submitted = lawyer.submittedAt ? formatHqDateTime(lawyer.submittedAt) : '';
    const waiting =
        lawyer.status === 'pending' && lawyer.submittedAt
            ? formatHqWaitingSince(lawyer.submittedAt)
            : '';
    const attachedCount = [lawyer.hasIdFront, lawyer.hasIdBack, lawyer.hasFaceSelfie].filter(Boolean).length;
    const governorate = lawyer.governorate.trim();
    const barRoom = lawyer.lawyerBarRoom.trim();
    const email = lawyer.email.trim();
    const phone = lawyer.phone.trim();

    return (
        <article className="hq-panel hq-verify-card" data-testid="hq-verify-card">
            <div className="hq-verify-card-top">
                <div className="min-w-0">
                    <h3 className="hq-verify-name">{displayName}</h3>
                    {submitted ? <p className="hq-verify-date">قُدّم {submitted}</p> : null}
                    {waiting ? <p className="hq-verify-date">{waiting} بلا قرار</p> : null}
                </div>
                <span className={`hq-verify-badge hq-verify-badge-${lawyer.status}`}>
                    {hqVerificationStatusLabel(lawyer.status)}
                </span>
            </div>

            <dl className="hq-dir-facts">
                {governorate ? (
                    <div>
                        <dt>المحافظة</dt>
                        <dd>{governorate}</dd>
                    </div>
                ) : null}
                {barRoom ? (
                    <div>
                        <dt>غرفة المحامين</dt>
                        <dd>{barRoom}</dd>
                    </div>
                ) : null}
                {email ? (
                    <div>
                        <dt>البريد</dt>
                        <dd dir="ltr">{email}</dd>
                    </div>
                ) : null}
                {phone ? (
                    <div>
                        <dt>الهاتف</dt>
                        <dd dir="ltr">{phone}</dd>
                    </div>
                ) : null}
                <div>
                    <dt>الوثائق</dt>
                    <dd>{attachedCount} من 3</dd>
                </div>
            </dl>

            {lawyer.rejectionReason && lawyer.status === 'rejected' ? (
                <p className="hq-verify-reason">سبب الرفض: {lawyer.rejectionReason}</p>
            ) : null}

            <HqNameMismatchAlert liveName={lawyer.liveFullName} kycName={lawyer.fullName} />

            <div className="hq-verify-seals" aria-label="حالة وثائق الهوية">
                <Seal present={lawyer.hasIdFront} label="وجه الهوية" />
                <Seal present={lawyer.hasIdBack} label="ظهر الهوية" />
                <Seal present={lawyer.hasFaceSelfie} label="صورة إضافية" />
            </div>

            <div className="hq-verify-actions">
                {hasDocs ? (
                    <button
                        type="button"
                        onClick={onPeekDocs}
                        className="hq-btn hq-btn-ghost hq-verify-action"
                        data-testid="hq-verify-peek-open"
                    >
                        <Eye className="h-4 w-4" aria-hidden />
                        معاينة الوثائق
                    </button>
                ) : (
                    <p className="hq-verify-missing">لا وثائق مرفقة في هذا الطلب.</p>
                )}
                {onInspect ? (
                    <button type="button" onClick={onInspect} className="hq-btn hq-btn-ghost hq-verify-action">
                        <User className="h-4 w-4" aria-hidden />
                        إدارة الحساب
                    </button>
                ) : null}
            </div>

            {lawyer.status === 'pending' ? (
                <div className="hq-verify-decide">
                    {rejectOpen ? (
                        <textarea
                            value={rejectDraft}
                            onChange={(event) => onRejectDraft(event.target.value)}
                            placeholder="سبب الرفض (أربعة أحرف على الأقل)"
                            rows={3}
                            maxLength={240}
                            className="hq-verify-reject-input"
                            aria-label="سبب الرفض"
                        />
                    ) : null}
                    <div className="hq-verify-decide-row">
                        <button
                            type="button"
                            disabled={busy || !canApprove}
                            onClick={onApprove}
                            className="hq-verify-approve"
                            title={
                                canApprove
                                    ? undefined
                                    : 'القبول يحتاج وجه وظهر هوية النقابة'
                            }
                            aria-label={
                                canApprove ? undefined : 'القبول يحتاج وجه وظهر هوية النقابة'
                            }
                        >
                            <CheckCircle className="h-4 w-4" aria-hidden />
                            قبول
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={rejectOpen ? onReject : onToggleReject}
                            className="hq-verify-deny"
                        >
                            <XCircle className="h-4 w-4" aria-hidden />
                            {rejectOpen ? 'تأكيد الرفض' : 'رفض'}
                        </button>
                    </div>
                </div>
            ) : null}
        </article>
    );
}
