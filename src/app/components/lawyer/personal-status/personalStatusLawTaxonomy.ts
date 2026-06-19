import type { PersonalStatusLawCodeType } from '@/app/constants/personalStatusLawCatalog';
import { articleNumberInRange, extractArticleSortNumber } from '@/app/utils/articleNumberRange';

export type PersonalStatusLawTaxonomyNode = {
    id: string;
    label: string;
    from: number;
    to: number;
    exclude?: readonly number[];
};

export type PersonalStatusLawTaxonomyBranch = {
    id: string;
    label: string;
    from: number;
    to: number;
    nodes: PersonalStatusLawTaxonomyNode[];
};

export type PersonalStatusLawTaxonomySection = {
    id: string;
    label: string;
    from: number;
    to: number;
    branches: PersonalStatusLawTaxonomyBranch[];
};

export type PersonalStatusLawTaxonomy = {
    codeType: PersonalStatusLawCodeType;
    sections: PersonalStatusLawTaxonomySection[];
};

function node(
    id: string,
    label: string,
    from: number,
    to: number,
    exclude?: readonly number[],
): PersonalStatusLawTaxonomyNode {
    return { id, label, from, to, ...(exclude?.length ? { exclude } : {}) };
}

function branch(
    id: string,
    label: string,
    from: number,
    to: number,
    nodes: PersonalStatusLawTaxonomyNode[],
): PersonalStatusLawTaxonomyBranch {
    return { id, label, from, to, nodes };
}

function section(
    id: string,
    label: string,
    from: number,
    to: number,
    branches: PersonalStatusLawTaxonomyBranch[],
): PersonalStatusLawTaxonomySection {
    return { id, label, from, to, branches };
}

/** شجرة تصنيف قانون الأحوال الشخصية رقم 188 — قسم ← فرع ← عقدة */
export const PERSONAL_STATUS_188_TAXONOMY: PersonalStatusLawTaxonomy = {
    codeType: 'personal_status_188',
    sections: [
        section('ps188-s1', 'الأحكام العامة والزواج', 1, 21, [
            branch('ps188-s1-b1', 'سريان القانون والمبادئ العامة', 1, 2, [
                node('ps188-s1-b1-n1', 'المرجعية التشريعية وتطبيق الشريعة', 1, 1),
                node('ps188-s1-b1-n2', 'نطاق السريان وحق اختيار المذهب (الجعفري)', 2, 2),
            ]),
            branch('ps188-s1-b2', 'الزواج وشروطه', 3, 11, [
                node('ps188-s1-b2-n1', 'تعريف الزواج، الخطبة، وتعدد الزوجات', 3, 3),
                node('ps188-s1-b2-n2', 'أركان العقد وشروط الصحة (الإيجاب، القبول، والشهود)', 4, 6),
                node('ps188-s1-b2-n3', 'الأهلية، سن الزواج، وتجريم الإكراه على الزواج', 7, 9),
                node('ps188-s1-b2-n4', 'تسجيل العقد وإثبات الزوجية', 10, 11),
            ]),
            branch('ps188-s1-b3', 'المحرمات والمهر', 12, 21, [
                node('ps188-s1-b3-n1', 'أسباب التحريم (القرابة، المصاهرة، الرضاع)', 12, 16),
                node('ps188-s1-b3-n2', 'زواج الكتابيات واختلاف الدين', 17, 18),
                node('ps188-s1-b3-n3', 'المهر (المسمى، المعجل، المؤجل، ومهر المثل)', 19, 21),
            ]),
        ]),
        section('ps188-s2', 'حقوق الزوجية والنفقة', 23, 33, [
            branch('ps188-s2-b1', 'نفقة الزوجة والنشوز', 23, 33, [
                node('ps188-s2-b1-n1', 'وجوب النفقة ومشتملاتها', 23, 24),
                node('ps188-s2-b1-n2', 'مسقطات النفقة، النشوز، وأثره في التفريق', 25, 26),
                node('ps188-s2-b1-n3', 'نفقة الزوج الغائب والإعسار', 29, 30),
                node('ps188-s2-b1-n4', 'النفقة المؤقتة والمتراكمة وطاعة الزوج', 31, 33),
            ]),
        ]),
        section('ps188-s3', 'انحلال الزواج والعدة', 34, 50, [
            branch('ps188-s3-b1', 'الطلاق والخلع', 34, 46, [
                node('ps188-s3-b1-n1', 'تعريف الطلاق، شروطه، والأشخاص الممنوعون منه', 34, 36),
                node('ps188-s3-b1-n2', 'عدد الطلقات وأنواع الطلاق (رجعي وبائن)', 37, 38),
                node('ps188-s3-b1-n3', 'إجراءات الطلاق والتعويض عن التعسف', 39, 39),
                node('ps188-s3-b1-n4', 'الخلع', 46, 46),
            ]),
            branch('ps188-s3-b2', 'التفريق القضائي', 40, 45, [
                node('ps188-s3-b2-n1', 'التفريق للضرر، الخيانة، وتعدد الزوجات', 40, 40),
                node('ps188-s3-b2-n2', 'التفريق للشقاق والخلاف (التحكيم)', 41, 42),
                node('ps188-s3-b2-n3', 'التفريق للحبس، الهجر، العقم، الأمراض، وعدم الإنفاق', 43, 45),
            ]),
            branch('ps188-s3-b3', 'العدة', 47, 50, [
                node('ps188-s3-b3-n1', 'أسباب العدة وأنواعها', 47, 47),
                node('ps188-s3-b3-n2', 'مدد العدة (الطلاق والوفاة)', 48, 49),
                node('ps188-s3-b3-n3', 'نفقة المعتدة', 50, 50),
            ]),
        ]),
        section('ps188-s4', 'حقوق الأولاد والأقارب', 51, 63, [
            branch('ps188-s4-b1', 'النسب والرضاع والحضانة', 51, 57, [
                node('ps188-s4-b1-n1', 'ثبوت النسب والإقرار به', 51, 54),
                node('ps188-s4-b1-n2', 'الرضاع', 55, 55),
                node('ps188-s4-b1-n3', 'الحضانة، شروطها، مدتها، وحق المشاهدة', 57, 57),
            ]),
            branch('ps188-s4-b2', 'نفقة الأولاد والأقارب', 58, 63, [
                node('ps188-s4-b2-n1', 'نفقة الأولاد على الأب', 58, 60),
                node('ps188-s4-b2-n2', 'نفقة الوالدين والأقارب', 61, 63),
            ]),
        ]),
        section('ps188-s5', 'الوصايا والمواريث', 64, 93, [
            branch('ps188-s5-b1', 'الوصية والإيصاء', 64, 85, [
                node('ps188-s5-b1-n1', 'تعريف الوصية، إثباتها، وشروط الموصي والموصى له/به', 64, 69),
                node('ps188-s5-b1-n2', 'حدود الوصية (الثلث) ومبطلاتها', 70, 73),
                node('ps188-s5-b1-n3', 'الوصية الواجبة (لأولاد الابن/البنت المتوفى)', 74, 74),
                node('ps188-s5-b1-n4', 'الإيصاء (نصب الوصي، شروطه، واجباته، وعزله)', 75, 85),
            ]),
            branch('ps188-s5-b2', 'المواريث والأحكام الختامية', 86, 93, [
                node('ps188-s5-b2-n1', 'أركان الإرث، أسبابه، وشروطه', 86, 86),
                node('ps188-s5-b2-n2', 'الحقوق المتعلقة بالتركة والمستحقون لها', 87, 88),
                node('ps188-s5-b2-n3', 'كيفية التوريث، العصبات، وفرض البنت والزوجين', 89, 91),
                node('ps188-s5-b2-n4', 'الأحكام الختامية وسريان القانون', 92, 93),
            ]),
        ]),
    ],
};

/** شجرة تصنيف المدونة الجعفرية — قسم ← فرع ← عقدة */
export const JAAFAARI_CODE_TAXONOMY: PersonalStatusLawTaxonomy = {
    codeType: 'jaafari_code',
    sections: [
        section('psj-s1', 'المبادئ العامة وعقد الزواج', 1, 18, [
            branch('psj-s1-b1', 'المبادئ العامة ونطاق السريان', 1, 2, [
                node('psj-s1-b1-n1', 'سريان النصوص التشريعية ومبادئ وحكمة الشريعة الإسلامية', 1, 1),
                node('psj-s1-b1-n2', 'نطاق السريان، حق اختيار المذهب الجعفري، والمدونة الشرعية', 2, 2),
            ]),
            branch('psj-s1-b2', 'انعقاد الزواج وأركانه وصيغته', 3, 11, [
                node('psj-s1-b2-n1', 'تعريف عقد الزواج، التعدد المبدئي، وأحكام الخطبة', 3, 3),
                node('psj-s1-b2-n2', 'شروط صيغة العقد (الإيجاب، القبول اللفظي، الموالاة، التطابق، والقصد)', 4, 5),
                node('psj-s1-b2-n3', 'الشروط المشروطة في العقد والالتزام بها وحق الإجبار القضائي', 6, 7),
                node('psj-s1-b2-n4', 'اشتراط توكيل المرأة بالطلاق وأنواعه (الرجعي، البائن، والخلعي بطلب الفداء)', 8, 8),
                node('psj-s1-b2-n5', 'شروط عدم التعدد وعدم الطلاق وشروط السكنى المستقل', 9, 10),
                node('psj-s1-b2-n6', 'دعوى الزوجية والتصادق عليها', 11, 11),
            ]),
            branch('psj-s1-b3', 'الولاية في الزواج والأهلية', 12, 18, [
                node('psj-s1-b3-n1', 'ولاية تزويج الابن البالغ الرشيد', 12, 12),
                node('psj-s1-b3-n2', 'ولاية البنت البالغة الرشيدة (الثيب والباكرة والتشاح بين الأب والجد)', 13, 14),
                node('psj-s1-b3-n3', 'مسقطات ولاية الأب والجد للأب عن الباكرة الرشيدة', 15, 15),
                node('psj-s1-b3-n4', 'زواج البالغ غير الرشيد وشروط الولي', 16, 18),
            ]),
        ]),
        section('psj-s2', 'موانع الزواج والمهر والعيوب', 19, 64, [
            branch('psj-s2-b1', 'المحرمات بالنسب والمصاهرة', 19, 25, [
                node('psj-s2-b1-n1', 'التحريم بالنسب مؤبداً (الأصول والفروع والحواشي) والنسب غير الشرعي', 19, 21),
                node('psj-s2-b1-n2', 'التحريم بالمصاهرة والجمع بين الأختين أو بنت الأخ/الأخت', 22, 25),
            ]),
            branch('psj-s2-b2', 'الموانع المؤقتة واختلاف الدين وجرائم الحرمة', 26, 36, [
                node('psj-s2-b2-n1', 'الزواج بذات السوار والمعتدة والزنا بذات الزوج والتحريم المؤبد', 26, 28),
                node('psj-s2-b2-n2', 'التحريم الأبدي بجريمة اللواط', 29, 29),
                node('psj-s2-b2-n3', 'أحكام الرضاع المحرم وشروطه وآثاره وتأثيره اللاحق على العقد', 30, 36),
            ]),
            branch('psj-s2-b3', 'أحكام الارتداد والتعدد واللعان والإحرام', 37, 45, [
                node('psj-s2-b3-n1', 'زواج غير المسلمين وأحكام ارتداد الزوجين (الفطري والملي)', 37, 41),
                node('psj-s2-b3-n2', 'الزوجة الخامسة والطلاق ثلاثاً وتسعاً واللعان وقذف الصماء والإحرام', 42, 45),
            ]),
            branch('psj-s2-b4', 'أحكام المهر والصداق', 46, 56, [
                node('psj-s2-b4-n1', 'تعريف المهر وماليته وعيوبه وسقوط الأجل بالوفاة أو الطلاق', 46, 50),
                node('psj-s2-b4-n2', 'إهمال ذكر المهر ومهر المثل والامتناع عن التمكين', 51, 52),
                node('psj-s2-b4-n3', 'استحقاق المهر بالطلاق أو الموت والوكالة بالإبراء والاختلاف القضائي فيه', 53, 56),
            ]),
            branch('psj-s2-b5', 'فسخ عقد الزواج للعيوب', 57, 64, [
                node('psj-s2-b5-n1', 'عيوب الرجل الوجوبية (الجنون، العنن، الخصاء، الجب) وأحكام مهلة السنة', 57, 63, [59, 60, 61, 62]),
                node('psj-s2-b5-n2', 'عيوب المرأة الوجوبية (الجنون، الجذام، البرص، القرن، الإفضاء، العمى، العرج)', 59, 59),
                node('psj-s2-b5-n3', 'سقوط خيار العيب بالمهلة العرفية، وحكم المهر عند الفسخ، وزواج المريض مرضا متصلا بموته', 60, 64, [63]),
            ]),
        ]),
        section('psj-s3', 'الحقوق الزوجية، النسب، الحضانة، والنفقة', 65, 107, [
            branch('psj-s3-b1', 'الحقوق الزوجية المتبادلة والنشوز', 65, 69, [
                node('psj-s3-b1-n1', 'حقوق الزوج (التمكين، عدم الخروج) والأعمال المنزلية العرفية', 65, 66),
                node('psj-s3-b1-n2', 'حقوق الزوجة (الإنفاق، حسن المعاشرة، عدم الهجر، والمبيت ليلة من أربع)', 67, 67),
                node('psj-s3-b1-n3', 'أحكام نشوز الزوجة بترك البيت أو منع الزوج لحقوقه الواجبة', 68, 69),
            ]),
            branch('psj-s3-b2', 'التفريق القضائي للضرر ودور المرجع الديني', 70, 74, [
                node('psj-s3-b2-n1', 'طلاق القاضي للامتناع عن الإنفاق، الهجر التام، أو الاعتداء بالضرب', 70, 72),
                node('psj-s3-b2-n2', 'شروط إيقاع الطلاق القضائي للضرر ودور المرجع الديني الأعلى بالتنسيق مع المجلس العلمي', 73, 74),
            ]),
            branch('psj-s3-b3', 'أحكام النسب والتبني', 75, 79, [
                node('psj-s3-b3-n1', 'إلحاق الولد بالزوج وشروط المدة والإنزال', 75, 75),
                node('psj-s3-b3-n2', 'نفي الولد وفحص الحمض النووي (DNA)', 76, 76),
                node('psj-s3-b3-n3', 'أحكام التبني، نسب ولد الزنا، والبنوة للمجهول علمياً', 77, 79),
            ]),
            branch('psj-s3-b4', 'الإرضاع وحضانة الصغير', 80, 88, [
                node('psj-s3-b4-n1', 'حق الأم بالإرضاع والأجرة عليه وضابط مصلحة الولد', 80, 80),
                node('psj-s3-b4-n2', 'مدة الحضانة للأم (7 سنوات) وللأب وحق اللقاء والمشاهدة زماناً ومكاناً', 81, 82),
                node('psj-s3-b4-n3', 'سقوط حضانة الأم بالزواج، موت أحد الحاضنين، وحضانة الأقارب حسب مراتب الإرث', 83, 85),
                node('psj-s3-b4-n4', 'شروط الحاضن (العقل، الإسلام، الأمانة)، العنف، وانتهاء الحضانة بالبلوغ والرشد', 86, 88),
            ]),
            branch('psj-s3-b5', 'أحكام النفقة الزوجية ونفقة الأقارب', 89, 107, [
                node('psj-s3-b5-n1', 'نفقة الزوجة ونفقة المعتدة (الرجعية والبائنة والحامل حتى تضع)', 89, 93),
                node('psj-s3-b5-n2', 'ضابط النفقة الشرعي، ديونها بالذمة، سقوطها بالإسقاط، وتكسب الزوج بالإقراض', 94, 100),
                node('psj-s3-b5-n3', 'نفقة العمودين (الآباء والأولاد) وشروط الاستحقاق والقدرة والإعسار', 101, 104),
                node('psj-s3-b5-n4', 'شروط الفقر، الدين، والمواصفات الشرعية لنفقة القريب العاجز', 105, 107),
            ]),
        ]),
        section('psj-s4', 'انحلال عقد الزواج (الطلاق، الرجعة، العِدَد، المفقود، والخلع)', 108, 173, [
            branch('psj-s4-b1', 'أحكام الطلاق وشروطه وصيغته', 108, 124, [
                node('psj-s4-b1-n1', 'تعريف الطلاق، وشروط المطلق (العقل، القصد، الاختيار، وطلاق المجنون من وليه)', 108, 112),
                node('psj-s4-b1-n2', 'معايير الإكراه على الطلاق (الوعيد، عدم التحمل)، والإكراه بحق', 113, 116),
                node('psj-s4-b1-n3', 'شروط المطلقة (الطهر، طهر المواقعة، اليائسة، الحامل، والمسترابة)', 116, 118),
                node('psj-s4-b1-n4', 'صيغة الطلاق التنجيزي (لفظ طالق)، الإشهاد والعدالة، وطلاق الأخرس', 119, 124),
            ]),
            branch('psj-s4-b2', 'عدالة الشهود وأنواع الطلاق والرجعة', 125, 134, [
                node('psj-s4-b2-n1', 'تعريف العدل سلوكياً، الاختلاف في صحة الطلاق، وطلاق الثلاث المرسل والولاء', 125, 129),
                node('psj-s4-b2-n2', 'أقسام الطلاق (البائن والرجعي) وتعريف الرجعة وآلياتها اللفظية والفعلية وثبوتها', 130, 134),
            ]),
            branch('psj-s4-b3', 'الطلاق المتعدد والمحلل', 135, 141, [
                node('psj-s4-b3-n1', 'الطلاق بعد الطلاق، والتحريم بالتطليقات الثلاث، وشروط الزوج المحلل', 135, 139),
                node('psj-s4-b3-n2', 'الطلاق التسع الأبدي والطلاق العدي وشروطه', 140, 141),
            ]),
            branch('psj-s4-b4', 'أحكام العِدَد والفسخ والوفاة وزوجة المفقود', 142, 153, [
                node('psj-s4-b4-n1', 'تعريف العدة، ومستثنيات الطلاق، وأقسام المطلقات المعتدات (الأطهار والشهور)', 142, 145),
                node('psj-s4-b4-n2', 'مبدأ عدة الطلاق، وعدة الفسخ والانفساخ بالارتداد', 146, 149),
                node('psj-s4-b4-n3', 'عدة الوفاة (أبعد الأجلين) ومبدأ سريانها ببلوغ الخبر للزوجة', 150, 151),
                node('psj-s4-b4-n4', 'زوجة المفقود المنقطع خبره، أحكام الانتظار (4 سنوات الفحص)، الطلاق القضائي، والولي', 152, 153),
            ]),
            branch('psj-s4-b5', 'طلاق الخلع والمباراة', 154, 173, [
                node('psj-s4-b5-n1', 'تعريف الخلع والمباراة وشروطهما وصيغتهما وفداء المختلعة', 154, 162),
                node('psj-s4-b5-n2', 'معمارية الخلع البرمجية (البذل والقبول، الموالاة، التوكيل، وصيغ الوكلاء)', 163, 168),
                node('psj-s4-b5-n3', 'أثر الرجوع في الفدية في العدة ومستثنيات المباراة', 169, 173),
            ]),
        ]),
        section('psj-s5', 'الوصايا والإيصاء والولاية على القاصرين', 174, 238, [
            branch('psj-s5-b1', 'أحكام الوصية وأركانها وقواعدها العامة', 174, 183, [
                node('psj-s5-b1-n1', 'تعريف الوصية (التمليكية والعهدية)، أركانها، وطرق تحققها بالخط أو التوقيع', 174, 176),
                node('psj-s5-b1-n2', 'أحكام الرد والقبول، تصرف الورثة بالعين، وموت الموصى له وقيام وارثه مقامه', 177, 180),
                node('psj-s5-b1-n3', 'الرجوع عن الوصية بالقول أو الفعل، والوصية المطلقة والمقيدة بظرف', 181, 183),
            ]),
            branch('psj-s5-b2', 'شروط الموصي والموصى به وحدود الثلث', 184, 194, [
                node('psj-s5-b2-n1', 'شروط الموصي (البلوغ، العقل، الرشد، الاختيار، ومن أحدث في نفسه ما يوجب الموت)', 184, 184),
                node('psj-s5-b2-n2', 'شروط الموصى به، وحدود الثلث، وإجازة الورثة أو ردها', 185, 189),
                node('psj-s5-b2-n3', 'احتساب الثلث بالنسبة للتركة وقت الموت، وزيادة القيمة، والكسر المشاع المتجدد', 190, 194),
            ]),
            branch('psj-s5-b3', 'إدارة أموال التركة والديون والوصايا المتعددة', 195, 209, [
                node('psj-s5-b3-n1', 'تعيين الثلث في عين مخصوصة، المشاع في التركة، وحماية التركة', 195, 198),
                node('psj-s5-b3-n2', 'استخراج الديون والحقوق المالية والحج من التركة، والوصايا المتعددة والبدنية', 199, 203),
                node('psj-s5-b3-n3', 'حرمان وارث، والوصية للمستقبل، وللحمل، ولغير المسلم، والتسوية بين الموصى لهم', 204, 209),
            ]),
            branch('psj-s5-b4', 'أحكام الإيصاء وشروط الوصي وواجباته', 210, 225, [
                node('psj-s5-b4-n1', 'تعيين الوصي وشروطه (البلوغ، العقل، الإسلام، الوثوق)، وأمانته والتعدي والتفريط', 210, 211),
                node('psj-s5-b4-n2', 'تعدد الأوصياء، زوال الوصف، موت الوصي، والتوكيل والإنفراد', 212, 218),
                node('psj-s5-b4-n3', 'عجز الوصي وخيانته وعزله، وإطلاق التصرف بمصلحة الميت، وأجرة الوصي', 219, 223),
                node('psj-s5-b4-n4', 'عدم تعيين وصي، وأحكام الناظر الرقيب أو المشاور على الوصي', 224, 225),
            ]),
            branch('psj-s5-b5', 'الولاية على الطفل وإثبات الوصية', 226, 238, [
                node('psj-s5-b5-n1', 'الوصية بالولاية مع فقد الأب أو الجد، وتعيين القاضي للقيم والأم', 226, 227),
                node('psj-s5-b5-n2', 'الوصية التمليكية للطفل وبقاء المال بيد الوصي، وتعدد القيمين وإطلاق الولاية', 228, 232),
                node('psj-s5-b5-n3', 'طرق إثبات الوصية (شهادة الرجال، شهادة النساء، إقرار الورثة، والخط الموثق)', 233, 238),
            ]),
        ]),
        section('psj-s6', 'المواريث (أحكام عامة، موانع الإرث، والطبقات الثلاث)', 239, 306, [
            branch('psj-s6-b1', 'القواعد العامة للميراث والتركة والفروض', 239, 243, [
                node('psj-s6-b1-n1', 'تعريف الميراث ومشتملات التركة، وتصفيتها (التجهيز، الديون، الحج، الوصية)', 239, 240),
                node('psj-s6-b1-n2', 'موجبات الميراث (النسب بطبقاته الثلاث، السبب: الزوجية والولاء)', 241, 241),
                node('psj-s6-b1-n3', 'الفروض الستة المقدرة وأصحابها، وأقسام الوارث بالفرض أو القرابة أو الولاء', 242, 243),
            ]),
            branch('psj-s6-b2', 'موانع الإرث (الكفر، القتل، والزنى)', 244, 255, [
                node('psj-s6-b2-n1', 'مانع الكفر وإرث المسلم من غير المسلم، وإسلام الوارث قبل القسمة، وتبعية الطفل', 244, 248),
                node('psj-s6-b2-n2', 'مانع القتل العمد والظلم، وحكم القتل الخطأ والشبيه بالعمد، وحجب القاتل', 249, 252),
                node('psj-s6-b2-n3', 'مانع الزنى، وانعدام التوارث بين ولد الزنى وأبويه الزانيين، وتوارثه مع أقربائه الآخرين', 253, 255),
            ]),
            branch('psj-s6-b3', 'إرث الطبقة الأولى (الأبوان والأولاد)', 256, 275, [
                node('psj-s6-b3-n1', 'انفراد الأب أو الأم، واجتماع الأبوين مع الزوج أو الزوجة، وشروط حجب الإخوة للأم', 256, 259),
                node('psj-s6-b3-n2', 'انفراد الابن أو البنت أو الأبناء، وحبوة الابن الأكبر، واجتماع الأبناء والبنات', 260, 261),
                node('psj-s6-b3-n3', 'اجتماع الأبوين مع بنت واحدة أو أولاد متعددين، ودخول أحد الزوجين عليهم', 262, 269),
                node('psj-s6-b3-n4', 'أحكام أولاد الأولاد، قيامهم مقام الأولاد، حجبهم للأبعد، ونصيب من يتقربون به', 270, 275),
            ]),
            branch('psj-s6-b4', 'إرث الطبقة الثانية (الإخوة والأخوات والأجداد)', 276, 291, [
                node('psj-s6-b4-n1', 'شروط إرث الطبقة الثانية، وانفراد الأخ أو الأخت للأبوين أو للأب، والجمع بينهم', 276, 280),
                node('psj-s6-b4-n2', 'إرث الإخوة والأخوات للأم (انفراد وتعدد)، واجتماع إخوة الأبوين/الأب مع إخوة الأم', 281, 283),
                node('psj-s6-b4-n3', 'دخول أحد الزوجين على الإخوة، ودخول النقص على المتقرب بالأبوين/الأب (العول والتعصيب)', 284, 284),
                node('psj-s6-b4-n4', 'إرث الأجداد والجدات (لأب ولأم)، واجتماع الأجداد مع الزوجين', 285, 286),
                node('psj-s6-b4-n5', 'صور اجتماع الإخوة والأخوات مع الأجداد والجدات التسع بالتفصيل', 287, 287),
                node('psj-s6-b4-n6', 'أحكام أولاد الإخوة والأخوات عند فقد الآباء، ونصيب من يتقربون به', 288, 291),
            ]),
            branch('psj-s6-b5', 'إرث الطبقة الثالثة (الأعمام والأخوال)', 292, 306, [
                node('psj-s6-b5-n1', 'شروط إرث الطبقة الثالثة، وانفراد العم/العمة، واجتماع الأعمام وتفرق نسبهم', 292, 295),
                node('psj-s6-b5-n2', 'إرث الخال والخالة (انفراد وتعدد وتفرق نسب)، واجتماع الأعمام مع الأخوال', 296, 298),
                node('psj-s6-b5-n3', 'أحكام أولاد الأعمام والأخوال، ونصيب المتقرب به، وترتيب الأقرب', 299, 303),
                node('psj-s6-b5-n4', 'دخول أحد الزوجين على الأعمام والأخوال، واجتماع سببين للميراث لوارث واحد', 304, 306),
            ]),
        ]),
        section('psj-s7', 'ميراث الزوجين، الولاء، الحمل، الغائب، والغرقى', 307, 337, [
            branch('psj-s7-b1', 'أحكام ميراث الزوج والزوجة وتعديلاتها', 307, 319, [
                node('psj-s7-b1-n1', 'أنصبة الزوجين، غياب الوارث النسبي والإرث للإمام وصرف حصته بإذن المرجع', 307, 308),
                node('psj-s7-b1-n2', 'تعدد الزوجات واشتباكهن، وعدم اشتراط الدخول، وزواج المريض قبل الدخول وموته', 309, 311),
                node('psj-s7-b1-n3', 'إرث المطلقة رجعياً وباعتداد الخلع، وإرث المطلقة في مرض موت الزوج وشروطه', 312, 313),
                node('psj-s7-b1-n4', 'حرمان الزوجة من أعيان الأرض، وإرثها من المنقولات والحقوق وقيمة البناء والشجر', 314, 314),
                node('psj-s7-b1-n5', 'اشتراط الزوجة الوصية بالتقدم من الثلث، وطريقة تقويم البناء والشجر يوم الدفع', 315, 319),
            ]),
            branch('psj-s7-b2', 'أحكام الولاء وإرث الحمل وأموال الغائب', 320, 330, [
                node('psj-s7-b2-n1', 'أنواع الولاء (ضامن الجريرة، ولاء الإمامة)، شروطه، عدم انتقاله للورثة، ومصرفه', 320, 324),
                node('psj-s7-b2-n2', 'إرث الحمل وشروطه (الانفصال حياً)، تعريف الحمل بالرحم، وعزل نصيب ذكرين للحمل', 325, 329),
                node('psj-s7-b2-n3', 'أموال الغائب غيبة منقطعة، مدة الانتظار (4 سنوات فحص أو 10 سنوات بلا فحص) وتقسيمها', 330, 330),
            ]),
            branch('psj-s7-b3', 'أحكام الغرقى والمهدوم عليهم والختام', 331, 337, [
                node('psj-s7-b3-n1', 'الموت المتزامن (التقارن) وانعدام التوارث، واشتباه السبق والتأخر والتوارث المتبادل', 331, 334),
                node('psj-s7-b3-n2', 'أحكام ختامية للمدونة (الرجوع للمجلس العلمي، المذكرة الإيضاحية، وعدم التعارض)', 335, 337),
            ]),
        ]),
    ],
};

const TAXONOMY_BY_CODE: Partial<Record<PersonalStatusLawCodeType, PersonalStatusLawTaxonomy>> = {
    personal_status_188: PERSONAL_STATUS_188_TAXONOMY,
    jaafari_code: JAAFAARI_CODE_TAXONOMY,
};

export function getPersonalStatusLawTaxonomy(
    codeType: PersonalStatusLawCodeType,
): PersonalStatusLawTaxonomy | null {
    return TAXONOMY_BY_CODE[codeType] ?? null;
}

export function findPersonalStatusTaxonomySection(
    codeType: PersonalStatusLawCodeType,
    sectionId: string | null,
): PersonalStatusLawTaxonomySection | null {
    if (!sectionId) return null;
    return getPersonalStatusLawTaxonomy(codeType)?.sections.find((s) => s.id === sectionId) ?? null;
}

export function findPersonalStatusTaxonomyBranch(
    section: PersonalStatusLawTaxonomySection | null,
    branchId: string | null,
): PersonalStatusLawTaxonomyBranch | null {
    if (!section || !branchId) return null;
    return section.branches.find((b) => b.id === branchId) ?? null;
}

export function findPersonalStatusTaxonomyNode(
    branch: PersonalStatusLawTaxonomyBranch | null,
    nodeId: string | null,
): PersonalStatusLawTaxonomyNode | null {
    if (!branch || !nodeId) return null;
    return branch.nodes.find((n) => n.id === nodeId) ?? null;
}

function isExcludedArticle(n: number, exclude?: readonly number[]): boolean {
    return Boolean(exclude?.includes(n));
}

export function articleMatchesPersonalStatusTaxonomyNode(
    articleNumber: string,
    taxonomyNode: PersonalStatusLawTaxonomyNode,
): boolean {
    const n = extractArticleSortNumber(articleNumber);
    if (n === null) return false;
    if (!articleNumberInRange(articleNumber, taxonomyNode.from, taxonomyNode.to)) return false;
    return !isExcludedArticle(n, taxonomyNode.exclude);
}

export function articleMatchesPersonalStatusTaxonomyBranch(
    articleNumber: string,
    taxonomyBranch: PersonalStatusLawTaxonomyBranch,
): boolean {
    return taxonomyBranch.nodes.some((item) =>
        articleMatchesPersonalStatusTaxonomyNode(articleNumber, item),
    );
}

export function articleMatchesPersonalStatusTaxonomySection(
    articleNumber: string,
    taxonomySection: PersonalStatusLawTaxonomySection,
): boolean {
    return taxonomySection.branches.some((item) =>
        articleMatchesPersonalStatusTaxonomyBranch(articleNumber, item),
    );
}

export function articleMatchesPersonalStatusLawTaxonomy(params: {
    articleNumber: string;
    codeType: PersonalStatusLawCodeType;
    sectionId: string | null;
    branchId: string | null;
    nodeId: string | null;
}): boolean {
    const { articleNumber, codeType, sectionId, branchId, nodeId } = params;
    const taxonomy = getPersonalStatusLawTaxonomy(codeType);
    if (!taxonomy) return true;

    const activeSection = findPersonalStatusTaxonomySection(codeType, sectionId);
    const activeBranch = findPersonalStatusTaxonomyBranch(activeSection, branchId);
    const activeNode = findPersonalStatusTaxonomyNode(activeBranch, nodeId);

    if (activeNode) return articleMatchesPersonalStatusTaxonomyNode(articleNumber, activeNode);
    if (activeBranch) return articleMatchesPersonalStatusTaxonomyBranch(articleNumber, activeBranch);
    if (activeSection) return articleMatchesPersonalStatusTaxonomySection(articleNumber, activeSection);

    if (sectionId || branchId || nodeId) {
        const fallback = taxonomy.sections.find((s) => s.id === sectionId);
        if (fallback) return articleNumberInRange(articleNumber, fallback.from, fallback.to);
        return false;
    }

    return true;
}
