import React from 'react';
import { LayoutGrid, PanelBottom } from 'lucide-react';
import { SettingCard, SettingRow, Toggle } from '../settings-ui';
import type { AppearanceSectionViewModel } from './useAppearanceSection';

export function AppearanceHomeLayoutCard({
    onEnterHomeLayoutEdit,
    vm,
}: {
    onEnterHomeLayoutEdit?: () => void;
    vm: AppearanceSectionViewModel;
}) {
    return (
        <>
            {onEnterHomeLayoutEdit ? (
                <SettingCard className="mb-4 overflow-hidden">
                    <button
                        type="button"
                        onClick={onEnterHomeLayoutEdit}
                        data-testid="settings-enter-home-layout-edit"
                        className="w-full p-4 flex items-center gap-4 text-right hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
                    >
                        <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-[#E6C673]/12 border border-[#E6C673]/25">
                            <LayoutGrid size={22} className="text-[#E6C673]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white">تخصيص الواجهة الرئيسية</p>
                            <p className="text-[10px] text-white/45 mt-1 leading-relaxed">
                                انتقل للوحة — حرّك الحاويات، خصّص الشريط السفلي، غيّر الحجم واللون والنمط
                            </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-[#E6C673] px-2.5 py-1 rounded-full border border-[#E6C673]/30">
                            فتح
                        </span>
                    </button>
                </SettingCard>
            ) : null}

            <SettingCard className="mb-4">
                <SettingRow
                    icon={PanelBottom}
                    label="الشريط السفلي"
                    isLast
                    action={
                        <Toggle
                            label="الشريط السفلي"
                            checked={vm.homeLayout.dockVisible}
                            onChange={vm.toggleDockVisible}
                        />
                    }
                />
            </SettingCard>
        </>
    );
}
