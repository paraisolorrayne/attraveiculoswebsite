'use client'

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'loading'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => string
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    setToasts((prev) => [...prev, { id, type, message }])

    if (type !== 'loading' && duration > 0) {
      setTimeout(() => hideToast(id), duration)
    }

    return id
  }, [hideToast])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border pointer-events-auto',
              'animate-slide-up backdrop-blur-lg',
              'min-w-[280px] max-w-[400px]',
              toast.type === 'success' && 'bg-green-700/95 border-green-600/50 text-white',
              toast.type === 'error' && 'bg-red-500/95 border-red-400/50 text-white',
              toast.type === 'loading' && 'bg-background-card/95 border-border text-foreground'
            )}
          >
            {/* Icon */}
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 shrink-0" />}
            {toast.type === 'loading' && <Loader2 className="w-5 h-5 shrink-0 animate-spin text-primary" />}
            
            {/* Message */}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            
            {/* Close button */}
            {toast.type !== 'loading' && (
              <button
                onClick={() => hideToast(toast.id)}
                className="p-1 hover:bg-white/20 rounded transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

