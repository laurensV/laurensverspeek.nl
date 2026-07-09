// GoatCounter's public counter returns counts as display strings ("12 345").
// Turn one into odometer digits: strip the formatting, pad to six wheels.
export function formatHits(count: string, wheels = 6): string[] | null {
  const digits = count.replace(/\D/g, '')
  if (!digits) return null
  return digits.padStart(wheels, '0').split('')
}
