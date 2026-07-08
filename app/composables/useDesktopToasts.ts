// lvOS toast notifications: a small queue that auto-dismisses each entry after
// a timeout. Extracted from WebDesktop so the shell just calls notify().

export interface Toast { id: number, icon: string, title: string, body?: string }

export function useDesktopToasts(timeout = 4200) {
  const toasts = ref<Toast[]>([])
  let nextId = 0

  const notify = (icon: string, title: string, body?: string) => {
    const id = nextId++
    toasts.value.push({ id, icon, title, body })
    setTimeout(() => {
      toasts.value = toasts.value.filter((toast) => toast.id !== id)
    }, timeout)
  }

  return { toasts, notify }
}
