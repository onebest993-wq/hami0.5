import React, { useCallback, useRef, useState } from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { ImageBlockFramePanel } from './imageStudio/ImageBlockFramePanel';
import { ImageBlockFocusPanel } from './imageStudio/ImageBlockFocusPanel';
/** CSS لوحة الشكل/الحافة — مع chunk الاستوديو فقط (ليس فتح الملف الأول) */
import '@/app/components/lawyer/RoyalLawyerProfile/profileImageStudioFx.css';
import { isPrimaryDragPointer } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';

type ImageStudioPanel = 'frame' | 'focus';

type ImageBlockStudioEditorProps = {
    block: ProfileCustomBlock;
    uploading: boolean;
    saving?: boolean;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
    onPickImage: () => void;
    onClearImage?: () => void;
};

const PANELS: { id: ImageStudioPanel; label: string; testId: string }[] = [
    { id: 'focus', label: 'الصورة', testId: 'image-studio-tab-focus' },
    { id: 'frame', label: 'الإطار', testId: 'image-studio-tab-frame' },
];

/**
 * محرر صور خفيف: رفع + إطار فقط.
 * حركات Ken Burns / tilt / … أُزيلت من الاستوديو لأنها كانت تثقل المعاينة والجهاز.
 */
export const ImageBlockStudioEditor = React.memo(function ImageBlockStudioEditor({
    block,
    uploading,
    saving = false,
    onChange,
    onPickImage,
    onClearImage,
}: ImageBlockStudioEditorProps) {
    const [panel, setPanel] = useState<ImageStudioPanel>('focus');
    const armedPanelRef = useRef<ImageStudioPanel | null>(null);

    const activatePanel = useCallback((next: ImageStudioPanel) => {
        setPanel((curr) => (curr === next ? curr : next));
    }, []);

    return (
        <div className="space-y-3" data-testid="image-block-studio-editor">
            <div className="profile-studio-panel-tabs" role="tablist" aria-label="أقسام تحرير الصورة">
                {PANELS.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        role="tab"
                        aria-selected={panel === p.id}
                        data-active={panel === p.id ? 'true' : 'false'}
                        data-testid={p.testId}
                        className="profile-studio-panel-tab min-h-[44px] touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                        onPointerDown={(event) => {
                            if (!isPrimaryDragPointer(event)) return;
                            event.stopPropagation();
                            /* لا preventDefault — على Android يمرّر click لاحقاً ويغلق الورقة */
                            if (event.pointerType === 'touch' || event.pointerType === 'pen') {
                                armedPanelRef.current = p.id;
                                activatePanel(p.id);
                            }
                        }}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (armedPanelRef.current === p.id) {
                                armedPanelRef.current = null;
                                return;
                            }
                            activatePanel(p.id);
                        }}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {panel === 'focus' ? (
                <ImageBlockFocusPanel
                    block={block}
                    uploading={uploading || saving}
                    onChange={onChange}
                    onPickImage={onPickImage}
                    onClearImage={onClearImage}
                />
            ) : null}

            {panel === 'frame' ? <ImageBlockFramePanel block={block} onChange={onChange} /> : null}
        </div>
    );
});
