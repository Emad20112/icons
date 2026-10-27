import { ref } from 'vue'

/**
 * A translatable toast string. Prefer `{ key: 'toast.x', params: { ... } }`
 * over raw English text so the message is rendered in the active locale.
 */
export type ToastText = string | { key: string; params?: Record<string, unknown> }

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: ToastText
  message?: ToastText
}

const toasts = ref<ToastItem[]>([])

export function useToast() {
  function show(toast: Omit<ToastItem, 'id'>, duration = 4000) {
    const id = `t-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const item = { ...toast, id }
    toasts.value.push(item)

    setTimeout(() => {
      dismiss(id)
    }, duration)
  }

  function success(title: ToastText, message?: ToastText) {
    show({ type: 'success', title, message })
  }

  function error(title: ToastText, message?: ToastText) {
    show({ type: 'error', title, message })
  }

  function info(title: ToastText, message?: ToastText) {
    show({ type: 'info', title, message })
  }

  function warning(title: ToastText, message?: ToastText) {
    show({ type: 'warning', title, message })
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    show,
    success,
    error,
    info,
    warning,
    dismiss
  }
}
