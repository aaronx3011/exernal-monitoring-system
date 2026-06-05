import { create } from 'zustand'
import api from './api'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  isLoading: false,
  error: null,
  initializing: true,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('auth_token', data.data.accessToken)
      set({ user: data.data.user, token: data.data.accessToken, isLoading: false })
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Login failed',
        isLoading: false,
      })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token')
    set({ user: null, token: null })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      set({ user: null, token: null, initializing: false })
      return
    }
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data.data, token, initializing: false })
    } catch {
      localStorage.removeItem('auth_token')
      set({ user: null, token: null, initializing: false })
    }
  },
}))

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token')
}
