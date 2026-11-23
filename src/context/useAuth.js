import { useState, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

const DEV_GET_TOKEN = async () => null

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()
  const [devUser, setDevUser] = useState(() => {
    try {
      const stored = localStorage.getItem('energyshark_dev_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const loginDev = useCallback(() => {
    const mock = { name: 'Pedro González (Operador REE)', email: 'pedro@energyshark.local', cityId: 'REE', cityName: 'Re-Estize' }
    localStorage.setItem('energyshark_dev_user', JSON.stringify(mock))
    setDevUser(mock)
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }, [])

  const logoutAll = useCallback((options) => {
    localStorage.removeItem('energyshark_dev_user')
    setDevUser(null)
    if (isAuthenticated && logout) {
      logout(options)
    }
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }, [isAuthenticated, logout])

  if (devUser) {
    return {
      user: devUser,
      isAuthenticated: true,
      loading: false,
      error: null,
      login: loginDev,
      logout: logoutAll,
      getAccessToken: DEV_GET_TOKEN,
      loginDev,
    }
  }

  return {
    user: user ? { name: user.name || user.nickname || user.email, email: user.email, cityId: 'REE', cityName: 'Re-Estize' } : null,
    isAuthenticated,
    loading: isLoading,
    error,
    login: () => loginWithRedirect(),
    logout: logoutAll,
    getAccessToken: getAccessTokenSilently,
    loginDev,
  }
}
