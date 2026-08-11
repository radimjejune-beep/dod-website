// src/pages/DebugClub.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function DebugClub() {
  const [profile, setProfile] = useState(null)
  const [coordinatorData, setCoordinatorData] = useState(null)
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])

  const addLog = (message, data) => {
    setLogs(prev => [...prev, { message, data: JSON.stringify(data, null, 2) }])
  }

  useEffect(() => {
    checkData()
  }, [])

  const checkData = async () => {
    try {
      addLog('🔍 НАЧАЛО ДИАГНОСТИКИ')

      // 1. Проверяем авторизацию
      const { data: { user } } = await supabase.auth.getUser()
      addLog('1. Пользователь:', user)

      if (!user) {
        addLog('❌ Нет пользователя')
        setLoading(false)
        return
      }

      // 2. Загружаем профиль
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        addLog('❌ Ошибка профиля:', profileError)
        setLoading(false)
        return
      }

      setProfile(profileData)
      addLog('2. Профиль:', profileData)
      addLog('2a. Роль:', profileData.role)

      // 3. Ищем привязку координатора
      if (profileData.role === 'club_coordinator') {
        addLog('3. Ищем привязку к клубам...')

        const { data: coordData, error: coordError } = await supabase
          .from('club_coordinators')
          .select('club_id')
          .eq('profile_id', profileData.id)

        if (coordError) {
          addLog('❌ Ошибка поиска:', coordError)
        } else {
          addLog('4. Привязки найдены:', coordData)
          setCoordinatorData(coordData)

          if (coordData && coordData.length > 0) {
            const clubIds = coordData.map(c => c.club_id)
            addLog('5. ID клубов:', clubIds)

            // Загружаем клубы
            const { data: clubsData, error: clubsError } = await supabase
              .from('clubs')
              .select('*')
              .in('id', clubIds)

            if (clubsError) {
              addLog('❌ Ошибка загрузки клубов:', clubsError)
            } else {
              addLog('6. Найдены клубы:', clubsData)
              setClubs(clubsData || [])
            }
          } else {
            addLog('❌ Нет привязок к клубам')
          }
        }
      } else {
        addLog('⚠️ Пользователь не координатор КЮДа, роль:', profileData.role)
      }

    } catch (err) {
      addLog('❌ Ошибка:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <Navigation profile={profile} />
      
      <div className="container" style={{ paddingTop: '30px' }}>
        <h1>🔍 Диагностика привязки координатора</h1>
        
        <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
          <h3>📊 Результат</h3>
          <div style={{ marginTop: '12px' }}>
            <p><strong>Роль пользователя:</strong> {profile?.role || 'Не определена'}</p>
            <p><strong>Найдено привязок:</strong> {coordinatorData?.length || 0}</p>
            <p><strong>Найдено клубов:</strong> {clubs.length}</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
          <h3>📋 Найденные клубы</h3>
          {clubs.length === 0 ? (
            <p style={{ color: '#B3262E' }}>❌ Клубы не найдены</p>
          ) : (
            <ul>
              {clubs.map(club => (
                <li key={club.id}><strong>{club.name}</strong> — {club.description || 'Без описания'}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3>📝 Логи</h3>
          <div style={{
            background: '#1a1a2e',
            color: '#00ff88',
            padding: '16px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '13px',
            maxHeight: '400px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '4px' }}>
                <span style={{ color: '#ffcc00' }}>{log.message}</span>
                {log.data && (
                  <span style={{ color: '#88ddff' }}> → {log.data}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={checkData}
          style={{ marginTop: '16px' }}
        >
          🔄 Обновить
        </button>
      </div>
    </div>
  )
}