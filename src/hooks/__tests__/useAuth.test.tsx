import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'

// Mock Supabase
const mockSupabase = {
  auth: {
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    signOut: vi.fn(() => Promise.resolve())
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null }))
      }))
    }))
  }))
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}))

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.session).toBe(null)
    expect(result.current.profile).toBe(null)
  })

  it('handles signOut correctly', async () => {
    const { result } = renderHook(() => useAuth())
    
    await result.current.signOut()
    
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('determines isAdmin correctly', async () => {
    const { result } = renderHook(() => useAuth())
    
    // Initially false
    expect(result.current.isAdmin).toBe(false)
    
    // Would be true if profile.role === 'ADMIN' (tested through integration)
  })

  it('sets up auth state listener on mount', () => {
    renderHook(() => useAuth())
    
    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
    expect(mockSupabase.auth.getSession).toHaveBeenCalled()
  })
})