// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="auth-bg">
      <div className="card" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '40px',
        animation: 'fadeIn 0.5s ease',
        position: 'relative',
        zIndex: 1
      }}>
        {/* ЛОГОТИП */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, var(--mid-blue), var(--mid-blue-light))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '28px',
            boxShadow: '0 4px 16px rgba(11, 43, 74, 0.3)'
          }}>
            🌍
          </div>
          <h1 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '2px' }}>
            Дипломаты будущего
          </h1>
          <p style={{ 
            fontSize: '12px', 
            color: 'var(--gold)', 
            fontWeight: '600',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            МИД РФ • Вход в систему
          </p>
        </div>

        {/* ОШИБКА */}
        {error && (
          <div style={{
            padding: '14px',
            background: '#FED7D7',
            color: '#9B2C2C',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center',
            borderLeft: '4px solid #D4202B'
          }}>
            ❌ {error}
          </div>
        )}

        {/* ФОРМА */}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@mail.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Введите пароль"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '16px', 
              fontSize: '16px',
              marginTop: '8px'
            }}
          >
            {loading ? '⏳ Вход...' : '🔑 Войти'}
          </button>
        </form>

        <p style={{ 
          marginTop: '24px', 
          textAlign: 'center', 
          fontSize: '14px', 
          color: 'var(--text-secondary)'
        }}>
          Нет аккаунта?{' '}
          <a href="/register" style={{ 
            color: 'var(--mid-blue)', 
            fontWeight: '600',
            textDecoration: 'none',
            borderBottom: '2px solid var(--gold)',
            paddingBottom: '2px'
          }}>
            Зарегистрироваться
          </a>
        </p>

        {/* ЗОЛОТАЯ ЛИНИЯ ВНИЗУ */}
        <div style={{
          marginTop: '24px',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
          borderRadius: '2px'
        }} />
      </div>
    </div>
  )
}