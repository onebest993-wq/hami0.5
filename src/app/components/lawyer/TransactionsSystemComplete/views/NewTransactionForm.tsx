import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft, Building2, Users, FileText, Sparkles
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { Transaction, DepartmentType } from '../types';
import { DEPARTMENTS, TRANSACTION_TEMPLATES, DEPARTMENT_FIELDS } from '../constants';

interface NewTransactionFormProps {
  onBack: () => void;
  onSave: (tx: Transaction) => void;
  showTemplates: boolean;
}

export const NewTransactionForm = ({ onBack, onSave, showTemplates }: NewTransactionFormProps) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [proxyNumber, setProxyNumber] = useState('');
  const [proxyDate, setProxyDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentType | ''>('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customSteps, setCustomSteps] = useState<string[]>([]);

  const handleTemplateSelect = (templateKey: string) => {
    const template = TRANSACTION_TEMPLATES[templateKey as keyof typeof TRANSACTION_TEMPLATES];
    setSelectedTemplate(templateKey);
    setSelectedDepartment(template.department);
    setCustomSteps(template.steps);
  };

  const handleSave = () => {
    if (!clientName || !selectedDepartment) {
      SmartToast.error('الرجاء إدخال اسم الموكل واختيار الدائرة');
      return;
    }

    const steps = customSteps.length > 0
      ? customSteps.map((label, i) => ({ id: `s${i + 1}`, label, completed: false }))
      : [];

    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      clientName,
      clientPhone,
      departmentType: selectedDepartment as DepartmentType,
      transactionType: formData.transactionSubType || selectedTemplate || 'معاملة عامة',
      details: formData,
      status: 'pending',
      currentStep: 'تم الإنشاء',
      createdAt: new Date(),
      proxyNumber,
      proxyDate: proxyDate || undefined,
      steps,
      documents: [],
      expenses: [],
      lawyerFee: { total: 0, paid: 0, remaining: 0 }
    };

    onSave(newTransaction);
  };

  const currentFields = selectedDepartment ? DEPARTMENT_FIELDS[selectedDepartment as DepartmentType] : [];

  return (
    <div className="h-full pb-24">
      <div className="sticky top-0 z-50 bg-[#001830]/95 backdrop-blur-xl border-b border-[#D4AF37]/20">
        <div className="p-5 flex items-center justify-between">
          <button type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37]/10 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">معاملة جديدة</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {showTemplates && (
          <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#F4C430]/5 border border-[#D4AF37]/30 rounded-3xl p-6">
            <h3 className="text-[#D4AF37] font-bold text-base mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              قوالب جاهزة
            </h3>
            <div className="grid gap-3">
              {Object.entries(TRANSACTION_TEMPLATES).map(([key, template]) => (
                <motion.button
                  key={key}
                  onClick={() => handleTemplateSelect(key)}
                  className={`p-4 rounded-2xl text-right transition-all ${
                    selectedTemplate === key
                      ? 'bg-[#D4AF37] text-[#0D0D1A] shadow-lg'
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <p className="font-bold text-sm mb-1">{template.label}</p>
                  <p className={`text-xs ${selectedTemplate === key ? 'text-[#0D0D1A]/70' : 'text-gray-400'}`}>
                    {template.steps.length} خطوة جاهزة
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
          <h3 className="text-[#D4AF37] font-bold text-base mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            معلومات الموكل
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">اسم الموكل *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="الاسم الكامل..."
                className="w-full h-12 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">رقم الهاتف</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="07XXXXXXXXX"
                className="w-full h-12 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">رقم الوكالة</label>
                <input
                  type="text"
                  value={proxyNumber}
                  onChange={(e) => setProxyNumber(e.target.value)}
                  placeholder="9845/2024"
                  className="w-full h-12 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">تاريخ الوكالة</label>
                <input
                  type="date"
                  value={proxyDate}
                  onChange={(e) => setProxyDate(e.target.value)}
                  className="w-full h-12 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-[#D4AF37]/50 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {!selectedTemplate && (
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
            <h3 className="text-[#D4AF37] font-bold text-base mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              الدائرة المختصة *
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {DEPARTMENTS.filter(d => d.id !== 'all').map(dept => {
                const Icon = dept.icon;
                const isSelected = selectedDepartment === dept.id;
                return (
                  <motion.button
                    key={dept.id}
                    onClick={() => {
                      setSelectedDepartment(dept.id as DepartmentType);
                      setFormData({});
                    }}
                    className={`h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? `${dept.color} border-white/20 shadow-lg`
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                    <span className="text-xs font-medium text-white">{dept.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {selectedDepartment && currentFields.length > 0 && (
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
            <h3 className="text-[#D4AF37] font-bold text-base mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              تفاصيل المعاملة
            </h3>
            <div className="space-y-4">
              {currentFields.map(field => (
                <div key={field.id}>
                  <label className="text-gray-400 text-sm mb-2 block">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      className="w-full h-12 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-[#D4AF37]/50 transition"
                    >
                      <option value="">اختر...</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full h-12 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0D0D1A] via-[#0D0D1A] to-transparent">
        <div className="flex gap-3">
          <button type="button"
            onClick={onBack}
            className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl text-gray-400 font-medium hover:bg-white/10 transition"
          >
            إلغاء
          </button>
          <button type="button"
            onClick={handleSave}
            className="flex-[2] h-14 bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-2xl text-[#0D0D1A] font-bold shadow-lg shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50 transition"
          >
            حفظ وبدء المعاملة
          </button>
        </div>
      </div>
    </div>
  );
};
