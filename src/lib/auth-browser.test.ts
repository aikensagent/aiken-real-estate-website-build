import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isLikelyEmail } from './auth-email'

const here = dirname(fileURLToPath(import.meta.url))

describe('buyer auth', () => {
  it('accepts a normal email and rejects empty values', () => {
    expect(isLikelyEmail('buyer@example.com')).toBe(true)
    expect(isLikelyEmail('nope')).toBe(false)
    expect(isLikelyEmail('')).toBe(false)
  })

  it('gates /account behind magic-link claim and keeps supabase off the dashboard file', () => {
    const account = readFileSync(join(here, '../routes/account.tsx'), 'utf8')
    const browser = readFileSync(join(here, 'auth-browser.ts'), 'utf8')
    const login = readFileSync(join(here, '../routes/login.tsx'), 'utf8')
    const callback = readFileSync(
      join(here, '../routes/auth.callback.tsx'),
      'utf8'
    )
    const rpc = readFileSync(join(here, '../routes/api/-account-auth.ts'), 'utf8')
    const migration = readFileSync(
      join(here, '../../supabase/migrations/20260813_buyer_account_auth.sql'),
      'utf8'
    )
    expect(account).toContain('resolveBuyerAccount')
    expect(account).toContain('Sign out')
    expect(account).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(account).not.toMatch(/from ['"][^'"]*ChatWidget['"]/)
    expect(browser).toContain('signInWithOtp')
    expect(browser).toContain('onAuthStateChange')
    expect(browser).toContain('A link was already sent')
    expect(login).toContain('Email me a sign-in link')
    expect(login).toContain('consent')
    expect(login).toContain('useBuyerSignedIn')
    expect(login).toContain("to: '/account'")
    expect(callback).toContain('completeMagicLink')
    expect(callback).toContain('resolveBuyerAccount')
    expect(rpc).toContain('claim_buyer_account')
    expect(rpc).toContain('buyerUserClient')
    const userClient = readFileSync(join(here, 'buyer-user-client.ts'), 'utf8')
    expect(userClient).toContain('Authorization')
    expect(migration).toContain('auth.uid()')
    expect(migration).toContain('security definer')
    expect(migration).toContain('visitor_session_key')
    expect(migration).toMatch(/grant execute on function public.claim_buyer_account/)
    expect(migration).toMatch(/revoke all on function public.claim_buyer_account/)
    const link = readFileSync(
      join(here, '../components/SiteAccountLink.tsx'),
      'utf8'
    )
    expect(link).toContain("to=\"/login\"")
    expect(link).toContain('Sign in')
    expect(link).toContain('Dashboard')
    expect(link).toContain('bg-brand-gold')
    expect(link).toContain('text-brand-navy')
    expect(link).toContain('hover:text-brand-navy')
    const styles = readFileSync(join(here, '../styles.css'), 'utf8')
    expect(styles).toContain('@layer base')
    expect(styles).toContain('color: var(--color-brand-navy);')
    expect(styles).not.toContain('color: var(--lagoon-deep);')
  })
})
