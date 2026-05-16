import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, type LucideIcon } from 'lucide-react';

export type FloatingAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
};

export function FloatingActionButton(props: {
  label?: string;
  actions: FloatingAction[];
}): React.JSX.Element {
  const [open, setOpen] = useState(false);

  const actions = useMemo(() => props.actions.slice(0, 3), [props.actions]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            aria-label="إغلاق قائمة الإجراءات"
            className="fixed inset-0 z-[60] bg-transparent"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        ) : null}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-[70]">
        <AnimatePresence>
          {open ? (
            <motion.div
              className="absolute bottom-[72px] right-0 flex flex-col gap-3 items-end"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              {actions.map((a, idx) => {
                const Icon = a.icon;
                return (
                  <motion.button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      a.onClick();
                      close();
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0D0D1A]/95 border border-white/10 shadow-xl backdrop-blur-xl text-white text-xs"
                  >
                    <span className="whitespace-nowrap">{a.label}</span>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-[#DAA520]/25 text-[#FFD700]">
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#0D0D1A]/95 border border-[#DAA520]/40 shadow-2xl backdrop-blur-xl text-[#FFD700]"
          aria-label={props.label ?? 'إجراء سريع'}
        >
          <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ type: 'spring', stiffness: 420, damping: 28 }}>
            <Plus size={24} strokeWidth={2} />
          </motion.div>
        </motion.button>
      </div>
    </>
  );
}
