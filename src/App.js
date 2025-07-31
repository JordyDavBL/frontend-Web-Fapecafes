import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/auth/cliente/dashboard';
import Registros from './components/auth/cliente/Registros';
import AnalisisMuestra from './components/auth/cliente/analisis_muestra';
import Procesos from './components/auth/cliente/procesos';
import DetalleProceso from './components/auth/cliente/detalle-proceso';
import Actividades from './components/auth/cliente/actividades';
import Limpieza from './components/auth/cliente/limpieza';
import SeparacionColores from './components/auth/cliente/separacion';
import Recepcion from './components/auth/cliente/recepcion';
import Descarga from './components/auth/cliente/descarga';
import Personal from './components/auth/cliente/personal';
import Reportes from './components/auth/cliente/reportes';
import Bitacora from './components/auth/cliente/bitacora';
import Insumos from './components/auth/cliente/insumos';
import ContabilidadCostos from './components/auth/cliente/contabilidad';
import EmpleadoDashboard from './components/auth/empleado/empleado';
import { getCurrentUser } from './utils/auth';
import './App.css';

// Componente para proteger rutas que requieren autenticación
const ProtectedRoute = () => {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    // Si no hay token, redirigir al login
    return <Navigate to="/login" replace />;
  }
  
  // Si hay token, renderizar las rutas hijas (Outlet es un componente de React Router)
  return <Outlet />;
};

// Componente para proteger rutas según el rol del usuario
const RoleProtectedRoute = ({ allowedRoles, children }) => {
  const [userRole, setUserRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkUserRole = async () => {
      const userData = await getCurrentUser();
      if (userData) {
        setUserRole(userData.rol);
      }
      setLoading(false);
    };
    
    checkUserRole();
  }, []);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    // Si el usuario no tiene un rol permitido, redirigir según su rol
    if (userRole === 'SECRETARIA') {
      return <Navigate to="/Registros" replace />;
    } else if (userRole === 'EMPLEADO') {
      return <Navigate to="/empleado" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <div data-testid="app-container">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Rutas protegidas que requieren autenticación */}
          <Route element={<ProtectedRoute />}>
            {/* Dashboard principal solo para administradores */}
            <Route 
              path="/dashboard" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR']}>
                  <Dashboard />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Dashboard específico para empleados */}
            <Route 
              path="/empleado" 
              element={
                <RoleProtectedRoute allowedRoles={['EMPLEADO']}>
                  <EmpleadoDashboard />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Registros para administradores, empleados y secretarias */}
            <Route 
              path="/Registros" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'EMPLEADO', 'SECRETARIA']}>
                  <Registros />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Descarga para todos los roles */}
            <Route 
              path="/descarga" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'EMPLEADO', 'SECRETARIA']}>
                  <Descarga />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Limpieza para todos los roles */}
            <Route 
              path="/limpieza" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'SECRETARIA']}>
                  <Limpieza />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Separación para administradores y secretarias */}
            <Route 
              path="/separacion" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'SECRETARIA']}>
                  <SeparacionColores />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Recepción solo para administradores y empleados */}
            <Route 
              path="/recepcion" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'EMPLEADO']}>
                  <Recepcion />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Análisis de Muestra para administradores y empleados */}
            <Route 
              path="/analisis-muestra" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'EMPLEADO']}>
                  <AnalisisMuestra />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Procesos para administradores y empleados */}
            <Route 
              path="/procesos" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'EMPLEADO']}>
                  <Procesos />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Detalle de Proceso para administradores y empleados */}
            <Route 
              path="/procesos/:id" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'EMPLEADO']}>
                  <DetalleProceso />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Actividades para administradores, empleados y secretarias */}
            <Route 
              path="/actividades" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'EMPLEADO', 'SECRETARIA']}>
                  <Actividades />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Insumos para administradores y secretarias */}
            <Route 
              path="/insumos" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'SECRETARIA']}>
                  <Insumos />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Contabilidad de costos para administradores y secretarias */}
            <Route 
              path="/contabilidad" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'SECRETARIA']}>
                  <ContabilidadCostos />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Personal para administradores y secretarias */}
            <Route 
              path="/personal" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'SECRETARIA']}>
                  <Personal />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Reportes para administradores y secretarias */}
            <Route 
              path="/reportes" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'SECRETARIA']}>
                  <Reportes />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Bitácora para administradores y empleados */}
            <Route 
              path="/bitacora" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMINISTRADOR', 'EMPLEADO']}>
                  <Bitacora />
                </RoleProtectedRoute>
              } 
            />
          </Route>
          
          {/* Ruta por defecto: redirige al login */}
          <Route path="/" element={<Navigate replace to="/login" />} />
          
          {/* Ruta para URLs no encontradas */}
          <Route path="*" element={<Navigate replace to="/login" />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
