import React from 'react';
import { Link } from '@/app/components/ui/icons/Link';
import type { ExecutionFile } from '@/app/types/execution';
import type { ElementType } from 'react';

export function DashboardHeaderLinkedDossiers({
    linkedDossiers,
    onOpenLinkedDossier,
    onRemoveLinkedDossier,
    XCircle,
}: {
    linkedDossiers?: ExecutionFile['linkedDossiers'];
    onOpenLinkedDossier?: (dossier: NonNullable<ExecutionFile['linkedDossiers']>[number]) => void;
    onRemoveLinkedDossier?: (linkedId: string) => void;
    XCircle: ElementType;
}) {
    if (!linkedDossiers || linkedDossiers.length === 0) return null;
    return (
        <div className="mt-3" dir="rtl">
            <p className="mb-1.5 text-[10px] font-bold text-amber-400/80 tracking-wide text-center">🔗 الأضابير الموحّدة</p>
            <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                {linkedDossiers.map((d) => (
                    <div
                        key={d.linkedId}
                        className="inline-flex items-stretch overflow-hidden rounded-lg border border-blue-500/25 bg-blue-950/25 text-[10px] font-bold text-blue-200/85"
                    >
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onOpenLinkedDossier?.(d); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 transition hover:bg-blue-950/45"
                        >
                            <Link size={13} className="text-blue-400" />
                            {d.fileNumber || '---'} / {d.fileYear || '---'} — {d.directorate || '---'}
                            {d.type === 'colleague' ? (
                                <span className="text-[8px] text-yellow-400/70">(زميل)</span>
                            ) : null}
                        </button>
                        {onRemoveLinkedDossier ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveLinkedDossier(d.linkedId);
                                }}
                                className="inline-flex items-center justify-center border-l border-blue-500/20 px-2 transition hover:bg-blue-950/45"
                                aria-label="إلغاء الربط"
                                title="إلغاء الربط"
                            >
                                <XCircle size={12} className="text-blue-300/90" />
                            </button>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
