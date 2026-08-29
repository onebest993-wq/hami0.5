import React from 'react';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import { CaseShareCard } from './CaseShareCard';

type Props = {
    testId: string;
    title: string;
    count?: number;
    icon?: LucideIcon;
    borderClassName: string;
    titleClassName: string;
    shares: CaseShareRecord[];
    userId: string;
    roleLabel: (share: CaseShareRecord) => string;
    busyId: string | null;
    onRespond: (share: CaseShareRecord, action: 'accept' | 'decline') => void;
    onOpen: (share: CaseShareRecord) => void;
    onChanged: () => void;
};

export function CaseShareSectionBlock({
    testId,
    title,
    count,
    icon: Icon,
    borderClassName,
    titleClassName,
    shares,
    userId,
    roleLabel,
    busyId,
    onRespond,
    onOpen,
    onChanged,
}: Props) {
    if (!shares.length) return null;

    return (
        <section className={`mb-4 pb-4 border-b ${borderClassName}`} data-testid={testId}>
            <h3 className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 px-1 flex items-center gap-1.5 ${titleClassName}`}>
                {Icon ? <Icon size={12} /> : null}
                {title}
                {typeof count === 'number' ? (
                    <span className="text-white/40 font-normal">({count})</span>
                ) : null}
            </h3>
            <div className="space-y-2">
                {shares.map((share) => (
                    <CaseShareCard
                        key={share.id}
                        share={share}
                        userId={userId}
                        roleLabel={roleLabel(share)}
                        busyId={busyId}
                        onRespond={onRespond}
                        onOpen={(item) => void onOpen(item)}
                        onChanged={onChanged}
                    />
                ))}
            </div>
        </section>
    );
}
