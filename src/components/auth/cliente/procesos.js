import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { getCurrentUser, isAdmin } from '../../../utils/auth';
import '../../../styles/procesos.css';

const Procesos = () => {
    const navigate = useNavigate();
    const [lotes, setLotes] = useState([]);
    const [lotesAprobados, setLotesAprobados] = useState([]);
    const [procesos, setProcesos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedLotes, setSelectedLotes] = useState([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [isAdminUser, setIsAdminUser] = useState(false);

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
                    setIsAdminUser(adminCheck);
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

    // Cargar datos cuando el componente se monta y configurar actualización automática
    useEffect(() => {
        if (isAuthenticated) {
            cargarDatos();
            
            // Configurar actualización automática cada 30 segundos
            const intervalo = setInterval(() => {
                cargarDatos();
            }, 30000); // 30 segundos
            
            // Limpiar intervalo cuando el componente se desmonte
            return () => clearInterval(intervalo);
        }
    }, [isAuthenticated]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // Cargar procesos y lotes disponibles en paralelo
            const [procesosResponse, lotesResponse] = await Promise.all([
                axiosInstance.get('/procesos/'),
                axiosInstance.get('/procesos/lotes-disponibles/')
            ]);
            
            const procesosData = procesosResponse.data.results || procesosResponse.data;
            setProcesos(procesosData);
            
            // Log para debugging del estado de los procesos
            console.log('Procesos actualizados:', procesosData.map(p => ({
                id: p.id,
                numero: p.numero,
                fase_actual: p.fase_actual,
                estado: p.estado,
                fecha_actualizacion: new Date().toLocaleTimeString()
            })));
            
            const lotesData = lotesResponse.data.lotes || lotesResponse.data.results || [];
            setLotes(lotesData);
            
            // ✅ INCLUIR LOTES CON SEPARACIÓN APLICADA
            // Filtrar lotes disponibles para procesos (APROBADO y SEPARACION_APLICADA)
            const lotesAprobadosData = lotesData.filter(lote => 
                lote.estado === 'APROBADO' || lote.estado === 'SEPARACION_APLICADA'
            );
            setLotesAprobados(lotesAprobadosData);
            
            console.log('Lotes disponibles:', lotesAprobadosData.map(l => ({
                numero: l.numero_lote,
                estado: l.estado,
                quintales: l.total_quintales
            })));
            
            console.log('Datos actualizados en tiempo real -', new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Error al cargar datos:', error);
            const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
            // Solo mostrar alerta si no es un error de red silencioso
            if (!error.code || error.code !== 'NETWORK_ERROR') {
                console.warn(`Error al actualizar datos: ${errorMsg}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const abrirModalNuevoProceso = () => {
        if (lotesAprobados.length === 0) {
            alert('No hay lotes aprobados disponibles para procesar');
            return;
        }
        setShowModal(true);
        setSelectedLotes([]);
    };

    const cerrarModal = () => {
        setShowModal(false);
        setSelectedLotes([]);
    };

    const handleLoteSelection = (loteId) => {
        setSelectedLotes(prev => {
            const isSelected = prev.includes(loteId);
            if (isSelected) {
                return prev.filter(id => id !== loteId);
            } else {
                return [...prev, loteId];
            }
        });
    };

    const crearNuevoProceso = async () => {
        if (selectedLotes.length === 0) {
            alert('Debe seleccionar al menos un lote para crear el proceso');
            return;
        }

        try {
            setLoading(true);
            
            // Calcular totales de los lotes seleccionados
            const lotesSeleccionadosData = lotesAprobados.filter(lote => selectedLotes.includes(lote.id));
            const totalQuintales = lotesSeleccionadosData.reduce((sum, lote) => sum + lote.total_quintales, 0);
            const nombreProceso = `Proceso de Producción - ${lotesSeleccionadosData.length} lote${lotesSeleccionadosData.length > 1 ? 's' : ''}`;
            
            const procesoData = {
                nombre: nombreProceso,
                descripcion: `Proceso de producción que incluye ${lotesSeleccionadosData.length} lote(s) con un total de ${totalQuintales} quintales`,
                lotes: selectedLotes,
                responsable: (await getCurrentUser()).id
            };

            console.log('Creando proceso con datos:', procesoData);
            
            const response = await axiosInstance.post('/procesos/', procesoData);
            
            console.log('Proceso creado exitosamente:', response.data);
            alert('✅ Proceso creado exitosamente');
            
            // Navegar al detalle del proceso recién creado
            const nuevoProceso = response.data;
            navigate(`/procesos/${nuevoProceso.id}`, { state: { proceso: nuevoProceso } });
            
        } catch (error) {
            console.error('Error al crear proceso:', error);
            const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
            alert(`Error al crear el proceso: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'INICIADO': return '#17a2b8';
            case 'EN_PROCESO': return '#ffc107';
            case 'COMPLETADO': return '#28a745';
            case 'PAUSADO': return '#fd7e14';
            case 'CANCELADO': return '#dc3545';
            default: return '#6c757d';
        }
    };

    const getEstadoTexto = (estado) => {
        switch (estado) {
            case 'INICIADO': return 'Iniciado';
            case 'EN_PROCESO': return 'En Proceso';
            case 'COMPLETADO': return 'Completado';
            case 'PAUSADO': return 'Pausado';
            case 'CANCELADO': return 'Cancelado';
            default: return estado;
        }
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

    const verDetalleProceso = (proceso) => {
        navigate(`/procesos/${proceso.id}`, { state: { proceso } });
    };

    const calcularProgresoPorcentaje = (fase) => {
        const fases = {
            'PILADO': 20,
            'CLASIFICACION': 40,
            'DENSIDAD': 60,
            'COLOR': 80,
            'EMPAQUE': 100
        };
        return fases[fase] || 0;
    };

    return (
        <div className="app-container">
            <Sidebar />
            
            <div className="procesos-container">
                <BottomNavigator />
                
                <div className="procesos-header">
                    <h1>⚙️ Gestión de Procesos de Producción</h1>
                    <p>FAPECAFES - Administración y Control de Procesos de Café</p>
                </div>

                {/* Estadísticas rápidas */}
                <div className="estadisticas-procesos">
                    <div className="stat-card total">
                        <h3>Total Procesos</h3>
                        <span className="stat-number">{procesos.length}</span>
                    </div>
                    <div className="stat-card activos">
                        <h3>Procesos Activos</h3>
                        <span className="stat-number">{procesos.filter(p => p.estado === 'EN_PROCESO' || p.estado === 'INICIADO').length}</span>
                    </div>
                    <div className="stat-card completados">
                        <h3>Completados</h3>
                        <span className="stat-number">{procesos.filter(p => p.estado === 'COMPLETADO').length}</span>
                    </div>
                    <div className="stat-card lotes-disponibles">
                        <h3>Lotes Disponibles</h3>
                        <span className="stat-number">{lotesAprobados.length}</span>
                    </div>
                </div>

                {/* Botón para crear nuevo proceso */}
                <div className="acciones-procesos">
                    <button 
                        className="btn-nuevo-proceso"
                        onClick={abrirModalNuevoProceso}
                        disabled={loading || lotesAprobados.length === 0}
                    >
                        ➕ Crear Nuevo Proceso
                    </button>
                    <button 
                        className="btn-actualizar"
                        onClick={cargarDatos}
                        disabled={loading}
                    >
                        {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
                    </button>
                </div>

                {/* Lista de procesos activos */}
                {procesos.length > 0 && (
                    <div className="procesos-activos-section">
                        <div className="section-header">
                            <h2>⚙️ Procesos en Curso</h2>
                            <p>Procesos de café actualmente en desarrollo</p>
                        </div>
                        
                        <div className="procesos-activos-grid">
                            {procesos.map(proceso => (
                                <div key={proceso.id} className="proceso-card" onClick={() => verDetalleProceso(proceso)}>
                                    <div className="proceso-header">
                                        <h3>{proceso.numero || `Proceso ${proceso.id}`}</h3>
                                        <span 
                                            className="estado-badge"
                                            style={{ backgroundColor: getEstadoColor(proceso.estado) }}
                                        >
                                            {getEstadoTexto(proceso.estado)}
                                        </span>
                                    </div>
                                    
                                    <div className="proceso-progress">
                                        <div className="progress-bar">
                                            <div className="progress-steps">
                                                <div className={`step ${proceso.fase_actual === 'PILADO' || calcularProgresoPorcentaje(proceso.fase_actual) >= 20 ? 'active' : ''}`}>
                                                    <div className="step-circle" style={{ backgroundColor: proceso.fase_actual === 'PILADO' ? getFaseColor('PILADO') : (calcularProgresoPorcentaje(proceso.fase_actual) >= 20 ? '#28a745' : '#dc3545') }}>1</div>
                                                    <span>PILADO</span>
                                                </div>
                                                <div className={`step ${proceso.fase_actual === 'CLASIFICACION' || calcularProgresoPorcentaje(proceso.fase_actual) >= 40 ? 'active' : ''}`}>
                                                    <div className="step-circle" style={{ backgroundColor: proceso.fase_actual === 'CLASIFICACION' ? getFaseColor('CLASIFICACION') : (calcularProgresoPorcentaje(proceso.fase_actual) >= 40 ? '#28a745' : '#dc3545') }}>2</div>
                                                    <span>CLASIFICACION</span>
                                                </div>
                                                <div className={`step ${proceso.fase_actual === 'DENSIDAD' || calcularProgresoPorcentaje(proceso.fase_actual) >= 60 ? 'active' : ''}`}>
                                                    <div className="step-circle" style={{ backgroundColor: proceso.fase_actual === 'DENSIDAD' ? getFaseColor('DENSIDAD') : (calcularProgresoPorcentaje(proceso.fase_actual) >= 60 ? '#28a745' : '#dc3545') }}>3</div>
                                                    <span>DENSIDAD</span>
                                                </div>
                                                <div className={`step ${proceso.fase_actual === 'COLOR' || calcularProgresoPorcentaje(proceso.fase_actual) >= 80 ? 'active' : ''}`}>
                                                    <div className="step-circle" style={{ backgroundColor: proceso.fase_actual === 'COLOR' ? getFaseColor('COLOR') : (calcularProgresoPorcentaje(proceso.fase_actual) >= 80 ? '#28a745' : '#dc3545') }}>4</div>
                                                    <span>COLOR</span>
                                                </div>
                                                <div className={`step ${proceso.fase_actual === 'EMPAQUE' || calcularProgresoPorcentaje(proceso.fase_actual) === 100 ? 'active' : ''}`}>
                                                    <div className="step-circle" style={{ backgroundColor: proceso.fase_actual === 'EMPAQUE' ? getFaseColor('EMPAQUE') : (calcularProgresoPorcentaje(proceso.fase_actual) === 100 ? '#28a745' : '#dc3545') }}>5</div>
                                                    <span>EMPAQUE</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="proceso-info">
                                        <div className="info-item">
                                            <strong>📅 Iniciado:</strong> {new Date(proceso.fecha_inicio).toLocaleDateString()}
                                        </div>
                                        <div className="info-item">
                                            <strong>📊 Lotes:</strong> {proceso.total_lotes || 0}
                                        </div>
                                        <div className="info-item">
                                            <strong>⏱️ Fase Actual:</strong> {proceso.fase_actual || 'PILADO'}
                                        </div>
                                        <div className="info-item peso-actual">
                                            <strong>⚖️ Peso Actual:</strong> {
                                                proceso.peso_total_actual 
                                                    ? `${parseFloat(proceso.peso_total_actual).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
                                                    : proceso.peso_total_inicial 
                                                        ? `${parseFloat(proceso.peso_total_inicial).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
                                                        : `${((proceso.quintales_totales || 0) * 46).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg (est.)`
                                            }
                                        </div>
                                        <div className="info-item">
                                            <strong>📈 Progreso:</strong> {calcularProgresoPorcentaje(proceso.fase_actual)}%
                                        </div>
                                    </div>
                                    
                                    <button className="btn-ver-proceso" onClick={(e) => {
                                        e.stopPropagation();
                                        verDetalleProceso(proceso);
                                    }}>
                                        👁️ Ver Detalle
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Lista de lotes aprobados */}
                <div className="lotes-aprobados-section">
                    <div className="section-header">
                        <h2>📦 Lotes Disponibles para Procesar</h2>
                        <p>Lotes que han completado el análisis y están listos para procesos de producción</p>
                    </div>
                    
                    {lotesAprobados.length === 0 ? (
                        <div className="no-data-card">
                            <div className="no-data-icon">📦</div>
                            <h3>No hay lotes disponibles</h3>
                            <p>No hay lotes disponibles para crear procesos de producción.</p>
                        </div>
                    ) : (
                        <div className="lotes-grid">
                            {lotesAprobados.map(lote => (
                                <div key={lote.id} className={`lote-card ${lote.estado.toLowerCase()}`}>
                                    <div className="lote-header">
                                        <h3>{lote.numero_lote}</h3>
                                        <span 
                                            className="estado-badge"
                                            style={{ 
                                                backgroundColor: lote.estado === 'APROBADO' ? '#28a745' : '#17a2b8',
                                                color: 'white'
                                            }}
                                        >
                                            {lote.estado === 'APROBADO' ? '✅ APROBADO' : '🔄 SEPARACIÓN APLICADA'}
                                        </span>
                                    </div>
                                    <div className="lote-info">
                                        <div className="info-item">
                                            <strong>🏢 Organización:</strong> {lote.organizacion_nombre}
                                        </div>
                                        <div className="info-item">
                                            <strong>📊 Quintales:</strong> {lote.total_quintales} qq
                                        </div>
                                        <div className="info-item">
                                            <strong>📅 Fecha Entrega:</strong> {new Date(lote.fecha_entrega).toLocaleDateString()}
                                        </div>
                                        <div className="info-item">
                                            <strong>📝 Registrado:</strong> {new Date(lote.fecha_creacion).toLocaleDateString()}
                                        </div>
                                        {lote.tiene_separacion_aplicada && (
                                            <div className="info-item separacion-info">
                                                <strong>ℹ️ Información:</strong> 
                                                <span className="separacion-badge">Parte limpia disponible</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal para crear nuevo proceso */}
                {showModal && (
                    <div className="modal-overlay" onClick={cerrarModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>➕ Crear Nuevo Proceso</h3>
                                <button className="close-btn" onClick={cerrarModal}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="proceso-info-card">
                                    <h4>📋 Seleccionar Lotes para el Proceso</h4>
                                    <p>Seleccione los lotes aprobados que desea incluir en el nuevo proceso de producción.</p>
                                </div>
                                
                                <div className="lotes-seleccion">
                                    {lotesAprobados.map(lote => (
                                        <div key={lote.id} className="lote-seleccion-item">
                                            <label className="lote-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLotes.includes(lote.id)}
                                                    onChange={() => handleLoteSelection(lote.id)}
                                                />
                                                <div className="lote-seleccion-info">
                                                    <h5>{lote.numero_lote}</h5>
                                                    <div className="lote-detalles">
                                                        <span className="organizacion">🏢 {lote.organizacion_nombre}</span>
                                                        <span className="quintales">📊 {lote.total_quintales} qq</span>
                                                    </div>
                                                    <div className="fecha">📅 {new Date(lote.fecha_entrega).toLocaleDateString()}</div>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <div className="seleccion-summary">
                                    <strong>
                                        Lotes seleccionados: {selectedLotes.length} de {lotesAprobados.length}
                                    </strong>
                                    {selectedLotes.length > 0 && (
                                        <div className="totales-seleccion">
                                            <span>Total quintales: {lotesAprobados.filter(l => selectedLotes.includes(l.id)).reduce((sum, l) => sum + l.total_quintales, 0)} qq</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="form-actions">
                                    <button type="button" className="btn-cancel" onClick={cerrarModal}>
                                        Cancelar
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn-submit"
                                        onClick={crearNuevoProceso}
                                        disabled={selectedLotes.length === 0 || loading}
                                    >
                                        {loading ? '⏳ Creando...' : '➕ Crear Proceso'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <p>Cargando datos...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Procesos;