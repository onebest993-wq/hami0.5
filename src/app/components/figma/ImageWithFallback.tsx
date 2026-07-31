import React, { useEffect, useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

const ERROR_IMG_SRC_DARK =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjQTg5NEIwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuNDUiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMy43Ij48cmVjdCB4PSIxNiIgeT0iMTYiIHdpZHRoPSI1NiIgaGVpZ2h0PSI1NiIgcng9IjYiLz48cGF0aCBkPSJtMTYgNTggMTYtMTggMzIgMzIiLz48Y2lyY2xlIGN4PSI1MyIgY3k9IjM1IiByPSI3Ii8+PC9zdmc+Cg=='

export type ImageWithFallbackProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  /** سطح الخطأ — dark يمنع البقع البيضاء داخل المنتدى */
  errorTone?: 'light' | 'dark'
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)

  useEffect(() => {
    setDidError(false)
  }, [props.src])

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, fetchPriority, onError, errorTone = 'light', ...rest } = props
  const isDark = errorTone === 'dark'
  /** React 18 DOM: camelCase `fetchPriority` warns — use lowercase attribute. */
  const fetchPriorityAttr =
    fetchPriority != null
      ? ({ fetchpriority: fetchPriority } as React.ImgHTMLAttributes<HTMLImageElement>)
      : undefined

  return didError ? (
    <div
      className={`inline-block text-center align-middle ${className ?? ''} ${
        isDark ? 'bg-[#241018]' : 'bg-gray-100'
      }`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full min-h-[100px]">
        <img
          src={isDark ? ERROR_IMG_SRC_DARK : ERROR_IMG_SRC}
          alt="Error loading image"
          {...rest}
          data-original-url={src}
        />
      </div>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...fetchPriorityAttr}
      {...rest}
      onError={(event) => {
        onError?.(event)
        handleError()
      }}
    />
  )
}
