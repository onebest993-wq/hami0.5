import { useState } from 'react';
import { Link2Off } from '@/app/components/ui/icons/Link2Off';
import { createPortal } from 'react-dom';

type CaseLinkUnlinkButtonProps = {
    peerCaseNo: string;
    originCaseNo?: string;
    peerFileId?: number;
    peerCriminalId?: string;
    onConfirm: (peer: { peerFileId?: number; peerCriminalId?: string }) => void;
    className?: string;
    label?: string;
    compact?: boolean;
};

export function CaseLinkUnlinkButton({
    peerCaseNo,
    originCaseNo,
    peerFileId,
    peerCriminalId,
    onConfirm,
    className = '',
    label = 'فك الربط',
    compact = false,
}: CaseLinkUnlinkButtonProps) {
    const [open, setOpen] = useState(false);

    const handleConfirm = () => {
        onConfirm({ peerFileId, peerCriminalId });
        setOpen(false);
    };

    const confirmLayer =
        open && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
                      role="alertdialog"
                      aria-modal="true"
                      aria-labelledby="case-link-unlink-title"
                      onClick={() => setOpen(false)}
                  >
                      <div
                          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0F1C] p-5 shadow-lg text-right"
                          dir="rtl"
                          onClick={(event) => event.stopPropagation()}
                      >
                          <h2
                              id="case-link-unlink-title"
                              className="text-base font-bold text-rose-200 mb-2"
                          >
                              تأكيد فك ربط الدعوى
                          </h2>
                          <p className="text-sm text-white/60 leading-relaxed mb-5">
                              سيتم فك ربط الدعوى{' '}
                              <span className="font-bold text-white/85">{peerCaseNo}</span>
                              {originCaseNo ? (
                                  <>
                                      {' '}
                                      من الإضبارة الأصلية{' '}
                                      <span className="font-bold text-white/85">{originCaseNo}</span>
                                  </>
                              ) : null}
                              . إضبارة المخزن المربوطة لن تُحذف ولا تُعدَّل — يُزال الربط من الإضبارة
                              الطالبة فقط.
                          </p>
                          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
                              <button
                                  type="button"
                                  onClick={handleConfirm}
                                  className="min-h-[44px] flex-1 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-500 touch-manipulation"
                              >
                                  تأكيد فك الربط
                              </button>
                              <button
                                  type="button"
                                  onClick={() => setOpen(false)}
                                  className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-white/80 hover:bg-white/10 touch-manipulation"
                              >
                                  إلغاء
                              </button>
                          </div>
                      </div>
                  </div>,
                  document.body,
              )
            : null;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={
                    className ||
                    `flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 font-bold text-rose-100 transition-colors hover:bg-rose-500/15 touch-manipulation ${
                        compact
                            ? 'min-h-[44px] flex-1 px-3 text-[11px]'
                            : 'min-h-[44px] w-full px-3 py-2.5 text-xs'
                    }`
                }
            >
                <Link2Off size={compact ? 13 : 14} className="shrink-0" />
                {label}
            </button>
            {confirmLayer}
        </>
    );
}
