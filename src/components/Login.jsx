import { useState } from 'react'
import { useAuth } from '../context/useAuth'

export function Login() {
  const { login, error: authError } = useAuth()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async () => {
    setError('')
    setIsSubmitting(true)
    try {
      await login()
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
      setIsSubmitting(false)
    }
  }

  return <div className="login-page">
    <div className="login-card">
      <div className="login-header">
        <span className="login-tag">Nodo Energético · Ciudad REE</span>
        <h1 className="login-title">EnergyShark</h1>
        <p className="login-subtitle">Plataforma de operación y negociación de energía</p>
      </div>
      {(error || authError) && <div className="alert-error" role="alert">{error || authError.message}</div>}
      <button type="button" className="btn-primary" onClick={handleLogin} disabled={isSubmitting}>
        {isSubmitting ? 'Redirigiendo...' : 'Iniciar sesión con Auth0'}
      </button>
      <div className="login-footer"><small>Ciudad de Re-Estize (REE)</small></div>
    </div>
  </div>
}
