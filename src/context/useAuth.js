import { useAuth0 } from '@auth0/auth0-react'

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()

  return {
    user: user ? { name: user.name || user.nickname || user.email, email: user.email, cityId: 'REE', cityName: 'Re-Estize' } : null,
    isAuthenticated,
    loading: isLoading,
    error,
    login: () => loginWithRedirect(),
    logout: () => logout({ logoutParams: { returnTo: window.location.origin } }),
    getAccessToken: getAccessTokenSilently,
  }
}
