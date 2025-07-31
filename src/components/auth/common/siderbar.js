import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import { checkAuth } from '../../../utils/auth';
import '../../../styles/dasboard.css';

const Sidebar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Usuario');

  // Verificar muestras contaminadas
  const verificarMuestrasContaminadas = async () => {
    try {
      const response = await axiosInstance.get('/muestras/');
      
      const muestrasContaminadas = response.data.filter(muestra => 
        muestra.estado === 'CONTAMINADA'
      );

      // Crear notificaciones para muestras contaminadas nuevas
      const notificacionesExistentes = JSON.parse(localStorage.getItem('notificaciones') || '[]');
      const nuevasNotificaciones = [];

      muestrasContaminadas.forEach(muestra => {
        const notificacionExiste = notificacionesExistentes.find(n => 
          n.tipo === 'muestra_contaminada' && n.muestra_id === muestra.id
        );

        if (!notificacionExiste) {
          nuevasNotificaciones.push({
            id: `muestra_${muestra.id}_${Date.now()}`,
            tipo: 'muestra_contaminada',
            muestra_id: muestra.id,
            titulo: '⚠️ Muestra Contaminada Detectada',
            mensaje: `La muestra ${muestra.numero_muestra} del lote ${muestra.lote_info?.numero_lote || 'N/A'} ha sido marcada como contaminada.`,
            fecha: new Date().toISOString(),
            leida: false,
            prioridad: 'alta',
            detalles: {
              numero_muestra: muestra.numero_muestra,
              lote: muestra.lote_info?.numero_lote,
              propietario: muestra.propietario_nombre,
              fecha_analisis: muestra.fecha_analisis,
              observaciones: muestra.observaciones
            }
          });
        }
      });

      if (nuevasNotificaciones.length > 0) {
        const todasLasNotificaciones = [...notificacionesExistentes, ...nuevasNotificaciones];
        localStorage.setItem('notificaciones', JSON.stringify(todasLasNotificaciones));
        setNotificaciones(todasLasNotificaciones);
        
        // Actualizar contador de no leídas
        const noLeidas = todasLasNotificaciones.filter(n => !n.leida).length;
        setUnreadCount(noLeidas);

        // Mostrar notificación del navegador si es posible
        if (Notification.permission === 'granted') {
          nuevasNotificaciones.forEach(notif => {
            new Notification(notif.titulo, {
              body: notif.mensaje,
              icon: '/favicon.ico'
            });
          });
        }
      }
    } catch (error) {
      console.error('Error al verificar muestras contaminadas:', error);
    }
  };

  // Cargar notificaciones desde localStorage
  const cargarNotificaciones = () => {
    const notificacionesGuardadas = JSON.parse(localStorage.getItem('notificaciones') || '[]');
    setNotificaciones(notificacionesGuardadas);
    const noLeidas = notificacionesGuardadas.filter(n => !n.leida).length;
    setUnreadCount(noLeidas);
  };

  // Solicitar permisos de notificación
  const solicitarPermisosNotificacion = () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    // Obtener nombre del usuario desde localStorage
    const storedUserName = localStorage.getItem('userName');
    if (storedUserName) {
      setUserName(storedUserName);
    }

    // Cargar notificaciones al iniciar
    cargarNotificaciones();
    solicitarPermisosNotificacion();

    // Verificar muestras contaminadas cada 30 segundos
    const interval = setInterval(() => {
      verificarMuestrasContaminadas();
    }, 30000);

    // Verificar inmediatamente al cargar
    verificarMuestrasContaminadas();

    return () => clearInterval(interval);
  }, []);

  // Marcar notificación como leída
  const marcarComoLeida = (notificacionId) => {
    const notificacionesActualizadas = notificaciones.map(n => 
      n.id === notificacionId ? { ...n, leida: true } : n
    );
    setNotificaciones(notificacionesActualizadas);
    localStorage.setItem('notificaciones', JSON.stringify(notificacionesActualizadas));
    
    const noLeidas = notificacionesActualizadas.filter(n => !n.leida).length;
    setUnreadCount(noLeidas);
  };

  // Marcar todas como leídas
  const marcarTodasComoLeidas = () => {
    const notificacionesActualizadas = notificaciones.map(n => ({ ...n, leida: true }));
    setNotificaciones(notificacionesActualizadas);
    localStorage.setItem('notificaciones', JSON.stringify(notificacionesActualizadas));
    setUnreadCount(0);
  };

  // Eliminar notificación
  const eliminarNotificacion = (notificacionId) => {
    const notificacionesActualizadas = notificaciones.filter(n => n.id !== notificacionId);
    setNotificaciones(notificacionesActualizadas);
    localStorage.setItem('notificaciones', JSON.stringify(notificacionesActualizadas));
    
    const noLeidas = notificacionesActualizadas.filter(n => !n.leida).length;
    setUnreadCount(noLeidas);
  };

  // Limpiar todas las notificaciones
  const limpiarTodasLasNotificaciones = () => {
    setNotificaciones([]);
    localStorage.setItem('notificaciones', JSON.stringify([]));
    setUnreadCount(0);
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    const ahora = new Date();
    const fechaNotificacion = new Date(fecha);
    const diferencia = ahora - fechaNotificacion;
    
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} h`;
    return `Hace ${dias} d`;
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
    // Cerrar notificaciones si están abiertas
    if (notificationsOpen) {
      setNotificationsOpen(false);
    }
  };

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    // Cerrar dropdown si está abierto
    if (dropdownOpen) {
      setDropdownOpen(false);
    }
  };

  const handleLogout = () => {
    // Eliminar tokens y datos de sesión
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('access_token');
    localStorage.removeItem('notificaciones');
    
    // Redireccionar al login
    navigate('/login');
  };

  return (
    <div className="navbar">
      <div className="navbar-brand">
        <h2>FAPECAFES</h2>
      </div>
      
      <div className="navbar-actions">
        {/* Botón de Notificaciones */}
        <div className="notifications-container">
          <button 
            className={`notifications-btn ${notificationsOpen ? 'active' : ''}`}
            onClick={toggleNotifications}
            title="Notificaciones"
          >
            <span className="bell-icon">🔔</span>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {/* Modal de Notificaciones */}
          {notificationsOpen && (
            <div className="notifications-modal">
              <div className="notifications-header">
                <h4>Notificaciones</h4>
                <span className="unread-count">({unreadCount} nuevas)</span>
                <div className="notifications-actions">
                  {unreadCount > 0 && (
                    <button 
                      className="btn-mark-all-read"
                      onClick={marcarTodasComoLeidas}
                      title="Marcar todas como leídas"
                    >
                      ✓
                    </button>
                  )}
                  <button 
                    className="btn-clear-all"
                    onClick={limpiarTodasLasNotificaciones}
                    title="Limpiar todas"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="notifications-list">
                {notificaciones.length > 0 ? (
                  notificaciones
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                    .slice(0, 10) // Mostrar solo las últimas 10
                    .map(notificacion => (
                      <div 
                        key={notificacion.id}
                        className={`notification-item ${!notificacion.leida ? 'unread' : ''} priority-${notificacion.prioridad}`}
                      >
                        <div className="notification-content">
                          <div className="notification-title">
                            {notificacion.titulo}
                          </div>
                          <div className="notification-message">
                            {notificacion.mensaje}
                          </div>
                          {notificacion.detalles && (
                            <div className="notification-details">
                              <small>
                                Lote: {notificacion.detalles.lote} | 
                                Propietario: {notificacion.detalles.propietario}
                              </small>
                            </div>
                          )}
                          <div className="notification-time">
                            {formatearFecha(notificacion.fecha)}
                          </div>
                        </div>
                        <div className="notification-actions">
                          {!notificacion.leida && (
                            <button 
                              className="btn-mark-read"
                              onClick={() => marcarComoLeida(notificacion.id)}
                              title="Marcar como leída"
                            >
                              ✓
                            </button>
                          )}
                          <button 
                            className="btn-delete"
                            onClick={() => eliminarNotificacion(notificacion.id)}
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="no-notifications">
                    <p>No hay notificaciones</p>
                  </div>
                )}
              </div>
              
              {notificaciones.length > 10 && (
                <div className="notifications-footer">
                  <p>Mostrando las 10 más recientes de {notificaciones.length} total</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="navbar-user">
          <div className="user-name-display">
            {userName}
          </div>
          
          <div className="user-profile" onClick={toggleDropdown}>
            <div className="user-avatar">
              <span className="avatar-placeholder">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          
          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-item">
                <button onClick={() => {
                  navigate('/perfil');
                  setDropdownOpen(false);
                }}>
                  Mi Perfil
                </button>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item">
                <button onClick={handleLogout} className="logout-btn">
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;