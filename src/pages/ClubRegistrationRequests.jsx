// src/pages/ClubRegistrationRequests.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function ClubRegistrationRequests() {
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [clubName, setClubName] = useState('')
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

      // Проверка — только координатор КЮДа
      if (profileData?.role !== 'club_coordinator') {
        navigate('/dashboard')
        return
      }

      // Получаем клуб координатора
      const { data: coordData } = await supabase
        .from('club_coordinators')
        .select('club_id, clubs:club_id (name)')
        .eq('profile_id', profileData.id)
        .single()

      if (coordData) {
        setClubName(coordData.clubs?.name || 'Ваш клуб')

        // Получаем участников клуба
        const { data: clubParticipants } = await supabase
          .from('club_participants')
          .select('profile_id')
          .eq('club_id', coordData.club_id)
          .eq('status', 'active')

        if (clubParticipants && clubParticipants.length > 0) {
          const participantIds = clubParticipants.map(p => p.profile_id)
          
          // Получаем заявки на регистрацию от участников этого клуба
          const { data: requestsData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', participantIds)
            .eq('registration_status', 'pending')
            .order('created_at', { ascending: true })

          setRequests(requestsData || [])
        } else {
          setRequests([])
        }
      }

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const handleApprove = async (userId) => {
    if (!confirm('Подтвердить участника и отправить на одобрение администратору?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          registration_status: 'club_approved',
          approved_by_club: profile.id,
          approved_at_club: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      setMessage('✅ Участник подтверждён! Отправлено на одобрение администратору.')
      setMessageType('success')
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
  }

  const handleReject = async (userId) => {
    if (!confirm('Отклонить заявку участника?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          registration_status: 'rejected'
        })
        .eq('id', userId)

      if (error) throw error

      setMessage('❌ Заявка отклонена')
      setMessageType('error')
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message)
      setMessageType('error')
    }
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
      
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>
            📋 Заявки на регистрацию
          </h1>
          <p style={{ color: '#667085', fontSize: '16px' }}>
            🏫 {clubName} — {requests.length} заявок на подтверждение
          </p>
          <p style={{ color: '#98A2B3', fontSize: '14px', marginTop: '4px' }}>
            Подтвердите участников вашего клуба, затем администратор одобрит доступ
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            background: messageType === 'success' ? '#E8F5EF' : '#FCEBEC',
            color: messageType === 'success' ? '#16845B' : '#B3262E',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h3 style={{ fontSize: '20px', color: '#0B1F3A' }}>Новых заявок нет</h3>
            <p style={{ color: '#667085' }}>Все участники вашего клуба уже подтверждены</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map((req) => (
              <div
                key={req.id}
                className="card"
                style={{
                  padding: '20px',
                  border: '1px solid #E2E7EF',
                  borderLeft: '4px solid #C9A227'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '18px', color: '#0B1F3A' }}>
                      {req.full_name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#667085' }}>
                      📧 {req.email}
                    </div>
                    <div style={{ fontSize: '14px', color: '#667085' }}>
                      🏫 {req.school || 'Школа не указана'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#667085' }}>
                      📅 {new Date(req.created_at).toLocaleDateString('ru-RU')}
                    </div>
                    <div style={{ fontSize: '14px', color: '#667085' }}>
                      📱 {req.phone || 'Телефон не указан'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-success"
                      style={{
                        padding: '8px 20px',
                        background: '#16845B',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                      onClick={() => handleApprove(req.id)}
                    >
                      ✅ Подтвердить
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{
                        padding: '8px 20px',
                        background: '#B3262E',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                      onClick={() => handleReject(req.id)}
                    >
                      ❌ Отклонить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}