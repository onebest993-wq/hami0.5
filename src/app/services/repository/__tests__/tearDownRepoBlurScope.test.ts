/**
 * FINDING-024 (الدَّين المجاور) — تفكيك المستودع كان ينزع التركيز عن أيّ عنصرٍ
 * في الوثيقة، لا عمّا هو داخل أسطحه. فكلّما أُغلق المستودع سُرق التركيز من حقلٍ
 * يكتب فيه المستخدم في شاشةٍ أخرى. الحلقة هي التي جعلت ذلك كارثة، لكنّ الاتّساع
 * عطبٌ قائم بذاته.
 *
 * الشرط المحروس: يُنزع التركيز عمّا هو **داخل** سطح مستودعٍ يُغلَق، ولا يُمسّ سواه.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { tearDownRepoFloatingState } from '@/app/services/repository/tearDownRepoFloatingState';

let repoSurface: HTMLElement;
let outsideInput: HTMLInputElement;
let insideInput: HTMLInputElement;

describe('tearDownRepoFloatingState — نطاق نزع التركيز', () => {
    beforeEach(() => {
        repoSurface = document.createElement('div');
        repoSurface.setAttribute('data-repository-shell', '');
        insideInput = document.createElement('input');
        repoSurface.appendChild(insideInput);

        outsideInput = document.createElement('input');
        outsideInput.setAttribute('data-testid', 'unrelated-search');

        document.body.append(repoSurface, outsideInput);
    });

    afterEach(() => {
        repoSurface.remove();
        outsideInput.remove();
    });

    it('لا يمسّ حقلاً خارج أسطح المستودع', () => {
        outsideInput.focus();
        expect(document.activeElement).toBe(outsideInput);

        tearDownRepoFloatingState();

        expect(document.activeElement).toBe(outsideInput);
    });

    it('ينزع التركيز عمّا هو داخل سطح المستودع', () => {
        insideInput.focus();
        expect(document.activeElement).toBe(insideInput);

        tearDownRepoFloatingState();

        expect(document.activeElement).not.toBe(insideInput);
    });
});
