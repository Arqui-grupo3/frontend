import { useState } from 'react'
import { useAuth } from '../context/useAuth'

export function Login() {
  const { login, loginDev, error: authError } = useAuth()
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

      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={loginDev}
          style={{
            marginTop: '12px',
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            background: '#EEF5F6',
            border: '1px solid #DCE5E7',
            color: '#087782',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          ⚡ Acceder en Modo Local (Operador REE)
        </button>
      )}

      <div className="login-footer"><small>Ciudad de Re-Estize (REE)</small></div>
    </div>
  </div>
}
