// src/components/Footer.jsx
import { Link } from 'react-router-dom'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer style={{
      background: '#0B2B4A',
      color: 'white',
      marginTop: '60px',
      padding: '40px 24px 20px',
      borderTop: '4px solid #C9A845'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '30px',
        paddingBottom: '30px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* О ДВИЖЕНИИ */}
        <div>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#C9A845',
            marginBottom: '12px'
          }}>
            🌍 О движении
          </h4>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: '1.6'
          }}>
            Детское общественное движение «Дипломаты будущего» — это сообщество юных дипломатов, 
            развивающих навыки международного общения и дипломатии.
          </p>
        </div>

        {/* БЫСТРЫЕ ССЫЛКИ */}
        <div>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#C9A845',
            marginBottom: '12px'
          }}>
            📌 Быстрые ссылки
          </h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/dashboard" style={{
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '13px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#C9A845'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
              >
                Главная
              </Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/events" style={{
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '13px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#C9A845'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
              >
                Мероприятия
              </Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/clubs" style={{
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '13px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#C9A845'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
              >
                КЮДы
              </Link>
            </li>
          </ul>
        </div>

        {/* КОНТАКТЫ */}
        <div>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#C9A845',
            marginBottom: '12px'
          }}>
            📞 Контакты
          </h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: '1.8'
          }}>
            <li>📍 Москва, Россия</li>
            <li>📧 info@diplomats-future.ru</li>
            <li>📱 +7 (495) 123-45-67</li>
          </ul>
        </div>

        {/* СОЦИАЛЬНЫЕ СЕТИ */}
        <div>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#C9A845',
            marginBottom: '12px'
          }}>
            🌐 Мы в соцсетях
          </h4>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <a href="#" style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '24px',
              textDecoration: 'none',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#C9A845'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
            >
              📘
            </a>
            <a href="#" style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '24px',
              textDecoration: 'none',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#C9A845'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
            >
              📺
            </a>
            <a href="#" style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '24px',
              textDecoration: 'none',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#C9A845'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
            >
              📸
            </a>
            <a href="#" style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '24px',
              textDecoration: 'none',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#C9A845'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
            >
              💬
            </a>
          </div>
        </div>
      </div>

      {/* НИЖНЯЯ ЧАСТЬ ПОДВАЛА */}
      <div style={{
        maxWidth: '1200px',
        margin: '20px auto 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)'
      }}>
        <span>
          © {currentYear} ДОД «Дипломаты будущего». Все права защищены.
        </span>
        <span>
          При поддержке Ассоциации российских дипломатов
        </span>
      </div>
    </footer>
  )
}