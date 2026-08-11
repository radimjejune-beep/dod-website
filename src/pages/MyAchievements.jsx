// src/pages/MyAchievements.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function MyAchievements() {
  const [profile, setProfile] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [childProfile, setChildProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isParent, setIsParent] = useState(false)
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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      if (profileData.role === 'parent') {
        setIsParent(true)
        await loadChildAchievements(user.id)
      } else if (profileData.role === 'participant') {
        await loadUserAchievements(user.id)
      } else {
        navigate('/achievements')
      }

    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChildAchievements = async (parentId) => {
    try {
      const { data: relations, error: relError } = await supabase
        .from('parent_child_relations')
        .select(`
          child_id,
          profiles:child_id (
            id,
            full_name,
            school,
            class_name
          )
        `)
        .eq('parent_id', parentId)
        .eq('status', 'active')
        .limit(1)

      if (relError) throw relError

      if (!relations || relations.length === 0) {
        setAchievements([])
        setChildProfile(null)
        return
      }

      const child = relations[0].profiles
      setChildProfile(child)
      await loadUserAchievements(child.id)

    } catch (error) {
      console.error('Ошибка загрузки ребенка:', error)
      setAchievements([])
    }
  }

  const loadUserAchievements = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (
            id,
            name,
            description,
            icon,
            points,
            category,
            color
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })

      if (error) throw error
      setAchievements(data || [])
    } catch (error) {
      console.error('Ошибка загрузки достижений:', error)
      setAchievements([])
    }
  }

  const getStats = () => {
    const total = achievements.length
    const totalPoints = achievements.reduce((sum, item) => {
      return sum + (item.achievements?.points || 0)
    }, 0)
    
    const categories = {}
    achievements.forEach(item => {
      const cat = item.achievements?.category || 'Другое'
      categories[cat] = (categories[cat] || 0) + 1
    })

    return { total, totalPoints, categories }
  }

  const stats = getStats()

  const getCategoryIcon = (category) => {
    const icons = {
      'Участие': '🎯',
      'Организация': '🤝',
      'Особое': '⭐',
      'Спорт': '⚽',
      'Творчество': '🎨',
      'Наука': '🔬',
      'Волонтерство': '❤️'
    }
    return icons[category] || '🏅'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    )
  }

  const getTitle = () => {
    if (isParent && childProfile) {
      return `🏆 Достижения ${childProfile.full_name}`
    }
    if (isParent && !childProfile) {
      return '🏆 Достижения ребенка'
    }
    return '🏆 Мои достижения'
  }

  const getSubtitle = () => {
    if (isParent && childProfile) {
      return `${childProfile.full_name} • ${childProfile.school || 'Школа не указана'}`
    }
    if (isParent && !childProfile) {
      return 'Ребенок еще не привязан к вашему аккаунту'
    }
    return 'Все ваши награды и достижения в ДОД «Дипломаты будущего»'
  }

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 24px 40px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
            {getTitle()}
          </h1>
          <p style={{ color: '#667085', fontSize: '16px' }}>
            {getSubtitle()}
          </p>
        </div>

        {isParent && !childProfile && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px 40px',
            textAlign: 'center',
            border: '1px solid #E2E7EF'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👦</div>
            <h3 style={{ fontSize: '20px', color: '#0B1F3A', marginBottom: '8px' }}>
              Ребенок не привязан
            </h3>
            <p style={{ color: '#667085', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              Чтобы увидеть достижения ребенка, необходимо привязать его аккаунт.
              Обратитесь к координатору для настройки связи.
            </p>
          </div>
        )}

        {!isParent || (isParent && childProfile) ? (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '16px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid #E2E7EF'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '14px', color: '#667085' }}>Всего достижений</div>
              </div>
              
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid #E2E7EF'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#C9A227' }}>
                  {stats.totalPoints}
                </div>
                <div style={{ fontSize: '14px', color: '#667085' }}>Всего баллов</div>
              </div>

              {Object.keys(stats.categories).length > 0 && (
                <div style={{
                  background: 'white',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid #E2E7EF'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                    По категориям:
                  </div>
                  {Object.entries(stats.categories).map(([category, count]) => (
                    <div key={category} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                      color: '#667085',
                      padding: '2px 0'
                    }}>
                      <span>{getCategoryIcon(category)} {category}</span>
                      <span style={{ fontWeight: '600', color: '#0B1F3A' }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {achievements.length === 0 ? (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '60px 40px',
                textAlign: 'center',
                border: '1px solid #E2E7EF'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌟</div>
                <h3 style={{ fontSize: '20px', color: '#0B1F3A', marginBottom: '8px' }}>
                  {isParent ? 'У ребенка пока нет достижений' : 'У вас пока нет достижений'}
                </h3>
                <p style={{ color: '#667085', fontSize: '16px' }}>
                  {isParent 
                    ? 'Поощряйте ребенка участвовать в мероприятиях!'
                    : 'Участвуйте в мероприятиях и получайте награды! 🏆'
                  }
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {achievements.map((item) => (
                  <div key={item.id} style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E7EF',
                    borderLeft: `4px solid ${item.achievements?.color || '#C9A227'}`,
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{
                        fontSize: '40px',
                        width: '56px',
                        height: '56px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#F4F6F9',
                        borderRadius: '12px',
                        flexShrink: 0
                      }}>
                        {item.achievements?.icon || '🏅'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                            {item.achievements?.name || 'Достижение'}
                          </h3>
                          <span style={{
                            background: '#F4F6F9',
                            padding: '2px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            color: '#667085'
                          }}>
                            +{item.achievements?.points || 0} баллов
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 8px 0', fontSize: '14px', color: '#667085' }}>
                          {item.achievements?.description || 'Без описания'}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#98A2B3', flexWrap: 'wrap' }}>
                          <span>📅 {new Date(item.earned_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}</span>
                          {item.achievements?.category && (
                            <span style={{
                              background: '#F4F6F9',
                              padding: '2px 12px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {getCategoryIcon(item.achievements.category)} {item.achievements.category}
                            </span>
                          )}
                          {isParent && childProfile && (
                            <span style={{
                              background: '#E8F5EF',
                              padding: '2px 12px',
                              borderRadius: '12px',
                              color: '#16845B',
                              fontSize: '12px'
                            }}>
                              👶 {childProfile.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}