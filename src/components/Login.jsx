import { useState } from 'react'
import { useAuth } from '../context/useAuth'

export function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('operador@re-estize.org')
  const [password, setPassword] = useState('contraseña123')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickDemo = () => {
    setEmail('operador@re-estize.org')
    setPassword('ree-demo-pass')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-tag">Nodo Energético · Ciudad REE</span>
          <h1 className="login-title">EnergyShark</h1>
          <p className="login-subtitle">
            Plataforma de Operación y Negociación de Energía (Re-Estize)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert-error" role="alert">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Correo institucional / Operador</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@re-estize.org"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleQuickDemo}
          >
            Cargar credenciales de prueba (Demo)
          </button>
        </form>

        <div className="login-footer">
          <span className="badge-g06">Gate G06 · Auth Mock</span>
          <small>
            Modo desarrollo local. En producción, la autenticación delega a Auth0 con JWK para API Gateway (RNF02).
          </small>
        </div>
      </div>
    </div>
  )
}
