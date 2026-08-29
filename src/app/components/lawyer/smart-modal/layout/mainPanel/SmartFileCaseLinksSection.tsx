import { ArrowRightLeft } from '@/app/components/ui/icons/ArrowRightLeft';
import { CaseLinkUnlinkButton } from '../../parts/CaseLinkUnlinkButton';

type CaseLinkRef = {
    id: string;
    peerCaseNo: string;
    linkDate: string;
    reason?: string;
};

type InternalCaseLink = {
    peerDossierKind?: string;
    peerCriminalId?: string;
    peerFileId?: number | null;
    peerCaseNo?: string;
} | null;

export type SmartFileCaseLinksSectionProps = {
    isCaseLinkViewOnly: boolean;
    internalCaseLink: InternalCaseLink;
    externalCaseLinks: CaseLinkRef[];
    primaryCaseNo: string;
    onOpenLinkedFile?: (linkedFileId: number, linkedCriminalId?: string) => void;
    onUnlinkCaseLink?: (peer: { peerFileId?: number; peerCriminalId?: string }) => void;
};

export function SmartFileCaseLinksSection({
    isCaseLinkViewOnly,
    internalCaseLink,
    externalCaseLinks,
    primaryCaseNo,
    onOpenLinkedFile,
    onUnlinkCaseLink,
}: SmartFileCaseLinksSectionProps) {
    if (!isCaseLinkViewOnly && internalCaseLink && onOpenLinkedFile) {
        return (
            <div className="mt-2 space-y-2">
                <button
                    type="button"
                    onClick={() => {
                        if (
                            internalCaseLink.peerDossierKind === 'criminal' &&
                            internalCaseLink.peerCriminalId
                        ) {
                            onOpenLinkedFile(0, internalCaseLink.peerCriminalId);
                            return;
                        }
                        if (internalCaseLink.peerFileId != null) {
                            onOpenLinkedFile(internalCaseLink.peerFileId);
                        }
                    }}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-sky-400/25 bg-sky-400/8 px-3 py-2.5 text-right hover:bg-sky-400/12 transition-colors"
                >
                    <ArrowRightLeft size={14} className="text-sky-300 shrink-0" />
                    <span className="text-xs font-bold text-sky-200">
                        الانتقال إلى{' '}
                        {internalCaseLink.peerDossierKind === 'criminal'
                            ? 'الإضبارة الجزائية'
                            : 'الدعوى'}{' '}
                        المربوطة ({internalCaseLink.peerCaseNo || '—'}) — للاطلاع
                    </span>
                </button>
                {onUnlinkCaseLink ? (
                    <CaseLinkUnlinkButton
                        peerCaseNo={internalCaseLink.peerCaseNo}
                        originCaseNo={primaryCaseNo}
                        peerFileId={internalCaseLink.peerFileId}
                        peerCriminalId={internalCaseLink.peerCriminalId}
                        onConfirm={onUnlinkCaseLink}
                    />
                ) : null}
                {externalCaseLinks.map((link) => (
                    <div
                        key={link.id}
                        className="rounded-xl border border-dashed border-white/[0.14] bg-white/[0.02] px-3 py-2.5 text-right"
                    >
                        <p className="text-[10px] text-white/45 mb-0.5">دعوى مربوطة (مرجع)</p>
                        <p className="text-xs font-bold text-white/75">{link.peerCaseNo}</p>
                        <p className="text-[10px] text-white/40 mt-1">تاريخ الربط: {link.linkDate}</p>
                        {link.reason ? (
                            <p className="text-[10px] text-white/50 mt-0.5">{link.reason}</p>
                        ) : null}
                    </div>
                ))}
            </div>
        );
    }

    if (externalCaseLinks.length > 0) {
        return (
            <div className="mt-2 space-y-2">
                {externalCaseLinks.map((link) => (
                    <div
                        key={link.id}
                        className="rounded-xl border border-dashed border-white/[0.14] bg-white/[0.02] px-3 py-2.5 text-right"
                    >
                        <p className="text-[10px] text-white/45 mb-0.5">دعوى مربوطة (مرجع)</p>
                        <p className="text-xs font-bold text-white/75">{link.peerCaseNo}</p>
                        <p className="text-[10px] text-white/40 mt-1">تاريخ الربط: {link.linkDate}</p>
                        {link.reason ? (
                            <p className="text-[10px] text-white/50 mt-0.5">{link.reason}</p>
                        ) : null}
                    </div>
                ))}
            </div>
        );
    }

    return null;
}
