import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src/app/components/lawyer/LawyerDashboardParts/components');

function read(name: string): string {
    return fs.readFileSync(path.join(dir, name), 'utf8');
}

describe('header toolbar marks', () => {
    it('لا يستخدم أيقونات Lucide التقليدية على شريط الأدوات', () => {
        expect(read('HeaderSearchTrigger.tsx')).toContain('HeaderSearchMark');
        expect(read('HeaderSearchTrigger.tsx')).not.toContain('HomeSearchIcon');
        expect(read('HeaderNotificationsTrigger.tsx')).toContain('HeaderNoticeMark');
        expect(read('HeaderNotificationsTrigger.tsx')).not.toContain('HomeBellIcon');
        expect(read('HeaderSettingsTrigger.tsx')).toContain('HeaderTuneMark');
        expect(read('HeaderSettingsTrigger.tsx')).not.toContain('HomeSettingsIcon');
    });

    it('علامات هندسية خاصة — لا عدسة/جرس/ترس', () => {
        const marks = read('headerToolbarIcons.tsx');
        expect(marks).toContain('HeaderSearchMark');
        expect(marks).toContain('HeaderNoticeMark');
        expect(marks).toContain('HeaderTuneMark');
        expect(marks).not.toContain('circle cx="11" cy="11" r="8"');
        expect(marks).not.toContain('M10.268 21a2 2 0 0 0 3.464 0');
        expect(marks).not.toContain('M9.671 4.136');
        expect(read('HeaderToolbarReveal.tsx')).toContain('hami-header-tools-reveal__burst');
        expect(read('HeaderToolbarReveal.tsx')).toContain('hami-header-tools-reveal__caret');
        expect(marks).not.toContain('HeaderCardMark');
        expect(fs.existsSync(path.join(dir, 'HeaderAlertsTrigger.tsx'))).toBe(false);
    });
});
