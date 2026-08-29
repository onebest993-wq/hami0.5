import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
    clearPublishedLawyerHeaderOffset,
    publishLawyerHeaderOffset,
} from '@/app/components/lawyer/LawyerDashboardParts/publishLawyerHeaderOffset';

describe('publishLawyerHeaderOffset', () => {
    beforeEach(() => {
        document.documentElement.style.removeProperty('--hami-lawyer-header-offset');
    });

    afterEach(() => {
        clearPublishedLawyerHeaderOffset();
    });

    it('ينشر ارتفاع الهيدر المقاس إلى --hami-lawyer-header-offset', () => {
        publishLawyerHeaderOffset(84.2);
        expect(document.documentElement.style.getPropertyValue('--hami-lawyer-header-offset')).toBe('85px');
    });

    it('يتجاهل اهتزاز القياس دون 2px', () => {
        publishLawyerHeaderOffset(85);
        publishLawyerHeaderOffset(85.4);
        expect(document.documentElement.style.getPropertyValue('--hami-lawyer-header-offset')).toBe('85px');
    });

    it('يتجاهل القيم غير الصالحة', () => {
        publishLawyerHeaderOffset(0);
        expect(document.documentElement.style.getPropertyValue('--hami-lawyer-header-offset')).toBe('');
    });

    it('يمسح الإزاحة المنشورة', () => {
        publishLawyerHeaderOffset(90);
        clearPublishedLawyerHeaderOffset();
        expect(document.documentElement.style.getPropertyValue('--hami-lawyer-header-offset')).toBe('');
    });
});
