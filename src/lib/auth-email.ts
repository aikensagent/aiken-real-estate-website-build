export function isLikelyEmail(value: string): boolean {
  const email = value.trim()
  return email.length > 3 && email.length <= 254 && email.includes('@')
}
