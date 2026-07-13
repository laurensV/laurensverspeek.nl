/**
 * Best-effort browser label from a user-agent string. One shared implementation
 * so the terminal `sysinfo` card and the lvOS "About This Computer" dialog can't
 * disagree — they used to: `sysinfo` had no Opera branch and mislabelled it
 * "Chrome". Order matters: Edge and Opera both carry "Chrome/" in their UA, so
 * they must be tested first.
 */
export function browserName(ua: string): string {
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'an exotic browser'
}
