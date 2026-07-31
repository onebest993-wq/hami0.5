import React from 'react';
import { ArchiveHearingStrip } from './ArchiveHearingStrip';

export type ArchivePartySnippet = {
    name: string;
    role: string;
    isClient: boolean;
};

export type ArchiveDossierMetaRow = {
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
            <div className="mb-0.5 flex items-center gap-1.5">
                <span className={`text-[11px] font-bold ${roleColor(tone)}`}>{party.role}</span>
                {party.isClient ? (
                    <span className="rounded-md border border-[#E6C673]/40 bg-[#E6C673]/12 px-1.5 py-px text-[9px] font-extrabold text-[#E6C673]">
                        موكل
                    </span>
                ) : null}
            </div>
            <p className="truncate text-[13px] font-bold text-white/95">{party.name}</p>
        </div>
    );
}

/** جسم موحّد لبطاقات الأرشيف — نفس التسلسل: موعد · بيانات · أطراف */
export function ArchiveDossierIdentityBlock({
    hearing,
    metaRows = [],
    parties,
}: ArchiveDossierIdentityBlockProps) {
    const visibleMeta = metaRows.filter((row) => row.value.trim().length > 0);

    return (
        <div className="space-y-2.5">
            {hearing ? (
                <ArchiveHearingStrip
                    label={hearing.label}
                    ymd={hearing.ymd}
                    sessionNumber={hearing.sessionNumber}
                />
            ) : null}

            {visibleMeta.length > 0 ? (
                <div className="space-y-1">
                    {visibleMeta.map((row) => (
                        <p key={row.label} className="truncate text-[12px] text-white/55">
                            <span className="text-white/35">{row.label} · </span>
                            <span className="font-semibold text-white/75">{row.value}</span>
                        </p>
                    ))}
                </div>
            ) : null}

            {parties && (parties.left || parties.right) ? (
                <div className="grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-2.5">
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
