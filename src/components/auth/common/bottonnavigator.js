import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../../utils/auth';
import '../../../styles/dasboard.css';

const BottomNavigator = () => {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Obtener el rol del usuario
    const fetchUserRole = async () => {
      const userData = await getCurrentUser();
      if (userData) {
        setUserRole(userData.rol);
        
        // Extraer el path actual y convertir a minúsculas para comparación
        const currentPath = location.pathname.split('/')[1] || 'dashboard';
        
        // Mapear rutas específicas para que coincidan con las keys
        let activeKey = currentPath.toLowerCase();
        
        // Casos especiales de mapeo
        if (currentPath === 'Registros') {
          activeKey = 'registros';
        } else if (currentPath === 'analisis-muestra') {
          activeKey = 'analisis-muestra';
        }
        
        // Si es secretaria, establecer registros como página activa por defecto si no hay path
        if (userData.rol === 'SECRETARIA' && !currentPath) {
          activeKey = 'registros';
        } else if (!currentPath) {
          // Para otros roles, usar dashboard como default
          activeKey = userData.rol === 'EMPLEADO' ? 'empleado' : 'dashboard';
        }
        
        setActiveItem(activeKey);
      }
    };
    
    fetchUserRole();
  }, [location]);

  const handleLogout = () => {
    // Eliminar tokens y datos de sesión
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Redireccionar al login
    navigate('/login');
  };

  // Definir los elementos del menú según el rol
  const getMenuItems = () => {
    if (userRole === 'SECRETARIA') {
      return [
        {
          path: '/Registros',
          key: 'registros',
          icon: '⟳',
          text: 'Registros'
        },
        {
          path: '/actividades',
          key: 'actividades',
          icon: '📋',
          text: 'Actividades'
        },
        {
          path: '/reportes',
          key: 'reportes',
          icon: '📊',
          text: 'Reportes'
        },
        {
          path: '/contabilidad',
          key: 'contabilidad',
          icon: '💰',
          text: 'Contabilidad de costos'
        },
        {
          path: '/personal',
          key: 'personal',
          icon: '👤',
          text: 'Propietarios'
        }
      ];
    } else if (userRole === 'EMPLEADO') {
      return [
        {
          path: '/descarga',
          key: 'descarga',
          icon: '📦',
          text: 'Descargas'
        },
        {
          path: '/analisis-muestra',
          key: 'analisis-muestra',
          icon: '🔬',
          text: 'Análisis de Muestra'
        },
        {
          path: '/procesos',
          key: 'procesos',
          icon: '⚙️',
          text: 'Procesos'
        }
      ];
    } else {
      // ADMINISTRADOR o rol por defecto
      return [
        {
          path: '/dashboard',
          key: 'dashboard',
          icon: '⊞',
          text: 'Dashboard'
        },
        {
          path: '/Registros',
          key: 'registros',
          icon: '⟳',
          text: 'Registros'
        },
        {
          path: '/descarga',
          key: 'descarga',
          icon: '📦',
          text: 'Descarga'
        },
        {
          path: '/analisis-muestra',
          key: 'analisis-muestra',
          icon: '🔬',
          text: 'Análisis de Muestra'
        },
        {
          path: '/procesos',
          key: 'procesos',
          icon: '⚙️',
          text: 'Procesos'
        },
        {
          path: '/actividades',
          key: 'actividades',
          icon: '📋',
          text: 'Actividades'
        },
        {
          path: '/contabilidad',
          key: 'contabilidad',
          icon: '💰',
          text: 'Contabilidad de costos'
        },
        {
          path: '/bitacora',
          key: 'bitacora',
          icon: '📄',
          text: 'Bitácora'
        },
        {
          path: '/personal',
          key: 'personal',
          icon: '👤',
          text: 'Propietarios'
        },
        {
          path: '/reportes',
          key: 'reportes',
          icon: '📊',
          text: 'Reportes'
        }
      ];
    }
  };

  return (
    <div className="side-nav">
      <div className="side-nav-items">
        {getMenuItems().map((item) => (
          <Link 
            key={item.key}
            to={item.path} 
            className={`side-nav-item ${activeItem === item.key ? 'active' : ''}`}
          >
            <div className="side-nav-icon">
              <i className={`icon-${item.key}`}>{item.icon}</i>
            </div>
            <div className="side-nav-text">{item.text}</div>
          </Link>
        ))}
      </div>
      
      <div className="side-nav-footer">
        <div className="side-nav-item logout" onClick={handleLogout}>
          <div className="side-nav-icon">
            <i className="icon-logout">↪</i>
          </div>
          <div className="side-nav-text">Cerrar Sesión</div>
        </div>
      </div>
    </div>
  );
};

export default BottomNavigator;