// src/pages/Profile.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [activeTab, setActiveTab] = useState('profile')
  const [consents, setConsents] = useState([])
  const [consentsLoading, setConsentsLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    loadProfile()
    loadConsents()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Ошибка загрузки профиля:', error)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  const loadConsents = async () => {
    setConsentsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id)
      .order('given_at', { ascending: false })

    if (!error) {
      setConsents(data || [])
    }
    setConsentsLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone || '',
        school: profile.school || '',
        class_name: profile.class_name || '',
        interests: profile.interests || '',
        bio: profile.bio || '',
        city: profile.city || ''
      })
      .eq('id', profile.id)

    if (error) {
      setMessage('❌ Ошибка: ' + error.message)
      setMessageType('error')
    } else {
      setMessage('✅ Профиль успешно обновлён!')
      setMessageType('success')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  const handleRevokeAllConsents = async () => {
    if (!confirm('Вы уверены, что хотите отозвать все согласия?')) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setConsentsLoading(true)

    const { error: updateError } = await supabase
      .from('user_consents')
      .update({
        revoked_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .is('revoked_at', null)

    if (updateError) {
      setMessage('❌ Ошибка при отзыве согласий: ' + updateError.message)
      setMessageType('error')
      setConsentsLoading(false)
      return
    }

    await supabase.from('consent_logs').insert([
      {
        user_id: user.id,
        action: 'revoked_all',
        consent_type: 'all',
        ip_address: '...',
        user_agent: navigator.userAgent || 'unknown',
        details: { timestamp: new Date().toISOString() }
      }
    ])

    setMessage('✅ Все согласия отозваны')
    setMessageType('success')
    await loadConsents()
    setConsentsLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleRevokeSingleConsent = async (consentId) => {
    if (!confirm('Отозвать это согласие?')) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('user_consents')
      .update({
        revoked_at: new Date().toISOString()
      })
      .eq('id', consentId)

    if (error) {
      setMessage('❌ Ошибка: ' + error.message)
      setMessageType('error')
    } else {
      setMessage('✅ Согласие отозвано')
      setMessageType('success')
      await loadConsents()
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const getConsentLabel = (type) => {
    const labels = {
      'personal_data': 'Согласие на обработку персональных данных',
      'has_read_privacy': 'Ознакомление с Политикой обработки ПД',
      'minor_personal_data': 'Согласие на обработку ПД несовершеннолетнего',
      'image_use': 'Согласие на использование изображения',
      'photo_publication': 'Согласие на публикацию фотографий',
      'marketing': 'Согласие на получение рекламных материалов'
    }
    return labels[type] || type
  }

  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Администратор',
      participant: 'Участник',
      parent: 'Родитель',
      coordinator: 'Координатор КЮДа',
      club_coordinator: 'Координатор КЮДа',
      movement_coordinator: 'Координатор движения',
      tutor: 'Тьютор'
    }
    return roles[role] || role
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px', maxWidth: '800px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>👤 Мой профиль</h1>
          <span style={{
            background: '#0B1F3A',
            color: 'white',
            padding: '4px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {getRoleLabel(profile?.role)}
          </span>
        </div>
        <p style={{ color: '#667085', marginBottom: '24px' }}>
          Управление личными данными и согласиями
        </p>

        {/* ВКЛАДКИ */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid #E2E7EF',
          paddingBottom: '4px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '10px 24px',
              border: 'none',
              background: activeTab === 'profile' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'profile' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'profile' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            📋 Профиль
          </button>
          
          <button
            onClick={() => setActiveTab('achievements')}
            style={{
              padding: '10px 24px',
              border: 'none',
              background: activeTab === 'achievements' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'achievements' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'achievements' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            🏆 Достижения
          </button>
          
          <button
            onClick={() => setActiveTab('activities')}
            style={{
              padding: '10px 24px',
              border: 'none',
              background: activeTab === 'activities' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'activities' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'activities' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            🎯 Кружки
          </button>
          
          <button
            onClick={() => setActiveTab('consents')}
            style={{
              padding: '10px 24px',
              border: 'none',
              background: activeTab === 'consents' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'consents' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'consents' ? '600' : '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            📄 Согласия
          </button>
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '16px',
            textAlign: 'center',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}

        {/* ===== ВКЛАДКА: ПРОФИЛЬ ===== */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} className="card" style={{ padding: '32px', background: 'white', borderRadius: '16px', border: '1px solid #E2E7EF' }}>
            <div className="form-group">
              <label className="form-label">ФИО</label>
              <input
                type="text"
                className="form-input"
                value={profile?.full_name || ''}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={profile?.email || ''}
                disabled
                style={{ background: '#F4F6F9', cursor: 'not-allowed' }}
              />
              <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                Email нельзя изменить — это ваш логин
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Телефон</label>
              <input
                type="tel"
                className="form-input"
                value={profile?.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+7 (XXX) XXX-XX-XX"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Город</label>
              <input
                type="text"
                className="form-input"
                value={profile?.city || ''}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder="Москва"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Школа</label>
              <input
                type="text"
                className="form-input"
                value={profile?.school || ''}
                onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                placeholder="Школа №1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Класс</label>
              <input
                type="text"
                className="form-input"
                value={profile?.class_name || ''}
                onChange={(e) => setProfile({ ...profile, class_name: e.target.value })}
                placeholder="8А"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Интересы</label>
              <input
                type="text"
                className="form-input"
                value={profile?.interests || ''}
                onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
                placeholder="Дипломатия, история, иностранные языки"
              />
            </div>

            <div className="form-group">
              <label className="form-label">О себе</label>
              <textarea
                className="form-input"
                rows="3"
                value={profile?.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Расскажите о себе..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Роль</label>
              <input
                type="text"
                className="form-input"
                value={getRoleLabel(profile?.role) || ''}
                disabled
                style={{ background: '#F4F6F9', cursor: 'not-allowed' }}
              />
            </div>

            {profile?.birth_date && (
              <div className="form-group">
                <label className="form-label">Дата рождения</label>
                <input
                  type="date"
                  className="form-input"
                  value={profile.birth_date || ''}
                  disabled
                  style={{ background: '#F4F6F9', cursor: 'not-allowed' }}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ width: '100%', padding: '14px', marginTop: '8px' }}
            >
              {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
            </button>
          </form>
        )}

        {/* ===== ВКЛАДКА: ДОСТИЖЕНИЯ (пустая, с пояснением) ===== */}
        {activeTab === 'achievements' && (
          <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E7EF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🏆 Мои достижения
            </h3>
            <div style={{ padding: '30px', textAlign: 'center', background: '#F4F6F9', borderRadius: '10px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
              <p style={{ color: '#667085', fontSize: '16px' }}>Управление достижениями</p>
              <p style={{ fontSize: '13px', color: '#98A2B3', marginTop: '4px' }}>
                Достижения выдаются координаторами и администраторами
              </p>
              <p style={{ fontSize: '13px', color: '#98A2B3', marginTop: '4px' }}>
                📌 Обратитесь к координатору вашего КЮДа для получения информации
              </p>
            </div>
          </div>
        )}

        {/* ===== ВКЛАДКА: КРУЖКИ ===== */}
        {activeTab === 'activities' && (
          <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E7EF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🎯 Мои кружки и увлечения
            </h3>
            <div style={{ padding: '20px', textAlign: 'center', background: '#F4F6F9', borderRadius: '10px' }}>
              <p style={{ color: '#667085' }}>Раздел в разработке</p>
              <p style={{ fontSize: '13px', color: '#98A2B3', marginTop: '4px' }}>
                Скоро здесь появится возможность добавлять кружки
              </p>
            </div>
          </div>
        )}

        {/* ===== ВКЛАДКА: СОГЛАСИЯ ===== */}
        {activeTab === 'consents' && (
          <div>
            <div className="card" style={{ padding: '24px', marginBottom: '20px', background: 'white', borderRadius: '16px', border: '1px solid #E2E7EF' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                📄 Мои согласия
              </h3>
              <p style={{ fontSize: '14px', color: '#667085', marginBottom: '16px' }}>
                Здесь отображаются все юридические согласия, которые вы дали при регистрации.
                Вы можете отозвать любое согласие в любое время.
              </p>

              {consentsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : consents.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: '#F4F6F9',
                  borderRadius: '10px'
                }}>
                  <p style={{ color: '#667085' }}>Согласия не найдены</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {consents.map((c) => (
                    <div key={c.id} style={{
                      padding: '14px 16px',
                      border: '1px solid #E2E7EF',
                      borderRadius: '10px',
                      background: c.revoked_at ? '#FCEBEC' : '#FFFFFF',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px', color: c.revoked_at ? '#B3262E' : '#0B1F3A' }}>
                          {getConsentLabel(c.consent_type)}
                          {c.revoked_at && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '11px',
                              background: '#FCEBEC',
                              color: '#B3262E',
                              padding: '2px 10px',
                              borderRadius: '12px'
                            }}>
                              ОТОЗВАНО
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                          Дано: {new Date(c.given_at).toLocaleDateString('ru-RU')}
                          {c.expires_at && ` • Истекает: ${new Date(c.expires_at).toLocaleDateString('ru-RU')}`}
                          {c.revoked_at && ` • Отозвано: ${new Date(c.revoked_at).toLocaleDateString('ru-RU')}`}
                        </div>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>
                          Версия: {c.version || '1.0'}
                        </div>
                      </div>
                      {!c.revoked_at && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 14px', fontSize: '12px' }}
                          onClick={() => handleRevokeSingleConsent(c.id)}
                        >
                          Отозвать
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E7EF' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#B3262E', marginBottom: '8px' }}>
                ⚠️ Отзыв всех согласий
              </h3>
              <p style={{ fontSize: '14px', color: '#667085', marginBottom: '16px' }}>
                Отзыв всех согласий может ограничить доступ к платформе.
                После отзыва вы сможете дать согласия заново в процессе использования платформы.
              </p>
              <button
                className="btn btn-danger"
                onClick={handleRevokeAllConsents}
                disabled={consentsLoading}
                style={{ width: '100%', padding: '12px' }}
              >
                {consentsLoading ? '⏳ Загрузка...' : '🗑️ Отозвать все согласия'}
              </button>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E7EF'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '4px' }}>
                📞 Контактная информация оператора
              </h4>
              <p style={{ fontSize: '12px', color: '#667085', marginBottom: '4px' }}>
                По вопросам обработки персональных данных обращайтесь:
              </p>
              <div style={{ fontSize: '13px', color: '#0B1F3A' }}>
                <p><strong>Наименование:</strong> ДОД «Дипломаты будущего»</p>
                <p><strong>Email:</strong> privacy@diplomats-future.ru</p>
                <p><strong>Телефон:</strong> +7 (495) 123-45-67</p>
                <p><strong>Юридический адрес:</strong> г. Москва, ул. Дипломатическая, д. 1</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}