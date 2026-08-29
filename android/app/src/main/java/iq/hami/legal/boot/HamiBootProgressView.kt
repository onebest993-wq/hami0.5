package iq.hami.legal.boot

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.provider.Settings
import android.util.AttributeSet
import android.view.View
import android.view.animation.LinearInterpolator
import androidx.core.content.ContextCompat
import iq.hami.legal.R

/**
 * شريط إقلاع رفيع — رسم برمجي فقط، بلا صور.
 * حركة غير محددة مستمرة حتى تُزال الطبقة بعد HamiBoot.notifyReady.
 */
class HamiBootProgressView
    @JvmOverloads
    constructor(
        context: Context,
        attrs: AttributeSet? = null,
        defStyleAttr: Int = 0,
    ) : View(context, attrs, defStyleAttr) {
        private val trackPaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                color = ContextCompat.getColor(context, R.color.splash_progress_track)
            }
        private val fillPaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
            }
        private val trackRect = RectF()
        private val fillRect = RectF()
        private var progress = 0f
        private var animator: ValueAnimator? = null

        init {
            importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
            setLayerType(LAYER_TYPE_HARDWARE, null)
        }

        override fun onAttachedToWindow() {
            super.onAttachedToWindow()
            startIfAllowed()
        }

        override fun onDetachedFromWindow() {
            animator?.cancel()
            animator = null
            super.onDetachedFromWindow()
        }

        override fun onSizeChanged(
            w: Int,
            h: Int,
            oldw: Int,
            oldh: Int,
        ) {
            super.onSizeChanged(w, h, oldw, oldh)
            trackRect.set(0f, 0f, w.toFloat(), h.toFloat())
            val gold = ContextCompat.getColor(context, R.color.splash_progress_gold)
            val hi = ContextCompat.getColor(context, R.color.splash_progress_gold_hi)
            fillPaint.shader = LinearGradient(0f, 0f, w.toFloat(), 0f, gold, hi, Shader.TileMode.CLAMP)
        }

        override fun onDraw(canvas: Canvas) {
            val radius = height / 2f
            canvas.drawRoundRect(trackRect, radius, radius, trackPaint)
            val span = width * 0.34f
            val travel = width + span
            val x = -span + travel * progress
            fillRect.set(x, 0f, x + span, height.toFloat())
            val save = canvas.save()
            canvas.clipRect(trackRect)
            canvas.drawRoundRect(fillRect, radius, radius, fillPaint)
            canvas.restoreToCount(save)
        }

        private fun startIfAllowed() {
            if (animator != null) return
            if (animationDurationScale() <= 0f) {
                progress = 0.32f
                invalidate()
                return
            }
            val anim = ValueAnimator.ofFloat(0f, 1f)
            anim.duration = 1100L
            anim.repeatCount = ValueAnimator.INFINITE
            anim.interpolator = LinearInterpolator()
            anim.addUpdateListener {
                progress = it.animatedValue as Float
                invalidate()
            }
            anim.start()
            animator = anim
        }

        private fun animationDurationScale(): Float =
            try {
                Settings.Global.getFloat(
                    context.contentResolver,
                    Settings.Global.ANIMATOR_DURATION_SCALE,
                    1f,
                )
            } catch (_: Throwable) {
                1f
            }
    }
