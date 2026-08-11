// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [useCodeLogin, setUseCodeLogin] = useState(false)
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

  const handleCodeLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Ищем код в таблице invitation_codes
    const { data: codeData, error: codeError } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_used', false)
      .single()

    if (codeError || !codeData) {
      setError('Неверный код приглашения или он уже использован')
      setLoading(false)
      return
    }

    // Проверяем, существует ли пользователь с таким email
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', codeData.invited_email)
      .single()

    let authData, authError

    if (existingUser) {
      // Если пользователь уже существует — просто входим
      const { data, error } = await supabase.auth.signInWithPassword({
        email: codeData.invited_email,
        password: codeData.invited_password
      })
      authData = data
      authError = error
    } else {
      // Если пользователь не существует — регистрируем
      const { data, error } = await supabase.auth.signUp({
        email: codeData.invited_email,
        password: codeData.invited_password,
        options: {
          data: {
            full_name: codeData.invited_name,
            role: codeData.role
          }
        }
      })
      authData = data
      authError = error

      // Создаём профиль
      if (data.user) {
        await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            full_name: codeData.invited_name,
            email: codeData.invited_email,
            role: codeData.role
          }])

        // Если координатор КЮДа — привязываем к клубу
        if (codeData.role === 'club_coordinator' && codeData.club_id) {
          await supabase
            .from('club_coordinators')
            .insert([{
              profile_id: data.user.id,
              club_id: codeData.club_id
            }])
        }
      }
    }

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Отмечаем код как использованный
    await supabase
      .from('invitation_codes')
      .update({ 
        is_used: true, 
        used_at: new Date().toISOString(),
        used_by: authData.user?.id
      })
      .eq('id', codeData.id)

    navigate('/dashboard')
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
            background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '28px',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.3)'
          }}>
            🌍
          </div>
          <h1 style={{ fontSize: '20px', color: '#172033', marginBottom: '2px' }}>
            Детское общественное движение
          </h1>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
            «Дипломаты будущего»
          </h2>
          <p style={{
            fontSize: '10px',
            color: '#C9A227',
            fontWeight: '600',
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}>
            Ассоциация российских дипломатов
          </p>
          <div style={{
            marginTop: '8px',
            fontSize: '13px',
            color: '#667085'
          }}>
            {useCodeLogin ? 'Вход по коду приглашения' : 'Вход в систему'}
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#FCEBEC',
            color: '#B3262E',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ❌ {error}
          </div>
        )}

        {/* ПЕРЕКЛЮЧАТЕЛЬ СПОСОБА ВХОДА */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '20px',
          background: '#F4F6F9',
          borderRadius: '10px',
          padding: '4px'
        }}>
          <button
            type="button"
            onClick={() => setUseCodeLogin(false)}
            style={{
              flex: 1,
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              background: !useCodeLogin ? '#0B1F3A' : 'transparent',
              color: !useCodeLogin ? 'white' : '#667085',
              fontWeight: !useCodeLogin ? '600' : '400',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🔑 По логину
          </button>
          <button
            type="button"
            onClick={() => setUseCodeLogin(true)}
            style={{
              flex: 1,
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              background: useCodeLogin ? '#0B1F3A' : 'transparent',
              color: useCodeLogin ? 'white' : '#667085',
              fontWeight: useCodeLogin ? '600' : '400',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🎫 По коду
          </button>
        </div>

        {/* ФОРМА ВХОДА ПО ЛОГИНУ */}
        {!useCodeLogin && (
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
                padding: '14px',
                fontSize: '16px',
                marginTop: '8px'
              }}
            >
              {loading ? '⏳ Вход...' : '🔑 Войти'}
            </button>
          </form>
        )}

        {/* ФОРМА ВХОДА ПО КОДУ */}
        {useCodeLogin && (
          <form onSubmit={handleCodeLogin}>
            <div className="form-group">
              <label className="form-label">Код приглашения</label>
              <input
                type="text"
                className="form-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                placeholder="Например: ИВАНОВ123"
                style={{ textTransform: 'uppercase' }}
              />
              <div style={{
                fontSize: '12px',
                color: '#98A2B3',
                marginTop: '4px'
              }}>
                Введите код, который вы получили при приглашении
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-gold"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                marginTop: '8px'
              }}
            >
              {loading ? '⏳ Проверка...' : '🎫 Войти по коду'}
            </button>
          </form>
        )}

        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#667085'
        }}>
          Нет аккаунта?{' '}
          <a href="/register" style={{
            color: '#0B1F3A',
            fontWeight: '600',
            textDecoration: 'none',
            borderBottom: '2px solid #C9A227',
            paddingBottom: '2px'
          }}>
            Зарегистрироваться
          </a>
        </p>

        {useCodeLogin && (
          <p style={{
            marginTop: '12px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#98A2B3'
          }}>
            Если у вас нет кода приглашения, обратитесь к администратору
          </p>
        )}

        <div style={{
          marginTop: '20px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #C9A227, transparent)',
          borderRadius: '2px'
        }} />
      </div>
    </div>
  )
}