import { describe, expect, it } from 'vitest'
import {
  authNextTarget,
  parseAuthNext,
  serializeAuthNext,
} from './auth-next'

const listingId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('auth next allowlist', () => {
  it('accepts home, account, listing, and saved-search tokens only', () => {
    expect(parseAuthNext('home')).toEqual({ kind: 'home' })
    expect(parseAuthNext('/')).toEqual({ kind: 'home' })
    expect(parseAuthNext('/account')).toEqual({ kind: 'account' })
    expect(parseAuthNext(`listing:${listingId}`)).toEqual({
      kind: 'listing',
      listingId,
    })
    expect(parseAuthNext(`saved:${listingId}`)).toEqual({
      kind: 'saved',
      savedId: listingId,
    })
    expect(authNextTarget('home')).toEqual({ to: '/' })
    expect(authNextTarget(`saved:${listingId}`)).toEqual({
      to: '/',
      search: { saved: listingId },
    })
    expect(authNextTarget(`listing:${listingId}`)).toEqual({
      to: '/listing/$listingId',
      params: { listingId },
    })
    expect(serializeAuthNext({ kind: 'home' })).toBe('home')
  })

  it('never follows an open redirect', () => {
    expect(parseAuthNext('https://evil.example')).toEqual({ kind: 'account' })
    expect(parseAuthNext('//evil.example')).toEqual({ kind: 'account' })
    expect(parseAuthNext('/login')).toEqual({ kind: 'account' })
    expect(parseAuthNext('../account')).toEqual({ kind: 'account' })
    expect(parseAuthNext('listing:nope')).toEqual({ kind: 'account' })
    expect(parseAuthNext('/listing/../account')).toEqual({ kind: 'account' })
    expect(authNextTarget(undefined).to).toBe('/account')
  })
})
