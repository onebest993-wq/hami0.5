import { describe, expect, it } from 'vitest';
import { requestSparkLawsuitTimelineFocus, SPARK_LAWSUIT_EXPAND_TIMELINE_EVENT } from '@/app/spark/focus/sparkLawsuitFocus';

describe('sparkLawsuitFocus', () => {
    it('يبث حدث توسيع السجل الزمني', () => {
        let fired = false;
        const handler = () => {
            fired = true;
        };
        window.addEventListener(SPARK_LAWSUIT_EXPAND_TIMELINE_EVENT, handler);
        requestSparkLawsuitTimelineFocus();
        window.removeEventListener(SPARK_LAWSUIT_EXPAND_TIMELINE_EVENT, handler);
        expect(fired).toBe(true);
    });
});
