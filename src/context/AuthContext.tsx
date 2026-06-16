import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import type { AuthIdentity, AuthStateResponse, AuthUser } from '../api/auth'

interface AuthContextValue {
  user: AuthUser | null
  identities: AuthIdentity[]
  isFirstUse: boolean
  loading: boolean
  error: string | null
  login: (input: { username: string; password: string; remember?: boolean }) => Promise<AuthStateResponse>
  register: (input: { username: string; displayName?: string; password: string }) => Promise<AuthStateResponse>
  logout: () => Promise<void>
  refreshUser: () => Promise<AuthStateResponse>
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>
  unlinkIdentity: (identityId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [identities, setIdentities] = useState<AuthIdentity[]>([])
  const [isFirstUse, setIsFirstUse] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applyState = useCallback((state: AuthStateResponse) => {
    setUser(state.user)
    setIdentities(state.identities)
    setIsFirstUse(state.isFirstUse)
    return state
  }, [])

  const refreshUser = useCallback(async () => {
    setError(null)
    try {
      return applyState(await authApi.getCurrentUser())
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载用户失败'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [applyState])

  useEffect(() => {
    void refreshUser().catch(() => undefined)
  }, [refreshUser])

  const login = useCallback(async (input: { username: string; password: string; remember?: boolean }) => {
    setError(null)
    try {
      return applyState(await authApi.login(input))
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      setError(message)
      throw err
    }
  }, [applyState])

  const register = useCallback(async (input: { username: string; displayName?: string; password: string }) => {
    setError(null)
    try {
      return applyState(await authApi.register(input))
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败'
      setError(message)
      throw err
    }
  }, [applyState])

  const logout = useCallback(async () => {
    setError(null)
    await authApi.logout()
    applyState({ user: null, identities: [], isFirstUse: false })
  }, [applyState])

  const changePassword = useCallback(async (input: { currentPassword: string; newPassword: string }) => {
    setError(null)
    await authApi.changePassword(input)
  }, [])

  const unlinkIdentity = useCallback(async (identityId: string) => {
    setError(null)
    await authApi.unlinkIdentity(identityId)
    await refreshUser()
  }, [refreshUser])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    identities,
    isFirstUse,
    loading,
    error,
    login,
    register,
    logout,
    refreshUser,
    changePassword,
    unlinkIdentity,
  }), [user, identities, isFirstUse, loading, error, login, register, logout, refreshUser, changePassword, unlinkIdentity])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
