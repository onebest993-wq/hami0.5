import React from 'react';
import type { ProfileBlockCanvasStyle, ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_CANVAS_INTERACTIONS,
    resolveBlockCanvasStyle,
} from '@/app/services/profile/profilePageCustomization';

type TextBlockInteractionPanelProps = {
    block: ProfileCustomBlock;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
};

export function TextBlockInteractionPanel({ block, onChange }: TextBlockInteractionPanelProps) {
    const canvas = resolveBlockCanvasStyle(block);

    const patchCanvas = (patch: Partial<ProfileBlockCanvasStyle>) => {
        onChange({ canvasStyle: { ...canvas, ...patch } });
    };

    return (
        <div className="profile-settings-luxury-card p-3 space-y-3" data-testid="text-block-interaction-panel">
            <div>
                <p className="profile-studio-field-label">تفاعل الكشف</p>
                <p className="profile-studio-field-hint">
                    اختر أسلوب الكشف — جرّبه في المعاينة أعلاه. يُفعّل لوحة الكتابة تلقائياً عند
                    اختيار تفاعل غير «بدون».
                </p>
                <div className="profile-studio-text-interaction-grid">
                    {PROFILE_CANVAS_INTERACTIONS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            data-selected={canvas.interaction === item.id ? 'true' : 'false'}
                            data-interaction={item.id}
                            data-testid={`text-canvas-interaction-${item.id}`}
                            className="profile-studio-text-interaction-card min-h-[44px]"
                            onClick={() =>
                                patchCanvas({
                                    enabled: item.id !== 'none',
                                    interaction: item.id,
                                    ...(item.id === 'doorOpen'
                                        ? { frameShape: 'door' as const }
                                        : item.id === 'luminousFold'
                                          ? { frameShape: 'arch' as const }
                                          : {}),
                                })
                            }
                        >
                            <span className="profile-studio-text-interaction-card__stage" aria-hidden>
                                <span className="profile-studio-text-interaction-card__demo" />
                            </span>
                            <span className="profile-studio-text-interaction-card__copy">
                                <span className="profile-studio-text-interaction-card__label">
                                    {item.label}
                                </span>
                                <span className="profile-studio-text-interaction-card__hint">
                                    {item.hint}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {!block.body?.trim() ? (
                <p className="text-[10px] text-white/38 leading-relaxed">
                    اكتب نصاً في الحقل أعلاه لتجربة التفاعل في المعاينة المباشرة.
                </p>
            ) : null}
        </div>
    );
}
