الجزء الأول: بناء العقل المركزي والزمني (The State Machine) CRITICAL ARCHITECTURE V5 (PART 1): THE MASTER CHRONO-ENGINE & SINGLE SOURCE OF TRUTH
Target: Global State Management for `Dashboard_Active_Execution`.
Context: The UI is suffering from severe state fragmentation (displaying conflicting statuses like "7 days left", "Grace Period", and "Expired" simultaneously). The app MUST be driven by a centralized State Machine (Single Source of Truth) based strictly on Date Mathematics. Do NOT alter the UI design language; purely wire the logic.

EXECUTION STEPS (THE BRAIN):

1. THE SINGLE SOURCE OF TRUTH (المتغير الحاكم):
   - Define a global state variable: `execution_status`.
   - It can ONLY have one of four strict values:
     A) `[ ⚪ غير مبلغ ]` (Unnotified) -> Default state on file creation.
     B) `[ 🟡 فترة رضائية ]` (Grace Period) -> Active for 7 days post-notification.
     C) `[ 🔴 جاهز للتنفيذ ]` (Ready for Coercive) -> Day 8 and beyond.
     D) `[ 🟢 مغلقة / مسددة ]` (Closed/Paid) -> Debt is 0.

2. THE CHRONO-MATH ENGINE (محرك حساب الزمن):
   - Input: User logs `[ تاريخ التبلغ الفعلي ]` (e.g., 2026-02-13).
   - Logic: Automatically calculate `days_elapsed` = (Current System Date) - (Notification Date).
   - State Mutation Rules:
     * IF `notification_date` is NULL -> Set `execution_status` = `[ ⚪ غير مبلغ ]`.
     * IF `days_elapsed` <= 7 -> Set `execution_status` = `[ 🟡 فترة رضائية ]`.
     * IF `days_elapsed` > 7 -> Set `execution_status` = `[ 🔴 جاهز للتنفيذ ]`.

3. STRICT UI SYNCHRONIZATION (الربط الإجباري للواجهات):
   - EVERY single component on the dashboard (Debtor Card, Notification Button, Financial Ledger, Coercive Arsenal) MUST listen to `execution_status`.
   - Conflicting UI states are strictly forbidden. If the status is "Grace Period", NO "Expired" buttons or "Ready" badges can exist on the screen simultaneously. الجزء الثاني: السلوك الديناميكي لكل مكون (Dynamic Behavior Routing) CRITICAL ARCHITECTURE V5 (PART 2): DYNAMIC COMPONENT MORPHING BASED ON TIME
Target: `Dashboard_Active_Execution` Components.
Context: Apply the `execution_status` from Part 1 to visually morph the UI elements automatically, eradicating all conflicting data and dead UI elements.

EXECUTION STEPS (DYNAMIC MORPHING):

1. THE DEBTOR CARD & TIMERS (بطاقة المدين والعدادات):
   - IF `[ ⚪ غير مبلغ ]`: 
     * Show ONLY the clean `[ 🔔 تبليغ المدين ]` button. Hide all countdowns and purple alert cards.
   - IF `[ 🟡 فترة رضائية ]`: 
     * Morph the button into a live countdown badge `[ ⏳ فترة رضائية: باقي X أيام ]` (calculated from `7 - days_elapsed`).
     * HIDE the massive purple "انتهت المهلة" card entirely. It does not exist yet.
   - IF `[ 🔴 جاهز للتنفيذ ]`: 
     * Morph the badge in the debtor card to a solid `[ 🚨 انتهت مدة الإخبار ]`.
     * NOW, and ONLY NOW, reveal the purple `[ إعلان انتهاء المهلة ]` card/button to finalize the transition.

2. THE FINANCIAL CENTER (الإدارة المركزية للأموال):
   - IF `[ ⚪ غير مبلغ ]` OR `[ 🟡 فترة رضائية ]`:
     * Display the status tag `[ فترة الإمهال القانوني ]` in yellow.
     * The `[ رسوم التحصيل 3% ]` MUST remain hidden and uncalculated.
   - IF `[ 🔴 جاهز للتنفيذ ]` AND the purple button was clicked (or auto-transitioned):
     * Change the tag instantly to a red `[ جاهز للتنفيذ הגبري ]`.
     * Auto-inject the `[ + 3% رسوم تحصيل ]` line item into the ledger (unless `claim_type` is Alimony).

3. THE COERCIVE ARSENAL (أسلحة التنفيذ הגبري والمحجوزات):
   - IF `[ ⚪ غير مبلغ ]` OR `[ 🟡 فترة رضائية ]`:
     * The `[ التنفيذ הגبري والمحجوزات ]` card/modal is strictly locked. If clicked, show a toast: "مقفلة: يجب إكمال التبليغ وانتهاء مهلة الـ 7 أيام".
   - IF `[ 🔴 جاهز للتنفيذ ]`:
     * UNLOCK the arsenal. Highlight specific actions based on demographic routing (e.g., highlight `[ حجز راتب ]` if `job_status` == 'موظف'). الجزء الثالث: معالجة العطلات وتعدد الخصوم (Advanced Edge Cases) CRITICAL ARCHITECTURE V5 (PART 3): ADVANCED CHRONO-LOGIC (HOLIDAYS & MULTI-DEBTOR ISOLATION)
Target: Backend Chrono-Engine for `Dashboard_Active_Execution`.
Context: To make the application legally bulletproof according to Iraqi Execution Law, the timing engine must account for official holidays extending the grace period, and it must handle multiple debtors with staggered notification dates independently.

EXECUTION STEPS (ADVANCED LOGIC):

1. THE HOLIDAY EXTENSION RULE (قاعدة امتداد العطلات):
   - Logic: When calculating the 7-day `grace_period`, the engine MUST check the 7th day against a calendar API or an internal array of Iraqi public holidays and weekends (Friday/Saturday).
   - Action: IF Day 7 falls on a weekend or public holiday -> Dynamically extend the grace period to the next valid working day.
   - UI Feedback: Update the badge to say `[ ⏳ فترة رضائية ممتدة: يصادف عطلة ]`.

2. MULTI-DEBTOR STATE ISOLATION (عزل حالة المدينين):
   - Bug Prevention: If File 4567 has two debtors (Debtor A notified on the 1st, Debtor B notified on the 4th), the global state cannot simply turn "Red/Ready" on the 8th.
   - Logic: Move `notification_date` and `execution_status` from being a single global variable to being an Array of Objects tied to `debtor_id`.
   - Action: 
     * Debtor A's card shows `[ 🚨 جاهز للتنفيذ ]` and unlocks actions targeted ONLY at Debtor A.
     * Debtor B's card still shows `[ ⏳ باقي 3 أيام ]` and their specific assets/salary remain legally locked.
   - Global Financial Sync: The 3% execution fee is injected globally ONLY when the FIRST debtor's grace period expires, but coercive actions remain individually locked based on each debtor's specific timer.

3. THE "DEATH/PAUSE" TOGGLE (إيقاف التنفيذ):
   - Add a subtle master toggle in the "تفاصيل السند" accordion: `[ ⏸️ إيقاف التنفيذ (تأخير تنفيذي / قرار محكمة) ]`.
   - Action: If toggled ON -> Instantly pause all timers, gray out the entire Coercive Arsenal, and inject a massive banner at the top: `[ ⚠️ الإضبارة موقوفة قانونياً ]`.