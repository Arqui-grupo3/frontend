import { Auth0Provider } from '@auth0/auth0-react'

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const audience = import.meta.env.VITE_AUTH0_AUDIENCE

export function AuthProvider({ children }) {
  if (!domain || !clientId || !audience) {
    return <main className="auth-config-error" role="alert">
      <h1>Falta configurar Auth0</h1>
      <p>Copia <code>.env.example</code> a <code>.env.local</code> y completa las variables VITE_AUTH0_*. Luego reinicia Vite.</p>
    </main>
  }

  return <Auth0Provider
    domain={domain}
    clientId={clientId}
    authorizationParams={{ redirect_uri: window.location.origin, audience }}
    cacheLocation="localstorage"
    useRefreshTokens={true}
  >{children}</Auth0Provider>
}
