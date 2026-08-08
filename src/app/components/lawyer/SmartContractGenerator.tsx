import React, { useState, useMemo } from 'react';
import { X, Calendar, MapPin, User, Building, UserCircle, Briefcase, Hash, Map, FileText, Shield, AlertTriangle, TrendingDown, Scale, Home, Hammer, ShoppingCart, DollarSign, Clock, Copy, Printer, Check, Bot } from '@/app/components/ui/lucideIcons';
import { motion, AnimatePresence } from 'motion/react';
import { AILegalAssistant } from './AILegalAssistant';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { PRINT_STYLES } from './SmartContractGenerator/utils/printStyles';
import type { ContractData, ContractDetails, ShieldsData } from './SmartContractGenerator/types/types';
import ContractPaper from './SmartContractGenerator/components/ContractPaper';

export const SmartContractGenerator = ({ onClose }: { onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  
  const [contractData, setContractData] = useState<ContractData>({
    type: 'عقد اتفاق عام',
    date: '',
    location: '',
    partyOne: { entity: 'فرد', name: '', id: '', address: '', representedBy: '', role: 'الطرف الأول' },
    partyTwo: { entity: 'فرد', name: '', id: '', address: '', representedBy: '', role: 'الطرف الثاني' },
    shields: {
      evidentiary: false,
      guillotine: false,
      shockAbsorption: false,
      shockPercentage: 15,
      willDefects: false,
    },
  });

  const [contractDetails, setContractDetails] = useState<ContractDetails>({
    lease: {
      propertyType: 'سكني (يخضع للامتداد القانوني)',
      monthlyRent: '',
      duration: '',
    },
    construction: {
      pricingStrategy: 'مقاولة بسعر ثابت إجمالي (Lump Sum)',
      durationDays: '',
      dailyPenalty: '',
      penaltyCap: '10',
    },
    sale: {
      itemType: 'منقول (بضاعة/سيارة)',
      description: '',
      totalPrice: '',
      paymentMethod: 'دفعة واحدة نقداً',
    },
  });

  const handleMetaChange = (field: string, value: string) => {
    setContractData(prev => ({ ...prev, [field]: value }));
  };

  const handlePartyChange = (party: 'partyOne' | 'partyTwo', field: string, value: string) => {
    setContractData(prev => ({
      ...prev,
      [party]: { ...prev[party], [field]: value }
    }));
  };

  const handleShieldToggle = (shield: keyof ShieldsData) => {
    setContractData(prev => ({
      ...prev,
      shields: { ...prev.shields, [shield]: !prev.shields[shield] }
    }));
  };

  const handleShieldPercentageChange = (value: number) => {
    setContractData(prev => ({
      ...prev,
      shields: { ...prev.shields, shockPercentage: value }
    }));
  };

  const handleDetailsChange = (category: keyof ContractDetails, field: string, value: string) => {
    setContractDetails(prev => ({
      ...prev,
      [category]: { ...prev[category], [field]: value }
    }));
  };

  // وظيفة النسخ النظيف
  const handleCopyText = async () => {
    const element = document.getElementById('contract-paper');
    if (!element) return;
    
    try {
      const text = element.innerText;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  };

  // وظيفة الطباعة
  const handlePrint = () => {
    window.print();
  };

  const isCanvasEmpty = !contractData.partyOne.name && !contractData.partyTwo.name;

  // تنسيق التاريخ بالعربية
  const formatArabicDate = (dateStr: string) => {
    if (!dateStr) return '..............';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ar-IQ', options);
  };

  // حساب الدروع النشطة وترقيم المواد
  const activeShieldsArticles = useMemo(() => {
    const articles: Array<{ id: string; content: string }> = [];
    let articleNumber = 1; // سيبدأ من المادة الأولى

    if (contractData.shields.evidentiary) {
      articles.push({
        id: 'evidentiary',
        content: `المادة (${articleNumber}) - الحجية الرقمية: يُقر الطرفان إقراراً مانعاً للرجوع بأن كافة المراسلات عبر البريد الإلكتروني أو تطبيق (WhatsApp) المعتمدة في تنفيذ هذا العقد، تُعد حجة كتابية قاطعة، وتسري عليها أحكام السند العادي وفق قانون الإثبات العراقي، ويسقط حقهما في الطعن بصحتها أو المطالبة باستكتابها.`
      });
      articleNumber++;
    }

    if (contractData.shields.guillotine) {
      articles.push({
        id: 'guillotine',
        content: `المادة (${articleNumber}) - الشرط الفاسخ الصريح: يُعد هذا العقد مفسوخاً من تلقاء نفسه، وبقوة القانون، بمجرد إخلال أي من الطرفين بالتزاماته الجوهرية، وذلك دون حاجة إلى تنبيه، أو إنذار عن طريق الكاتب العدل، أو استصدار حكم قضائي تطبيقاً للمادة (178) من القانون المدني العراقي، وتُعد يد الطرف المخل على محل العقد يد غاصب تبيح اتخاذ كافة الإجراءات المستعجلة لطرده.`
      });
      articleNumber++;
    }

    if (contractData.shields.shockAbsorption) {
      articles.push({
        id: 'shockAbsorption',
        content: `المادة (${articleNumber}) - استقرار الالتزامات والظروف الطارئة: يتنازل الطرفان مسبقاً عن حق المطالبة بتعديل الالتزامات استناداً لنظرية الظروف الطارئة (المادة 146 مدني)، ويُقران بأن أي تذبذب مالي في أسعار الصرف أو تضخم اقتصادي لا يتجاوز نسبة [ ${contractData.shields.shockPercentage}% ] يُعد من المخاطر التجارية المتوقعة التي ارتضياها وقت التعاقد، ولا يجوز التذرع بها لفسخ العقد أو تعديله.`
      });
      articleNumber++;
    }

    return articles;
  }, [contractData.shields]);

  // نص نفي عيوب الإرادة (يحقن في الديباجة)
  const willDefectsClause = useMemo(() => {
    if (!contractData.shields.willDefects) return null;
    return "يُقر الطرفان بمناقشة هذا العقد بنداً بنداً، وبتعادل التزاماتهما اقتصادياً، وانتفاء أي غبن فاحش أو استغلال لطيش بيّن أو هوى جامح، وبالمعاينة التامة النافية للجهالة الفاحشة شرعاً وقانوناً، ويسقط حقهما بالتمسك بأي عيب من عيوب الإرادة كسبب لإبطال هذا العقد.";
  }, [contractData.shields.willDefects]);

  // حساب المواد القانونية الخاصة بنوع العقد
  const contractSpecificArticles = useMemo(() => {
    const articles: Array<{ id: string; content: string }> = [];
    let articleNumber = activeShieldsArticles.length + 1;

    // عقد إيجار
    if (contractData.type === 'عقد إيجار' && contractDetails.lease) {
      const { propertyType, monthlyRent, duration } = contractDetails.lease;
      
      if (monthlyRent || duration) {
        articles.push({
          id: 'lease-terms',
          content: `المادة (${articleNumber}) - الأجرة والمدة: اتفق الطرفان على إيجار المأجور لمدة ${duration || '...............'} ببدل إيجار مقداره ${monthlyRent ? `${monthlyRent} دينار شهرياً` : '..............'}.`
        });
        articleNumber++;
      }

      if (propertyType === 'سكني (يخضع للامتداد القانوني)') {
        articles.push({
          id: 'sublease-ban',
          content: `المادة (${articleNumber}) - حظر الإيجار من الباطن: يُمنع منعاً باتاً على الطرف الثاني (المستأجر) إيجار المأجور من الباطن أو التنازل عنه للغير كلياً أو جزئياً، ويُعد أي تصرف من هذا القبيل باطلاً وموجباً للفسخ الفوري والإخلاء دون تعويض.`
        });
        articleNumber++;
      }
    }

    // عقد مقاولة
    if (contractData.type === 'عقد مقاولة' && contractDetails.construction) {
      const { pricingStrategy, durationDays, dailyPenalty, penaltyCap } = contractDetails.construction;
      
      if (pricingStrategy) {
        articles.push({
          id: 'construction-pricing',
          content: `المادة (${articleNumber}) - التسعير: يتم تنفيذ العمل وفق استراتيجية ${pricingStrategy}.`
        });
        articleNumber++;
      }

      if (durationDays || dailyPenalty || penaltyCap) {
        articles.push({
          id: 'construction-penalties',
          content: `المادة (${articleNumber}) - غرامات التأخير: يلتزم الطرف الثاني بإنجاز العمل خلال ${durationDays ? `${durationDays} يوماً` : '..............' }. وفي حال التأخير، يخضع لغرامة تأخيرية قدرها ${dailyPenalty ? `${dailyPenalty} دينار` : '..............'} عن كل يوم تأخير، على ألا يتجاوز مجموع الغرامات نسبة ${penaltyCap || '10'}% من القيمة الإجمالية للعقد لتجنب التعسف، وبعدها يحق للطرف الأول سحب العمل.`
        });
        articleNumber++;
      }
    }

    // عقد بيع
    if (contractData.type === 'عقد بيع' && contractDetails.sale) {
      const { description, totalPrice, paymentMethod } = contractDetails.sale;
      
      if (description || totalPrice || paymentMethod) {
        articles.push({
          id: 'sale-terms',
          content: `المادة (${articleNumber}) - المبيع والثمن: باع الطرف الأول للطرف الثاني المبيع الموصوف بـ: ${description || '..............'} وذلك بثمن إجمالي قدره ${totalPrice ? `${totalPrice} دينار` : '..............'} يُدفع بطريقة ${paymentMethod || '..............'}. `
        });
        articleNumber++;
      }
    }

    return articles;
  }, [contractData.type, contractDetails, activeShieldsArticles.length]);

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 flex flex-col overflow-hidden m-0 p-0" dir="rtl">
      {/* ===== DEDICATED GENERATOR HEADER ===== */}
      <header className="sticky top-0 z-[10000] flex items-center justify-between px-4 py-4 bg-slate-900 border-b border-slate-700 shadow-md w-full">
        <h1 className="text-xl font-bold text-amber-500 flex items-center gap-2">
          ⚖️ منشئ العقود الذكي
        </h1>

        <div className="flex items-center gap-3">
            {/* AI Assistant Toggle Button */}
            <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
                showAIAssistant
                ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                : 'bg-slate-800/50 border border-slate-700/50 text-white/70 hover:bg-slate-800 hover:text-white'
            }`}
            >
            <Bot size={18} />
            <span className="hidden sm:inline">المساعد القانوني</span>
            </motion.button>

            <button type="button" 
                onClick={onClose} 
                className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-colors"
            >
                ❌ إغلاق
            </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT AREA (SCROLLABLE) ===== */}
      <div className="flex-1 overflow-y-auto p-4 w-full scrollbar-hide">
        <div className="max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8 pb-32 space-y-8">

        {/* Floating Action Buttons (Export Controls) */}
        {!isCanvasEmpty && (
          <div className="fixed top-20 left-4 sm:left-8 flex flex-col gap-2 sm:gap-3 z-50 print:hidden">
            {/* زر النسخ */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyText}
              className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-lg transition-all"
            >
              {copied ? <Check size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Copy size={16} className="sm:w-[18px] sm:h-[18px]" />}
              <span className="text-xs sm:text-sm font-semibold">{copied ? 'تم النسخ ✓' : 'نسخ'}</span>
            </motion.button>

            {/* زر الطباعة */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrint}
              className="flex items-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-lg transition-all"
            >
              <Printer size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-xs sm:text-sm font-semibold">طباعة</span>
            </motion.button>
          </div>
        )}

        {/* AI Legal Assistant Panel */}
        <AnimatePresence>
          {showAIAssistant && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-[600px] w-full"
            >
              <AILegalAssistant
                onInsertToDraft={(text) => {
                  // سيتم نسخ النص إلى الحافظة
                  navigator.clipboard.writeText(text);
                  SmartToast.success('✅ تم نسخ النص إلى الحافظة! الصق النص في المكان المناسب في العقد.');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Split View - Responsive Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" dir="rtl">
          
          {/* Right Column (Inputs): The "Interrogation Room" */}
          <div className="xl:col-span-5 space-y-6">
              
              {/* Card 1: بيانات العقد الأساسية */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-700/50 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow"
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Briefcase size={16} className="text-blue-400" />
                  </div>
                  بيانات العقد الأساسية
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/70 text-xs mb-1.5 font-medium">نوع العقد</label>
                    <select 
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={contractData.type}
                      onChange={(e) => handleMetaChange('type', e.target.value)}
                    >
                      {['عقد بيع', 'عقد إيجار', 'عقد مقاولة', 'عقد اتفاق عام'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/70 text-xs mb-1.5 font-medium">تاريخ الإبرام</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        <input 
                          type="date" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-9 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          value={contractData.date}
                          onChange={(e) => handleMetaChange('date', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/70 text-xs mb-1.5 font-medium">مكان الإبرام</label>
                      <div className="relative">
                        <MapPin size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        <input 
                          type="text" 
                          placeholder="بغداد، العراق" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-9 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                          value={contractData.location}
                          onChange={(e) => handleMetaChange('location', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: الطرف الأول */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-700/50 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow"
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <User size={16} className="text-emerald-400" />
                  </div>
                  الطرف الأول
                </h3>
                <div className="space-y-4">
                  <div className="flex p-1 bg-black/50 rounded-lg border border-white/5">
                    {(['فرد', 'شركة'] as const).map(entity => (
                      <button type="button"
                        key={entity}
                        onClick={() => handlePartyChange('partyOne', 'entity', entity)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                          contractData.partyOne.entity === entity 
                            ? 'bg-blue-500 text-white' 
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {entity === 'فرد' ? <UserCircle size={14} className="inline mr-1" /> : <Building size={14} className="inline mr-1" />}
                        {entity === 'فرد' ? 'شخص طبيعي (فرد)' : 'شخص معنوي (شركة)'}
                      </button>
                    ))}
                  </div>

                  {contractData.partyOne.entity === 'فرد' ? (
                    <>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">الاسم الثلاثي</label>
                        <input 
                          type="text" 
                          placeholder="اسم الطرف الأول" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                          value={contractData.partyOne.name}
                          onChange={(e) => handlePartyChange('partyOne', 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">رقم البطاقة الوطنية</label>
                        <div className="relative">
                          <Hash size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                          <input 
                            type="text" 
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-9 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            value={contractData.partyOne.id}
                            onChange={(e) => handlePartyChange('partyOne', 'id', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">اسم الشركة</label>
                        <input 
                          type="text" 
                          placeholder="اسم الشركة" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                          value={contractData.partyOne.name}
                          onChange={(e) => handlePartyChange('partyOne', 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">رقم التسجيل</label>
                        <input 
                          type="text" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          value={contractData.partyOne.id}
                          onChange={(e) => handlePartyChange('partyOne', 'id', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">يمثلها المدير المفوض</label>
                        <input 
                          type="text" 
                          placeholder="اسم المدير المفوض" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                          value={contractData.partyOne.representedBy}
                          onChange={(e) => handlePartyChange('partyOne', 'representedBy', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">عنوان الشركة</label>
                        <div className="relative">
                          <Map size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                          <input 
                            type="text" 
                            placeholder="عنوان المقر الرئيسي"
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-9 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                            value={contractData.partyOne.address}
                            onChange={(e) => handlePartyChange('partyOne', 'address', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {contractData.partyOne.entity === 'فرد' && (
                    <div>
                      <label className="block text-white/70 text-xs mb-1.5 font-medium">العنوان</label>
                      <div className="relative">
                        <Map size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        <input 
                          type="text" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-9 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          value={contractData.partyOne.address}
                          onChange={(e) => handlePartyChange('partyOne', 'address', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-white/70 text-xs mb-1.5 font-medium">صفته في العقد</label>
                    <input 
                      type="text" 
                      placeholder="البائع، المؤجر، الطرف الأول" 
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                      value={contractData.partyOne.role}
                      onChange={(e) => handlePartyChange('partyOne', 'role', e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Card 3: الطرف الثاني */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-700/50 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow"
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <User size={16} className="text-purple-400" />
                  </div>
                  الطرف الثاني
                </h3>
                <div className="space-y-4">
                  <div className="flex p-1 bg-black/50 rounded-lg border border-white/5">
                    {(['فرد', 'شركة'] as const).map(entity => (
                      <button type="button"
                        key={entity}
                        onClick={() => handlePartyChange('partyTwo', 'entity', entity)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                          contractData.partyTwo.entity === entity 
                            ? 'bg-blue-500 text-white' 
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {entity === 'فرد' ? <UserCircle size={14} className="inline mr-1" /> : <Building size={14} className="inline mr-1" />}
                        {entity === 'فرد' ? 'شخص طبيعي (فرد)' : 'شخص معنوي (شركة)'}
                      </button>
                    ))}
                  </div>

                  {contractData.partyTwo.entity === 'فرد' ? (
                    <>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">الاسم الثلاثي</label>
                        <input 
                          type="text" 
                          placeholder="اسم الطرف الثاني" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                          value={contractData.partyTwo.name}
                          onChange={(e) => handlePartyChange('partyTwo', 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">رقم البطاقة الوطنية</label>
                        <div className="relative">
                          <Hash size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                          <input 
                            type="text" 
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-9 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            value={contractData.partyTwo.id}
                            onChange={(e) => handlePartyChange('partyTwo', 'id', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">اسم الشركة</label>
                        <input 
                          type="text" 
                          placeholder="اسم الشركة" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                          value={contractData.partyTwo.name}
                          onChange={(e) => handlePartyChange('partyTwo', 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">رقم التسجيل</label>
                        <input 
                          type="text" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          value={contractData.partyTwo.id}
                          onChange={(e) => handlePartyChange('partyTwo', 'id', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">يمثلها المدير المفوض</label>
                        <input 
                          type="text" 
                          placeholder="اسم المدير المفوض" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                          value={contractData.partyTwo.representedBy}
                          onChange={(e) => handlePartyChange('partyTwo', 'representedBy', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1.5 font-medium">عنوان الشركة</label>
                        <div className="relative">
                          <Map size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                          <input 
                            type="text" 
                            placeholder="عنوان المقر الرئيسي"
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-9 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                            value={contractData.partyTwo.address}
                            onChange={(e) => handlePartyChange('partyTwo', 'address', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {contractData.partyTwo.entity === 'فرد' && (
                    <div>
                      <label className="block text-white/70 text-xs mb-1.5 font-medium">العنوان</label>
                      <div className="relative">
                        <Map size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        <input 
                          type="text" 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-9 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          value={contractData.partyTwo.address}
                          onChange={(e) => handlePartyChange('partyTwo', 'address', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-white/70 text-xs mb-1.5 font-medium">صفته في العقد</label>
                    <input 
                      type="text" 
                      placeholder="البائع، المشتري، الطرف الثاني" 
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/30"
                      value={contractData.partyTwo.role}
                      onChange={(e) => handlePartyChange('partyTwo', 'role', e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Card 4: الدروع القانونية والتحصين */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-emerald-900/30 to-slate-900/80 border border-emerald-700/50 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow"
              >
                <h3 className="text-lg font-bold text-emerald-400 mb-5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Shield size={18} className="text-emerald-400" />
                  </div>
                  🛡️ الدروع القانونية والتحصين
                </h3>
                <div className="space-y-5">
                  
                  {/* الدرع 1: التحصين الإثباتي */}
                  <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-white font-semibold text-sm flex items-center gap-2">
                        <FileText size={16} className="text-blue-400" />
                        اعتماد المراسلات الرقمية كدليل قاطع
                      </label>
                      <button type="button"
                        onClick={() => handleShieldToggle('evidentiary')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          contractData.shields.evidentiary ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            contractData.shields.evidentiary ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 pr-6">
                      يجعل رسائل الواتساب والإيميل حجة قانونية ملزمة
                    </p>
                  </div>

                  {/* الدرع 2: الشرط الفاسخ الشرس */}
                  <div className="bg-black/30 rounded-lg p-4 border border-red-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-white font-semibold text-sm flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-400" />
                        تفعيل الشرط الفاسخ التلقائي للمخالفات
                      </label>
                      <button type="button"
                        onClick={() => handleShieldToggle('guillotine')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          contractData.shields.guillotine ? 'bg-red-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            contractData.shields.guillotine ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 pr-6">
                      يفسخ العقد فوراً عند المخالفة دون الحاجة لإنذار كاتب عدل أو حكم محكمة
                    </p>
                  </div>

                  {/* الدرع 3: تجميد الظروف الطارئة */}
                  <div className="bg-black/30 rounded-lg p-4 border border-amber-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-white font-semibold text-sm flex items-center gap-2">
                        <TrendingDown size={16} className="text-amber-400" />
                        تحصين ضد التضخم (تعطيل نظرية الظروف الطارئة)
                      </label>
                      <button type="button"
                        onClick={() => handleShieldToggle('shockAbsorption')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          contractData.shields.shockAbsorption ? 'bg-amber-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            contractData.shields.shockAbsorption ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 pr-6 mb-3">
                      يمنع القاضي من تعديل العقد في حال انهيار العملة أو تقلب السوق
                    </p>
                    
                    {/* حقل النسبة المشروط */}
                    {contractData.shields.shockAbsorption && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <label className="block text-white/70 text-xs mb-2 font-medium">
                          نسبة التذبذب المقبولة (%)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="15"
                            className="w-20 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                            value={contractData.shields.shockPercentage}
                            onChange={(e) => handleShieldPercentageChange(Number(e.target.value))}
                          />
                          <span className="text-white/50 text-sm">%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* الدرع 4: نفي عيوب الإرادة */}
                  <div className="bg-black/30 rounded-lg p-4 border border-purple-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-white font-semibold text-sm flex items-center gap-2">
                        <Scale size={16} className="text-purple-400" />
                        إقرار نفي الجهالة والغبن الفاحش
                      </label>
                      <button type="button"
                        onClick={() => handleShieldToggle('willDefects')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          contractData.shields.willDefects ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            contractData.shields.willDefects ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 pr-6">
                      يحصن العقد ضد دعاوى الإبطال بسبب الاستغلال أو الغلط
                    </p>
                  </div>

                </div>
              </motion.div>

              {/* Card 5: تفاصيل العقد الخاصة (DYNAMIC) */}
              {(contractData.type === 'عقد إيجار' || contractData.type === 'عقد مقاولة' || contractData.type === 'عقد بيع') && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-cyan-900/30 to-slate-900/80 border border-cyan-700/50 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <h3 className="text-lg font-bold text-cyan-400 mb-5 flex items-center gap-2">
                    {contractData.type === 'عقد إيجار' && <Home size={18} className="text-cyan-400" />}
                    {contractData.type === 'عقد مقاولة' && <Hammer size={18} className="text-cyan-400" />}
                    {contractData.type === 'عقد بيع' && <ShoppingCart size={18} className="text-cyan-400" />}
                    📋 تفاصيل العقد الخاصة
                  </h3>
                  <div className="space-y-4">
                    
                    {/* عقد إيجار */}
                    {contractData.type === 'عقد إيجار' && contractDetails.lease && (
                      <>
                        <div>
                          <label className="block text-white/70 text-xs mb-2 font-medium">طبيعة المأجور</label>
                          <div className="flex gap-2">
                            <button type="button"
                              onClick={() => handleDetailsChange('lease', 'propertyType', 'سكني (يخضع للامتداد القانوني)')}
                              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                                contractDetails.lease.propertyType === 'سكني (يخضع للامتداد القانوني)'
                                  ? 'bg-cyan-600 text-white shadow-lg'
                                  : 'bg-black/30 text-white/50 hover:bg-black/50 hover:text-white border border-white/10'
                              }`}
                            >
                              سكني (يخضع للامتداد القانوني)
                            </button>
                            <button type="button"
                              onClick={() => handleDetailsChange('lease', 'propertyType', 'تجاري')}
                              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                                contractDetails.lease.propertyType === 'تجاري'
                                  ? 'bg-cyan-600 text-white shadow-lg'
                                  : 'bg-black/30 text-white/50 hover:bg-black/50 hover:text-white border border-white/10'
                              }`}
                            >
                              تجاري
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-white/70 text-xs mb-2 font-medium">بدل الإيجار (دينار/شهرياً)</label>
                          <div className="relative">
                            <DollarSign size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                              type="number"
                              placeholder="500,000"
                              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-10 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-white/30"
                              value={contractDetails.lease.monthlyRent}
                              onChange={(e) => handleDetailsChange('lease', 'monthlyRent', e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-white/70 text-xs mb-2 font-medium">مدة الإيجار</label>
                          <input
                            type="text"
                            placeholder="سنة واحدة تبدأ من..."
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-white/30"
                            value={contractDetails.lease.duration}
                            onChange={(e) => handleDetailsChange('lease', 'duration', e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {/* عقد مقاولة */}
                    {contractData.type === 'عقد مقاولة' && contractDetails.construction && (
                      <>
                        <div>
                          <label className="block text-white/70 text-xs mb-2 font-medium">استراتيجية التسعير</label>
                          <select
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            value={contractDetails.construction.pricingStrategy}
                            onChange={(e) => handleDetailsChange('construction', 'pricingStrategy', e.target.value)}
                          >
                            <option value="مقاولة بسعر ثابت إجمالي (Lump Sum)">مقاولة بسعر ثابت إجمالي (Lump Sum)</option>
                            <option value="مقاولة بوحدة القياس (Unit Price)">مقاولة بوحدة القياس (Unit Price)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-white/70 text-xs mb-2 font-medium">مدة الإنجاز (أيام)</label>
                            <div className="relative">
                              <Clock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
                              <input
                                type="number"
                                placeholder="90"
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-10 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-white/30"
                                value={contractDetails.construction.durationDays}
                                onChange={(e) => handleDetailsChange('construction', 'durationDays', e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-white/70 text-xs mb-2 font-medium">غرامة التأخير (يومياً)</label>
                            <div className="relative">
                              <DollarSign size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
                              <input
                                type="number"
                                placeholder="50,000"
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-10 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-white/30"
                                value={contractDetails.construction.dailyPenalty}
                                onChange={(e) => handleDetailsChange('construction', 'dailyPenalty', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-white/70 text-xs mb-2 font-medium">الحد الأعلى للغرامة (%)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="10"
                              className="w-24 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                              value={contractDetails.construction.penaltyCap}
                              onChange={(e) => handleDetailsChange('construction', 'penaltyCap', e.target.value)}
                            />
                            <span className="text-white/50 text-sm">% من القيمة الإجمالية</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* عقد بيع */}
                    {contractData.type === 'عقد بيع' && contractDetails.sale && (
                      <>
                        {/* تنبيه التسجيل إذا كان عقار */}
                        {contractDetails.sale.itemType === 'عقار (أرض/دار)' && (
                          <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-amber-200 text-sm font-semibold mb-1">⚠️ تنبيه تشريعي</p>
                                <p className="text-amber-100 text-xs leading-relaxed">
                                  بيع العقار من العقود الشكلية. هذا المحرر يمثل (تعهداً بنقل الملكية) فقط، 
                                  ولا ينعقد البيع قانوناً إلا بالتسجيل في دائرة التسجيل العقاري.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-white/70 text-xs mb-2 font-medium">طبيعة المبيع</label>
                          <div className="flex gap-2">
                            <button type="button"
                              onClick={() => handleDetailsChange('sale', 'itemType', 'منقول (بضاعة/سيارة)')}
                              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                                contractDetails.sale.itemType === 'منقول (بضاعة/سيارة)'
                                  ? 'bg-cyan-600 text-white shadow-lg'
                                  : 'bg-black/30 text-white/50 hover:bg-black/50 hover:text-white border border-white/10'
                              }`}
                            >
                              منقول (بضاعة/سيارة)
                            </button>
                            <button type="button"
                              onClick={() => handleDetailsChange('sale', 'itemType', 'عقار (أرض/دار)')}
                              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                                contractDetails.sale.itemType === 'عقار (أرض/دار)'
                                  ? 'bg-cyan-600 text-white shadow-lg'
                                  : 'bg-black/30 text-white/50 hover:bg-black/50 hover:text-white border border-white/10'
                              }`}
                            >
                              عقار (أرض/دار)
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-white/70 text-xs mb-2 font-medium">وصف المبيع (دقيق ونافي للجهالة)</label>
                          <textarea
                            placeholder="مثال: قطعة أرض مساحتها 200 متر مربع، تقع في حي المنصور..."
                            rows={3}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-white/30 resize-none"
                            value={contractDetails.sale.description}
                            onChange={(e) => handleDetailsChange('sale', 'description', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-white/70 text-xs mb-2 font-medium">الثمن الكلي (دينار)</label>
                          <div className="relative">
                            <DollarSign size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                              type="number"
                              placeholder="50,000,000"
                              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pr-10 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-white/30"
                              value={contractDetails.sale.totalPrice}
                              onChange={(e) => handleDetailsChange('sale', 'totalPrice', e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-white/70 text-xs mb-2 font-medium">طريقة الدفع</label>
                          <select
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            value={contractDetails.sale.paymentMethod}
                            onChange={(e) => handleDetailsChange('sale', 'paymentMethod', e.target.value)}
                          >
                            <option value="دفعة واحدة نقداً">دفعة واحدة نقداً</option>
                            <option value="أقساط مجدولة">أقساط مجدولة</option>
                          </select>
                        </div>
                      </>
                    )}

                  </div>
                </motion.div>
              )}

            </div>

            <div className="xl:col-span-7 bg-gradient-to-br from-slate-200 to-slate-100 p-4 sm:p-8 rounded-2xl flex justify-center min-h-max">
              <ContractPaper
                contractData={contractData}
                contractDetails={contractDetails}
                isCanvasEmpty={isCanvasEmpty}
                formatArabicDate={formatArabicDate}
                activeShieldsArticles={activeShieldsArticles}
                contractSpecificArticles={contractSpecificArticles}
                willDefectsClause={willDefectsClause}
              />
            </div>

          </div>
        </div>
      </div>

      <style>{PRINT_STYLES}</style>
    </div>
  );
};
