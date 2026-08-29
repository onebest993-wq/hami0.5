import React from 'react';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { PauseCircle } from '@/app/components/ui/icons/PauseCircle';
import { User } from '@/app/components/ui/icons/User';
import { UserX } from '@/app/components/ui/icons/UserX';
import { HqChip, HqChipRow } from '@/app/components/admin/hqChrome';
import { formatHqDate, formatHqFreezeCaption } from '@/app/components/admin/hqFormat';
import { HQ_FREEZE_DURATION_OPTIONS, type HqFreezeHours } from '@/app/components/admin/hqFreeze';
import { cn } from '@/app/components/ui/utils';
import {
    HEADQUARTERS_ASSIGNABLE_ROLES,
    composeLawyerDirectoryName,
    type AdminUser,
    type AdminUserRole,
} from '@/app/domain/admin/AdminUser';
import { AccreditedLawyerMark } from '@/app/components/shared/AccreditedLawyerMark';
import { HqNameMismatchAlert } from '@/app/components/admin/HqNameMismatchAlert';
import {
    hqDirectoryStatusLabel,
    isAccreditedLawyer,
    resolveHqUserPresence,
    type HqUserPresence,
} from '@/app/domain/admin/hqUserPresence';

const ROLE_LABELS: Record<AdminUserRole, string> = {
    lawyer: 'محامي',
    admin: 'إدارة',
    moderator: 'مشرف',
};

const PRESENCE_BADGE: Record<HqUserPresence, string> = {
    active: 'hq-dir-badge-active',
    pending: 'hq-dir-badge-pending',
    unsubmitted: 'hq-dir-badge-unsubmitted',
    locked: 'hq-dir-badge-locked',
    frozen: 'hq-dir-badge-frozen',
    rejected: 'hq-dir-badge-rejected',
    deleted: 'hq-dir-badge-deleted',
};

const ROLE_BADGE: Record<AdminUserRole, string> = {
    admin: 'hq-dir-badge-admin',
    moderator: 'hq-dir-badge-moderator',
    lawyer: 'hq-dir-badge-lawyer',
};

function StatusBadge({ user }: { user: AdminUser }) {
    const kind = resolveHqUserPresence(user);
    return (
        <span className={cn('hq-dir-badge', PRESENCE_BADGE[kind])}>{hqDirectoryStatusLabel(user)}</span>
    );
}

function RoleBadge({ role }: { role: AdminUserRole }) {
    return <span className={cn('hq-dir-badge', ROLE_BADGE[role])}>{ROLE_LABELS[role]}</span>;
}

export function headquartersRoleLabel(role: AdminUserRole): string {
    return ROLE_LABELS[role];
}

export function HeadquartersUserRow({
    user,
    busy,
    locked,
    open = false,
    pickingFreeze,
    onOpen,
    onRoleChange,
    onFreeze,
    onUnfreeze,
    onToggleFreezePicker,
    onTogglePublicBadge,
}: {
    user: AdminUser;
    busy: boolean;
    locked: boolean;
    open?: boolean;
    pickingFreeze: boolean;
    onOpen: () => void;
    onRoleChange: (next: AdminUserRole) => void;
    onFreeze: (hours: HqFreezeHours) => void;
    onUnfreeze: () => void;
    onToggleFreezePicker: () => void;
    onTogglePublicBadge?: (shown: boolean) => void;
}) {
    const isSuspended = user.status === 'suspended';
    const freezeCaption = formatHqFreezeCaption(user.freezeUntil, isSuspended);
    const displayName = composeLawyerDirectoryName(user.fullName, user.familyName, user.email);
    const governorate = user.governorate.trim();
    const phone = user.phone.trim();
    const barRoom = user.lawyerBarRoom.trim();
    const created = formatHqDate(user.createdAt);

    return (
        <article
            role="listitem"
            className={cn('hq-dir-card', open && 'hq-dir-card-open', isSuspended && 'hq-dir-card-frozen')}
            onClick={(event) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest('button, select, a, input, textarea, .hq-dir-card-actions')) return;
                onOpen();
            }}
        >
            <div className="hq-dir-card-top">
                <button
                    type="button"
                    className="hq-dir-identity"
                    onClick={onOpen}
                    data-testid={`hq-user-open-${user.id}`}
                    aria-expanded={open}
                    aria-label={`فتح إضبارة ${displayName}`}
                >
                    <span className={cn('hq-dir-avatar', isSuspended && 'hq-dir-avatar-frozen')}>
                        {isSuspended ? (
                            <UserX className="h-5 w-5" aria-hidden />
                        ) : (
                            <User className="h-5 w-5" aria-hidden />
                        )}
                        {isAccreditedLawyer(user) ? <AccreditedLawyerMark /> : null}
                    </span>
                    <span className="hq-dir-identity-copy">
                        <span className="hq-dir-name">{displayName}</span>
                        <span className="hq-dir-email" dir="ltr">
                            {user.email || user.id}
                        </span>
                    </span>
                </button>
                <div className="hq-dir-flags">
                    <RoleBadge role={user.role} />
                    <StatusBadge user={user} />
                </div>
            </div>

            <dl className="hq-dir-facts">
                {governorate ? (
                    <div>
                        <dt>المحافظة</dt>
                        <dd>{governorate}</dd>
                    </div>
                ) : null}
                {phone ? (
                    <div>
                        <dt>الهاتف</dt>
                        <dd dir="ltr">{phone}</dd>
                    </div>
                ) : null}
                <div>
                    <dt>التسجيل</dt>
                    <dd>{created}</dd>
                </div>
                {barRoom ? (
                    <div>
                        <dt>غرفة المحامين</dt>
                        <dd>{barRoom}</dd>
                    </div>
                ) : null}
                {user.previousLegalDisplayName ? (
                    <div>
                        <dt>الاسم السابق</dt>
                        <dd data-testid={`hq-user-previous-name-${user.id}`}>
                            {user.previousLegalDisplayName}
                            {user.legalDisplayNameCorrectedAt
                                ? ` · ${formatHqDate(user.legalDisplayNameCorrectedAt)}`
                                : ''}
                        </dd>
                    </div>
                ) : null}
            </dl>

            <HqNameMismatchAlert liveName={user.fullName} kycName={user.kycSubmittedName ?? ''} />

            {freezeCaption ? <p className="hq-dir-caption">{freezeCaption}</p> : null}

            {locked ? null : (
                <div className="hq-dir-card-actions">
                    <label className="sr-only" htmlFor={`role-${user.id}`}>
                        ترقية صلاحية {displayName}
                    </label>
                    <select
                        id={`role-${user.id}`}
                        value={user.role}
                        disabled={busy}
                        onChange={(e) => {
                            const next = e.target.value as AdminUserRole;
                            onRoleChange(next);
                        }}
                        className="hq-dir-select"
                    >
                        {HEADQUARTERS_ASSIGNABLE_ROLES.map((role) => (
                            <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                            </option>
                        ))}
                    </select>
                    {user.isDeleted ? null : (
                        <>
                        <button
                            type="button"
                            disabled={busy}
                            aria-expanded={!isSuspended && pickingFreeze}
                            onClick={() => {
                                if (isSuspended) {
                                    onUnfreeze();
                                    return;
                                }
                                onToggleFreezePicker();
                            }}
                            className={cn('hq-dir-freeze', isSuspended ? 'hq-dir-freeze-stop' : 'hq-dir-freeze-go')}
                        >
                            {isSuspended ? (
                                <>
                                    <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                                    تفعيل
                                </>
                            ) : (
                                <>
                                    <PauseCircle className="h-4 w-4 shrink-0" aria-hidden />
                                    تجميد
                                </>
                            )}
                        </button>
                        {user.role === 'lawyer' && onTogglePublicBadge ? (
                            <button
                                type="button"
                                disabled={busy}
                                data-testid={`hq-public-badge-${user.id}`}
                                aria-pressed={isAccreditedLawyer(user)}
                                aria-label={
                                    isAccreditedLawyer(user)
                                        ? `إزالة علامة التوثيق عن ${displayName}`
                                        : `وضع علامة التوثيق لـ ${displayName}`
                                }
                                onClick={() => onTogglePublicBadge(!isAccreditedLawyer(user))}
                                className={cn(
                                    'hq-dir-freeze',
                                    isAccreditedLawyer(user) ? 'hq-dir-badge-on' : 'hq-dir-badge-off',
                                )}
                            >
                                <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                                {isAccreditedLawyer(user) ? 'إزالة العلامة' : 'وضع العلامة'}
                            </button>
                        ) : null}
                        </>
                    )}
                    {pickingFreeze && !isSuspended ? (
                        <div className="hq-dir-freeze-pick">
                            <HqChipRow>
                                {HQ_FREEZE_DURATION_OPTIONS.map((option) => (
                                    <HqChip
                                        key={option.hours}
                                        disabled={busy}
                                        onClick={() => onFreeze(option.hours)}
                                    >
                                        {option.label}
                                    </HqChip>
                                ))}
                            </HqChipRow>
                        </div>
                    ) : null}
                </div>
            )}
        </article>
    );
}
