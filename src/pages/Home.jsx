// src/pages/Home.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [news, setNews] = useState([
    {
      id: 1,
      title: 'Открытие нового КЮДа в Москве',
      date: '10 августа 2026',
      description: 'Состоялось торжественное открытие клуба юных дипломатов на базе школы № 1234. В мероприятии приняли участие представители МИД России.',
      image: '🏛️'
    },
    {
      id: 2,
      title: 'Международный форум юных дипломатов',
      date: '5 августа 2026',
      description: 'С 15 по 20 сентября в Москве пройдёт II Международный форум юных дипломатов. Участников ждут мастер-классы и встречи с дипломатами.',
      image: '🌍'
    },
    {
      id: 3,
      title: 'Старт заявок на участие в программе "Стажёр МИД"',
      date: '1 августа 2026',
      description: 'Открыт приём заявок для участников движения на стажировку в Министерстве иностранных дел. Успейте подать заявку до 1 сентября!',
      image: '📄'
    },
    {
      id: 4,
      title: 'Встреча с молодыми дипломатами',
      date: '25 июля 2026',
      description: 'Состоялась встреча участников движения с молодыми сотрудниками МИД России. Ребята узнали о работе дипломатической службы из первых уст.',
      image: '🤝'
    }
  ])

  const [user, setUser] = useState(null)

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })
  }, [])

  return (
    <div className="fade-in">
      {/* ========== ШАПКА ========== */}
      <header style={{
        background: 'white',
        borderBottom: '2px solid var(--gray-border)',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              background: 'linear-gradient(135deg, var(--mid-blue), var(--mid-blue-light))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
              🌍
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--mid-blue)' }}>
                Детское общественное движение
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--mid-blue)' }}>
                «Дипломаты будущего»
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {user ? (
              <Link to="/dashboard" className="btn btn-primary">
                Войти в систему
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline">
                  Войти
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ========== ГЕРОЙ-БАННЕР ========== */}
      <section style={{
        background: 'linear-gradient(135deg, var(--mid-blue) 0%, var(--mid-blue-light) 100%)',
        color: 'white',
        padding: '60px 24px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '40px',
            border: '2px solid var(--gold)'
          }}>
            🌍
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '12px' }}>
            Детское общественное движение
          </h1>
          <h2 style={{ fontSize: '42px', fontWeight: '800', color: 'var(--gold)', marginBottom: '16px' }}>
            «Дипломаты будущего»
          </h2>
          <p style={{ fontSize: '18px', opacity: 0.9, maxWidth: '600px', margin: '0 auto 24px' }}>
            При Министерстве иностранных дел Российской Федерации
          </p>
          <div style={{
            display: 'inline-block',
            background: 'var(--gold)',
            color: 'var(--mid-blue)',
            padding: '8px 24px',
            borderRadius: '30px',
            fontWeight: '700',
            fontSize: '14px'
          }}>
            🇷🇺 Развиваем дипломатов будущего
          </div>
        </div>
      </section>

      {/* ========== НОВОСТИ ========== */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '28px', color: 'var(--mid-blue)' }}>📰 Новости движения</h2>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Актуальные события
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {news.map((item) => (
            <div key={item.id} className="card card-gold-border" style={{
              transition: 'var(--transition)',
              cursor: 'default'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>{item.image}</div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px', color: 'var(--mid-blue)' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                📅 {item.date}
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== О НАС ========== */}
      <section style={{ background: 'var(--gray-light)', padding: '50px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', color: 'var(--mid-blue)', textAlign: 'center', marginBottom: '30px' }}>
            🇷🇺 О движении
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px'
          }}>
            <div className="card card-blue-border" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎯</div>
              <h4 style={{ color: 'var(--mid-blue)' }}>Миссия</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Воспитание нового поколения дипломатов, знающих историю и культуру России
              </p>
            </div>
            <div className="card card-gold-border" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏛️</div>
              <h4 style={{ color: 'var(--mid-blue)' }}>Статус</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Движение действует при поддержке Министерства иностранных дел Российской Федерации
              </p>
            </div>
            <div className="card card-blue-border" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🌍</div>
              <h4 style={{ color: 'var(--mid-blue)' }}>География</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Клубы юных дипломатов открыты в 15 регионах России
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== ПОДВАЛ ========== */}
      <footer style={{
        background: 'var(--mid-blue)',
        color: 'white',
        padding: '30px 24px',
        textAlign: 'center'
      }}>
        <p style={{ marginBottom: '8px' }}>
          <strong>Детское общественное движение «Дипломаты будущего»</strong>
        </p>
        <p style={{ fontSize: '14px', opacity: 0.7 }}>
          При Министерстве иностранных дел Российской Федерации
        </p>
        <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '16px' }}>
          © 2026 Все права защищены
        </p>
      </footer>
    </div>
  )
}