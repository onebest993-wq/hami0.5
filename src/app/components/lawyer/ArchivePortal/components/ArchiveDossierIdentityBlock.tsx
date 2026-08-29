import React from 'react';
import { ArchiveHearingStrip } from './ArchiveHearingStrip';

export type ArchivePartySnippet = {
    name: string;
    role: string;
    isClient: boolean;
};

type ArchiveDossierMetaRow = {
    label: string;
    value: string;
};

export type ArchiveDossierIdentityBlockProps = {
    hearing?: {
        label: string;
        ymd: string;
        sessionNumber?: number | null;
    } | null;
    metaRows?: ArchiveDossierMetaRow[];
    parties?: {
        left: ArchivePartySnippet | null;
        right: ArchivePartySnippet | null;
        leftTone?: 'plaintiff' | 'defendant' | 'primary';
        rightTone?: 'plaintiff' | 'defendant' | 'primary';
    } | null;
    /** inline = صف أرشيف مضغوط · grid = تسمية فوق القيمة (المستعجل) */
    metaLayout?: 'inline' | 'grid';
    /** يحجز ارتفاع صف الموعد فارغاً لمحاذاة الشبكة عندما لا يوجد hearing */
    reserveHearingSlot?: boolean;
};

function roleColor(tone: 'plaintiff' | 'defendant' | 'primary'): string {
    if (tone === 'plaintiff' || tone === 'primary') return 'text-emerald-300/90';
    return 'text-rose-300/90';
}

function ArchivePartyRow({
    party,
    tone,
}: {
    party: ArchivePartySnippet;
    tone: 'plaintiff' | 'defendant' | 'primary';
}) {
    return (
        <div className="min-w-0">
            <div className="mb-0 flex items-center gap-1">
                <span className={`text-[10px] font-bold ${roleColor(tone)}`}>{party.role}</span>
                {party.isClient ? (
                    <span className="rounded border border-[#E6C673]/40 bg-[#E6C673]/12 px-1 py-px text-[8px] font-extrabold text-[#E6C673]">
                        موكل
                    </span>
                ) : null}
            </div>
            <p className="truncate text-[12px] font-bold leading-5 text-white/95">{party.name}</p>
        </div>
    );
}

/** جسم موحّد لبطاقات الأرشيف — نفس التسلسل: موعد · بيانات · أطراف */
export function ArchiveDossierIdentityBlock({
    hearing,
    metaRows = [],
    parties,
    reserveHearingSlot = true,
    metaLayout = 'inline',
}: ArchiveDossierIdentityBlockProps) {
    const visibleMeta = metaRows.filter((row) => row.value.trim().length > 0);

    return (
        <div className="space-y-1.5">
            {hearing ? (
                <ArchiveHearingStrip
                    label={hearing.label}
                    ymd={hearing.ymd}
                    sessionNumber={hearing.sessionNumber}
                />
            ) : reserveHearingSlot ? (
                <div
                    className="invisible pointer-events-none select-none"
                    aria-hidden
                    data-testid="archive-hearing-slot"
                >
                    <ArchiveHearingStrip label="موعد" ymd="0000-00-00" />
                </div>
            ) : null}

            {visibleMeta.length > 0 ? (
                metaLayout === 'grid' ? (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {visibleMeta.map((row) => (
                            <div key={row.label} className="min-w-0">
                                <dt className="text-[10px] font-bold text-white/40 leading-tight">{row.label}</dt>
                                <dd className="mt-0.5 truncate text-[12px] font-semibold text-white/85 leading-snug">
                                    {row.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                ) : (
                    <div className="flex min-w-0 items-center gap-x-3 overflow-hidden">
                        {visibleMeta.map((row) => (
                            <p
                                key={row.label}
                                className="min-w-0 flex-1 truncate text-[11px] leading-5 text-white/55"
                            >
                                <span className="text-white/35">{row.label}: </span>
                                <span className="font-semibold text-white/75">{row.value}</span>
                            </p>
                        ))}
                    </div>
                )
            ) : null}

            {parties && (parties.left || parties.right) ? (
                <div className="grid grid-cols-2 gap-1.5 border-t border-white/[0.07] pt-1.5">
                    {parties.left ? (
                        <ArchivePartyRow
                            party={parties.left}
                            tone={parties.leftTone ?? 'plaintiff'}
                        />
                    ) : (
                        <span />
                    )}
                    {parties.right ? (
                        <ArchivePartyRow
                            party={parties.right}
                            tone={parties.rightTone ?? 'defendant'}
                        />
                    ) : (
                        <span />
                    )}
                </div>
            ) : null}
        </div>
    );
}
