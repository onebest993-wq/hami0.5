/**
 * أسماء أحداث الإقلاع المشتركة — ورقة بلا اعتماديات.
 *
 * `HOME_MAIN_GRID_PAINTED_EVENT` كان يسكن `homeMainGridPaintGate`، والبوابة
 * تستورد من `bootReveal` بينما `bootReveal` يستورد الثابت منها — دائرة استيراد
 * على مسار الإقلاع نفسه، حيث ترتيب التقييم يقرّر ما إذا كان التطبيق يقلع أصلاً.
 *
 * الثابت هنا لا في `bootReveal` عمداً: الاختبارات تُبدّل `bootReveal` بنسخ
 * وهمية، ولا يصحّ أن يتوقّف اسم حدث على ذلك.
 */

/** يُطلق بعد أول paint لشبكة الرئيسية — بوابة إزالة splash الثابت */
export const HOME_MAIN_GRID_PAINTED_EVENT = 'hami:home-main-grid-painted';

/** يُطلق عند أول طلاء لتبويب المنزل الظاهر — مرادف عملي لـ home-main-grid */
export const FIRST_TAB_OPEN_EVENT = 'hami:first-tab-open';
