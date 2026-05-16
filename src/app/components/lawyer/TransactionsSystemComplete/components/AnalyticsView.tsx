import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft, CheckCircle2, TrendingUp, DollarSign,
  Eye, EyeOff, PieChart, Users, AlertCircle
} from 'lucide-react';
import type { Transaction } from '../types';
import { DEPARTMENTS } from '../constants';

export interface AnalyticsViewProps {
  transactions: Transaction[];
  onBack: () => void;
}

export const AnalyticsView = ({ transactions, onBack }: AnalyticsViewProps) => {
  const [showRevenue, setShowRevenue] = useState(false);

  const currentMonth = new Date().getMonth();
  const completedThisMonth = transactions.filter((t: Transaction) =>
    (t.status === 'completed' || t.status === 'archived') &&
    t.completedAt && new Date(t.completedAt).getMonth() === currentMonth
  ).length;

  const activeTransactions = transactions.filter((t: Transaction) =>
    t.status === 'in-progress' || t.status === 'pending'
  ).length;

  const totalRevenue = transactions
    .filter((t: Transaction) => t.status === 'completed' || t.status === 'archived')
    .reduce((sum: number, t: Transaction) => sum + t.lawyerFee.paid, 0);

  const deptCounts: Record<string, number> = {};
  transactions.forEach((t: Transaction) => {
    deptCounts[t.departmentType] = (deptCounts[t.departmentType] || 0) + 1;
  });

  const deptData = Object.entries(deptCounts).map(([type, count]) => {
    const dept = DEPARTMENTS.find(d => d.id === type);
    return {
      type,
      label: dept?.label || type,
      count,
      percentage: (count / transactions.length) * 100,
      color: dept?.color || 'bg-gray-500'
    };
  }).sort((a, b) => b.count - a.count);

  const clerkPerformance: Record<string, number> = {};
  transactions.forEach((t: Transaction) => {
    if (t.clerkAssigned) {
      clerkPerformance[t.clerkAssigned.name] = t.clerkAssigned.completedCount || 0;
    }
  });

  const clerkData = Object.entries(clerkPerformance)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

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
          <h1 className="text-lg font-bold text-white">الإحصائيات والأرباح</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500/30 rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <p className="text-green-400 text-xs font-medium">المنجزة هذا الشهر</p>
            </div>
            <p className="text-white font-bold text-4xl">{completedThisMonth}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-2 border-blue-500/30 rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <p className="text-blue-400 text-xs font-medium">قيد الإنجاز</p>
            </div>
            <p className="text-white font-bold text-4xl">{activeTransactions}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#D4AF37]/20 to-[#F4C430]/10 border-2 border-[#D4AF37]/40 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-[#D4AF37]" />
              <h3 className="text-[#D4AF37] font-bold text-lg">أرباح المعاملات</h3>
            </div>
            <button type="button"
              onClick={() => setShowRevenue(!showRevenue)}
              className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]"
            >
              {showRevenue ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
          <div className="text-center">
            {showRevenue ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white font-bold text-5xl"
              >
                {totalRevenue.toLocaleString()}
                <span className="text-2xl text-gray-400 mr-2">د.ع</span>
              </motion.p>
            ) : (
              <p className="text-gray-500 font-bold text-5xl">• • • • •</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-white font-bold text-base">توزيع المعاملات حسب الدوائر</h3>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {deptData.map((dept, i) => {
                    const prevTotal = deptData.slice(0, i).reduce((sum, d) => sum + d.percentage, 0);
                    const strokeDasharray = `${dept.percentage} ${100 - dept.percentage}`;
                    const strokeDashoffset = -prevTotal;

                    const colorMap: Record<string, string> = {
                      'bg-blue-500': '#3b82f6',
                      'bg-green-500': '#22c55e',
                      'bg-orange-500': '#f97316',
                      'bg-purple-500': '#a855f7',
                      'bg-pink-500': '#ec4899',
                      'bg-gray-500': '#6b7280',
                      'bg-[#D4AF37]': '#D4AF37'
                    };

                    const strokeColor = colorMap[dept.color] || '#6b7280';

                    return (
                      <circle
                        key={dept.type}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="20"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        opacity="0.8"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <p className="text-white font-bold text-3xl">{transactions.length}</p>
                  <p className="text-gray-400 text-xs">معاملة</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {deptData.map(dept => (
                <div key={dept.type} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${dept.color}`} />
                    <span className="text-white text-sm">{dept.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">{Math.round(dept.percentage)}%</span>
                    <span className="text-white font-bold">{dept.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {clerkData.length > 0 && (
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="text-white font-bold text-base">أداء المندوبين</h3>
            </div>
            <div className="space-y-3">
              {clerkData.map((clerk, i) => (
                <div key={clerk.name} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    i === 0 ? 'bg-[#D4AF37] text-[#0D0D1A]' : 'bg-white/10 text-gray-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold">{clerk.name}</p>
                    <p className="text-gray-400 text-xs">معقب ميداني</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[#D4AF37] font-bold text-2xl">{clerk.count}</p>
                    <p className="text-gray-500 text-xs">معاملة</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
