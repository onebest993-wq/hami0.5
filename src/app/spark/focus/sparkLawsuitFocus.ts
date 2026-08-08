/** توسيع السجل الزمني والتمرير إليه عند متابعة تنبيه سبارك */
export const SPARK_LAWSUIT_EXPAND_TIMELINE_EVENT = 'spark-lawsuit-expand-timeline';

export const SPARK_LAWSUIT_TIMELINE_FOCUS_SELECTOR = '[data-spark-focus="lawsuit_timeline"]';

export function requestSparkLawsuitTimelineFocus(): void {
    window.dispatchEvent(new CustomEvent(SPARK_LAWSUIT_EXPAND_TIMELINE_EVENT));
    window.requestAnimationFrame(() => {
        document.querySelector(SPARK_LAWSUIT_TIMELINE_FOCUS_SELECTOR)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    });
}
