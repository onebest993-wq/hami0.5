1️⃣ الأمر الأول: هندسة تصنيف الدين (النفقة) واختراق حصانة الموظف

هذا الأمر سيضيف تصنيف "النفقة" للإضبارة، ويجبر التطبيق على سؤال المحامي عن (مقدار راتب الموظف) ليعرف هل يكفي لسداد النفقة أم لا، وبناءً عليه يقرر هل يطلب كفيلاً أم لا.

Plaintext



CRITICAL LOGIC INSTRUCTION: ALIMONY ENGINE & EMPLOYEE SALARY OVERRIDE

Target: The Financial Ledger & Settlement Engine `Modal_Master_Financial`.



CONTEXT FROM LEGAL EXPERT:

Execution of "Alimony" (النفقة) has completely different rules than regular financial debt.

1. If the debt is Alimony and the Debtor is an Employee, the deduction overrides standard limits.

2. Crucially, if the employee's salary DOES NOT COVER the alimony, their "employee immunity" from arrest drops, and they MUST provide a Guarantor (كفيل) or face imprisonment for the shortfall.



EXECUTION STEPS:

1. DEBT CLASSIFICATION: Read or add a state variable: `Debt_Category` (Dropdown: [ دين مالي اعتيادي, نفقة شرعية ]).

2. THE ALIMONY / EMPLOYEE LOGIC (THE OVERRIDE):

- IF `Debt_Category` === 'نفقة شرعية' AND `Debtor_Job` === 'موظف':

- Display a mandatory new input inside the Settlement/Financial view: "مقدار الراتب الصافي للموظف (لغرض المقارنة)" (Employee's Net Salary).

- Display inputs for: "النفقة المستمرة" (Continuous Alimony) and "القسط المتراكم" (Accumulated Installment).

- THE MATH ENGINE: Compare `(Continuous + Accumulated Installment)` against the `Net Salary`.

- IF the total required > Net Salary:

* Show a Warning Banner: "⚠️ الراتب لا يغطي كامل النفقة. الموظف ملزم قانوناً بتقديم (كفيل ضامن) للمبلغ المتبقي وإلا تعرض للحبس التنفيذي."

* UNLOCK the Guarantor inputs and Arrest options for this employee.

2️⃣ الأمر الثاني: محرك الإنذار الاستراتيجي (فخ النفقة المتراكمة)

هذا الأمر سيراقب المحامي؛ فإذا حاول طلب مبلغ النفقة المتراكمة كـ (دفعة واحدة) ورفض التسوية، سيطلق التطبيق إنذاراً شديد اللهجة يحذره من ضياع وسيلة الضغط (الحبس).

Plaintext



CRITICAL UI INSTRUCTION: STRATEGIC WARNING ENGINE FOR ACCUMULATED ALIMONY

Target: The Settlement Engine inside `Modal_Master_Financial`.



CONTEXT FROM LEGAL EXPERT:

Requesting the imprisonment of a debtor for the ENTIRE lump sum of "Accumulated Alimony" (النفقة المتراكمة) without a settlement is a fatal rookie mistake. Once the debtor serves the jail time for that lump sum, they are legally deemed "Insolvent/Unable" (عاجز) for that specific amount and cannot be jailed for it again. The app must warn the lawyer to settle it into installments.



EXECUTION STEPS:

1. THE LUMP-SUM TRIGGER:

- IF `Debt_Category` === 'نفقة شرعية'.

- Add a toggle: "طريقة المطالبة بالنفقة المتراكمة" -> [ دفعة صفقة واحدة, تسوية وتقسيط ].

2. THE STRATEGIC WARNING (CRITICAL):

- IF "دفعة صفقة واحدة" (Lump Sum) is selected, instantly display a massive, pulsating RED warning card:

"🛑 تحذير استراتيجي شديد: المطالبة بالنفقة المتراكمة كدفعة واحدة وحبس المدين عليها يعني أنه بعد انتهاء مدة الحبس سيُعتبر (عاجزاً قانوناً) عن هذا المبلغ، ولن تتمكن من حبسه عليه مجدداً! يُنصح بشدة إبرام (تسوية وتقسيط) وطلب (كفيل ضامن) لضمان استمرار ورقة الضغط."

3. GUARANTOR REINFORCEMENT: Ensure the "إضافة كفيل ضامن" (Add Guarantor) section is highly prominent and glowing when dealing with any type of Alimony.

3️⃣ الأمر الثالث: رادار التسديد والإخلال (القرار السريع)

هذا الأمر سيبني الأزرار البسيطة التي طلبتها (تم التسديد / أخل بالدفع)، ويجعل التطبيق يغير واجهته تلقائياً ليفتح خيارات الشرطة والكفيل إذا ضغط المحامي على (أخل بالدفع).

Plaintext



CRITICAL LOGIC & UI INSTRUCTION: PAYMENT VS. BREACH ACTION BAR

Target: The Tracking Section inside `Modal_Master_Financial`.



CONTEXT:

We need a simplified, binary action bar for ongoing tracking of settlements or continuous alimony. Either the debtor pays on time, or they breach the agreement.



EXECUTION STEPS:

1. THE BINARY ACTION BAR:

- Replace complex payment forms with two massive, clear buttons for the active installment/alimony period:

* Button A (Green): `[ ✅ تم تسديد الدفعة الحالية ]` (Current Installment Paid).

* Button B (Crimson): `[ ❌ المدين أخلّ بالدفع ]` (Debtor Breached Payment).



2. THE BREACH CONSEQUENCE ENGINE (MORPHING UI):

- IF the Green button is clicked -> Log payment, update numbers, show a success toast.

- IF the Crimson button is clicked -> Morph the UI immediately below it to show enforcement options based on the debtor:

* Show Header: "⚖️ إجراءات الإخلال بالتسوية / النفقة"

* Condition A (If Guarantor exists): Show `[ 🚨 طلب إحضار المدين والكفيل الضامن جبراً ]`.

* Condition B (If No Guarantor exists & Debt is Alimony): Show `[ 🔒 إيقاع الحبس التنفيذي للامتناع عن تسديد النفقة ]`.

* Condition C (If Employee & Salary doesn't cover): Show `[ 👮 تعميم أمر قبض لعدم كفاية الراتب وعدم وجود كفيل ]`.