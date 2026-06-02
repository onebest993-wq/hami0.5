import React from 'react';
import { Bell, Briefcase, LayoutGrid, List, Sparkles } from 'lucide-react';
import { IRAQ_COURTS_SAMPLE, type AppSettingsState } from '@/app/services/settings';
import { SectionHeader, SettingCard, SettingRow, Toggle, Segmented, SelectRow } from './settings-ui';

export type WorkflowSectionProps = {
    settings: AppSettingsState;
    patchWorkflow: (partial: Partial<AppSettingsState['workflow']>) => void;
};

export function WorkflowSection({ settings, patchWorkflow }: WorkflowSectionProps) {
    return (
        <>
            <SectionHeader title="سير العمل القانوني" subtitle="تفضيلات المكتب والذكاء" icon={Briefcase} />
            <SettingCard>
                <SettingRow
                    icon={settings.workflow.viewMode === 'list' ? List : LayoutGrid}
                    label="عرض الإضابير"
                    subLabel="العاجل، المخزن الذكي، أرشيف المعاملات"
                    action={
                        <Segmented
                            value={settings.workflow.viewMode}
                            options={[
                                { value: 'list', label: 'قائمة' },
                                { value: 'grid', label: 'شبكة' },
                            ]}
                            onChange={(v) => patchWorkflow({ viewMode: v as 'list' | 'grid' })}
                        />
                    }
                />
                <SelectRow
                    label="المحكمة الافتراضية"
                    value={settings.workflow.defaultCourt}
                    options={IRAQ_COURTS_SAMPLE.map((c) => ({ value: c, label: c || '— غير محدد —' }))}
                    onChange={(v) => patchWorkflow({ defaultCourt: v })}
                    hint="يُملأ تلقائياً عند فتح «دعوى جديدة»"
                />
                <SettingRow
                    icon={Briefcase}
                    label="علامة مائية على التصدير"
                    subLabel="تظهر عند طباعة المستند من المتصفح"
                    action={<Toggle checked={settings.workflow.watermark} onChange={(v) => patchWorkflow({ watermark: v })} />}
                />
                <SettingRow
                    icon={Sparkles}
                    label="حفظ نص OCR تلقائياً"
                    subLabel="يحفظ النص المستخرج من المسح داخل المخزن الذكي"
                    action={<Toggle checked={settings.workflow.autoSummary} onChange={(v) => patchWorkflow({ autoSummary: v })} />}
                />
                <SettingRow
                    icon={Bell}
                    label="تنبيهات ذكية"
                    subLabel="بطاقة التنبيهات + الإشعارات الحرجة"
                    action={<Toggle checked={settings.workflow.smartAlerts} onChange={(v) => patchWorkflow({ smartAlerts: v })} />}
                />
                <SettingRow
                    icon={LayoutGrid}
                    label="وضع مضغوط"
                    subLabel="تقليل المسافات في الشاشات الرئيسية"
                    isLast
                    action={<Toggle checked={settings.workflow.compactMode} onChange={(v) => patchWorkflow({ compactMode: v })} />}
                />
            </SettingCard>
        </>
    );
}
