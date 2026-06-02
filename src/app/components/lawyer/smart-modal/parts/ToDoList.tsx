import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Plus, Clock, Check, Edit3 } from 'lucide-react';
import type { Task } from '../../LawyerShared';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';

export const ToDoList = ({ tasks, onAddTask, onToggleTask, onEditTask }: { tasks: Task[], onAddTask: () => void, onToggleTask: (id: string) => void, onEditTask: (task: Task) => void }) => {
    const sortedTasks = [...tasks].sort((a, b) => (a.isCompleted === b.isCompleted) ? 0 : a.isCompleted ? 1 : -1);

    return (
        <div className="mb-6">
            {/* 1. SLIM ELEGANT HEADER */}
            <div className="flex items-center justify-between bg-[#1A1E2E] border border-white/10 rounded-lg px-4 py-2.5 mb-2 shadow-sm" dir="rtl">
                <h3 className="text-[#E6C673] text-xs font-bold flex items-center gap-2">
                    المهام الإدارية
                    <CheckSquare size={14} className="text-[#E6C673]" />
                </h3>
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.taskAdd}
                    onClick={onAddTask}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    title="إضافة مهمة جديد"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* 2. TRANSPARENT TASK LIST */}
            <div className="space-y-0 relative">
                <AnimatePresence>
                    {sortedTasks.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            className="text-center py-4"
                        >
                            <p className="text-[10px] text-white/20">لا توجد مهام مسجلة</p>
                        </motion.div>
                    ) : (
                        sortedTasks.map((task, idx) => (
                            <motion.div
                                key={task.id}
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.taskRow(task.id)}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`flex items-start gap-3 py-3 px-2 group ${idx !== sortedTasks.length - 1 ? 'border-b border-white/[0.03]' : ''}`}
                            >
                                <button type="button" 
                                    onClick={() => onToggleTask(task.id)}
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all mt-0.5 shrink-0 ${
                                        task.isCompleted 
                                            ? 'bg-[#E6C673] border-[#E6C673] text-black shadow-[0_0_10px_rgba(230,198,115,0.4)]' 
                                            : 'border-white/20 hover:border-[#E6C673]/50 bg-transparent'
                                    }`}
                                >
                                    {task.isCompleted && <Check size={10} strokeWidth={3} />}
                                </button>
                                
                                <div className={`flex-1 transition-all ${task.isCompleted ? 'opacity-30' : 'opacity-90'}`}>
                                    <p className={`text-xs font-medium leading-relaxed ${task.isCompleted ? 'line-through decoration-white/20' : 'text-white'}`}>
                                        {task.title}
                                    </p>
                                    {task.dueDate && !task.isCompleted && (
                                        <span className="text-[9px] text-[#E6C673]/60 flex items-center gap-1 mt-1 font-mono">
                                            <Clock size={8} /> {task.dueDate}
                                        </span>
                                    )}
                                </div>

                                <button type="button" 
                                    onClick={() => onEditTask(task)}
                                    className="text-slate-400 hover:text-amber-500 transition-colors ml-2 opacity-0 group-hover:opacity-100"
                                    title="تعديل المهمة"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
