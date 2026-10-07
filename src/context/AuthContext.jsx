/* oxlint-disable react/only-export-components */
import { createContext, useState } from 'react'

export const AuthContext = createContext(null)

const STORAGE_KEY_USER = 'energyshark_auth_user'
const STORAGE_KEY_TOKEN = 'energyshark_auth_token'

export function AuthProvider({ children }) {
  // Inicialización síncrona perezosa para evitar re-renders en efectos
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER)
      return savedUser ? JSON.parse(savedUser) : null
    } catch (err) {
      console.error('Error restaurando usuario:', err)
      return null
    }
  })

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TOKEN) || null
    } catch (err) {
      console.error('Error restaurando token:', err)
      return null
    }
  })

  // Login simulado (hardcoded hasta que P4 libere Auth0 / Gate G06)
  const login = async (email, password) => {
    await new Promise((resolve) => setTimeout(resolve, 250))

    if (!email || !password) {
      throw new Error('Por favor ingresa un correo y contraseña')
    }

    const mockUser = {
      name: email.split('@')[0] || 'Operador',
      email: email,
      cityId: 'REE',
      cityName: 'Re-Estize',
      role: 'admin',
    }

    const mockToken = `mock-jwt-${btoa(email)}-${Date.now()}`

    setUser(mockUser)
    setToken(mockToken)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mockUser))
    localStorage.setItem(STORAGE_KEY_TOKEN, mockToken)

    return mockUser
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_KEY_USER)
    localStorage.removeItem(STORAGE_KEY_TOKEN)
  }

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading: false,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
