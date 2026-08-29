import { ArrowRight } from '@/app/components/ui/icons/ArrowRight';
import { CaseLinkUnlinkButton } from './CaseLinkUnlinkButton';

type CaseLinkBrowseBannerProps = {
    originCaseNo: string;
    peerCaseNo: string;
    peerFileId?: number;
    peerCriminalId?: string;
    onReturnToOrigin: () => void;
    onUnlink: (peer: { peerFileId?: number; peerCriminalId?: string }) => void;
};

export function CaseLinkBrowseBanner({
    originCaseNo,
    peerCaseNo,
    peerFileId,
    peerCriminalId,
    onReturnToOrigin,
    onUnlink,
}: CaseLinkBrowseBannerProps) {
    return (
        <div
            className="shrink-0 px-3 py-2.5 bg-sky-500/10 border-b border-sky-400/20 print:hidden"
            role="status"
        >
            <p className="text-center text-[11px] font-bold text-sky-200/90 mb-2 leading-relaxed">
                نسخة للاطلاع — الدعوى المربوطة ({peerCaseNo || '—'})
            </p>
            <div className="flex flex-wrap items-stretch gap-2 max-w-lg mx-auto">
                <button
                    type="button"
                    onClick={onReturnToOrigin}
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/15 px-3 text-[11px] font-bold text-sky-50 transition-colors hover:bg-sky-500/22 touch-manipulation"
                >
                    <ArrowRight size={14} className="shrink-0" />
                    العودة للإضبارة الأصلية ({originCaseNo || '—'})
                </button>
                <CaseLinkUnlinkButton
                    peerCaseNo={peerCaseNo}
                    originCaseNo={originCaseNo}
                    peerFileId={peerFileId}
                    peerCriminalId={peerCriminalId}
                    onConfirm={onUnlink}
                    compact
                />
            </div>
        </div>
    );
}
