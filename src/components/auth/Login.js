import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { setTokens, getCurrentUser } from '../../utils/auth';
import '../../styles/Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('=== INICIO DEL LOGIN ===');
    console.log('Username:', username);
    console.log('Password length:', password.length);
    
    setError('');
    setLoading(true);
    
    try {
      console.log('Enviando petición de login...');
      // Hacer login usando fetch
      const response = await fetch('http://localhost:8000/api/users/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      console.log('Respuesta recibida:', response.status);
      const data = await response.json();
      console.log('Datos de respuesta:', data);

      if (!response.ok) {
        throw new Error(data.detail || 'Error en el login');
      }
      
      console.log('Login exitoso, guardando tokens...');
      // Guardar tokens usando auth.js
      setTokens(data.access, data.refresh);
      
      console.log('Obteniendo información del usuario...');
      // Obtener información del usuario para determinar su rol usando auth.js
      const userData = await getCurrentUser();
      console.log('Datos del usuario:', userData);
      
      if (!userData) {
        throw new Error('No se pudo obtener la información del usuario');
      }
      
      // Guardar información adicional
      localStorage.setItem('userName', userData.nombre_completo || userData.username);
      
      console.log('Redirigiendo según rol:', userData.rol);
      // Redirigir según el rol del usuario
      if (userData.rol === 'ADMINISTRADOR') {
        navigate('/dashboard');
      } else if (userData.rol === 'EMPLEADO') {
        navigate('/descarga');
      } else if (userData.rol === 'SECRETARIA') {
        navigate('/Registros');
      } else {
        navigate('/dashboard'); // Por defecto redirigir al dashboard principal
      }
      
    } catch (err) {
      console.error('=== ERROR EN LOGIN ===');
      console.error('Error en login:', err);
      if (err.message) {
        setError(err.message);
      } else {
        setError('Error en el servidor. Por favor, inténtelo de nuevo.');
      }
    } finally {
      console.log('=== FIN DEL LOGIN ===');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-image">
        {/* Esta sección muestra la imagen de fondo de granos de café */}
      </div>
      <div className="login-form-container">
        <h1 className="app-name">FAPECAFES</h1>
        <div className="login-title">INGRESO AL SISTEMA</div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <div className="input-icon">
              <span className="input-icon-prefix">👤</span>
              <input
                type="text"
                className="form-control input-with-icon"
                id="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-icon">
              <span className="input-icon-prefix">🔒</span>
              <input
                type="password"
                className="form-control input-with-icon"
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
          <div className="register-link">
            ¿No tienes una cuenta? <Link to="/register">Regístrate aquí</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;