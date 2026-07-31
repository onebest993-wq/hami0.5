import React, { useCallback, useEffect, useId, useState } from 'react';
import { Contrast, ImageIcon } from 'lucide-react';
import { FONT_PRESETS } from '@/app/services/settings';
import { SettingCard, SettingRow, Toggle, SETTING_GLASS_INNER } from '../settings-ui';
import { markSettingsFilePickerOpening } from '../settingsFilePickerGrace';
import type { AppearanceSectionViewModel } from './useAppearanceSection';

/** معرّف ثابت بلا ":" — بعض المتصفحات تكسر htmlFor/label مع useId الافتراضي */
function useWallpaperInputDomId(): string {
    const reactId = useId().replace(/:/g, '');
    return `hami-wallpaper-file-${reactId}`;
}

export function AppearanceWallpaperCard({ vm }: { vm: AppearanceSectionViewModel }) {
    const inputId = useWallpaperInputDomId();
    const [status, setStatus] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!status) return;
        const t = window.setTimeout(() => setStatus(null), 5_000);
        return () => window.clearTimeout(t);
    }, [status]);

    const onFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) {
                setStatus('لم يُختر ملف');
                return;
            }
            setBusy(true);
            setStatus('جاري تطبيق الخلفية…');
            try {
                const ok = await vm.uploadWallpaper(file);
                setStatus(ok ? 'تم تطبيق الخلفية على اللوحة' : 'تعذر رفع الصورة — جرّب JPG أو PNG أصغر');
            } catch {
                setStatus('تعذر رفع الصورة — جرّب JPG أو PNG أصغر');
            } finally {
                setBusy(false);
            }
        },
        [vm],
    );

    const onRemove = useCallback(() => {
        setBusy(true);
        try {
            const ok = vm.removeWallpaper();
            setStatus(ok ? 'تمت إزالة الخلفية' : 'تعذر إزالة الخلفية');
        } finally {
            setBusy(false);
        }
    }, [vm]);

    const actionLabel = busy
        ? 'جاري الرفع…'
        : vm.wallpaperSrc
          ? 'تغيير الخلفية'
          : 'رفع صورة خلفية';

    return (
        <SettingCard className="mb-4 overflow-visible">
            <div className="relative z-[1] p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ImageIcon size={16} className="text-[#E6C673]" aria-hidden />
                            <span className="text-sm font-bold text-white">صورة خلفية</span>
                        </div>
                        <p className="text-[10px] text-white/40 leading-relaxed">
                            من الاستوديو أو الجهاز — JPG / PNG / WebP
                        </p>
                    </div>
                    {vm.wallpaperSrc ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onRemove}
                            className="relative z-[2] text-[10px] font-bold text-rose-400/90 hover:text-rose-300 shrink-0 min-h-[44px] px-2 touch-manipulation disabled:opacity-50"
                            data-testid="settings-wallpaper-remove"
                        >
                            إزالة
                        </button>
                    ) : null}
                </div>
                <div className="flex items-center gap-3">
                    <div
                        className={`relative z-[2] w-20 h-14 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/10 ${SETTING_GLASS_INNER}`}
                    >
                        {vm.wallpaperSrc ? (
                            <img src={vm.wallpaperSrc} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div
                                className="w-full h-full"
                                style={{ backgroundColor: vm.previewBaseColor }}
                            />
                        )}
                    </div>
                    {/* label يغلّف input بلا htmlFor — يمنع فتح/إغلاق فوري لمنتقي الملفات */}
                    <label
                        data-testid="settings-wallpaper-upload"
                        onPointerDown={() => markSettingsFilePickerOpening()}
                        className={`relative z-[2] flex flex-1 min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/10 text-[11px] font-bold text-[#E6C673] touch-manipulation ${
                            busy ? 'pointer-events-none opacity-60' : 'hover:bg-[#E6C673]/15'
                        }`}
                    >
                        {actionLabel}
                        <input
                            id={inputId}
                            ref={vm.wallpaperRef}
                            type="file"
                            accept="image/*,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif"
                            disabled={busy}
                            data-testid="settings-wallpaper-input"
                            aria-label={actionLabel}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            style={{ fontSize: 16 }}
                            onClick={() => markSettingsFilePickerOpening()}
                            onChange={(e) => void onFileChange(e)}
                        />
                    </label>
                </div>
                {status ? (
                    <p
                        className="mt-2 text-[10px] font-medium text-[#E6C673]/90"
                        data-testid="settings-wallpaper-status"
                        role="status"
                    >
                        {status}
                    </p>
                ) : null}
            </div>
        </SettingCard>
    );
}

export function AppearanceReadabilityCard({ vm }: { vm: AppearanceSectionViewModel }) {
    return (
        <SettingCard className="mb-4">
            <div className="p-4 border-b border-white/[0.03]">
                <label className="text-sm font-bold text-white mb-1 block">حجم الخط</label>
                <div className="flex gap-2 flex-wrap">
                    {FONT_PRESETS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            data-testid={`settings-font-${f.id}`}
                            onClick={() => vm.patchAppearance({ fontPreset: f.id, fontSize: f.px })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                vm.appearance.fontSize === f.px
                                    ? 'bg-[#E6C673]/20 text-[#E6C673] ring-1 ring-inset ring-[#E6C673]/30'
                                    : `${SETTING_GLASS_INNER} text-white/50 hover:bg-white/[0.05]`
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>
            <SettingRow
                icon={Contrast}
                label="تباين أعلى"
                subLabel="وضوح النص والحدود — بلا إطارات سميكة"
                isLast
                action={
                    <Toggle
                        label="تباين أعلى"
                        testId="settings-toggle-appearance-highContrast"
                        checked={vm.appearance.highContrast}
                        onChange={(v) => vm.patchAppearance({ highContrast: v })}
                    />
                }
            />
        </SettingCard>
    );
}
