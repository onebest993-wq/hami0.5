/**
 * 🎯 Optimized List Component
 * مكون قوائم محسّن للأداء العالي
 */

import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { listStagger } from '@/app/animations/transitions';

interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  animated?: boolean;
  emptyMessage?: string;
}

function OptimizedListComponent<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
  animated = true,
  emptyMessage = 'لا توجد عناصر'
}: OptimizedListProps<T>) {
  
  // Memoize rendered items
  const renderedItems = useMemo(() => {
    return items.map((item, index) => {
      const key = keyExtractor(item, index);
      const content = renderItem(item, index);
      
      if (animated) {
        return (
          <motion.div
            key={key}
            variants={listStagger.item}
            initial="initial"
            animate="animate"
          >
            {content}
          </motion.div>
        );
      }
      
      return <div key={key}>{content}</div>;
    });
  }, [items, renderItem, keyExtractor, animated]);

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        {emptyMessage}
      </div>
    );
  }

  if (animated) {
    return (
      <motion.div 
        className={className}
        variants={listStagger.container}
        initial="initial"
        animate="animate"
      >
        {renderedItems}
      </motion.div>
    );
  }

  return <div className={className}>{renderedItems}</div>;
}

// Memo to prevent unnecessary re-renders
export const OptimizedList = memo(OptimizedListComponent) as typeof OptimizedListComponent;
