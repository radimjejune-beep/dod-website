// src/pages/TestAchievements.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TestAchievements() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function test() {
      try {
        // 1. Проверяем авторизацию
        const { data: { user } } = await supabase.auth.getUser()
        console.log('1. Пользователь:', user)

        // 2. Проверяем подключение к таблице profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .limit(1)
        console.log('2. Профили:', profiles, profilesError)

        // 3. Проверяем таблицу achievements
        const { data: achievements, error: achievementsError } = await supabase
          .from('achievements')
          .select('*')
        console.log('3. Достижения:', achievements, achievementsError)

        setData({
          user,
          profiles,
          achievements,
          profilesError,
          achievementsError
        })
      } catch (err) {
        console.error('Ошибка:', err)
        setError(err.message)
      }
      setLoading(false)
    }
    test()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2>⏳ Загрузка...</h2>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '50px' }}>
        <h2 style={{ color: 'red' }}>❌ Ошибка: {error}</h2>
      </div>
    )
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>🔍 Тест подключения к Supabase</h1>
      
      <div style={{ background: '#f0f4f8', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3>👤 Пользователь</h3>
        <pre style={{ background: 'white', padding: '10px', borderRadius: '8px', overflow: 'auto' }}>
          {JSON.stringify(data?.user, null, 2)}
        </pre>
      </div>

      <div style={{ background: '#f0f4f8', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3>📋 Профили</h3>
        {data?.profilesError ? (
          <p style={{ color: 'red' }}>Ошибка: {data.profilesError.message}</p>
        ) : (
          <pre style={{ background: 'white', padding: '10px', borderRadius: '8px', overflow: 'auto' }}>
            {JSON.stringify(data?.profiles, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ background: '#f0f4f8', padding: '20px', borderRadius: '12px' }}>
        <h3>🏆 Достижения</h3>
        {data?.achievementsError ? (
          <p style={{ color: 'red' }}>Ошибка: {data.achievementsError.message}</p>
        ) : (
          <pre style={{ background: 'white', padding: '10px', borderRadius: '8px', overflow: 'auto' }}>
            {JSON.stringify(data?.achievements, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#E8EDF3', borderRadius: '12px' }}>
        <p><strong>📌 Статус:</strong></p>
        <ul>
          <li>✅ Пользователь авторизован: {data?.user ? 'Да' : 'Нет'}</li>
          <li>✅ Таблица profiles доступна: {data?.profilesError ? '❌ Нет' : '✅ Да'}</li>
          <li>✅ Таблица achievements доступна: {data?.achievementsError ? '❌ Нет' : '✅ Да'}</li>
          <li>📊 Количество достижений: {data?.achievements?.length || 0}</li>
        </ul>
      </div>
    </div>
  )
}