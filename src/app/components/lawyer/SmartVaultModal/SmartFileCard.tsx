import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Loader2, MoreVertical, Edit3, Trash2, Cpu, ImageIcon } from 'lucide-react';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import type { ViewMode, DropdownAction } from '@/app/components/lawyer/hooks/useSmartVault';
import { formatFileSize, formatDate } from '@/app/components/lawyer/hooks/useSmartVault';
import { isVaultDocImage, isVaultDocPdf } from '@/app/services/vaultUploadService';
import { useVaultModalRoot } from '@/app/components/lawyer/SmartVaultModal/VaultModalRootContext';
import { VAULT_CARD } from './vaultDustyRoseTheme';

interface SmartFileCardProps {
    doc: SmartVaultDoc;
    viewMode: ViewMode;
    openDropdownId: string | null;
    setOpenDropdownId: React.Dispatch<React.SetStateAction<string | null>>;
    onView: (doc: SmartVaultDoc) => void;
    onAction: (doc: SmartVaultDoc, action: DropdownAction) => void;
    canManage: boolean;
}

const tagColor = (tag: string) => {
    if (/مسح/.test(tag)) return 'bg-[#B87333]/15 text-[#C4926A] border border-[#B87333]/28';
    return 'bg-[#E6DED0]/10 text-[#C9BCA8] border border-[#D9CFC0]/22';
};

function DocTypeLabel({ doc }: { doc: SmartVaultDoc }) {
    const isImage = isVaultDocImage(doc);
    return (
        <span
            className={`inline-flex items-center gap-0.5 shrink-0 text-[9px] font-bold ${
                isImage ? 'text-[#C4926A]' : 'text-[#B87333]'
            }`}
        >
            {isImage ? <ImageIcon size={10} /> : <FileText size={10} />}
            {isImage ? 'صورة' : 'PDF'}
        </span>
    );
}

function DocThumb({ doc, className }: { doc: SmartVaultDoc; className: string }) {
    const isImage = isVaultDocImage(doc);
    const isPdf = isVaultDocPdf(doc);

    if (isImage && doc.signedUrl) {
        return (
            <div className={`overflow-hidden ${className}`}>
                <img src={doc.signedUrl} alt={doc.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
        );
    }

    if (isPdf) {
        return (
            <div
                className={`flex items-center justify-center bg-gradient-to-br from-[#132238]/80 to-[#0E1B2E] border border-[#B87333]/18 ${className}`}
            >
                <FileText size={24} className="text-[#C4926A]/75" />
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-center bg-[#132238]/50 ${className}`}>
            <FileText size={22} className="text-[#C9BCA8]/35" />
        </div>
    );
}

function CardActionMenu({
    doc,
    canManage,
    anchorRect,
    onAction,
    onClose,
}: {
    doc: SmartVaultDoc;
    canManage: boolean;
    anchorRect: DOMRect;
    onAction: (doc: SmartVaultDoc, action: DropdownAction) => void;
    onClose: () => void;
}) {
    const menuRef = useRef<HTMLDivElement>(null);
    const modalRoot = useVaultModalRoot();

    useEffect(() => {
        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (menuRef.current?.contains(target)) return;
            onClose();
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
        };
    }, [onClose]);

    const rootRect = modalRoot?.getBoundingClientRect();
    const top = rootRect
        ? Math.min(anchorRect.bottom - rootRect.top + 6, rootRect.height - 120)
        : Math.min(anchorRect.bottom + 6, window.innerHeight - 120);
    const left = rootRect
        ? Math.min(Math.max(anchorRect.left - rootRect.left, 8), rootRect.width - 168)
        : Math.min(anchorRect.left, window.innerWidth - 168);

    const items: { action: DropdownAction; icon: typeof Edit3; label: string; danger?: boolean }[] = [
        { action: 'edit', icon: Edit3, label: 'تعديل' },
    ];
    if (canManage) {
        items.push({ action: 'delete', icon: Trash2, label: 'حذف', danger: true });
    }

    const menu = (
        <div
            ref={menuRef}
            className="absolute z-[45] w-40 bg-[#132238] border border-[#B87333]/25 rounded-xl shadow-2xl overflow-hidden"
            style={{ top, left }}
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
        >
            {items.map(({ action, icon: Icon, label, danger }) => (
                <button
                    type="button"
                    key={action}
                    onClick={() => onAction(doc, action)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold transition-colors ${
                        danger ? 'text-rose-300 hover:bg-rose-500/10' : 'text-[#E8E4DC]/90 hover:bg-[#0E1B2E]/50'
                    }`}
                >
                    <Icon size={14} className={danger ? 'text-rose-300/80' : 'text-[#C9BCA8]/55'} />
                    {label}
                </button>
            ))}
        </div>
    );

    if (modalRoot) return createPortal(menu, modalRoot);
    return menu;
}

export const SmartFileCard: React.FC<SmartFileCardProps> = ({
    doc, viewMode, openDropdownId, setOpenDropdownId, onView, onAction, canManage,
}) => {
    const isGrid = viewMode === 'grid';
    const menuBtnRef = useRef<HTMLButtonElement>(null);
    const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
    const menuOpen = openDropdownId === doc.id;

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (menuOpen) {
            setOpenDropdownId(null);
            setMenuRect(null);
            return;
        }
        const rect = menuBtnRef.current?.getBoundingClientRect();
        if (rect) setMenuRect(rect);
        setOpenDropdownId(doc.id);
    };

    const categoryLabel = doc.customCategory?.trim() || '';

    return (
        <div
            className={`group cursor-pointer transition-all duration-200 active:scale-[0.98] relative overflow-visible hover:border-[#B87333]/32 ${
                isGrid
                    ? `${VAULT_CARD} p-3 flex flex-col gap-2`
                    : `${VAULT_CARD} p-3 flex items-center gap-3 min-h-[72px]`
            }`}
            onClick={() => onView(doc)}
        >
            {isGrid && (
                <div className="absolute -top-6 -right-6 w-14 h-14 rounded-full blur-[32px] opacity-15 bg-[#B87333] pointer-events-none" />
            )}

            <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-[#B87333]/55 via-[#E6DED0]/20 to-transparent rounded-r-2xl" />

            <div className="absolute top-2 left-2 z-20">
                <button
                    ref={menuBtnRef}
                    type="button"
                    onClick={toggleMenu}
                    className={`p-2 rounded-lg bg-[#0E1B2E]/65 hover:bg-[#132238]/70 border border-[#B87333]/15 transition-colors ${
                        menuOpen ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                    }`}
                >
                    <MoreVertical size={16} className="text-[#E8E4DC]/75" />
                </button>
            </div>

            {menuOpen && menuRect ? (
                <CardActionMenu
                    doc={doc}
                    canManage={canManage}
                    anchorRect={menuRect}
                    onAction={onAction}
                    onClose={() => {
                        setOpenDropdownId(null);
                        setMenuRect(null);
                    }}
                />
            ) : null}

            {!isGrid ? (
                <div className="flex items-center gap-3 flex-1 min-w-0 pl-8">
                    <DocThumb
                        doc={doc}
                        className="w-[72px] h-[52px] rounded-lg shrink-0 border border-[#C9BCA8]/12"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <DocTypeLabel doc={doc} />
                            <h3 className="text-[#E8E4DC] font-semibold text-sm truncate">{doc.title}</h3>
                        </div>
                        {doc.lawyerNote ? (
                            <p className="text-[#C9BCA8]/55 text-[10px] truncate mt-0.5">{doc.lawyerNote}</p>
                        ) : null}
                        <p className="text-[#C9BCA8]/40 text-[10px] mt-0.5">
                            {formatDate(doc.createdAt)} — {formatFileSize(doc.fileSize || 0)}
                        </p>
                    </div>
                    {categoryLabel ? (
                        <span className={`hidden sm:inline px-2 py-0.5 rounded-md text-[9px] font-medium shrink-0 ${tagColor(categoryLabel)}`}>
                            {categoryLabel}
                        </span>
                    ) : null}
                </div>
            ) : (
                <>
                    <div className="w-full aspect-square rounded-xl overflow-hidden relative">
                        <DocThumb doc={doc} className="w-full h-full rounded-xl" />
                        {doc.isProcessing ? (
                            <div className="absolute inset-0 bg-[#0E1B2E]/50 flex items-center justify-center rounded-xl">
                                <Loader2 size={20} className="text-[#B87333] animate-spin" />
                            </div>
                        ) : null}
                    </div>
                    <div className="flex flex-col gap-1 pl-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <DocTypeLabel doc={doc} />
                            <h3 className="text-[#E8E4DC] font-semibold text-sm leading-tight line-clamp-1 flex-1">{doc.title}</h3>
                        </div>
                        {doc.lawyerNote ? (
                            <p className="text-[#C9BCA8]/55 text-[10px] line-clamp-2">{doc.lawyerNote}</p>
                        ) : null}
                        <p className="text-[#C9BCA8]/45 text-[10px]">
                            {formatDate(doc.createdAt)} — {formatFileSize(doc.fileSize || 0)}
                        </p>
                        {categoryLabel ? (
                            <span className={`self-start px-1.5 py-0.5 rounded-md text-[9px] font-medium ${tagColor(categoryLabel)}`}>
                                {categoryLabel}
                            </span>
                        ) : null}
                    </div>
                    {doc.aiSummary && !doc.lawyerNote ? (
                        <div className="bg-[#132238]/40 border border-[#D9CFC0]/15 rounded-lg p-2">
                            <div className="flex items-center gap-1 mb-0.5">
                                <Cpu size={10} className="text-[#B87333]" />
                                <span className="text-[#B87333] text-[9px] font-medium">نص مستخرج</span>
                            </div>
                            <p className="text-[#E8E4DC]/55 text-[10px] leading-relaxed line-clamp-2">{doc.aiSummary}</p>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
};
