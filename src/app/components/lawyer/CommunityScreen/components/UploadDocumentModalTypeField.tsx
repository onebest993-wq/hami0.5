import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { FORUM_DROPDOWN_PANEL } from '../forumPlumTheme';
import { DOCUMENT_TYPES, type UploadDocumentModalFormModel } from '../hooks/useUploadDocumentModalForm';

export function UploadDocumentModalTypeField({ form }: { form: UploadDocumentModalFormModel }) {
    const { type, setType, isTypeMenuOpen, setIsTypeMenuOpen, typeMenuRef } = form;

    return (
        <div className="relative z-20" ref={typeMenuRef}>
            <label className="block text-white/70 text-xs font-bold mb-1.5">نوع المستند</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsTypeMenuOpen((prev) => !prev)}
                    className={`w-full h-11 min-h-[44px] hami-forum-input rounded-xl pr-4 pl-10 text-right text-white text-sm border transition-colors touch-manipulation flex items-center ${
                        isTypeMenuOpen
                            ? 'border-[#E6C673]/40 ring-1 ring-[#E6C673]/15'
                            : 'border-white/5 hover:border-white/10'
                    }`}
                    aria-haspopup="listbox"
                    aria-expanded={isTypeMenuOpen}
                >
                    <span className="truncate">{type}</span>
                </button>
                <ChevronDown
                    size={16}
                    className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40 transition-transform ${
                        isTypeMenuOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                />
                {isTypeMenuOpen ? (
                    <div
                        className={`absolute top-[calc(100%+0.5rem)] left-0 right-0 ${FORUM_DROPDOWN_PANEL}`}
                        role="listbox"
                        aria-label="نوع المستند"
                    >
                        <div className="max-h-64 overflow-y-auto py-1.5">
                            {DOCUMENT_TYPES.map((option) => {
                                const active = option === type;
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        onClick={() => {
                                            setType(option);
                                            setIsTypeMenuOpen(false);
                                        }}
                                        className={`w-full min-h-[44px] px-4 py-3 text-right text-sm transition-colors touch-manipulation ${
                                            active
                                                ? 'bg-[#E6C673]/12 text-[#E6C673] font-bold'
                                                : 'text-white/85 hover:bg-white/5'
                                        }`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
