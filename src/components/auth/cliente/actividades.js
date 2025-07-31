import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { getCurrentUser, isAdmin } from '../../../utils/auth';
import '../../../styles/actividades.css';

const Actividades = () => {
    const navigate = useNavigate();
    const [procesosCompletados, setProcesosCompletados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState(null);
    
    // Estados para el modal de actividades
    const [showActividadesModal, setShowActividadesModal] = useState(false);
    const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
    const [tareasDelProceso, setTareasDelProceso] = useState([]);
    const [loadingTareas, setLoadingTareas] = useState(false);

    // Verificar autenticación y rol del usuario
    useEffect(() => {
        const verificarAcceso = async () => {
            try {
                const userData = await getCurrentUser();
                const adminCheck = await isAdmin();
                const empleadoCheck = userData?.rol === 'EMPLEADO';
                
                if (userData && (adminCheck || empleadoCheck)) {
                    setIsAuthenticated(true);
                    setUserRole(userData.rol);
                } else {
                    alert('Acceso denegado. Esta sección requiere permisos de administrador o empleado.');
                    navigate('/login');
                }
            } catch (error) {
                console.error('Error al verificar acceso:', error);
                alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
                navigate('/login');
            }
        };
        
        verificarAcceso();
    }, [navigate]);

    // Cargar procesos completados
    useEffect(() => {
        if (isAuthenticated) {
            cargarProcesosCompletados();
        }
    }, [isAuthenticated]);

    const cargarProcesosCompletados = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/procesos/?estado=COMPLETADO&ordering=-fecha_inicio');
            const procesosData = response.data.results || response.data;
            setProcesosCompletados(procesosData);
            console.log('Procesos completados cargados:', procesosData);
        } catch (error) {
            console.error('Error al cargar procesos completados:', error);
            const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
            alert(`Error al cargar actividades: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const verActividades = async (proceso) => {
        setProcesoSeleccionado(proceso);
        setShowActividadesModal(true);
        setLoadingTareas(true);
        
        try {
            // Cargar tareas del proceso específico
            const response = await axiosInstance.get(`/procesos/tareas/?proceso_id=${proceso.id}&ordering=-fecha_registro`);
            const tareasData = response.data.results || response.data;
            setTareasDelProceso(tareasData);
            console.log('Tareas del proceso cargadas:', tareasData);
        } catch (error) {
            console.error('Error al cargar tareas del proceso:', error);
            setTareasDelProceso([]);
            alert('Error al cargar las tareas del proceso');
        } finally {
            setLoadingTareas(false);
        }
    };

    const cerrarModal = () => {
        setShowActividadesModal(false);
        setProcesoSeleccionado(null);
        setTareasDelProceso([]);
    };

    const getFaseColor = (fase) => {
        switch (fase) {
            case 'PILADO': return '#2c5530';
            case 'CLASIFICACION': return '#dc3545';
            case 'DENSIDAD': return '#007bff';
            case 'COLOR': return '#fd7e14';
            case 'EMPAQUE': return '#28a745';
            default: return '#6c757d';
        }
    };

    const getTipoTareaIcon = (tipoTarea) => {
        switch (tipoTarea) {
            case 'PILADO_CANTEADO': return '🔨';
            case 'PILADO_REPOSO': return '⏰';
            case 'CLASIFICACION_INICIO': return '📏';
            case 'CLASIFICACION_CONTROL': return '🔍';
            case 'DENSIDAD_INICIO': return '⚖️';
            case 'DENSIDAD_CONTROL': return '📊';
            case 'COLOR_INICIO': return '🎨';
            case 'COLOR_CONTROL': return '👁️';
            case 'EMPAQUE_PREPARACION': return '📦';
            case 'EMPAQUE_PROCESO': return '📋';
            default: return '⚙️';
        }
    };

    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatearHora = (hora) => {
        if (!hora) return 'No especificada';
        return new Date(`2000-01-01T${hora}`).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="app-container">
            <Sidebar />
            
            <div className="actividades-container">
                <BottomNavigator />
                
                <div className="actividades-header">
                    <h1>📋 Actividades Completadas</h1>
                    <p>FAPECAFES - Historial de Procesos y Tareas Realizadas</p>
                </div>

                {/* Estadísticas */}
                <div className="estadisticas-actividades">
                    <div className="stat-card total">
                        <h3>Procesos Completados</h3>
                        <span className="stat-number">{procesosCompletados.length}</span>
                    </div>
                    <div className="stat-card empacados">
                        <h3>Procesos Empacados</h3>
                        <span className="stat-number">{procesosCompletados.filter(p => p.fase_actual === 'EMPAQUE').length}</span>
                    </div>
                </div>

                {/* Botón de actualizar */}
                <div className="acciones-actividades">
                    <button 
                        className="btn-actualizar"
                        onClick={cargarProcesosCompletados}
                        disabled={loading}
                    >
                        {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
                    </button>
                </div>

                {/* Lista de procesos completados */}
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Cargando actividades...</p>
                    </div>
                ) : procesosCompletados.length === 0 ? (
                    <div className="no-data-card">
                        <div className="no-data-icon">📋</div>
                        <h3>No hay actividades completadas</h3>
                        <p>Aún no hay procesos completados para mostrar.</p>
                    </div>
                ) : (
                    <div className="procesos-completados-section">
                        <div className="section-header">
                            <h2>✅ Procesos Finalizados</h2>
                            <p>Historial de procesos completados con todas sus fases</p>
                        </div>
                        
                        <div className="procesos-completados-grid">
                            {procesosCompletados.map(proceso => (
                                <div key={proceso.id} className="proceso-completado-card">
                                    <div className="proceso-header">
                                        <h3>{proceso.numero || `Proceso ${proceso.id}`}</h3>
                                        <span className="estado-badge completado">
                                            ✅ COMPLETADO
                                        </span>
                                    </div>
                                    
                                    <div className="proceso-info">
                                        <div className="info-item">
                                            <strong>📅 Iniciado:</strong> {formatearFecha(proceso.fecha_inicio)}
                                        </div>
                                        <div className="info-item">
                                            <strong>🏁 Finalizado:</strong> {proceso.fecha_fin_real ? formatearFecha(proceso.fecha_fin_real) : 'No especificada'}
                                        </div>
                                        <div className="info-item">
                                            <strong>📊 Lotes Procesados:</strong> {proceso.total_lotes || 0}
                                        </div>
                                        <div className="info-item">
                                            <strong>⚖️ Peso Final:</strong> {
                                                proceso.peso_total_actual 
                                                    ? `${parseFloat(proceso.peso_total_actual).toLocaleString('es-ES', { minimumFractionDigits: 2 })} kg`
                                                    : 'No especificado'
                                            }
                                        </div>
                                        <div className="info-item">
                                            <strong>🎯 Fase Final:</strong> 
                                            <span 
                                                className="fase-badge"
                                                style={{ backgroundColor: getFaseColor(proceso.fase_actual) }}
                                            >
                                                {proceso.fase_actual || 'EMPAQUE'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        className="btn-ver-actividades"
                                        onClick={() => verActividades(proceso)}
                                    >
                                        📋 Ver Actividades
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Modal de actividades */}
                {showActividadesModal && (
                    <div className="modal-overlay" onClick={cerrarModal}>
                        <div className="modal-content actividades-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>📋 Actividades del {procesoSeleccionado?.numero || `Proceso ${procesoSeleccionado?.id}`}</h3>
                                <button className="close-btn" onClick={cerrarModal}>×</button>
                            </div>
                            
                            <div className="modal-body">
                                {/* Información del proceso */}
                                <div className="proceso-info-modal">
                                    <div className="info-row">
                                        <div className="info-item">
                                            <strong>📅 Iniciado:</strong> {formatearFecha(procesoSeleccionado?.fecha_inicio)}
                                        </div>
                                        <div className="info-item">
                                            <strong>🏁 Finalizado:</strong> {procesoSeleccionado?.fecha_fin_real ? formatearFecha(procesoSeleccionado.fecha_fin_real) : 'No especificada'}
                                        </div>
                                    </div>
                                    <div className="info-row">
                                        <div className="info-item">
                                            <strong>📊 Lotes:</strong> {procesoSeleccionado?.total_lotes || 0}
                                        </div>
                                        <div className="info-item">
                                            <strong>⚖️ Peso:</strong> {
                                                procesoSeleccionado?.peso_total_actual 
                                                    ? `${parseFloat(procesoSeleccionado.peso_total_actual).toLocaleString('es-ES', { minimumFractionDigits: 2 })} kg`
                                                    : 'No especificado'
                                            }
                                        </div>
                                    </div>
                                </div>

                                {/* Lista de tareas */}
                                <div className="tareas-section">
                                    <h4>🔧 Tareas Realizadas</h4>
                                    
                                    {loadingTareas ? (
                                        <div className="loading-tareas">
                                            <div className="loading-spinner-small"></div>
                                            <p>Cargando tareas...</p>
                                        </div>
                                    ) : tareasDelProceso.length === 0 ? (
                                        <div className="no-tareas">
                                            <p>No se encontraron tareas registradas para este proceso.</p>
                                        </div>
                                    ) : (
                                        <div className="tareas-list">
                                            {tareasDelProceso.map(tarea => (
                                                <div key={tarea.id} className="tarea-item">
                                                    <div className="tarea-header">
                                                        <div className="tarea-icon">
                                                            {getTipoTareaIcon(tarea.tipo_tarea)}
                                                        </div>
                                                        <div className="tarea-info">
                                                            <h5>{tarea.tipo_tarea_display || tarea.tipo_tarea}</h5>
                                                            <span className="fase-tag" style={{ backgroundColor: getFaseColor(tarea.fase) }}>
                                                                {tarea.fase}
                                                            </span>
                                                        </div>
                                                        <div className="tarea-status">
                                                            {tarea.completada ? '✅' : '⏳'}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="tarea-details">
                                                        <p><strong>Descripción:</strong> {tarea.descripcion}</p>
                                                        
                                                        <div className="tarea-meta">
                                                            <div className="meta-item">
                                                                <strong>👤 Empleado:</strong> {tarea.empleado_nombre || 'No especificado'}
                                                            </div>
                                                            <div className="meta-item">
                                                                <strong>📅 Fecha:</strong> {formatearFecha(tarea.fecha_registro)}
                                                            </div>
                                                        </div>

                                                        {(tarea.hora_inicio || tarea.hora_fin) && (
                                                            <div className="tarea-horarios">
                                                                <div className="horario-item">
                                                                    <strong>🕐 Inicio:</strong> {formatearHora(tarea.hora_inicio)}
                                                                </div>
                                                                <div className="horario-item">
                                                                    <strong>🕓 Fin:</strong> {formatearHora(tarea.hora_fin)}
                                                                </div>
                                                                {tarea.duracion_minutos && (
                                                                    <div className="horario-item">
                                                                        <strong>⏱️ Duración:</strong> {tarea.duracion_minutos} min
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {(tarea.peso_impurezas_encontradas || tarea.peso_impurezas_removidas) && (
                                                            <div className="tarea-pesos">
                                                                {tarea.peso_impurezas_encontradas && (
                                                                    <div className="peso-item">
                                                                        <strong>⚖️ Impurezas encontradas:</strong> {tarea.peso_impurezas_encontradas} kg
                                                                    </div>
                                                                )}
                                                                {tarea.peso_impurezas_removidas && (
                                                                    <div className="peso-item">
                                                                        <strong>🗑️ Impurezas removidas:</strong> {tarea.peso_impurezas_removidas} kg
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {tarea.observaciones && (
                                                            <div className="tarea-observaciones">
                                                                <strong>📝 Observaciones:</strong>
                                                                <p>{tarea.observaciones}</p>
                                                            </div>
                                                        )}

                                                        {tarea.resultado && (
                                                            <div className="tarea-resultado">
                                                                <strong>🎯 Resultado:</strong>
                                                                <p>{tarea.resultado}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Actividades;