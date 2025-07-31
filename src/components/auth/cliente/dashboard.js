import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar'; // Barra de navegación superior
import BottomNavigator from '../common/bottonnavigator'; // Barra de navegación lateral
import { checkAdminAuth } from '../../../utils/auth';
import '../../../styles/dasboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    nombre: 'Usuario FAPECAFE',
    rol: 'Cliente'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [procesoActual, setProcesoActual] = useState(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('00:00:00');
  const [actualizandoProceso, setActualizandoProceso] = useState(false);
  const [cafeQuintales] = useState([
    { tipo: 1, cantidad: 80, fecha: "18-Jun 24" },
    { tipo: 2, cantidad: 180, fecha: "18-Jun 24" },
    { tipo: 3, cantidad: 78, fecha: "18-Jun 24" },
    { tipo: 1, cantidad: 80, fecha: "18-Jun 24" }
  ]);

  // Comprobar autenticación y rol de administrador al cargar el componente
  useEffect(() => {
    const verificarAcceso = async () => {
      const tieneAcceso = await checkAdminAuth(navigate);
      if (!tieneAcceso) {
        return;
      }

      setIsLoading(true);
      try {
        const nombreUsuario = localStorage.getItem('userName') || 'Usuario FAPECAFE';
        setUserData({
          nombre: nombreUsuario,
          rol: 'Administrador'
        });

        // Cargar proceso actual
        await cargarProcesoActual();
      } catch (error) {
        console.error('Error al verificar acceso:', error);
      } finally {
        setIsLoading(false);
      }
    };

    verificarAcceso();
  }, [navigate]);

  // Efecto para actualizar el tiempo transcurrido cada segundo
  useEffect(() => {
    let interval;
    if (procesoActual && procesoActual.fecha_inicio) {
      interval = setInterval(() => {
        const inicio = new Date(procesoActual.fecha_inicio);
        const ahora = new Date();
        const diferencia = ahora - inicio;

        const horas = Math.floor(diferencia / (1000 * 60 * 60));
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

        setTiempoTranscurrido(
          `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`
        );
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [procesoActual]);

  // Cargar proceso actual (el más reciente que esté activo)
  const cargarProcesoActual = async () => {
    try {
      // Primero intentar obtener procesos EN_PROCESO
      let response = await axiosInstance.get('/procesos/?estado=EN_PROCESO&ordering=-fecha_inicio');
      let procesos = response.data.results || response.data;
      
      // Si no hay procesos EN_PROCESO, buscar INICIADO
      if (!procesos || procesos.length === 0) {
        response = await axiosInstance.get('/procesos/?estado=INICIADO&ordering=-fecha_inicio');
        procesos = response.data.results || response.data;
      }

      if (procesos && procesos.length > 0) {
        setProcesoActual(procesos[0]);
        console.log('Proceso actual cargado:', procesos[0]);
      } else {
        // Si no hay procesos activos, buscar el más reciente de cualquier estado
        const responseRecientes = await axiosInstance.get('/procesos/?ordering=-fecha_inicio&limit=1');
        const procesosRecientes = responseRecientes.data.results || responseRecientes.data;
        if (procesosRecientes && procesosRecientes.length > 0) {
          setProcesoActual(procesosRecientes[0]);
          console.log('Proceso más reciente cargado:', procesosRecientes[0]);
        } else {
          setProcesoActual(null);
          console.log('No se encontraron procesos');
        }
      }
    } catch (error) {
      console.error('Error al cargar proceso actual:', error);
      setProcesoActual(null);
    }
  };

  // Avanzar proceso a la siguiente fase
  const avanzarProceso = async () => {
    if (!procesoActual || actualizandoProceso) return;

    if (procesoActual.estado === 'COMPLETADO') {
      alert('Este proceso ya ha sido completado');
      return;
    }

    setActualizandoProceso(true);
    try {
      const response = await axiosInstance.post(`/procesos/${procesoActual.id}/avanzar-fase/`);

      if (response.data.proceso) {
        setProcesoActual(response.data.proceso);
        alert(`✅ ${response.data.mensaje}`);
      }
    } catch (error) {
      console.error('Error al avanzar proceso:', error);
      const errorMsg = error.response?.data?.error || error.message;
      alert(`Error al avanzar proceso: ${errorMsg}`);
    } finally {
      setActualizandoProceso(false);
    }
  };

  // Finalizar proceso actual
  const finalizarProceso = async () => {
    if (!procesoActual || actualizandoProceso) return;

    if (procesoActual.estado === 'COMPLETADO') {
      alert('Este proceso ya ha sido completado');
      return;
    }

    const confirmacion = window.confirm('¿Está seguro de que desea finalizar este proceso? Esta acción no se puede deshacer.');
    if (!confirmacion) return;

    setActualizandoProceso(true);
    try {
      const response = await axiosInstance.patch(`/procesos/${procesoActual.id}/`, {
        estado: 'COMPLETADO',
        fecha_fin_real: new Date().toISOString(),
        progreso: 100
      });

      setProcesoActual(response.data);
      alert('🎉 Proceso finalizado exitosamente');
    } catch (error) {
      console.error('Error al finalizar proceso:', error);
      const errorMsg = error.response?.data?.error || error.message;
      alert(`Error al finalizar proceso: ${errorMsg}`);
    } finally {
      setActualizandoProceso(false);
    }
  };

  // Ver detalle del proceso
  const verDetalleProceso = () => {
    if (procesoActual) {
      navigate(`/procesos/${procesoActual.id}`, { state: { proceso: procesoActual } });
    }
  };

  // Función para renderizar los indicadores de fase con las 5 fases correctas
  const renderFaseIndicators = () => {
    const fases = ['PILADO', 'CLASIFICACIÓN', 'DENSIDAD', 'COLOR', 'EMPAQUE'];
    const faseActual = procesoActual?.fase_actual || 'PILADO';
    const indicators = [];

    const faseIndices = {
      'PILADO': 1,
      'CLASIFICACION': 2,
      'DENSIDAD': 3,
      'COLOR': 4,
      'EMPAQUE': 5
    };

    const indiceActual = faseIndices[faseActual] || 1;

    for (let i = 1; i <= 5; i++) {
      indicators.push(
        <div 
          key={i} 
          className={`fase-indicator ${i <= indiceActual ? 'active' : ''}`}
          title={fases[i-1]}
        >
          {i}
        </div>
      );
    }
    return indicators;
  };

  // Función para renderizar los QR codes
  const renderQRCodes = () => {
    return null; // QR codes removidos
  };

  // Calcular tiempo estimado basado en la fase actual
  const calcularTiempoEstimado = () => {
    if (!procesoActual) return "00:00:00";

    const tiemposEstimados = {
      'PILADO': 120, // 2 horas
      'CLASIFICACION': 180, // 3 horas
      'DENSIDAD': 240, // 4 horas
      'COLOR': 300, // 5 horas
      'EMPAQUE': 360 // 6 horas
    };

    const tiempoTotal = tiemposEstimados[procesoActual.fase_actual] || 120;
    const horas = Math.floor(tiempoTotal / 60);
    const minutos = tiempoTotal % 60;

    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:00`;
  };

  // Obtener información de la organización/finca
  const obtenerInfoFinca = () => {
    if (!procesoActual || !procesoActual.lotes_info || procesoActual.lotes_info.length === 0) {
      return "Sin información de finca";
    }

    const primerLote = procesoActual.lotes_info[0];
    return primerLote.organizacion_nombre || "Finca no especificada";
  };

  const chartData = [
    { value: 150, month: 0 },
    { value: 650, month: 1 }, 
    { value: 550, month: 2 }, 
    { value: 500, month: 3 }, 
    { value: 250, month: 4 }, 
    { value: 650, month: 5 }, 
    { value: 850, month: 6 }, 
    { value: 800, month: 7 }, 
    { value: 150, month: 8 }, 
    { value: 750, month: 9 }
  ];

  const yAxisLabels = [
    { value: 1000, label: "1000" },
    { value: 750, label: "750" },
    { value: 500, label: "500" },
    { value: 250, label: "250" },
    { value: 0, label: "0" }
  ];

  return (
    <div className="app-container">
      <Sidebar userName={userData.nombre} userRole={userData.rol} />
      
      <div className="dashboard-container">
        <BottomNavigator />
        
        <div className="dashboard-content">
          <div className="dashboard-header">
            <div className="dashboard-title">DASHBOARD</div>
            <div className="search-container">
              <input type="text" placeholder="Buscar..." className="search-input" />
              <button className="search-button">🔍</button>
            </div>
            <div className="date-range">
              <span className="date-label">12 May 25 - 12 Jun 25</span>
              <button className="export-button">Exportar</button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="loading">Cargando datos...</div>
          ) : (
            <div className="dashboard-main">
              <div className="panel proceso-actual">
                <div className="proceso-titulo">
                  Tiempo Real del proceso actual
                  <button 
                    className="btn-refresh-proceso" 
                    onClick={cargarProcesoActual}
                    title="Actualizar proceso"
                  >
                    🔄
                  </button>
                </div>
                <div className="proceso-content">
                  {procesoActual ? (
                    <>
                      <div className="proceso-tiempo">
                        <div className="tiempo-transcurrido">{tiempoTranscurrido}</div>
                        <div className="tiempo-label">Tiempo transcurrido</div>
                        <div className="tiempo-estimado">{calcularTiempoEstimado()}</div>
                        <div className="tiempo-label">Tiempo estimado</div>
                      </div>
                      
                      <div className="proceso-info">
                        <div className="info-row">
                          <span className="info-icon">📅</span>
                          <span className="info-text">
                            {new Date(procesoActual.fecha_inicio).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-icon">📍</span>
                          <span className="info-text">{obtenerInfoFinca()}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-icon">📊</span>
                          <span className="info-text">
                            {procesoActual.total_lotes || 0} lotes - {procesoActual.quintales_totales || 0} qq
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-icon">⚡</span>
                          <span className="info-text">
                            Estado: {procesoActual.estado === 'COMPLETADO' ? 'Completado' : 
                                   procesoActual.estado === 'EN_PROCESO' ? 'En Proceso' : 
                                   procesoActual.estado === 'INICIADO' ? 'Iniciado' : procesoActual.estado}
                          </span>
                        </div>
                      </div>
                      
                      <div className="proceso-fases">
                        <div className="fase-indicators">
                          {renderFaseIndicators()}
                        </div>
                        <div className="fase-progress-bar">
                          <div 
                            className="fase-progress" 
                            style={{ width: `${procesoActual.porcentaje_progreso || 0}%` }}
                          ></div>
                        </div>
                        <div className="fase-actual-text">
                          Fase Actual: <strong>{procesoActual.fase_actual || 'PILADO'}</strong> 
                          ({procesoActual.porcentaje_progreso || 0}%)
                        </div>
                      </div>
                      
                      <div className="proceso-qr-codes">
                        {renderQRCodes()}
                      </div>
                      
                      <div className="proceso-buttons">
                        <button 
                          className="btn-finalizar"
                          onClick={finalizarProceso}
                          disabled={actualizandoProceso || procesoActual.estado === 'COMPLETADO'}
                        >
                          {actualizandoProceso ? '⏳ Procesando...' : 
                           procesoActual.estado === 'COMPLETADO' ? '✅ Completado' : 'Finalizar proceso'}
                        </button>
                        <button 
                          className="btn-avanzar"
                          onClick={avanzarProceso}
                          disabled={actualizandoProceso || procesoActual.estado === 'COMPLETADO'}
                        >
                          {actualizandoProceso ? '⏳ Avanzando...' : 
                           procesoActual.estado === 'COMPLETADO' ? 'Ver detalles' : 'Avanzar proceso'}
                        </button>
                        <button 
                          className="btn-ver-detalle"
                          onClick={verDetalleProceso}
                        >
                          👁️ Ver Detalle
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="no-proceso-activo">
                      <div className="no-proceso-icon">⚙️</div>
                      <h3>No hay procesos activos</h3>
                      <p>No hay procesos en curso en este momento.</p>
                      <button 
                        className="btn-crear-proceso"
                        onClick={() => navigate('/procesos')}
                      >
                        ➕ Ir a Procesos
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="quintales-container">
                {cafeQuintales.map((item, idx) => (
                  <div className="panel quintales-item" key={idx}>
                    <div className="quintales-fecha">{item.fecha}</div>
                    <div className="quintales-cantidad">{item.cantidad}</div>
                    <div className="quintales-tipo">
                      <span className="quintales-icon">☕</span>
                      <span>Quintales de café tipo {item.tipo}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="panel tiempo-mensual">
                <div className="tiempo-mensual-titulo">Tiempo mensual</div>
                <div className="chart-with-times">
                  <div className="chart-area">
                    <div className="y-axis">
                      {yAxisLabels.map((label, idx) => (
                        <div className="y-axis-label" key={idx} style={{ bottom: `${(label.value/1000)*100}%` }}>
                          {label.label}
                        </div>
                      ))}
                    </div>
                    
                    <div className="chart-container">
                      <div className="chart-grid">
                        {yAxisLabels.map((label, idx) => (
                          <div className="grid-line" key={idx} style={{ bottom: `${(label.value/1000)*100}%` }}></div>
                        ))}
                      </div>
                      <div className="bar-chart">
                        {chartData.map((item, idx) => (
                          <div className="chart-column" key={idx}>
                            <div 
                              className="chart-bar" 
                              style={{ height: `${(item.value / 1000) * 100}%` }}
                            ></div>
                            <div className="chart-label">{item.month}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="tiempos-info">
                    <div className="tiempo-row">
                      <div className="tiempo-item">
                        <div className="tiempo-valor" style={{ color: "#1F77B4" }}>2:30:00</div>
                        <div className="tiempo-titulo">Tiempo contratado</div>
                      </div>
                      
                      <div className="tiempo-item">
                        <div className="tiempo-valor" style={{ color: "#00A651" }}>0:10:00</div>
                        <div className="tiempo-titulo">Tiempo consumido</div>
                      </div>
                    </div>
                    
                    <div className="tiempo-row">
                      <div className="tiempo-item">
                        <div className="tiempo-valor" style={{ color: "#1F77B4" }}>10:30:00</div>
                        <div className="tiempo-monto" style={{ color: "#00A651" }}>$ 50.00</div>
                        <div className="tiempo-titulo">Tiempo contratado</div>
                      </div>
                      
                      <div className="tiempo-item">
                        <div className="tiempo-valor" style={{ color: "#1F77B4" }}>9:30:00</div>
                        <div className="tiempo-monto" style={{ color: "#00A651" }}>$ 250.00</div>
                        <div className="tiempo-titulo">Tiempo contratado</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;