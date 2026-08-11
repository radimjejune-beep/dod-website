// src/pages/ClubAnalytics.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function ClubAnalytics() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clubActivity, setClubActivity] = useState([])
  const [clubParticipants, setClubParticipants] = useState([])
  const [allParticipants, setAllParticipants] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState('club') // 'club' | 'participants' | 'all'
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [selectedMonth])

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

      const monthStr = selectedMonth.toISOString().slice(0, 7)

      // Загружаем активность клуба
      const { data: clubData } = await supabase
        .from('club_monthly_activity')
        .select('*')
        .eq('month', monthStr + '-01')
        .order('events_count', { ascending: false })

      setClubActivity(clubData || [])

      // Загружаем топ участников КЮДа
      const { data: participantsData } = await supabase
        .from('club_participants_rank')
        .select('*')
        .eq('month', monthStr + '-01')
        .order('rank_in_club', { ascending: true })

      setClubParticipants(participantsData || [])

      // Загружаем топ всех участников (только для админа и координатора движения)
      if (profile?.role === 'admin' || profile?.role === 'movement_coordinator') {
        const { data: allData } = await supabase
          .from('participants_rank_all')
          .select('*')
          .eq('month', monthStr + '-01')
          .order('rank_all', { ascending: true })
          .limit(20)
        setAllParticipants(allData || [])
      }

    } catch (err) {
      console.error('Ошибка:', err)
    }
    setLoading(false)
  }

  const getMonthLabel = (date) => {
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  }

  const changeMonth = (delta) => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + delta)
    setSelectedMonth(newDate)
  }

  const getRoleEmoji = (role) => {
    const map = {
      'participant': '👤',
      'parent': '👨‍👩‍👦',
      'club_coordinator': '🏫',
      'tutor': '📚',
      'movement_coordinator': '⭐',
      'admin': '🔧'
    }
    return map[role] || '👤'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  const isClubCoordinator = profile?.role === 'club_coordinator'
  const isAdminOrMovement = profile?.role === 'admin' || profile?.role === 'movement_coordinator'

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
              📊 Аналитика активности
            </h1>
            <p style={{ color: '#667085', fontSize: '14px' }}>
              {isClubCoordinator ? 'Активность вашего клуба' : 'Активность всех КЮДов'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px' }}
              onClick={() => changeMonth(-1)}
            >
              ◀
            </button>
            <span style={{ fontWeight: '600', color: '#0B1F3A', minWidth: '140px', textAlign: 'center' }}>
              {getMonthLabel(selectedMonth)}
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px' }}
              onClick={() => changeMonth(1)}
            >
              ▶
            </button>
            {!isClubCoordinator && (
              <select
                className="form-select"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
              >
                <option value="club">КЮДы</option>
                <option value="participants">Участники КЮДов</option>
                {isAdminOrMovement && (
                  <option value="all">Все участники</option>
                )}
              </select>
            )}
          </div>
        </div>

        {/* ===== АКТИВНОСТЬ КЛУБА ===== */}
        {(viewMode === 'club' || isClubCoordinator) && (
          <>
            <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
                🏫 Активность КЮДов
              </h3>
              {clubActivity.length === 0 ? (
                <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>
                  Нет данных за этот месяц
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {clubActivity.map((club, index) => (
                    <div
                      key={club.club_id}
                      style={{
                        padding: '14px 18px',
                        background: index === 0 ? '#E8EDF3' : '#F8FAFC',
                        borderRadius: '10px',
                        borderLeft: index === 0 ? '4px solid #C9A227' : '4px solid #174A7E',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                          {index === 0 && '🏆 '}
                          {club.club_name}
                          {index === 0 && (
                            <span style={{
                              marginLeft: '8px',
                              padding: '2px 10px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '600',
                              background: '#FBF4DC',
                              color: '#8A6A00'
                            }}>
                              Лидер месяца
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: '#667085' }}>
                          📊 {club.events_count} мероприятий • 👥 {club.participants_count} участников
                          {club.outgoing_events_count > 0 && ` • 🚗 ${club.outgoing_events_count} выездов`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A' }}>
                          {club.events_count || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#667085' }}>мероприятий</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== ТОП УЧАСТНИКОВ КЮДА ===== */}
        {(viewMode === 'participants' || isClubCoordinator) && (
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🏆 Топ участников КЮДов
            </h3>
            {clubParticipants.length === 0 ? (
              <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>
                Нет данных за этот месяц
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {clubParticipants
                  .filter(p => p.rank_in_club <= 3)
                  .map((p, index) => (
                    <div
                      key={p.participant_id}
                      style={{
                        padding: '12px 16px',
                        background: index === 0 ? '#FBF4DC' : index === 1 ? '#F4F6F9' : '#F8FAFC',
                        borderRadius: '10px',
                        borderLeft: index === 0 ? '4px solid #C9A227' : 
                                   index === 1 ? '4px solid #A0A0A0' : '4px solid #CD7F32',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                          {index === 0 && '🥇 '}
                          {index === 1 && '🥈 '}
                          {index === 2 && '🥉 '}
                          {p.full_name}
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '12px',
                            color: '#667085'
                          }}>
                            ({p.club_name})
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#667085' }}>
                          {p.events_count} мероприятий • {p.attended_count || 0} посещений
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          color: index === 0 ? '#C9A227' : index === 1 ? '#667085' : '#CD7F32'
                        }}>
                          #{p.rank_in_club}
                        </div>
                        <div style={{ fontSize: '11px', color: '#667085' }}>в КЮДе</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ===== ТОП ВСЕХ УЧАСТНИКОВ ===== */}
        {viewMode === 'all' && isAdminOrMovement && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🌟 Топ участников движения
            </h3>
            {allParticipants.length === 0 ? (
              <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>
                Нет данных за этот месяц
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {allParticipants.map((p, index) => (
                  <div
                    key={p.participant_id}
                    style={{
                      padding: '12px 16px',
                      background: index === 0 ? '#FBF4DC' : index === 1 ? '#F4F6F9' : '#F8FAFC',
                      borderRadius: '10px',
                      borderLeft: index === 0 ? '4px solid #C9A227' : 
                                 index === 1 ? '4px solid #A0A0A0' : '4px solid #CD7F32',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#0B1F3A' }}>
                        {index === 0 && '🥇 '}
                        {index === 1 && '🥈 '}
                        {index === 2 && '🥉 '}
                        {p.full_name}
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '12px',
                          color: '#667085'
                        }}>
                          ({p.club_name || 'Без клуба'})
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#667085' }}>
                        {p.events_count} мероприятий • {p.attended_count || 0} посещений
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: index === 0 ? '#C9A227' : index === 1 ? '#667085' : '#CD7F32'
                      }}>
                        #{p.rank_all}
                      </div>
                      <div style={{ fontSize: '11px', color: '#667085' }}>в движении</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}