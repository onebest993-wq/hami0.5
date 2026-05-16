import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface HorizontalCategoryPillProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  onClick?: () => void;
  highlighted?: boolean;
  className?: string;
}

export const HorizontalCategoryPill: React.FC<HorizontalCategoryPillProps> = ({
  title,
  subtitle,
  icon: Icon,
  onClick,
  highlighted = false,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-[30px] border text-right',
        'backdrop-blur-2xl transition-all duration-300',
        highlighted
          ? 'border-[#E6C673]/58 bg-[linear-gradient(115deg,rgba(46,78,156,0.26),rgba(11,21,53,0.66))] shadow-[0_0_28px_rgba(230,198,115,0.2)]'
          : 'border-[#E6C673]/38 bg-[linear-gradient(115deg,rgba(44,73,146,0.22),rgba(8,16,44,0.62))] shadow-[0_10px_28px_rgba(1,8,25,0.36)] hover:border-[#E6C673]/58',
        className
      )}
      dir="rtl"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(230,198,115,0.36)_0%,rgba(230,198,115,0.18)_20%,rgba(230,198,115,0.05)_41%,rgba(230,198,115,0)_58%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[1px] rounded-[28px] border border-white/10"
      />

      <span className="relative z-10 flex min-h-[82px] flex-row-reverse items-center justify-between px-4 py-3">
        <span
          className={cn(
            'relative flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full border',
            'bg-[radial-gradient(circle_at_28%_28%,rgba(255,238,194,0.42),rgba(230,198,115,0.18)_58%,rgba(10,15,28,0.2)_100%)]',
            'border-[#E6C673]/70 shadow-[0_0_16px_rgba(230,198,115,0.26),inset_0_0_10px_rgba(255,231,168,0.18)]'
          )}
        >
          <Icon
            className="h-7 w-7 text-[#E6C673] drop-shadow-[0_0_8px_rgba(230,198,115,0.58)]"
            strokeWidth={1.7}
          />
        </span>

        <span className="mx-3 flex-1 text-right">
          <span className="block truncate whitespace-nowrap text-[16px] font-bold leading-tight text-white md:text-[18px]">
            {title}
          </span>
          <span className="mt-1 block truncate whitespace-nowrap text-[12px] font-medium leading-tight text-white/70">
            {subtitle}
          </span>
        </span>

        <span className="shrink-0 pr-1 text-[#E6C673]/92">
          <ChevronLeft className="h-5 w-5 drop-shadow-[0_0_6px_rgba(230,198,115,0.52)]" strokeWidth={1.4} />
        </span>
      </span>
    </button>
  );
};

export default HorizontalCategoryPill;
