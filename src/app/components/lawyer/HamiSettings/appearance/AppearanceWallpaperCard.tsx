import React from 'react';
import { Contrast, ImageIcon } from 'lucide-react';
import { settingWiringHint } from '@/app/services/settings/settingsCapabilities';
import { FONT_PRESETS } from '@/app/services/settings';
import { SettingCard, SettingRow, Toggle, SETTING_GLASS_INNER } from '../settings-ui';
import type { AppearanceSectionViewModel } from './useAppearanceSection';

export function AppearanceWallpaperCard({ vm }: { vm: AppearanceSectionViewModel }) {
    return (
        <SettingCard className="mb-4">
            <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ImageIcon size={16} className="text-[#E6C673]" />
                            <span className="text-sm font-bold text-white">صورة خلفية</span>
                        </div>
                        <p className="text-[10px] text-white/40">{settingWiringHint('appearance.wallpaper')}</p>
                    </div>
                    {vm.wallpaperSrc ? (
                        <button
                            type="button"
                            onClick={vm.removeWallpaper}
                            className="text-[10px] font-bold text-rose-400/90 hover:text-rose-300 shrink-0"
                        >
                            إزالة
                        </button>
                    ) : null}
                </div>
                <div className="flex items-center gap-3">
                    <div className={`w-20 h-14 rounded-xl overflow-hidden shrink-0 ${SETTING_GLASS_INNER}`}>
                        {vm.wallpaperSrc ? (
                            <img src={vm.wallpaperSrc} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full" style={{ backgroundColor: vm.previewBaseColor }} />
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => vm.wallpaperRef.current?.click()}
                        className="flex-1 py-2.5 rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/10 backdrop-blur-sm text-[11px] font-bold text-[#E6C673] hover:bg-[#E6C673]/15 transition-colors min-h-[44px]"
                    >
                        {vm.wallpaperSrc ? 'تغيير الخلفية' : 'رفع صورة خلفية'}
                    </button>
                </div>
            </div>
            <input
                ref={vm.wallpaperRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void vm.uploadWallpaper(f);
                    e.target.value = '';
                }}
            />
        </SettingCard>
    );
}

export function AppearanceReadabilityCard({ vm }: { vm: AppearanceSectionViewModel }) {
    return (
        <SettingCard className="mb-4">
            <div className="p-4 border-b border-white/[0.03]">
                <label className="text-sm font-bold text-white mb-1 block">حجم الخط</label>
                <p className="text-[10px] text-white/40 mb-2">{settingWiringHint('appearance.fontSize')}</p>
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
                subLabel={settingWiringHint('appearance.highContrast')}
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
