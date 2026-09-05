import type { CSSProperties } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import { CURTAIN_FATAL_DIALOG } from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';

type FieldTasksFatalDialogProps = {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export function FieldTasksFatalDialog({ open, onConfirm, onCancel }: FieldTasksFatalDialogProps) {
    const keyboardInsetPx = useMobileKeyboardInset(open, true);
    const keyboardStyle: CSSProperties | undefined =
        keyboardInsetPx > 0
            ? {
                  top: 'auto',
                  bottom: keyboardInsetPx + 12,
                  transform: 'translate(-50%, 0)',
                  maxHeight: `calc(100dvh - ${keyboardInsetPx + 24}px)`,
                  overflowY: 'auto',
              }
            : undefined;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) onCancel();
            }}
        >
            <DialogContent className={CURTAIN_FATAL_DIALOG} style={keyboardStyle}>
                <DialogHeader className="text-right sm:text-right space-y-2">
                    <DialogTitle className="text-[#E6C673] text-base font-semibold leading-relaxed">
                        تحذير — موعد حتمي
                    </DialogTitle>
                    <DialogDescription className="text-[#F4F4F5]/80 text-sm leading-relaxed">
                        هذا موعد حتمي (سقوط حق). هل أنت متأكد من إنجاز الإجراء القانوني بشكل نهائي؟
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold touch-manipulation"
                    >
                        تأكيد الإكمال
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="min-h-[44px] px-4 py-2 rounded-xl border border-white/[0.1] bg-transparent text-[#F4F4F5] text-xs font-semibold touch-manipulation"
                    >
                        إلغاء
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
