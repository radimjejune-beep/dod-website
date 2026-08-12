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
  
  // ===== КРУЖКИ =====
  const [extraActivities, setExtraActivities] = useState([])
  const [extraLoading, setExtraLoading] = useState(false)
  const [showExtraActivityForm, setShowExtraActivityForm] = useState(false)
  const [editingExtraId, setEditingExtraId] = useState(null)
  const [extraActivityForm, setExtraActivityForm] = useState({
    name: '',
    organization: '',
    type: 'club',
    schedule: '',
    teacher: '',
    achievements: '',
    start_date: '',
    end_date: '',
    is_active: true,
    comment: ''
  })

  const navigate = useNavigate()

  useEffect(() => {
    loadProfile()
    loadConsents()
    loadExtraActivities()
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

  // ============================================================
  // ЗАГРУЗКА КРУЖКОВ
  // ============================================================
  const loadExtraActivities = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setExtraLoading(true)
    const { data, error } = await supabase
      .from('extra_activities')
      .select('*')
      .eq('participant_id', user.id)
      .order('start_date', { ascending: false })

    if (!error) {
      setExtraActivities(data || [])
    }
    setExtraLoading(false)
  }

  // ============================================================
  // ДОБАВЛЕНИЕ/ОБНОВЛЕНИЕ КРУЖКА
  // ============================================================
  const handleExtraActivitySubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Пользователь не найден')

      const data = {
        participant_id: user.id,
        name: extraActivityForm.name,
        organization: extraActivityForm.organization || '',
        type: extraActivityForm.type || 'club',
        schedule: extraActivityForm.schedule || '',
        teacher: extraActivityForm.teacher || '',
        achievements: extraActivityForm.achievements || '',
        start_date: extraActivityForm.start_date || null,
        end_date: extraActivityForm.end_date || null,
        is_active: extraActivityForm.is_active,
        comment: extraActivityForm.comment || ''
      }

      let error
      if (editingExtraId) {
        const { error: updateError } = await supabase
          .from('extra_activities')
          .update(data)
          .eq('id', editingExtraId)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('extra_activities')
          .insert([data])
        error = insertError
      }

      if (error) throw error

      setMessage(editingExtraId ? '✅ Кружок обновлён!' : '✅ Кружок добавлен!')
      setMessageType('success')
      resetExtraActivityForm()
      loadExtraActivities()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
    setSaving(false)
  }

  const resetExtraActivityForm = () => {
    setExtraActivityForm({
      name: '',
      organization: '',
      type: 'club',
      schedule: '',
      teacher: '',
      achievements: '',
      start_date: '',
      end_date: '',
      is_active: true,
      comment: ''
    })
    setEditingExtraId(null)
    setShowExtraActivityForm(false)
  }

  const handleEditExtraActivity = (item) => {
    setExtraActivityForm({
      name: item.name || '',
      organization: item.organization || '',
      type: item.type || 'club',
      schedule: item.schedule || '',
      teacher: item.teacher || '',
      achievements: item.achievements || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      is_active: item.is_active !== false,
      comment: item.comment || ''
    })
    setEditingExtraId(item.id)
    setShowExtraActivityForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteExtraActivity = async (extraId) => {
    if (!confirm('Удалить запись о кружке?')) return

    const { error } = await supabase
      .from('extra_activities')
      .delete()
      .eq('id', extraId)

    if (!error) {
      setExtraActivities(extraActivities.filter(a => a.id !== extraId))
      setMessage('✅ Кружок удалён')
      setMessageType('success')
      setTimeout(() => setMessage(''), 3000)
    }
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
      club_coordinator: 'Координатор КЮДа',
      movement_coordinator: 'Координатор движения',
      tutor: 'Тьютор',
      president: '👑 Президент ДОД',
      vice_president: '⭐ Вице-президент ДОД'
    }
    return roles[role] || role
  }

  // Типы дополнительных занятий
  const activityTypes = {
    'club': '🏫 Кружок',
    'sport': '⚽ Спорт',
    'music': '🎵 Музыка',
    'art': '🎨 Творчество',
    'language': '🌍 Языки',
    'science': '🔬 Наука',
    'volunteer': '❤️ Волонтёрство',
    'other': '📌 Другое'
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

        {/* ===== ВКЛАДКА: КРУЖКИ ===== */}
        {activeTab === 'activities' && (
          <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E7EF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                🎯 Мои кружки и увлечения
              </h3>
              <button
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={() => setShowExtraActivityForm(!showExtraActivityForm)}
              >
                {showExtraActivityForm ? '✖ Закрыть' : '➕ Добавить кружок'}
              </button>
            </div>

            {/* ФОРМА ДОБАВЛЕНИЯ КРУЖКА */}
            {showExtraActivityForm && (
              <div style={{ padding: '20px', background: '#F4F6F9', borderRadius: '12px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
                  {editingExtraId ? '✏️ Редактировать кружок' : '📝 Добавить кружок'}
                </h4>
                <form onSubmit={handleExtraActivitySubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Название *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={extraActivityForm.name}
                        onChange={(e) => setExtraActivityForm({ ...extraActivityForm, name: e.target.value })}
                        required
                        placeholder="Английский клуб"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Тип</label>
                      <select
                        className="form-select"
                        value={extraActivityForm.type}
                        onChange={(e) => setExtraActivityForm({ ...extraActivityForm, type: e.target.value })}
                      >
                        {Object.entries(activityTypes).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Организация</label>
                      <input
                        type="text"
                        className="form-input"
                        value={extraActivityForm.organization}
                        onChange={(e) => setExtraActivityForm({ ...extraActivityForm, organization: e.target.value })}
                        placeholder="Дом детского творчества"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Преподаватель</label>
                      <input
                        type="text"
                        className="form-input"
                        value={extraActivityForm.teacher}
                        onChange={(e) => setExtraActivityForm({ ...extraActivityForm, teacher: e.target.value })}
                        placeholder="Иванова М.А."
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Расписание</label>
                      <input
                        type="text"
                        className="form-input"
                        value={extraActivityForm.schedule}
                        onChange={(e) => setExtraActivityForm({ ...extraActivityForm, schedule: e.target.value })}
                        placeholder="Вт/Чт 15:00-16:30"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Дата начала</label>
                      <input
                        type="date"
                        className="form-input"
                        value={extraActivityForm.start_date}
                        onChange={(e) => setExtraActivityForm({ ...extraActivityForm, start_date: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Дата окончания</label>
                      <input
                        type="date"
                        className="form-input"
                        value={extraActivityForm.end_date}
                        onChange={(e) => setExtraActivityForm({ ...extraActivityForm, end_date: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Активно</label>
                      <select
                        className="form-select"
                        value={extraActivityForm.is_active ? 'true' : 'false'}
                        onChange={(e) => setExtraActivityForm({ ...extraActivityForm, is_active: e.target.value === 'true' })}
                      >
                        <option value="true">🟢 Да</option>
                        <option value="false">🔴 Нет</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Достижения в кружке</label>
                    <input
                      type="text"
                      className="form-input"
                      value={extraActivityForm.achievements}
                      onChange={(e) => setExtraActivityForm({ ...extraActivityForm, achievements: e.target.value })}
                      placeholder="Победитель городской олимпиады"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Комментарий</label>
                    <textarea
                      className="form-input"
                      rows="2"
                      value={extraActivityForm.comment}
                      onChange={(e) => setExtraActivityForm({ ...extraActivityForm, comment: e.target.value })}
                      placeholder="Дополнительная информация о кружке..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button type="submit" className="btn btn-success" disabled={saving}>
                      {saving ? '⏳ Сохранение...' : editingExtraId ? '💾 Обновить' : '✅ Добавить'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetExtraActivityForm}
                    >
                      ❌ Отмена
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* СПИСОК КРУЖКОВ */}
            {extraLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : extraActivities.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', background: '#F4F6F9', borderRadius: '10px' }}>
                <p style={{ color: '#667085' }}>У вас пока нет дополнительных кружков</p>
                <p style={{ fontSize: '13px', color: '#98A2B3', marginTop: '4px' }}>
                  Добавьте информацию о ваших внешкольных занятиях
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {extraActivities.map((item) => (
                  <div key={item.id} style={{
                    padding: '16px',
                    background: item.is_active !== false ? '#F8FAFC' : '#F4F6F9',
                    borderRadius: '12px',
                    border: `2px solid ${item.is_active !== false ? '#C9A227' : '#E2E7EF'}`,
                    opacity: item.is_active !== false ? 1 : 0.7,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (item.is_active !== false) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(11, 31, 58, 0.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '20px' }}>
                          {activityTypes[item.type]?.split(' ')[0] || '📌'}
                        </div>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', margin: '4px 0' }}>
                          {item.name}
                        </h4>
                        {item.organization && (
                          <div style={{ fontSize: '13px', color: '#667085' }}>🏛️ {item.organization}</div>
                        )}
                        {item.teacher && (
                          <div style={{ fontSize: '13px', color: '#667085' }}>👨‍🏫 {item.teacher}</div>
                        )}
                        {item.schedule && (
                          <div style={{ fontSize: '13px', color: '#667085' }}>🕐 {item.schedule}</div>
                        )}
                        {(item.start_date || item.end_date) && (
                          <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                            {item.start_date && `С: ${new Date(item.start_date).toLocaleDateString('ru-RU')}`}
                            {item.end_date && ` До: ${new Date(item.end_date).toLocaleDateString('ru-RU')}`}
                          </div>
                        )}
                        {item.achievements && (
                          <div style={{
                            fontSize: '13px',
                            color: '#C9A227',
                            marginTop: '6px',
                            padding: '4px 10px',
                            background: '#FBF4DC',
                            borderRadius: '6px',
                            display: 'inline-block'
                          }}>
                            🏆 {item.achievements}
                          </div>
                        )}
                        {item.comment && (
                          <div style={{
                            fontSize: '13px',
                            color: '#174A7E',
                            marginTop: '6px',
                            padding: '4px 10px',
                            background: '#EAF2FA',
                            borderRadius: '6px'
                          }}>
                            💬 {item.comment}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                        {item.is_active !== false ? (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            background: '#E8F5EF',
                            color: '#16845B',
                            fontWeight: '600'
                          }}>
                            Активно
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            background: '#FCEBEC',
                            color: '#B3262E',
                            fontWeight: '600'
                          }}>
                            Завершено
                          </span>
                        )}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <button
                            style={{
                              padding: '2px 8px',
                              background: '#F4F6F9',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            onClick={() => handleEditExtraActivity(item)}
                          >
                            ✏️
                          </button>
                          <button
                            style={{
                              padding: '2px 8px',
                              background: '#FCEBEC',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              color: '#B3262E'
                            }}
                            onClick={() => handleDeleteExtraActivity(item.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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