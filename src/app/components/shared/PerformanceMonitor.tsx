/**
 * 📊 Performance Monitor Component
 * مراقب الأداء في الوقت الفعلي
 */

import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Zap, Clock } from 'lucide-react';
import { slideFromTop, fadeTransitions } from '@/app/animations/transitions';

interface PerformanceMetrics {
  fps: number;
  memory: number;
  renderTime: number;
  componentsRendered: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  visible?: boolean;
  onToggleVisible?: (visible: boolean) => void;
}

const PerformanceMonitorComponent: React.FC<PerformanceMonitorProps> = ({ 
  enabled = false, 
  visible = false,
  onToggleVisible 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    renderTime: 0,
    componentsRendered: 0
  });

  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measurePerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / deltaTime);
        
        // Get memory info if available
        const memory = (performance as any).memory 
          ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) 
          : 0;

        setMetrics(prev => ({
          fps,
          memory,
          renderTime: Math.round(deltaTime / frameCount),
          componentsRendered: prev.componentsRendered + frameCount
        }));

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measurePerformance);
    };

    animationFrameId = requestAnimationFrame(measurePerformance);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled]);

  if (!enabled) return null;

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return '#10b981'; // Green
    if (fps >= 30) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  return (
    <>
      {/* Performance Panel */}
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed top-36 left-4 z-[9999] w-64 bg-[#0D0D1A]/95 backdrop-blur-xl border border-[#DAA520]/30 rounded-2xl p-4 shadow-2xl"
            {...slideFromTop}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#DAA520] font-bold text-sm">مراقب الأداء</h3>
              <motion.div
                className="w-2 h-2 rounded-full bg-green-500"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              {/* FPS */}
              <motion.div 
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                {...fadeTransitions}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: getFPSColor(metrics.fps) }} />
                  <span className="text-white text-sm">FPS</span>
                </div>
                <span 
                  className="font-bold text-lg"
                  style={{ color: getFPSColor(metrics.fps) }}
                >
                  {metrics.fps}
                </span>
              </motion.div>

              {/* Render Time */}
              <motion.div 
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                {...fadeTransitions}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-sm">وقت الرندر</span>
                </div>
                <span className="font-bold text-lg text-blue-400">
                  {metrics.renderTime}ms
                </span>
              </motion.div>

              {/* Memory */}
              {metrics.memory > 0 && (
                <motion.div 
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                  {...fadeTransitions}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span className="text-white text-sm">الذاكرة</span>
                  </div>
                  <span className="font-bold text-lg text-purple-400">
                    {metrics.memory}MB
                  </span>
                </motion.div>
              )}

              {/* Status */}
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">الحالة</span>
                  <span className="text-[#DAA520] font-medium">
                    {metrics.fps >= 55 ? '⚡ ممتاز' : metrics.fps >= 30 ? '⚠️ جيد' : '🐌 بطيء'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const PerformanceMonitor = memo(PerformanceMonitorComponent);