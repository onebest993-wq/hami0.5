import React, { useState } from 'react';
import { X, Link } from 'lucide-react';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { storageCache } from '@/app/utils/storageCache';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { purgeExpiredExecutionsFromTrash, isExecutionInTrash } from '@/app/utils/executionTrash';
import type { ExecutionFile } from '@/app/types/execution';

interface DossierLinkingModalProps {
    onClose: () => void;
    currentFileId?: string | null;
    onLinkDossier: (dossier: {
        linkedId: string;
        type: 'own' | 'colleague';
        directorate?: string;
        fileNumber?: string;
        fileYear?: string;
        linkToken?: string;
    }) => void;
}

export function DossierLinkingModal({ onClose, currentFileId, onLinkDossier }: DossierLinkingModalProps) {
    const pendingLink = useExecutionDashboardStore((s) => s.pendingUnificationLink);
    const setPendingLink = useExecutionDashboardStore((s) => s.setPendingUnificationLink);
    const currentFile = useExecutionDashboardStore((s) => s.currentFile);

    const cached = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
    const allFiles: ExecutionFile[] = Array.isArray(cached) ? (cached as ExecutionFile[]) : [];

    const [linkType, setLinkType] = useState<'own' | 'colleague'>('own');
    const [selectedOwnId, setSelectedOwnId] = useState('');
    const [colleagueToken, setColleagueToken] = useState('');

    const availableDossiers = (() => {
        const seen = new Set<string>();
        const cleanFiles = purgeExpiredExecutionsFromTrash(allFiles);
        const currentParentId = currentFileId ?? currentFile?.id;
        return cleanFiles.filter((d) => {
            const isNotCurrent = d.id !== currentParentId;
            const isActive = d.dossier_lifecycle_status === 'active' || !d.dossier_lifecycle_status;
            const hasValidNumber = d.fileNumber && String(d.fileNumber).trim().length > 0;
            const isUnique = d.id ? !seen.has(d.id) : true;
            const notInTrash = !isExecutionInTrash(d);
            const notCurrentParent = d.id !== currentParentId;
            const notAlreadyChild = !(d as any).parentId;
            if (d.id) seen.add(d.id);
            return isNotCurrent && isActive && hasValidNumber && isUnique && notInTrash && notCurrentParent && notAlreadyChild;
        });
    })();

    if (!pendingLink) return null;

    const handleSave = () => {
        if (linkType === 'own') {
            if (!selectedOwnId) return;
            const selected = availableDossiers.find((d) => d.id === selectedOwnId);
            onLinkDossier({
                linkedId: selectedOwnId,
                type: 'own',
                directorate: (selected?.directorate as string) || pendingLink.targetDirectorate,
                fileNumber: selected?.fileNumber || pendingLink.targetFileNumber,
                fileYear: selected?.fileYear || pendingLink.targetYear,
            });
        } else {
            if (!colleagueToken.trim()) return;
            onLinkDossier({
                linkedId: colleagueToken.trim(),
                type: 'colleague',
                directorate: pendingLink.targetDirectorate,
                fileNumber: pendingLink.targetFileNumber,
                fileYear: pendingLink.targetYear,
                linkToken: colleagueToken.trim(),
            });
        }
        setPendingLink(null);
        onClose();
    };

    const handleClose = () => {
        setPendingLink(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">
                        ربط الإضبارة الموحّدة
                    </h3>
                    <button type="button" onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="mb-4 rounded-lg bg-amber-950/30 border border-amber-500/20 px-3 py-2 text-xs text-amber-300/80">
                    الإضبارة المستهدفة: {pendingLink.targetFileNumber || '---'} / {pendingLink.targetYear || '---'} — {pendingLink.targetDirectorate || '---'}
                </div>

                <div className="space-y-3">
                    <div className={`rounded-lg border transition-colors ${linkType === 'own' ? 'border-amber-500/40 bg-amber-950/20' : 'border-white/10 bg-white/5'}`}>
                        <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors">
                            <input
                                type="radio"
                                name="linkType"
                                checked={linkType === 'own'}
                                onChange={() => setLinkType('own')}
                                className="accent-amber-500"
                            />
                            <div>
                                <span className="text-sm font-medium text-white">إضبارة خاصة بي</span>
                                <p className="text-[10px] text-slate-400">ربط هذه الإضبارة مع إضبارة أخرى من إضباراتي</p>
                            </div>
                        </label>
                        {linkType === 'own' && (
                            <div className="px-3 pb-3">
                                <select
                                    value={selectedOwnId}
                                    onChange={(e) => setSelectedOwnId(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                                >
                                    <option value="">-- اختر إضبارة --</option>
                                    {availableDossiers.length > 0 ? (
                                        availableDossiers.map((dossier: ExecutionFile) => (
                                            <option key={dossier.id} value={dossier.id}>
                                                {dossier.fileNumber || '---'} / {dossier.fileYear || '---'} — {dossier.directorate as string}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled value="">لا توجد أضابير أخرى قابلة للربط</option>
                                    )}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className={`rounded-lg border transition-colors ${linkType === 'colleague' ? 'border-amber-500/40 bg-amber-950/20' : 'border-white/10 bg-white/5'}`}>
                        <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors">
                            <input
                                type="radio"
                                name="linkType"
                                checked={linkType === 'colleague'}
                                onChange={() => setLinkType('colleague')}
                                className="accent-amber-500"
                            />
                            <div>
                                <span className="text-sm font-medium text-white">إضبارة زميل</span>
                                <p className="text-[10px] text-slate-400">إدخال رمز الرابط المرسل من الزميل</p>
                            </div>
                        </label>
                        {linkType === 'colleague' && (
                            <div className="px-3 pb-3">
                                <div className="relative">
                                    <Link size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={colleagueToken}
                                        onChange={(e) => setColleagueToken(e.target.value)}
                                        placeholder="أدخل رمز الربط السري للزميل"
                                        className="w-full rounded-lg border border-white/10 bg-slate-800 py-2 pr-9 pl-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500/50"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={linkType === 'own' ? !selectedOwnId : !colleagueToken.trim()}
                    className="mt-5 w-full rounded-lg bg-amber-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-500 disabled:pointer-events-none disabled:opacity-40"
                >
                    حفظ الربط
                </button>
            </div>
        </div>
    );
}
