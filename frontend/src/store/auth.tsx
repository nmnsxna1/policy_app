import { createContext, useContext, useState, type ReactNode } from 'react'
import api from '../services/api'
import type { AuthState } from '../types'

interface AuthContextType {
  auth: AuthState | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const stored = localStorage.getItem('auth')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password })
    const data = res.data as AuthState
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('auth', JSON.stringify(data))
    setAuth(data)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('auth')
    setAuth(null)
  }

  const isAuthenticated = !!auth

  return (
    <AuthContext.Provider value={{ auth, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
