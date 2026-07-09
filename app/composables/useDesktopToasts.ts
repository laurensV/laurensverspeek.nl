// lvOS toast notifications: a transient queue plus a kept history for the
// notification center. Each entry auto-dismisses from the toast stack after a
// timeout but stays in history until cleared.

export interface Toast { id: number, icon: string, title: string, body?: string | undefined, at: number }

const HISTORY_MAX = 30

export function useDesktopToasts(timeout = 4200) {
  const toasts = ref<Toast[]>([])
  const history = ref<Toast[]>([])
  const unread = ref(0)
  let nextId = 0

  const notify = (icon: string, title: string, body?: string) => {
    const toast: Toast = { id: nextId++, icon, title, body, at: Date.now() }
    toasts.value.push(toast)
    history.value = [toast, ...history.value].slice(0, HISTORY_MAX)
    unread.value++
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== toast.id)
    }, timeout)
  }

  const markRead = () => {
    unread.value = 0
  }
  const clearHistory = () => {
    history.value = []
    unread.value = 0
  }

  return { toasts, history, unread, notify, markRead, clearHistory }
}
