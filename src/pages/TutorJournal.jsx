// src/pages/TutorJournal.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function TutorJournal() {
  const { eventId } = useParams()
  const [profile, setProfile] = useState(null)
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [reviews, setReviews] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editReview, setEditReview] = useState(null)
  const [viewHistory, setViewHistory] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [eventId])

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

      // Загружаем мероприятие
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      setEvent(eventData)

      // Загружаем назначения на мероприятие
      const { data: assignmentsData } = await supabase
        .from('event_assignments')
        .select(`
          *,
          staff:staff_id (id, full_name, role)
        `)
        .eq('event_id', eventId)
        .eq('status', 'accepted')
      setAssignments(assignmentsData || [])

      // Загружаем участников мероприятия
      const { data: participantsData } = await supabase
        .from('registrations')
        .select(`
          participant_id,
          status,
          participants:participant_id (
            id,
            full_name,
            school,
            class_name,
            clubs:club_id (name)
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'attended')

      setParticipants(participantsData || [])

      // Загружаем существующие оценки
      const { data: reviewsData } = await supabase
        .from('participation_reviews')
        .select('*')
        .eq('event_id', eventId)
      setReviews(reviewsData || [])

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const loadHistory = async (reviewId) => {
    const { data } = await supabase
      .from('review_history')
      .select(`
        *,
        changed_by_profile:changed_by (id, full_name, role)
      `)
      .eq('review_id', reviewId)
      .order('changed_at', { ascending: false })
    setViewHistory(data || [])
    setShowHistory(true)
  }

  const handleSaveReview = async (participantId, formData, isFinal = false) => {
    setSaving(true)
    setMessage('')

    try {
      const existingReview = reviews.find(r => r.participant_id === participantId)

      const reviewData = {
        ...formData,
        event_id: eventId,
        participant_id: participantId,
        reviewer_id: profile.id,
        updated_at: new Date().toISOString(),
        is_final: isFinal
      }

      let result
      if (existingReview) {
        // Сохраняем старую версию в историю
        await supabase
          .from('review_history')
          .insert([{
            review_id: existingReview.id,
            changed_by: profile.id,
            changes: { old: existingReview, new: reviewData },
            action: 'updated'
          }])

        const { data, error: updateError } = await supabase
          .from('participation_reviews')
          .update(reviewData)
          .eq('id', existingReview.id)
          .select()
        result = data
        if (updateError) throw updateError
      } else {
        const { data, error: insertError } = await supabase
          .from('participation_reviews')
          .insert([reviewData])
          .select()
        result = data

        if (result && result[0]) {
          await supabase
            .from('review_history')
            .insert([{
              review_id: result[0].id,
              changed_by: profile.id,
              changes: result[0],
              action: 'created'
            }])
        }
        if (insertError) throw insertError
      }

      setMessage(isFinal ? '✅ Финальная оценка сохранена!' : '✅ Оценка сохранена!')
      loadData()
      setEditReview(null)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setSaving(false)
  }

  const handleApproveReview = async (reviewId) => {
    if (!confirm('Утвердить эту оценку?')) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('participation_reviews')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile.id,
          is_final: true
        })
        .eq('id', reviewId)

      if (error) throw error

      setMessage('✅ Оценка утверждена!')
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
    }
    setSaving(false)
  }

  const getReviewForParticipant = (participantId) => {
    return reviews.find(r => r.participant_id === participantId)
  }

  // Проверка прав
  const isTutor = profile?.role === 'tutor'
  const isAdmin = profile?.role === 'admin'
  const isMovementCoordinator = profile?.role === 'movement_coordinator'
  const isClubCoordinator = profile?.role === 'club_coordinator'
  
  const canEdit = isTutor || isAdmin || isMovementCoordinator
  const canApprove = isAdmin || isMovementCoordinator
  
  // Проверяем, является ли текущий пользователь старшим тьютором
  const isLeadTutor = assignments.some(a => 
    a.staff_id === profile?.id && a.is_lead_tutor === true
  )

  // Тьютор видит только свои мероприятия
  const canView = isTutor 
    ? assignments.some(a => a.staff_id === profile?.id)
    : true

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (isTutor && !canView) {
    return (
      <div className="fade-in">
        <Navigation profile={profile} />
        <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>
          <h1>⛔ Доступ запрещён</h1>
          <p style={{ color: '#667085' }}>
            У вас нет доступа к этому журналу. Вы не закреплены на это мероприятие.
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            style={{ marginTop: '16px' }}
          >
            ← Назад
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
          style={{ marginBottom: '20px' }}
        >
          ← Назад
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
              📋 {event?.title || 'Журнал'}
            </h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              {isLeadTutor && '⭐ Вы старший тьютор — вы можете финально оценивать'}
              {isAdmin && '🔧 Администратор — полный доступ'}
              {isMovementCoordinator && '⭐ Координатор движения — полный доступ'}
              {isClubCoordinator && '🏫 Координатор КЮДа — просмотр'}
              {isTutor && !isLeadTutor && '👤 Тьютор — только просмотр'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#667085' }}>
            {assignments.filter(a => a.is_lead_tutor).length > 0 && (
              <span style={{
                padding: '4px 12px',
                background: '#FBF4DC',
                borderRadius: '20px',
                color: '#8A6A00'
              }}>
                ⭐ Старший: {assignments.find(a => a.is_lead_tutor)?.staff?.full_name || 'Не назначен'}
              </span>
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

        <div className="card" style={{ padding: '0', overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>№</th>
                <th>Участник</th>
                <th>Клуб</th>
                <th>Активность</th>
                <th>Команда</th>
                <th>Инициатива</th>
                <th>Статус</th>
                <th style={{ textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#667085' }}>
                    Участников, отметившихся на мероприятии, пока нет
                  </td>
                </tr>
              ) : (
                participants.map((reg, index) => {
                  const review = getReviewForParticipant(reg.participant_id)
                  const participant = reg.participants
                  const status = review?.status || 'draft'
                  const statusBadge = {
                    'draft': { color: '#8A9AAA', bg: '#F4F6F9', label: 'Черновик' },
                    'submitted': { color: '#C9A227', bg: '#FBF4DC', label: 'На проверке' },
                    'approved': { color: '#16845B', bg: '#E8F5EF', label: 'Утверждено' }
                  }[status] || { color: '#8A9AAA', bg: '#F4F6F9', label: 'Черновик' }

                  const canEditThis = canEdit || (isTutor && isLeadTutor)

                  return (
                    <tr key={reg.participant_id}>
                      <td>{index + 1}</td>
                      <td style={{ fontWeight: '500' }}>
                        {participant?.full_name || 'Неизвестно'}
                      </td>
                      <td>{participant?.clubs?.name || '—'}</td>
                      <td>
                        {review?.engagement ? (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            background: review.engagement === 'active' ? '#E8F5EF' : 
                                       review.engagement === 'moderate' ? '#FBF4DC' : '#FCEBEC',
                            color: review.engagement === 'active' ? '#16845B' : 
                                   review.engagement === 'moderate' ? '#8A6A00' : '#B3262E'
                          }}>
                            {review.engagement === 'active' ? 'Активно' :
                             review.engagement === 'moderate' ? 'Умеренно' : 'Пассивно'}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {review?.teamwork ? (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            background: review.teamwork === 'excellent' ? '#E8F5EF' : 
                                       review.teamwork === 'good' ? '#FBF4DC' : '#FCEBEC',
                            color: review.teamwork === 'excellent' ? '#16845B' : 
                                   review.teamwork === 'good' ? '#8A6A00' : '#B3262E'
                          }}>
                            {review.teamwork === 'excellent' ? 'Отлично' :
                             review.teamwork === 'good' ? 'Хорошо' : 'Развивается'}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {review?.initiative ? (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            background: review.initiative === 'high' ? '#E8F5EF' : 
                                       review.initiative === 'average' ? '#FBF4DC' : '#FCEBEC',
                            color: review.initiative === 'high' ? '#16845B' : 
                                   review.initiative === 'average' ? '#8A6A00' : '#B3262E'
                          }}>
                            {review.initiative === 'high' ? 'Высокая' :
                             review.initiative === 'average' ? 'Средняя' : 'Низкая'}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: statusBadge.bg,
                          color: statusBadge.color
                        }}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {(canEditThis || canApprove) && review && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => loadHistory(review.id)}
                              title="История изменений"
                            >
                              📜
                            </button>
                          )}
                          {(canEditThis || canApprove) && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => {
                                if (review) {
                                  setEditReview({ ...review, participant: participant })
                                } else {
                                  setEditReview({
                                    participant_id: participant.id,
                                    participant: participant,
                                    engagement: '',
                                    teamwork: '',
                                    communication: '',
                                    initiative: '',
                                    responsibility: '',
                                    overall_impression: '',
                                    comment: '',
                                    strengths: '',
                                    areas_for_growth: '',
                                    status: 'draft'
                                  })
                                }
                              }}
                            >
                              {review ? '✏️' : '➕'}
                            </button>
                          )}
                          {canApprove && review && review.status === 'submitted' && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleApproveReview(review.id)}
                              title="Утвердить"
                            >
                              ✅
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ДЛЯ ОЦЕНКИ */}
      {editReview && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(11, 31, 58, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setEditReview(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditReview(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#98A2B3',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              {editReview.is_final ? '⭐ Финальная оценка' : '📝 Оценка участника'}
            </h2>
            <p style={{ color: '#667085', marginBottom: '20px' }}>
              {editReview.participant?.full_name || 'Участник'}
              {editReview.is_final && (
                <span style={{
                  marginLeft: '12px',
                  padding: '2px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: '#E8F5EF',
                  color: '#16845B'
                }}>
                  ✅ Финальная версия
                </span>
              )}
            </p>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = {
                engagement: editReview.engagement,
                teamwork: editReview.teamwork,
                communication: editReview.communication,
                initiative: editReview.initiative,
                responsibility: editReview.responsibility,
                overall_impression: editReview.overall_impression,
                comment: editReview.comment,
                strengths: editReview.strengths,
                areas_for_growth: editReview.areas_for_growth,
                status: editReview.status || 'draft'
              }
              const isFinal = canApprove || isLeadTutor
              handleSaveReview(editReview.participant_id, formData, isFinal)
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Активность</label>
                  <select
                    className="form-select"
                    value={editReview.engagement || ''}
                    onChange={(e) => setEditReview({ ...editReview, engagement: e.target.value })}
                    disabled={!canEdit && !isTutor}
                  >
                    <option value="">Выберите</option>
                    <option value="active">Активно</option>
                    <option value="moderate">Умеренно</option>
                    <option value="passive">Пассивно</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Работа в команде</label>
                  <select
                    className="form-select"
                    value={editReview.teamwork || ''}
                    onChange={(e) => setEditReview({ ...editReview, teamwork: e.target.value })}
                    disabled={!canEdit && !isTutor}
                  >
                    <option value="">Выберите</option>
                    <option value="excellent">Отлично</option>
                    <option value="good">Хорошо</option>
                    <option value="developing">Развивается</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Коммуникация</label>
                  <select
                    className="form-select"
                    value={editReview.communication || ''}
                    onChange={(e) => setEditReview({ ...editReview, communication: e.target.value })}
                    disabled={!canEdit && !isTutor}
                  >
                    <option value="">Выберите</option>
                    <option value="confident">Уверенная</option>
                    <option value="developing">Развивается</option>
                    <option value="needs_support">Требует поддержки</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Инициатива</label>
                  <select
                    className="form-select"
                    value={editReview.initiative || ''}
                    onChange={(e) => setEditReview({ ...editReview, initiative: e.target.value })}
                    disabled={!canEdit && !isTutor}
                  >
                    <option value="">Выберите</option>
                    <option value="high">Высокая</option>
                    <option value="average">Средняя</option>
                    <option value="low">Низкая</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ответственность</label>
                  <select
                    className="form-select"
                    value={editReview.responsibility || ''}
                    onChange={(e) => setEditReview({ ...editReview, responsibility: e.target.value })}
                    disabled={!canEdit && !isTutor}
                  >
                    <option value="">Выберите</option>
                    <option value="reliable">Надёжный</option>
                    <option value="average">Средний</option>
                    <option value="needs_attention">Требует внимания</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Общее впечатление</label>
                  <select
                    className="form-select"
                    value={editReview.overall_impression || ''}
                    onChange={(e) => setEditReview({ ...editReview, overall_impression: e.target.value })}
                    disabled={!canEdit && !isTutor}
                  >
                    <option value="">Выберите</option>
                    <option value="excellent">Отличное</option>
                    <option value="good">Хорошее</option>
                    <option value="satisfactory">Удовлетворительное</option>
                    <option value="needs_improvement">Требует развития</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Комментарий</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={editReview.comment || ''}
                  onChange={(e) => setEditReview({ ...editReview, comment: e.target.value })}
                  disabled={!canEdit && !isTutor}
                  placeholder="Общий комментарий об участии..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Сильные стороны</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={editReview.strengths || ''}
                  onChange={(e) => setEditReview({ ...editReview, strengths: e.target.value })}
                  disabled={!canEdit && !isTutor}
                  placeholder="Что получилось особенно хорошо..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Зоны роста</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={editReview.areas_for_growth || ''}
                  onChange={(e) => setEditReview({ ...editReview, areas_for_growth: e.target.value })}
                  disabled={!canEdit && !isTutor}
                  placeholder="Над чем стоит поработать..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                {(canEdit || isLeadTutor || canApprove) && (
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? '⏳ Сохранение...' : '💾 Сохранить'}
                  </button>
                )}
                {canApprove && editReview.status === 'draft' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const formData = {
                        engagement: editReview.engagement,
                        teamwork: editReview.teamwork,
                        communication: editReview.communication,
                        initiative: editReview.initiative,
                        responsibility: editReview.responsibility,
                        overall_impression: editReview.overall_impression,
                        comment: editReview.comment,
                        strengths: editReview.strengths,
                        areas_for_growth: editReview.areas_for_growth,
                        status: 'submitted'
                      }
                      handleSaveReview(editReview.participant_id, formData, true)
                    }}
                    disabled={saving}
                  >
                    📤 Отправить на проверку
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditReview(null)}
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО ИСТОРИИ */}
      {showHistory && viewHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(11, 31, 58, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '32px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHistory(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#98A2B3',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '16px' }}>
              📜 История изменений
            </h2>

            {viewHistory.length === 0 ? (
              <p style={{ color: '#667085' }}>История пуста</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {viewHistory.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: '12px 16px',
                      background: '#F8FAFC',
                      borderRadius: '8px',
                      borderLeft: h.action === 'created' ? '4px solid #16845B' :
                                 h.action === 'updated' ? '4px solid #C9A227' : '4px solid #174A7E'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '500', color: '#0B1F3A' }}>
                        {h.action === 'created' ? '✅ Создано' :
                         h.action === 'updated' ? '✏️ Обновлено' : '📤 Отправлено'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#98A2B3' }}>
                        {new Date(h.changed_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>
                      👤 {h.changed_by_profile?.full_name || 'Неизвестно'}
                    </div>
                    {h.changes && typeof h.changes === 'object' && (
                      <details style={{ marginTop: '4px', fontSize: '12px', color: '#98A2B3' }}>
                        <summary>Детали изменений</summary>
                        <pre style={{
                          background: 'white',
                          padding: '8px',
                          borderRadius: '4px',
                          overflow: 'auto',
                          fontSize: '11px',
                          maxHeight: '100px'
                        }}>
                          {JSON.stringify(h.changes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => setShowHistory(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}