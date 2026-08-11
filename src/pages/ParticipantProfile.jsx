// src/pages/ParticipantProfile.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function ParticipantProfile() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [activities, setActivities] = useState([])
  const [events, setEvents] = useState([])
  const [extraActivities, setExtraActivities] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showExtraActivityForm, setShowExtraActivityForm] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    birth_date: '',
    school: '',
    class_name: '',
    club_id: '',
    interests: '',
    bio: '',
    position: '',
    status: 'active'
  })
  const [activityForm, setActivityForm] = useState({
    event_id: '',
    event_title: '',
    event_date: '',
    status: 'registered',
    comment: '',
    is_new_event: false
  })
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
  const [editingExtraId, setEditingExtraId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }

      // Загружаем участника из profiles
      const { data: participantData, error: pError } = await supabase
        .from('profiles')
        .select(`
          *,
          club_participants!inner (
            club_id,
            clubs:club_id (id, name)
          )
        `)
        .eq('id', id)
        .eq('role', 'participant')
        .single()

      if (pError) {
        console.error('Ошибка загрузки участника:', pError)
        setLoading(false)
        return
      }

      setParticipant(participantData)
      setForm({
        full_name: participantData.full_name || '',
        birth_date: participantData.birth_date || '',
        school: participantData.school || '',
        class_name: participantData.class_name || '',
        club_id: participantData.club_participants?.[0]?.club_id || '',
        interests: participantData.interests || '',
        bio: participantData.bio || '',
        position: participantData.position || '',
        status: participantData.status || 'active'
      })

      // Загружаем достижения
      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (id, name, description, icon, points, category)
        `)
        .eq('user_id', id)
        .order('earned_at', { ascending: false })
      setAchievements(achievementsData || [])

      // Загружаем мероприятия участника
      const { data: activitiesData } = await supabase
        .from('event_participants')
        .select(`
          *,
          events:event_id (id, title, event_date, type)
        `)
        .eq('user_id', id)
        .order('registered_at', { ascending: false })
      setActivities(activitiesData || [])

      // Загружаем все мероприятия для выбора
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, event_date')
        .order('event_date', { ascending: false })
      setEvents(eventsData || [])

      // ============================================================
      // ЗАГРУЗКА ОЦЕНОК (REVIEWS)
      // ============================================================
      const { data: reviewsData } = await supabase
        .from('participation_reviews')
        .select(`
          *,
          events:event_id (id, title, event_date, type)
        `)
        .eq('participant_id', id)
        .order('updated_at', { ascending: false })

      console.log('📊 Оценки участника:', reviewsData)
      setReviews(reviewsData || [])

      // Загружаем дополнительные кружки
      const { data: extraActivitiesData } = await supabase
        .from('extra_activities')
        .select('*')
        .eq('participant_id', id)
        .order('start_date', { ascending: false })
      setExtraActivities(extraActivitiesData || [])

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          birth_date: form.birth_date || null,
          school: form.school || '',
          class_name: form.class_name || '',
          interests: form.interests || '',
          bio: form.bio || '',
          position: form.position || '',
          status: form.status || 'active'
        })
        .eq('id', id)

      if (error) throw error

      // Обновляем привязку к клубу
      if (form.club_id) {
        const { data: existing } = await supabase
          .from('club_participants')
          .select('id')
          .eq('profile_id', id)
          .eq('club_id', form.club_id)
          .maybeSingle()

        if (!existing) {
          await supabase
            .from('club_participants')
            .delete()
            .eq('profile_id', id)

          await supabase
            .from('club_participants')
            .insert([{
              profile_id: id,
              club_id: form.club_id,
              status: 'active'
            }])
        }
      }

      setMessage('✅ Профиль обновлён!')
      setShowEditForm(false)
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setSaving(false)
  }

  // ============================================================
  // ДОПОЛНИТЕЛЬНЫЕ КРУЖКИ
  // ============================================================
  const handleExtraActivitySubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    try {
      const data = {
        participant_id: id,
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
      resetExtraActivityForm()
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
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
      setTimeout(() => setMessage(''), 3000)
    }
  }

  // ============================================================
  // МЕРОПРИЯТИЯ УЧАСТНИКА
  // ============================================================
  const handleAddActivity = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      let eventId = activityForm.event_id

      if (activityForm.is_new_event) {
        const { data: newEvent, error: eventError } = await supabase
          .from('events')
          .insert([{
            title: activityForm.event_title,
            event_date: activityForm.event_date || new Date().toISOString().split('T')[0],
            type: 'internal',
            capacity: 20
          }])
          .select()
          .single()

        if (eventError) throw eventError
        eventId = newEvent.id
      }

      const { data: existing } = await supabase
        .from('event_participants')
        .select('id')
        .eq('user_id', id)
        .eq('event_id', eventId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('event_participants')
          .update({
            status: activityForm.status,
            comment: activityForm.comment || null
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('event_participants')
          .insert([{
            user_id: id,
            event_id: eventId,
            status: activityForm.status,
            comment: activityForm.comment || null
          }])

        if (error) throw error
      }

      setMessage('✅ Активность добавлена!')
      setActivityForm({
        event_id: '',
        event_title: '',
        event_date: '',
        status: 'registered',
        comment: '',
        is_new_event: false
      })
      setShowActivityForm(false)
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setLoading(false)
  }

  const handleDeleteActivity = async (registrationId) => {
    if (!confirm('Удалить запись об участии?')) return

    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('id', registrationId)

    if (!error) {
      loadData()
    }
  }

  const handleDeleteAchievement = async (achievementId) => {
    if (!confirm('Удалить достижение?')) return

    const { error } = await supabase
      .from('user_achievements')
      .delete()
      .eq('id', achievementId)

    if (!error) {
      setAchievements(achievements.filter(a => a.id !== achievementId))
    }
  }

  const canManage = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' || 
                    profile?.role === 'club_coordinator' ||
                    profile?.role === 'tutor'

  const canDelete = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>❌ Участник не найден</h1>
          <button className="btn btn-primary" onClick={() => navigate('/participants')} style={{ marginTop: '20px' }}>
            ← Назад к списку
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px', maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
          style={{ 
            marginBottom: '20px',
            padding: '8px 20px',
            background: 'transparent',
            border: '1.5px solid #D5DCE7',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#0B1F3A'
          }}
        >
          ← Назад
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
              {participant.full_name}
            </h1>
            <p style={{ color: '#667085' }}>
              {participant.club_participants?.[0]?.clubs?.name || 'Без клуба'} • {participant.class_name || 'Класс не указан'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {canManage && (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowEditForm(!showEditForm)}
                  style={{
                    padding: '8px 20px',
                    background: '#0B1F3A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  ✏️ Редактировать
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/achievements?participant=${participant.id}`)}
                  style={{
                    padding: '8px 20px',
                    background: '#C9A227',
                    color: '#0B1F3A',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  ➕ Добавить достижение
                </button>
              </>
            )}
          </div>
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '16px',
            textAlign: 'center',
            background: message.includes('✅') ? '#E8F5EF' : '#FCEBEC',
            color: message.includes('✅') ? '#16845B' : '#B3262E',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {/* ============================================================
            ОСНОВНАЯ ИНФОРМАЦИЯ
            ============================================================ */}
        <div className="card" style={{ marginBottom: '24px', background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            📋 Основная информация
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div><strong>ФИО:</strong> {participant.full_name}</div>
            <div><strong>Дата рождения:</strong> {participant.birth_date || '—'}</div>
            <div><strong>Школа:</strong> {participant.school || '—'}</div>
            <div><strong>Класс:</strong> {participant.class_name || '—'}</div>
            <div><strong>Клуб:</strong> {participant.club_participants?.[0]?.clubs?.name || '—'}</div>
            <div><strong>Статус:</strong> 
              <span style={{
                padding: '2px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '600',
                background: participant.status === 'active' ? '#E8F5EF' : '#FCEBEC',
                color: participant.status === 'active' ? '#16845B' : '#B3262E'
              }}>
                {participant.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================
            РЕДАКТИРОВАНИЕ ПРОФИЛЯ
            ============================================================ */}
        {showEditForm && canManage && (
          <div className="card" style={{ marginBottom: '24px', padding: '24px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E7EF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              ✏️ Редактировать профиль
            </h3>
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">ФИО</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Дата рождения</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Школа</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Класс</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.class_name}
                    onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Должность</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    placeholder="Капитан команды"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Статус</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">🟢 Активен</option>
                    <option value="inactive">🔴 Неактивен</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Интересы</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.interests}
                  onChange={(e) => setForm({ ...form, interests: e.target.value })}
                  placeholder="Дипломатия, история, иностранные языки"
                />
              </div>

              <div className="form-group">
                <label className="form-label">О себе</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Расскажите о себе..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-success" disabled={saving} style={{
                  padding: '10px 24px',
                  background: '#16845B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {saving ? '⏳ Сохранение...' : '💾 Сохранить'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditForm(false)}
                  style={{
                    padding: '10px 24px',
                    background: 'transparent',
                    color: '#0B1F3A',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
            ОЦЕНКИ (REVIEWS) — ВСЕГДА ВИДЕН
            ============================================================ */}
        <div className="card" style={{ marginBottom: '24px', background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📊 Оценки за мероприятия
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {reviews.length} оценок
            </span>
          </div>

          {reviews.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', background: '#F4F6F9', borderRadius: '10px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
              <p style={{ color: '#667085', fontSize: '16px' }}>Оценок пока нет</p>
              <p style={{ fontSize: '13px', color: '#98A2B3', marginTop: '4px' }}>
                Оценки появляются после мероприятий с участием тьюторов
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    padding: '16px',
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E7EF',
                    borderLeft: review.is_final ? '4px solid #C9A227' : '4px solid #174A7E'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                        {review.events?.title || 'Мероприятие'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#667085' }}>
                        📅 {review.events?.event_date ? new Date(review.events.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {review.is_final && (
                        <span style={{
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: '#FBF4DC',
                          color: '#8A6A00'
                        }}>
                          ⭐ Финальная
                        </span>
                      )}
                      <span style={{
                        padding: '2px 12px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600',
                        background: review.status === 'approved' ? '#E8F5EF' : '#FBF4DC',
                        color: review.status === 'approved' ? '#16845B' : '#8A6A00'
                      }}>
                        {review.status === 'approved' ? '✅ Утверждено' : '⏳ На проверке'}
                      </span>
                    </div>
                  </div>

                  {/* Показатели */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '8px',
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #E2E7EF'
                  }}>
                    {review.engagement && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Активность</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: review.engagement === 'active' ? '#16845B' :
                                 review.engagement === 'moderate' ? '#8A6A00' : '#B3262E'
                        }}>
                          {review.engagement === 'active' ? '🟢 Активно' :
                           review.engagement === 'moderate' ? '🟡 Умеренно' : '🔴 Пассивно'}
                        </div>
                      </div>
                    )}
                    {review.teamwork && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Работа в команде</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: review.teamwork === 'excellent' ? '#16845B' :
                                 review.teamwork === 'good' ? '#8A6A00' : '#B3262E'
                        }}>
                          {review.teamwork === 'excellent' ? '⭐ Отлично' :
                           review.teamwork === 'good' ? '👍 Хорошо' : '📈 Развивается'}
                        </div>
                      </div>
                    )}
                    {review.initiative && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Инициатива</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: review.initiative === 'high' ? '#16845B' :
                                 review.initiative === 'average' ? '#8A6A00' : '#B3262E'
                        }}>
                          {review.initiative === 'high' ? '🚀 Высокая' :
                           review.initiative === 'average' ? '📊 Средняя' : '📉 Низкая'}
                        </div>
                      </div>
                    )}
                    {review.communication && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Коммуникация</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: review.communication === 'confident' ? '#16845B' :
                                 review.communication === 'developing' ? '#8A6A00' : '#B3262E'
                        }}>
                          {review.communication === 'confident' ? '💬 Уверенная' :
                           review.communication === 'developing' ? '📈 Развивается' : '🆘 Требует поддержки'}
                        </div>
                      </div>
                    )}
                    {review.responsibility && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Ответственность</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: review.responsibility === 'reliable' ? '#16845B' :
                                 review.responsibility === 'average' ? '#8A6A00' : '#B3262E'
                        }}>
                          {review.responsibility === 'reliable' ? '✅ Надёжный' :
                           review.responsibility === 'average' ? '📊 Средний' : '⚠️ Требует внимания'}
                        </div>
                      </div>
                    )}
                    {review.overall_impression && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Общее впечатление</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: review.overall_impression === 'excellent' ? '#16845B' :
                                 review.overall_impression === 'good' ? '#8A6A00' : 
                                 review.overall_impression === 'satisfactory' ? '#C9A227' : '#B3262E'
                        }}>
                          {review.overall_impression === 'excellent' ? '🌟 Отличное' :
                           review.overall_impression === 'good' ? '👍 Хорошее' :
                           review.overall_impression === 'satisfactory' ? '👌 Удовлетворительное' : '📈 Требует развития'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Комментарии */}
                  {(review.comment || review.strengths || review.areas_for_growth) && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #E2E7EF'
                    }}>
                      {review.comment && (
                        <div style={{ fontSize: '14px', color: '#475467', marginBottom: '4px' }}>
                          💬 {review.comment}
                        </div>
                      )}
                      {review.strengths && (
                        <div style={{ fontSize: '13px', color: '#16845B' }}>
                          ✅ Сильные стороны: {review.strengths}
                        </div>
                      )}
                      {review.areas_for_growth && (
                        <div style={{ fontSize: '13px', color: '#B3262E' }}>
                          📈 Зоны роста: {review.areas_for_growth}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '8px' }}>
                    🕐 Обновлено: {new Date(review.updated_at).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================
            ДОПОЛНИТЕЛЬНЫЕ КРУЖКИ
            ============================================================ */}
        <div className="card" style={{ marginBottom: '24px', background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              🎯 Дополнительные кружки и увлечения
            </h3>
            {canManage && (
              <button
                className="btn btn-primary"
                style={{ 
                  padding: '6px 16px', 
                  fontSize: '13px',
                  background: '#0B1F3A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => setShowExtraActivityForm(!showExtraActivityForm)}
              >
                {showExtraActivityForm ? '✖ Закрыть' : '➕ Добавить кружок'}
              </button>
            )}
          </div>

          {showExtraActivityForm && canManage && (
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
                  <button type="submit" className="btn btn-success" disabled={saving} style={{
                    padding: '10px 24px',
                    background: '#16845B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {saving ? '⏳ Сохранение...' : editingExtraId ? '💾 Обновить' : '✅ Добавить'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={resetExtraActivityForm}
                    style={{
                      padding: '10px 24px',
                      background: 'transparent',
                      color: '#0B1F3A',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    ❌ Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          {extraActivities.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', background: '#F4F6F9', borderRadius: '10px' }}>
              <p style={{ color: '#667085' }}>Дополнительных кружков и увлечений пока нет</p>
              {canManage && (
                <p style={{ fontSize: '13px', color: '#98A2B3', marginTop: '4px' }}>
                  Добавьте информацию о внешкольных занятиях участника
                </p>
              )}
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
                        <div style={{ fontSize: '13px', color: '#667085' }}>
                          🏛️ {item.organization}
                        </div>
                      )}
                      {item.teacher && (
                        <div style={{ fontSize: '13px', color: '#667085' }}>
                          👨‍🏫 {item.teacher}
                        </div>
                      )}
                      {item.schedule && (
                        <div style={{ fontSize: '13px', color: '#667085' }}>
                          🕐 {item.schedule}
                        </div>
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
                      {canManage && (
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
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================
            ДОСТИЖЕНИЯ
            ============================================================ */}
        <div className="card" style={{ marginBottom: '24px', background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              🏆 Достижения
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {achievements.length} достижений
            </span>
          </div>
          {achievements.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', background: '#F4F6F9', borderRadius: '10px' }}>
              <p style={{ color: '#667085' }}>Достижений пока нет</p>
              {canManage && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '8px', padding: '8px 20px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={() => navigate(`/achievements?participant=${participant.id}`)}
                >
                  ➕ Добавить достижение
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {achievements.map((a) => (
                <div key={a.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  borderLeft: '4px solid #C9A227'
                }}>
                  <div>
                    <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                      {a.achievements?.name || a.name || 'Достижение'}
                    </div>
                    {a.achievements?.description && <div style={{ fontSize: '13px', color: '#667085' }}>{a.achievements.description}</div>}
                    {a.earned_at && (
                      <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                        📅 {new Date(a.earned_at).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                  {canDelete && (
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 12px', fontSize: '12px', background: '#FCEBEC', color: '#B3262E', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      onClick={() => handleDeleteAchievement(a.id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================
            ИНТЕРЕСЫ И УВЛЕЧЕНИЯ
            ============================================================ */}
        {(participant.interests || participant.bio) && (
          <div className="card" style={{ marginBottom: '24px', background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🌟 Интересы и о себе
            </h3>
            {participant.interests && (
              <div style={{ marginBottom: '8px' }}>
                <strong>Интересы:</strong> {participant.interests}
              </div>
            )}
            {participant.bio && (
              <div>
                <strong>О себе:</strong> {participant.bio}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            АКТИВНОСТЬ
            ============================================================ */}
        <div className="card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📅 Активность
            </h3>
            {canManage && (
              <button
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: '12px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => setShowActivityForm(!showActivityForm)}
              >
                {showActivityForm ? '✖' : '➕'}
              </button>
            )}
          </div>

          {showActivityForm && canManage && (
            <div style={{ padding: '16px', background: '#F4F6F9', borderRadius: '10px', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
                📝 Добавить участие в мероприятии
              </h4>
              <form onSubmit={handleAddActivity}>
                <div className="form-group">
                  <label className="form-label">Мероприятие</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: '1px solid #D5DCE7',
                        background: !activityForm.is_new_event ? '#0B1F3A' : 'transparent',
                        color: !activityForm.is_new_event ? 'white' : '#667085',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onClick={() => setActivityForm({ ...activityForm, is_new_event: false })}
                    >
                      Из списка
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: '1px solid #D5DCE7',
                        background: activityForm.is_new_event ? '#0B1F3A' : 'transparent',
                        color: activityForm.is_new_event ? 'white' : '#667085',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onClick={() => setActivityForm({ ...activityForm, is_new_event: true })}
                    >
                      Создать новое
                    </button>
                  </div>
                  {!activityForm.is_new_event ? (
                    <select
                      className="form-select"
                      value={activityForm.event_id}
                      onChange={(e) => setActivityForm({ ...activityForm, event_id: e.target.value })}
                      required
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D5DCE7', borderRadius: '8px', background: 'white' }}
                    >
                      <option value="">Выберите мероприятие</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title} ({new Date(event.event_date).toLocaleDateString('ru-RU')})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        className="form-input"
                        style={{ marginBottom: '8px', width: '100%', padding: '8px 12px', border: '1.5px solid #D5DCE7', borderRadius: '8px' }}
                        value={activityForm.event_title}
                        onChange={(e) => setActivityForm({ ...activityForm, event_title: e.target.value })}
                        required
                        placeholder="Название мероприятия"
                      />
                      <input
                        type="date"
                        className="form-input"
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D5DCE7', borderRadius: '8px' }}
                        value={activityForm.event_date}
                        onChange={(e) => setActivityForm({ ...activityForm, event_date: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Статус участия</label>
                  <select
                    className="form-select"
                    value={activityForm.status}
                    onChange={(e) => setActivityForm({ ...activityForm, status: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D5DCE7', borderRadius: '8px', background: 'white' }}
                  >
                    <option value="registered">📝 Записан</option>
                    <option value="confirmed">✅ Участвовал</option>
                    <option value="cancelled">❌ Отменено</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Комментарий</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={activityForm.comment}
                    onChange={(e) => setActivityForm({ ...activityForm, comment: e.target.value })}
                    placeholder="Отметка тьютора/координатора об участии..."
                    style={{ resize: 'vertical', width: '100%', padding: '8px 12px', border: '1.5px solid #D5DCE7', borderRadius: '8px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-success" disabled={loading} style={{
                    padding: '10px 24px',
                    background: '#16845B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {loading ? '⏳ Добавление...' : '✅ Добавить'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowActivityForm(false)}
                    style={{
                      padding: '10px 24px',
                      background: 'transparent',
                      color: '#0B1F3A',
                      border: '1.5px solid #D5DCE7',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    ❌ Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          {activities.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', background: '#F4F6F9', borderRadius: '10px' }}>
              <p style={{ color: '#667085' }}>Участий в мероприятиях пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.map((a) => (
                <div key={a.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  borderLeft: a.status === 'confirmed' ? '4px solid #16845B' : 
                              a.status === 'cancelled' ? '4px solid #B3262E' : '4px solid #C9A227'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                        {a.events?.title || 'Мероприятие'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#667085' }}>
                        {a.events?.event_date ? new Date(a.events.event_date).toLocaleDateString('ru-RU') : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: a.status === 'confirmed' ? '#E8F5EF' : a.status === 'cancelled' ? '#FCEBEC' : '#FBF4DC',
                        color: a.status === 'confirmed' ? '#16845B' : a.status === 'cancelled' ? '#B3262E' : '#8A6A00'
                      }}>
                        {a.status === 'confirmed' ? '✅ Участвовал' : a.status === 'cancelled' ? '❌ Отменено' : '📝 Записан'}
                      </span>
                      {canDelete && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 10px', fontSize: '11px', background: '#FCEBEC', color: '#B3262E', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => handleDeleteActivity(a.id)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  {a.comment && (
                    <div style={{
                      fontSize: '13px',
                      color: '#174A7E',
                      marginTop: '6px',
                      padding: '4px 10px',
                      background: '#EAF2FA',
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      💬 {a.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}