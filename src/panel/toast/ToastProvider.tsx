import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

export type ToastType = "loading" | "success" | "error"

export type ToastPayload = {
  id?: string
  type: ToastType
  text: string
  durationMs?: number
}

type ToastState = ToastPayload & { visible: boolean }

type ToastApi = {
  show: (payload: ToastPayload) => void
  hide: () => void
}

const ToastContext = createContext<ToastApi | null>(null)

function Icon({ type }: { type: ToastType }) {
  if (type === "loading") {
    return (
      <svg className="h-4 w-4 animate-spin text-slate-700" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path
          className="opacity-90"
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (type === "success") {
    return (
      <svg className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-8.25 8.3a1 1 0 0 1-1.42 0l-3.75-3.77a1 1 0 0 1 1.42-1.41l3.04 3.06 7.54-7.594a1 1 0 0 1 1.414 0Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  return (
    <svg className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm2.83-10.83a1 1 0 0 0-1.41 0L10 8.59 8.58 7.17a1 1 0 1 0-1.41 1.41L8.59 10l-1.42 1.42a1 1 0 1 0 1.41 1.41L10 11.41l1.42 1.42a1 1 0 0 0 1.41-1.41L11.41 10l1.42-1.42a1 1 0 0 0 0-1.41Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ToastView({ toast }: { toast: ToastState }) {
  if (!toast.visible) return null

  return (
    <div className="fixed left-1/2 top-3 z-[9999] -translate-x-1/2">
      <div className="flex max-w-[92vw] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg">
        <Icon type={toast.type} />
        <div className="max-w-[80vw] whitespace-pre-wrap break-words">{toast.text}</div>
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const timerRef = useRef<number | null>(null)
  const [toast, setToast] = useState<ToastState>({ visible: false, type: "success", text: "" })

  const hide = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToast((prev) => ({ ...prev, visible: false }))
  }, [])

  const show = useCallback(
    (payload: ToastPayload) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }

      setToast((prev) => {
        if (payload.id && prev.visible && prev.id === payload.id) return { ...prev, ...payload, visible: true }
        return { ...payload, visible: true }
      })

      if (payload.type !== "loading") {
        const ms = payload.durationMs ?? 1800
        timerRef.current = window.setTimeout(() => {
          setToast((prev) => ({ ...prev, visible: false }))
          timerRef.current = null
        }, ms)
      }
    },
    [],
  )

  useEffect(() => hide, [hide])

  const api = useMemo<ToastApi>(() => ({ show, hide }), [show, hide])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastView toast={toast} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("ToastProvider missing")
  return ctx
}

