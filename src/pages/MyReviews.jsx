// src/pages/MyReviews.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function MyReviews() {
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [childId, setChildId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      let participantId = user.id
      let childName = ''

      // ============================================================
      // ЕСЛИ РОДИТЕЛЬ — ИЩЕМ РЕБЕНКА
      // ============================================================
      if (profileData.role === 'parent') {
        const { data: childrenData } = await supabase
          .from('parent_child_relations')
          .select('child_id, profiles:child_id (full_name)')
          .eq('parent_id', user.id)
          .eq('status', 'active')
          .limit(1)

        if (childrenData && childrenData.length > 0) {
          participantId = childrenData[0].child_id
          childName = childrenData[0].profiles?.full_name || 'ребенка'
          setChildId(participantId)
        } else {
          setReviews([])
          setLoading(false)
          return
        }
      }

      // ============================================================
      // ЕСЛИ КООРДИНАТОР КЮДА — ПОКАЗЫВАЕМ ВСЕХ УЧАСТНИКОВ КЛУБА
      // ============================================================
      if (profileData.role === 'club_coordinator') {
        const { data: coordData } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', user.id)
          .single()

        if (coordData) {
          const { data: clubParticipants } = await supabase
            .from('club_participants')
            .select('profile_id')
            .eq('club_id', coordData.club_id)
            .eq('status', 'active')

          if (clubParticipants && clubParticipants.length > 0) {
            const participantIds = clubParticipants.map(p => p.profile_id)
            
            const { data: reviewsData } = await supabase
              .from('participation_reviews')
              .select(`
                *,
                events:event_id (id, title, event_date, type, description),
                reviewer:reviewer_id (id, full_name, role),
                participant:participant_id (id, full_name, school, class_name)
              `)
              .in('participant_id', participantIds)
              .order('updated_at', { ascending: false })

            setReviews(reviewsData || [])
            setLoading(false)
            return
          }
        }
        setReviews([])
        setLoading(false)
        return
      }

      // ============================================================
      // ДЛЯ ВСЕХ ОСТАЛЬНЫХ — ПОКАЗЫВАЕМ СВОИ ОЦЕНКИ
      // ============================================================
      const { data: reviewsData, error } = await supabase
        .from('participation_reviews')
        .select(`
          *,
          events:event_id (id, title, event_date, type, description),
          reviewer:reviewer_id (id, full_name, role)
        `)
        .eq('participant_id', participantId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки оценок:', error)
      } else {
        setReviews(reviewsData || [])
      }

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { text: 'Черновик', color: '#8A9AAA', bg: '#F4F6F9' },
      'submitted': { text: 'На проверке', color: '#C9A227', bg: '#FBF4DC' },
      'approved': { text: 'Утверждено', color: '#16845B', bg: '#E8F5EF' }
    }
    return badges[status] || badges['draft']
  }

  const getEngagementLabel = (value) => {
    const labels = {
      'active': '🟢 Активно',
      'moderate': '🟡 Умеренно',
      'passive': '🔴 Пассивно'
    }
    return labels[value] || value
  }

  const getTeamworkLabel = (value) => {
    const labels = {
      'excellent': '⭐ Отлично',
      'good': '👍 Хорошо',
      'developing': '📈 Развивается'
    }
    return labels[value] || value
  }

  const getInitiativeLabel = (value) => {
    const labels = {
      'high': '🚀 Высокая',
      'average': '📊 Средняя',
      'low': '📉 Низкая'
    }
    return labels[value] || value
  }

  const getCommunicationLabel = (value) => {
    const labels = {
      'confident': '💬 Уверенная',
      'developing': '📈 Развивается',
      'needs_support': '🆘 Требует поддержки'
    }
    return labels[value] || value
  }

  const getResponsibilityLabel = (value) => {
    const labels = {
      'reliable': '✅ Надёжный',
      'average': '📊 Средний',
      'needs_attention': '⚠️ Требует внимания'
    }
    return labels[value] || value
  }

  const getOverallLabel = (value) => {
    const labels = {
      'excellent': '🌟 Отличное',
      'good': '👍 Хорошее',
      'satisfactory': '👌 Удовлетворительное',
      'needs_improvement': '📈 Требует развития'
    }
    return labels[value] || value
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    )
  }

  const isParent = profile?.role === 'parent'
  const isClubCoordinator = profile?.role === 'club_coordinator'

  return (
    <div className="fade-in" style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
            {isParent ? '📊 Оценки ребенка' : 
             isClubCoordinator ? '📊 Оценки участников клуба' : 
             '📊 Мои оценки'}
          </h1>
          <p style={{ color: '#667085', fontSize: '16px' }}>
            {isParent ? 'Оценки вашего ребенка за участие в мероприятиях' : 
             isClubCoordinator ? 'Все оценки участников вашего КЮДа' : 
             'Ваши оценки за участие в мероприятиях'}
          </p>
        </div>

        {reviews.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px 40px',
            textAlign: 'center',
            border: '1px solid #E2E7EF'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3 style={{ fontSize: '20px', color: '#0B1F3A', marginBottom: '8px' }}>
              {isParent ? 'У ребенка пока нет оценок' : 
               isClubCoordinator ? 'У участников клуба пока нет оценок' : 
               'У вас пока нет оценок'}
            </h3>
            <p style={{ color: '#667085', fontSize: '16px' }}>
              Оценки появляются после мероприятий с участием тьюторов
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((review) => {
              const status = getStatusBadge(review.status)
              
              return (
                <div
                  key={review.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #E2E7EF',
                    borderLeft: review.is_final ? '4px solid #C9A227' : '4px solid #174A7E',
                    boxShadow: '0 4px 16px rgba(11, 31, 58, 0.06)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.10)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(11, 31, 58, 0.06)'
                  }}
                >
                  {/* ЗАГОЛОВОК */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                        {review.events?.title || 'Мероприятие'}
                      </h3>
                      <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                        📅 {review.events?.event_date ? new Date(review.events.event_date).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        }) : 'Дата не указана'}
                        {review.reviewer?.full_name && (
                          <>
                            <span style={{ margin: '0 8px' }}>•</span>
                            👤 Оценил: {review.reviewer.full_name}
                          </>
                        )}
                        {isClubCoordinator && review.participant?.full_name && (
                          <>
                            <span style={{ margin: '0 8px' }}>•</span>
                            👨‍🎓 {review.participant.full_name}
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                        padding: '4px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: status.bg,
                        color: status.color
                      }}>
                        {status.text}
                      </span>
                    </div>
                  </div>

                  {/* ПОКАЗАТЕЛИ */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #E2E7EF'
                  }}>
                    {review.engagement && (
                      <div style={{
                        padding: '8px 12px',
                        background: '#F8FAFC',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Активность</div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#0B1F3A' }}>
                          {getEngagementLabel(review.engagement)}
                        </div>
                      </div>
                    )}
                    {review.teamwork && (
                      <div style={{
                        padding: '8px 12px',
                        background: '#F8FAFC',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Работа в команде</div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#0B1F3A' }}>
                          {getTeamworkLabel(review.teamwork)}
                        </div>
                      </div>
                    )}
                    {review.initiative && (
                      <div style={{
                        padding: '8px 12px',
                        background: '#F8FAFC',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Инициатива</div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#0B1F3A' }}>
                          {getInitiativeLabel(review.initiative)}
                        </div>
                      </div>
                    )}
                    {review.communication && (
                      <div style={{
                        padding: '8px 12px',
                        background: '#F8FAFC',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Коммуникация</div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#0B1F3A' }}>
                          {getCommunicationLabel(review.communication)}
                        </div>
                      </div>
                    )}
                    {review.responsibility && (
                      <div style={{
                        padding: '8px 12px',
                        background: '#F8FAFC',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Ответственность</div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#0B1F3A' }}>
                          {getResponsibilityLabel(review.responsibility)}
                        </div>
                      </div>
                    )}
                    {review.overall_impression && (
                      <div style={{
                        padding: '8px 12px',
                        background: '#F8FAFC',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>Общее впечатление</div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#0B1F3A' }}>
                          {getOverallLabel(review.overall_impression)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* КОММЕНТАРИИ */}
                  {(review.comment || review.strengths || review.areas_for_growth) && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #E2E7EF'
                    }}>
                      {review.comment && (
                        <div style={{ fontSize: '14px', color: '#475467', marginBottom: '4px' }}>
                          💬 <span style={{ fontWeight: '500' }}>Комментарий:</span> {review.comment}
                        </div>
                      )}
                      {review.strengths && (
                        <div style={{ fontSize: '13px', color: '#16845B', marginTop: '4px' }}>
                          ✅ <span style={{ fontWeight: '500' }}>Сильные стороны:</span> {review.strengths}
                        </div>
                      )}
                      {review.areas_for_growth && (
                        <div style={{ fontSize: '13px', color: '#B3262E', marginTop: '4px' }}>
                          📈 <span style={{ fontWeight: '500' }}>Зоны роста:</span> {review.areas_for_growth}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E2E7EF' }}>
                    🕐 Обновлено: {new Date(review.updated_at).toLocaleString('ru-RU')}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}