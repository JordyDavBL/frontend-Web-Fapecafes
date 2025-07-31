import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { checkAdminAuth } from '../../../utils/auth';
import '../../../styles/bitacora.css';

const Bitacora = () => {
    const navigate = useNavigate();
    const [registros, setRegistros] = useState([]);
    const [estadisticas, setEstadisticas] = useState({});
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);
    const registrosPorPagina = 50;
    
    // Estados para filtros
    const [filtros, setFiltros] = useState({
        search: '',
        accion: '',
        modulo: '',
        usuario: '',
        fecha_desde: '',
        fecha_hasta: ''
    });
    
    // Estados para modal
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [nuevoRegistro, setNuevoRegistro] = useState({
        accion: '',
        modulo: '',
        descripcion: '',
        lote: '',
        muestra: '',
        organizacion: ''
    });

    // Opciones para los selectores
    const accionesOpciones = [
        { value: 'CREAR_LOTE', label: 'Crear Lote' },
        { value: 'ACTUALIZAR_LOTE', label: 'Actualizar Lote' },
        { value: 'ELIMINAR_LOTE', label: 'Eliminar Lote' },
        { value: 'TOMAR_MUESTRA', label: 'Tomar Muestra' },
        { value: 'ANALIZAR_MUESTRA', label: 'Analizar Muestra' },
        { value: 'ACTUALIZAR_MUESTRA', label: 'Actualizar Muestra' },
        { value: 'SEGUNDO_MUESTREO', label: 'Segundo Muestreo' },
        { value: 'GENERAR_REPORTE', label: 'Generar Reporte' },
        { value: 'EXPORTAR_PDF', label: 'Exportar PDF' },
        { value: 'EXPORTAR_CSV', label: 'Exportar CSV' },
        { value: 'CONSULTAR_PERSONAL', label: 'Consultar Personal' },
        { value: 'LOGIN', label: 'Inicio de Sesión' },
        { value: 'LOGOUT', label: 'Cierre de Sesión' }
    ];

    const modulosOpciones = [
        { value: 'RECEPCION', label: 'Recepción' },
        { value: 'PROCESOS', label: 'Procesos' },
        { value: 'PERSONAL', label: 'Personal' },
        { value: 'REPORTES', label: 'Reportes' },
        { value: 'SISTEMA', label: 'Sistema' },
        { value: 'AUTENTICACION', label: 'Autenticación' }
    ];

    // Verificar autenticación y rol de administrador
    useEffect(() => {
        const verificarAcceso = async () => {
            const tieneAcceso = await checkAdminAuth(navigate);
            if (tieneAcceso) {
                setIsAuthenticated(true);
            }
        };
        
        verificarAcceso();
    }, [navigate]);

    // Función para manejar errores de autenticación
    const handleAuthError = (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
            alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
            navigate('/login');
            return true;
        }
        return false;
    };

    // Cargar datos al inicializar
    useEffect(() => {
        if (isAuthenticated) {
            cargarDatos();
            cargarEstadisticas();
        }
    }, [isAuthenticated, paginaActual, filtros]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // Construir parámetros de consulta
            const params = new URLSearchParams();
            params.append('page', paginaActual);
            params.append('page_size', registrosPorPagina);
            
            if (filtros.search) params.append('search', filtros.search);
            if (filtros.accion) params.append('accion', filtros.accion);
            if (filtros.modulo) params.append('modulo', filtros.modulo);
            if (filtros.usuario) params.append('usuario', filtros.usuario);
            if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
            if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
            
            const response = await axiosInstance.get(
                `/bitacora/?${params.toString()}`
            );
            
            setRegistros(response.data.results || response.data);
            if (response.data.count) {
                setTotalRegistros(response.data.count);
                setTotalPaginas(Math.ceil(response.data.count / registrosPorPagina));
            }
            
        } catch (error) {
            console.error('Error al cargar registros de bitácora:', error);
            if (!handleAuthError(error)) {
                alert('Error al cargar los registros de bitácora');
            }
        }
        setLoading(false);
    };

    const cargarEstadisticas = async () => {
        try {
            const response = await axiosInstance.get(
                '/bitacora/estadisticas/'
            );
            setEstadisticas(response.data);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
            if (!handleAuthError(error)) {
                console.warn('No se pudieron cargar las estadísticas');
            }
        }
    };

    const aplicarFiltros = () => {
        setPaginaActual(1);
        cargarDatos();
    };

    const limpiarFiltros = () => {
        setFiltros({
            search: '',
            accion: '',
            modulo: '',
            usuario: '',
            fecha_desde: '',
            fecha_hasta: ''
        });
        setPaginaActual(1);
    };

    const crearRegistroManual = async () => {
        try {
            await axiosInstance.post(
                '/users/bitacora/',
                nuevoRegistro
            );
            
            alert('Registro creado exitosamente');
            setShowModal(false);
            setNuevoRegistro({
                accion: '',
                modulo: '',
                descripcion: '',
                lote: '',
                muestra: '',
                organizacion: ''
            });
            cargarDatos();
            cargarEstadisticas();
            
        } catch (error) {
            console.error('Error al crear registro:', error);
            if (!handleAuthError(error)) {
                alert('Error al crear el registro');
            }
        }
    };

    const exportarCSV = async () => {
        try {
            setLoading(true);
            
            const response = await axiosInstance.post(
                '/users/bitacora/exportar-csv/',
                { filtros }
            );
            
            if (response.data.success) {
                // Crear y descargar archivo CSV
                const csvContent = convertirACSV(response.data.datos);
                descargarCSV(csvContent, 'bitacora-registros.csv');
                alert(`Se exportaron ${response.data.total_registros} registros exitosamente`);
            }
            
        } catch (error) {
            console.error('Error al exportar CSV:', error);
            if (!handleAuthError(error)) {
                alert('Error al exportar los registros');
            }
        }
        setLoading(false);
    };

    const convertirACSV = (datos) => {
        if (!datos || datos.length === 0) return '';
        
        const headers = ['Fecha', 'Usuario', 'Acción', 'Módulo', 'Descripción', 'Lote', 'Muestra', 'IP'];
        const csvRows = [headers.join(',')];
        
        datos.forEach(registro => {
            const row = [
                registro.fecha,
                registro.usuario,
                `"${registro.accion}"`,
                registro.modulo,
                `"${registro.descripcion.replace(/"/g, '""')}"`,
                registro.lote,
                registro.muestra,
                registro.ip_address
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    };

    const descargarCSV = (csvContent, filename) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const formatearFecha = (fechaString) => {
        const fecha = new Date(fechaString);
        return {
            fecha: fecha.toLocaleDateString('es-ES'),
            hora: fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const getAccionColor = (accion) => {
        const colores = {
            'CREAR_LOTE': '#28a745',
            'ACTUALIZAR_LOTE': '#ffc107',
            'ELIMINAR_LOTE': '#dc3545',
            'TOMAR_MUESTRA': '#ffc107',
            'ANALIZAR_MUESTRA': '#007bff',
            'SEGUNDO_MUESTREO': '#fd7e14',
            'GENERAR_REPORTE': '#6c757d',
            'EXPORTAR_CSV': '#20c997',
            'EXPORTAR_PDF': '#e83e8c',
            'LOGIN': '#28a745',
            'LOGOUT': '#dc3545'
        };
        return colores[accion] || '#6c757d';
    };

    const getAccionIcono = (accion) => {
        const iconos = {
            'CREAR_LOTE': '📦',
            'ACTUALIZAR_LOTE': '✏️',
            'ELIMINAR_LOTE': '🗑️',
            'TOMAR_MUESTRA': '🧪',
            'ANALIZAR_MUESTRA': '🔬',
            'SEGUNDO_MUESTREO': '🔄',
            'GENERAR_REPORTE': '📊',
            'EXPORTAR_CSV': '📋',
            'EXPORTAR_PDF': '📄',
            'LOGIN': '🔑',
            'LOGOUT': '🚪'
        };
        return iconos[accion] || '📝';
    };

    const cambiarPagina = (nuevaPagina) => {
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            setPaginaActual(nuevaPagina);
        }
    };

    const renderPaginacion = () => {
        const paginas = [];
        const maxPaginasVisibles = 5;
        let inicio = Math.max(1, paginaActual - Math.floor(maxPaginasVisibles / 2));
        let fin = Math.min(totalPaginas, inicio + maxPaginasVisibles - 1);
        
        if (fin - inicio + 1 < maxPaginasVisibles) {
            inicio = Math.max(1, fin - maxPaginasVisibles + 1);
        }
        
        for (let i = inicio; i <= fin; i++) {
            paginas.push(
                <button
                    key={i}
                    className={`btn-page ${i === paginaActual ? 'active' : ''}`}
                    onClick={() => cambiarPagina(i)}
                >
                    {i}
                </button>
            );
        }
        
        return paginas;
    };

    return (
        <div className="app-container">
            <Sidebar userName="Usuario FAPECAFE" userRole="Cliente" />
            
            <div className="bitacora-container">
                <BottomNavigator />
                
                <div className="bitacora-content">
                    <div className="bitacora-header">
                        <h1>Bitácora del Sistema</h1>
                        <p>Registro completo de todas las acciones realizadas sobre lotes y muestras</p>
                    </div>

                    {/* Estadísticas rápidas */}
                    <div className="estadisticas-bitacora">
                        <div className="stat-card">
                            <div className="stat-icon">📊</div>
                            <div className="stat-info">
                                <span className="stat-number">{estadisticas.total_registros || 0}</span>
                                <span className="stat-label">Total Registros</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📅</div>
                            <div className="stat-info">
                                <span className="stat-number">{estadisticas.registros_hoy || 0}</span>
                                <span className="stat-label">Registros Hoy</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">👥</div>
                            <div className="stat-info">
                                <span className="stat-number">{estadisticas.usuarios_activos || 0}</span>
                                <span className="stat-label">Usuarios Activos</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">⚡</div>
                            <div className="stat-info">
                                <span className="stat-number">
                                    {estadisticas.acciones_stats && estadisticas.acciones_stats[0] 
                                        ? estadisticas.acciones_stats[0].total 
                                        : 0}
                                </span>
                                <span className="stat-label">Acción más Frecuente</span>
                            </div>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="filtros-bitacora">
                        <div className="filtros-row">
                            <div className="filtro-group">
                                <label>Buscar</label>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Buscar por descripción, usuario, lote..."
                                    value={filtros.search}
                                    onChange={(e) => setFiltros({...filtros, search: e.target.value})}
                                />
                            </div>
                            
                            <div className="filtro-group">
                                <label>Acción</label>
                                <select
                                    className="filter-select"
                                    value={filtros.accion}
                                    onChange={(e) => setFiltros({...filtros, accion: e.target.value})}
                                >
                                    <option value="">Todas las acciones</option>
                                    {accionesOpciones.map(opcion => (
                                        <option key={opcion.value} value={opcion.value}>
                                            {opcion.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="filtro-group">
                                <label>Módulo</label>
                                <select
                                    className="filter-select"
                                    value={filtros.modulo}
                                    onChange={(e) => setFiltros({...filtros, modulo: e.target.value})}
                                >
                                    <option value="">Todos los módulos</option>
                                    {modulosOpciones.map(opcion => (
                                        <option key={opcion.value} value={opcion.value}>
                                            {opcion.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="filtro-group">
                                <label>Fecha desde</label>
                                <input
                                    type="date"
                                    className="date-input"
                                    value={filtros.fecha_desde}
                                    onChange={(e) => setFiltros({...filtros, fecha_desde: e.target.value})}
                                />
                            </div>
                            
                            <div className="filtro-group">
                                <label>Fecha hasta</label>
                                <input
                                    type="date"
                                    className="date-input"
                                    value={filtros.fecha_hasta}
                                    onChange={(e) => setFiltros({...filtros, fecha_hasta: e.target.value})}
                                />
                            </div>
                        </div>
                        
                        <div className="acciones-bitacora">
                            <button className="btn-primary" onClick={aplicarFiltros}>
                                🔍 Aplicar Filtros
                            </button>
                            <button className="btn-secondary" onClick={limpiarFiltros}>
                                🗑️ Limpiar
                            </button>
                            <button className="btn-outline" onClick={() => { setModalType('crear'); setShowModal(true); }}>
                                ➕ Registro Manual
                            </button>
                            <button className="btn-outline" onClick={exportarCSV}>
                                📥 Exportar CSV
                            </button>
                        </div>
                    </div>

                    {/* Tabla de registros */}
                    <div className="bitacora-table-container">
                        <div className="table-header">
                            <h3>Registros de Bitácora</h3>
                            <span className="records-count">
                                {totalRegistros} registros encontrados
                            </span>
                        </div>
                        
                        <div className="table-responsive">
                            <table className="bitacora-table">
                                <thead>
                                    <tr>
                                        <th className="fecha-cell">Fecha/Hora</th>
                                        <th className="usuario-cell">Usuario</th>
                                        <th className="accion-cell">Acción</th>
                                        <th className="modulo-cell">Módulo</th>
                                        <th className="descripcion-cell">Descripción</th>
                                        <th className="lote-cell">Lote</th>
                                        <th className="muestra-cell">Muestra</th>
                                        <th className="ip-cell">IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registros.map((registro, index) => {
                                        const fechaHora = formatearFecha(registro.fecha);
                                        return (
                                            <tr key={`${registro.id}-${index}`}>
                                                <td className="fecha-cell">
                                                    <div className="fecha-info">
                                                        <span className="fecha">{fechaHora.fecha}</span>
                                                        <span className="hora">{fechaHora.hora}</span>
                                                    </div>
                                                </td>
                                                
                                                <td className="usuario-cell">
                                                    <div className="usuario-info">
                                                        <span className="usuario-icon">👤</span>
                                                        <div>
                                                            <div className="usuario-nombre">
                                                                {registro.usuario_nombre || registro.usuario}
                                                            </div>
                                                            {registro.usuario_email && (
                                                                <div className="usuario-email">
                                                                    {registro.usuario_email}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                
                                                <td className="accion-cell">
                                                    <div 
                                                        className="accion-badge"
                                                        style={{ backgroundColor: getAccionColor(registro.accion) }}
                                                    >
                                                        <span className="accion-icon">
                                                            {getAccionIcono(registro.accion)}
                                                        </span>
                                                        <span className="accion-text">
                                                            {accionesOpciones.find(a => a.value === registro.accion)?.label || registro.accion}
                                                        </span>
                                                    </div>
                                                </td>
                                                
                                                <td className="modulo-cell">
                                                    <span className="modulo-badge">
                                                        {modulosOpciones.find(m => m.value === registro.modulo)?.label || registro.modulo}
                                                    </span>
                                                </td>
                                                
                                                <td className="descripcion-cell">
                                                    <span className="descripcion-text" title={registro.descripcion}>
                                                        {registro.descripcion}
                                                    </span>
                                                </td>
                                                
                                                <td className="lote-cell">
                                                    {(registro.lote_numero || registro.lote_id || registro.lote) ? (
                                                        <span className="lote-numero">
                                                            {registro.lote_numero || registro.lote_id || registro.lote}
                                                        </span>
                                                    ) : null}
                                                </td>
                                                
                                                <td className="muestra-cell">
                                                    {(registro.muestra_numero || registro.muestra_id || registro.muestra) ? (
                                                        <span className="muestra-numero">
                                                            {registro.muestra_numero || registro.muestra_id || registro.muestra}
                                                        </span>
                                                    ) : null}
                                                </td>
                                                
                                                <td className="ip-cell">
                                                    {registro.ip_address ? (
                                                        <span className="ip-address">{registro.ip_address}</span>
                                                    ) : (
                                                        <span className="no-data">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Paginación */}
                        {totalPaginas > 1 && (
                            <div className="pagination-container">
                                <div className="pagination-info">
                                    Mostrando {((paginaActual - 1) * registrosPorPagina) + 1} - {Math.min(paginaActual * registrosPorPagina, totalRegistros)} de {totalRegistros} registros
                                </div>
                                
                                <div className="pagination-controls">
                                    <button 
                                        className="btn-pagination"
                                        onClick={() => cambiarPagina(paginaActual - 1)}
                                        disabled={paginaActual === 1}
                                    >
                                        ← Anterior
                                    </button>
                                    
                                    <div className="page-numbers">
                                        {renderPaginacion()}
                                    </div>
                                    
                                    <button 
                                        className="btn-pagination"
                                        onClick={() => cambiarPagina(paginaActual + 1)}
                                        disabled={paginaActual === totalPaginas}
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal para crear registro manual */}
                    {showModal && modalType === 'crear' && (
                        <div className="modal-overlay" onClick={() => setShowModal(false)}>
                            <div className="modal-content" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Crear Registro Manual</h3>
                                    <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                                </div>
                                
                                <div className="modal-body">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Acción *</label>
                                            <select
                                                value={nuevoRegistro.accion}
                                                onChange={(e) => setNuevoRegistro({...nuevoRegistro, accion: e.target.value})}
                                                required
                                            >
                                                <option value="">Seleccionar acción</option>
                                                {accionesOpciones.map(opcion => (
                                                    <option key={opcion.value} value={opcion.value}>
                                                        {opcion.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Módulo *</label>
                                            <select
                                                value={nuevoRegistro.modulo}
                                                onChange={(e) => setNuevoRegistro({...nuevoRegistro, modulo: e.target.value})}
                                                required
                                            >
                                                <option value="">Seleccionar módulo</option>
                                                {modulosOpciones.map(opcion => (
                                                    <option key={opcion.value} value={opcion.value}>
                                                        {opcion.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Descripción *</label>
                                        <textarea
                                            value={nuevoRegistro.descripcion}
                                            onChange={(e) => setNuevoRegistro({...nuevoRegistro, descripcion: e.target.value})}
                                            placeholder="Describe la acción realizada..."
                                            required
                                            rows={4}
                                        />
                                    </div>
                                    
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Lote (opcional)</label>
                                            <input
                                                type="text"
                                                value={nuevoRegistro.lote}
                                                onChange={(e) => setNuevoRegistro({...nuevoRegistro, lote: e.target.value})}
                                                placeholder="Número de lote"
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Muestra (opcional)</label>
                                            <input
                                                type="text"
                                                value={nuevoRegistro.muestra}
                                                onChange={(e) => setNuevoRegistro({...nuevoRegistro, muestra: e.target.value})}
                                                placeholder="Número de muestra"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="modal-actions">
                                    <button className="btn-secondary" onClick={() => setShowModal(false)}>
                                        Cancelar
                                    </button>
                                    <button 
                                        className="btn-primary" 
                                        onClick={crearRegistroManual}
                                        disabled={!nuevoRegistro.accion || !nuevoRegistro.modulo || !nuevoRegistro.descripcion}
                                    >
                                        Crear Registro
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="loading-overlay">
                            <div className="loading-spinner">Cargando...</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Bitacora;