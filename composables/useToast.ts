import { ref } from 'vue'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
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

  function success(title: string, message?: string) {
    show({ type: 'success', title, message })
  }

  function error(title: string, message?: string) {
    show({ type: 'error', title, message })
  }

  function info(title: string, message?: string) {
    show({ type: 'info', title, message })
  }

  function warning(title: string, message?: string) {
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
