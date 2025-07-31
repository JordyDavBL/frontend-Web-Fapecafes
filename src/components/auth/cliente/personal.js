import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { checkPropietariosAuth } from '../../../utils/auth';
import '../../../styles/personal.css';

const Personal = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('historial');
    const [propietarios, setPropietarios] = useState([]);
    const [selectedPropietario, setSelectedPropietario] = useState(null);
    const [historialMuestreos, setHistorialMuestreos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOrganizacion, setFilterOrganizacion] = useState('');
    const [organizaciones, setOrganizaciones] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [propietarioEditando, setPropietarioEditando] = useState(null);
    const [formEditarPropietario, setFormEditarPropietario] = useState({
        nombre_completo: '',
        telefono: '',
        departamento: '',
        municipio: '',
        comunidad: '',
        calle: '',
        numero_casa: '',
        referencias: ''
    });

    // Verificar autenticación y rol de administrador
    useEffect(() => {
        const verificarAcceso = async () => {
            const tieneAcceso = await checkPropietariosAuth(navigate);
            if (tieneAcceso) {
                setIsAuthenticated(true);
            }
        };
        
        verificarAcceso();
    }, [navigate]);

    // Cargar datos al inicializar
    useEffect(() => {
        if (isAuthenticated) {
            cargarDatos();
        }
    }, [isAuthenticated]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // Cargar propietarios maestros, lotes y organizaciones
            const [propResponse, lotesResponse, orgResponse] = await Promise.all([
                axiosInstance.get('http://localhost:8000/api/users/propietarios-maestros/'),
                axiosInstance.get('http://localhost:8000/api/users/lotes/'),
                axiosInstance.get('http://localhost:8000/api/users/organizaciones/')
            ]);
            
            const propietariosMaestrosData = propResponse.data.results || propResponse.data;
            const lotesData = lotesResponse.data;
            const organizacionesData = orgResponse.data;
            
            // Crear un mapa de organizaciones para búsqueda rápida
            const organizacionesMap = {};
            organizacionesData.forEach(org => {
                organizacionesMap[org.id] = org;
            });
            
            // Procesar propietarios maestros y asociarlos con organizaciones
            const propietariosProcesados = propietariosMaestrosData.map(prop => {
                // Buscar lotes donde participó este propietario
                const lotesDelPropietario = lotesData.filter(lote => 
                    lote.propietarios && lote.propietarios.some(p => p.cedula === prop.cedula)
                );
                
                // Obtener organizaciones únicas donde ha participado
                const organizacionesUnicas = new Set();
                lotesDelPropietario.forEach(lote => {
                    if (lote.organizacion && organizacionesMap[lote.organizacion]) {
                        organizacionesUnicas.add(lote.organizacion);
                    }
                });
                
                const organizacionesArray = Array.from(organizacionesUnicas);
                
                // Determinar la información de organización para mostrar
                let organizacion_nombre = 'Sin organización';
                let organizacion_id = null;
                
                if (organizacionesArray.length === 1) {
                    // Solo una organización
                    const orgId = organizacionesArray[0];
                    organizacion_nombre = organizacionesMap[orgId].nombre;
                    organizacion_id = orgId;
                } else if (organizacionesArray.length > 1) {
                    // Múltiples organizaciones - usar la primera como principal
                    const orgId = organizacionesArray[0];
                    organizacion_nombre = `${organizacionesMap[orgId].nombre} (+${organizacionesArray.length - 1} más)`;
                    organizacion_id = orgId;
                }
                
                return {
                    ...prop,
                    organizacion_nombre,
                    organizacion_id,
                    organizaciones_participadas: organizacionesArray,
                    total_lotes: prop.total_entregas || 0,
                    total_quintales: prop.total_quintales_historicos || 0
                };
            });
            
            setPropietarios(propietariosProcesados);
            setOrganizaciones(organizacionesData);
            
        } catch (error) {
            console.error('Error al cargar datos:', error);
            alert('Error al cargar los datos');
        }
        setLoading(false);
    };

    // Cargar propietarios maestros desde la API
    const cargarPropietariosMaestros = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('http://localhost:8000/api/users/propietarios-maestros/');
            
            // Procesar propietarios maestros para mostrar en la interfaz
            const propietariosMaestrosData = response.data.results || response.data;
            
            setPropietarios(propietariosMaestrosData.map(prop => ({
                ...prop,
                organizacion_nombre: 'Múltiples organizaciones',
                organizacion_id: null,
                total_lotes: prop.total_entregas || 0,
                total_quintales: prop.total_quintales_historicos || 0
            })));
            
        } catch (error) {
            console.error('Error al cargar propietarios maestros:', error);
            alert('Error al cargar los propietarios');
        }
        setLoading(false);
    };

    // Cargar historial de muestreos para un propietario específico
    const cargarHistorialPropietario = async (propietario) => {
        setLoading(true);
        try {
            // Obtener todos los lotes y muestras
            const [lotesRes, muestrasRes] = await Promise.all([
                axiosInstance.get('http://localhost:8000/api/users/lotes/'),
                axiosInstance.get('http://localhost:8000/api/users/muestras/')
            ]);
            
            // Filtrar historial por propietario (usando cédula como identificador único)
            const historial = [];
            
            lotesRes.data.forEach(lote => {
                if (lote.propietarios && lote.propietarios.length > 0) {
                    const propietarioEnLote = lote.propietarios.find(p => p.cedula === propietario.cedula);
                    if (propietarioEnLote) {
                        // Buscar muestras de este propietario en este lote
                        const muestrasDelPropietario = muestrasRes.data.filter(muestra => 
                            muestra.lote === lote.id && 
                            muestra.propietario_nombre === propietario.nombre_completo
                        );
                        
                        if (muestrasDelPropietario.length > 0) {
                            muestrasDelPropietario.forEach(muestra => {
                                historial.push({
                                    ...muestra,
                                    lote_info: {
                                        numero_lote: lote.numero_lote,
                                        organizacion_nombre: lote.organizacion_nombre,
                                        fecha_entrega: lote.fecha_entrega,
                                        estado_lote: lote.estado
                                    },
                                    propietario_info: propietarioEnLote
                                });
                            });
                        } else {
                            // Si no hay muestras, mostrar el lote sin análisis
                            historial.push({
                                id: `lote-${lote.id}`,
                                numero_muestra: 'Sin muestra',
                                estado: 'SIN_ANALIZAR',
                                fecha_toma_muestra: lote.fecha_entrega,
                                lote_info: {
                                    numero_lote: lote.numero_lote,
                                    organizacion_nombre: lote.organizacion_nombre,
                                    fecha_entrega: lote.fecha_entrega,
                                    estado_lote: lote.estado
                                },
                                propietario_info: propietarioEnLote
                            });
                        }
                    }
                }
            });
            
            // Ordenar por fecha más reciente
            historial.sort((a, b) => new Date(b.fecha_toma_muestra) - new Date(a.fecha_toma_muestra));
            
            setHistorialMuestreos(historial);
            setSelectedPropietario(propietario);
            setShowModal(true);
            setModalType('historial');
        } catch (error) {
            console.error('Error al cargar historial del propietario:', error);
            alert('Error al cargar el historial del propietario');
        }
        setLoading(false);
    };

    // Función para abrir modal de edición
    const abrirModalEdicion = (propietario) => {
        setPropietarioEditando(propietario);
        setFormEditarPropietario({
            nombre_completo: propietario.nombre_completo || '',
            telefono: propietario.telefono || '',
            departamento: propietario.departamento || '',
            municipio: propietario.municipio || '',
            comunidad: propietario.comunidad || '',
            calle: propietario.calle || '',
            numero_casa: propietario.numero_casa || '',
            referencias: propietario.referencias || ''
        });
        setShowModal(true);
        setModalType('editar');
    };

    // Función para manejar cambios en el formulario
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormEditarPropietario(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función para actualizar propietario
    const actualizarPropietario = async (e) => {
        e.preventDefault();
        
        try {
            await axiosInstance.put(
                `http://localhost:8000/api/users/propietarios-maestros/${propietarioEditando.id}/`,
                formEditarPropietario
            );
            
            alert('Propietario actualizado exitosamente');
            setShowModal(false);
            setModalType('');
            setPropietarioEditando(null);
            cargarDatos(); // Recargar datos usando cargarDatos en lugar de cargarPropietariosMaestros
            
        } catch (error) {
            console.error('Error al actualizar propietario:', error);
            const errorMsg = error.response?.data?.error || error.message;
            alert(`Error al actualizar el propietario: ${errorMsg}`);
        }
    };

    // Función para eliminar (desactivar) propietario
    const eliminarPropietario = async (propietario) => {
        if (window.confirm(`¿Está seguro de que desea eliminar al propietario ${propietario.nombre_completo}? Esta acción no se puede deshacer.`)) {
            try {
                await axiosInstance.delete(`http://localhost:8000/api/users/propietarios-maestros/${propietario.id}/`);
                
                alert('Propietario eliminado exitosamente');
                cargarDatos(); // Recargar datos usando cargarDatos en lugar de cargarPropietariosMaestros
                
            } catch (error) {
                console.error('Error al eliminar propietario:', error);
                const errorMsg = error.response?.data?.error || error.message;
                alert(`Error al eliminar el propietario: ${errorMsg}`);
            }
        }
    };

    // Filtrar propietarios
    const propietariosFiltrados = propietarios.filter(propietario => {
        const cumpleBusqueda = propietario.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              propietario.cedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              propietario.organizacion_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Mejorar el filtro por organización para manejar múltiples organizaciones
        const cumpleOrganizacion = !filterOrganizacion || 
                                 propietario.organizacion_id == filterOrganizacion ||
                                 (propietario.organizaciones_participadas && 
                                  propietario.organizaciones_participadas.includes(parseInt(filterOrganizacion)));
        
        return cumpleBusqueda && cumpleOrganizacion;
    });

    // Función para obtener color del estado
    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return '#ffc107';
            case 'APROBADA': return '#28a745';
            case 'CONTAMINADA': return '#dc3545';
            case 'ANALIZADA': return '#17a2b8';
            case 'SIN_ANALIZAR': return '#6c757d';
            default: return '#6c757d';
        }
    };

    const getEstadoTexto = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return 'Pendiente';
            case 'APROBADA': return 'Aprobada';
            case 'CONTAMINADA': return 'Contaminada';
            case 'ANALIZADA': return 'Analizada';
            case 'SIN_ANALIZAR': return 'Sin Analizar';
            default: return estado;
        }
    };

    const cerrarModal = () => {
        setShowModal(false);
        setModalType('');
        setSelectedPropietario(null);
        setHistorialMuestreos([]);
    };

    return (
        <div className="app-container">
            <Sidebar userName="Usuario FAPECAFE" userRole="Cliente" />
            
            <div className="personal-container">
                <BottomNavigator />
                
                <div className="personal-content">
                    <div className="personal-header">
                        <h1>Gestión de Personal Cafetero</h1>
                        <p>Historial de muestreos y resultados por propietario</p>
                    </div>

                    {/* Navegación por pestañas */}
                    <div className="tabs-container">
                        <button 
                            className={`tab-button ${activeTab === 'historial' ? 'active' : ''}`}
                            onClick={() => setActiveTab('historial')}
                        >
                            Historial de Propietarios
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'estadisticas' ? 'active' : ''}`}
                            onClick={() => setActiveTab('estadisticas')}
                        >
                            Estadísticas
                        </button>
                    </div>

                    {/* Contenido de pestañas */}
                    <div className="tab-content">
                        {activeTab === 'historial' && (
                            <div className="historial-section">
                                <div className="section-header">
                                    <h2>Propietarios Registrados</h2>
                                    <div className="filtros-container">
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre, cédula u organización..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="search-input"
                                        />
                                        <select
                                            value={filterOrganizacion}
                                            onChange={(e) => setFilterOrganizacion(e.target.value)}
                                            className="filter-select"
                                        >
                                            <option value="">Todas las organizaciones</option>
                                            {organizaciones.map(org => (
                                                <option key={org.id} value={org.id}>{org.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="table-container">
                                    <table className="propietarios-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre Completo</th>
                                                <th>Cédula</th>
                                                <th>Organización</th>
                                                <th>Teléfono</th>
                                                <th>Total Lotes</th>
                                                <th>Total Quintales</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {propietariosFiltrados.map((propietario, index) => (
                                                <tr key={`${propietario.cedula}-${index}`}>
                                                    <td>
                                                        <div className="propietario-nombre">
                                                            {propietario.nombre_completo}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="cedula-badge">
                                                            {propietario.cedula}
                                                        </span>
                                                    </td>
                                                    <td>{propietario.organizacion_nombre}</td>
                                                    <td>{propietario.telefono || 'N/A'}</td>
                                                    <td className="text-center">{propietario.total_lotes}</td>
                                                    <td className="text-center">{propietario.total_quintales.toFixed(1)}</td>
                                                    <td>
                                                        <div className="table-actions">
                                                            <button 
                                                                className="btn-table btn-primary"
                                                                onClick={() => cargarHistorialPropietario(propietario)}
                                                                title="Ver Historial"
                                                            >
                                                                📊
                                                            </button>
                                                            <button 
                                                                className="btn-table btn-secondary"
                                                                onClick={() => abrirModalEdicion(propietario)}
                                                                title="Editar"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button 
                                                                className="btn-table btn-danger"
                                                                onClick={() => eliminarPropietario(propietario)}
                                                                title="Eliminar"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {propietariosFiltrados.length === 0 && (
                                    <div className="no-results">
                                        <p>No se encontraron propietarios que coincidan con los filtros aplicados</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'estadisticas' && (
                            <div className="estadisticas-section">
                                <div className="section-header">
                                    <h2>Estadísticas Generales</h2>
                                </div>
                                
                                <div className="estadisticas-grid">
                                    <div className="stat-card">
                                        <h3>Total Propietarios</h3>
                                        <span className="stat-number">{propietarios.length}</span>
                                    </div>
                                    <div className="stat-card">
                                        <h3>Total Quintales</h3>
                                        <span className="stat-number">
                                            {propietarios.reduce((total, p) => total + p.total_quintales, 0).toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="stat-card">
                                        <h3>Organizaciones</h3>
                                        <span className="stat-number">{organizaciones.length}</span>
                                    </div>
                                    <div className="stat-card">
                                        <h3>Promedio por Propietario</h3>
                                        <span className="stat-number">
                                            {propietarios.length > 0 ? 
                                                (propietarios.reduce((total, p) => total + p.total_quintales, 0) / propietarios.length).toFixed(1) : 
                                                '0'
                                            }
                                        </span>
                                    </div>
                                </div>

                                <div className="organizaciones-resumen">
                                    <h3>Resumen por Organización</h3>
                                    <div className="organizaciones-cards">
                                        {organizaciones.map(org => {
                                            const propietariosOrg = propietarios.filter(p => p.organizacion_id === org.id);
                                            const totalQuintales = propietariosOrg.reduce((total, p) => total + p.total_quintales, 0);
                                            
                                            return (
                                                <div key={org.id} className="organizacion-card">
                                                    <h4>{org.nombre}</h4>
                                                    <p><strong>Propietarios:</strong> {propietariosOrg.length}</p>
                                                    <p><strong>Total Quintales:</strong> {totalQuintales.toFixed(1)}</p>
                                                    <p><strong>Contacto:</strong> {org.contacto || 'N/A'}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal de Historial */}
                    {showModal && modalType === 'historial' && selectedPropietario && (
                        <div className="modal-overlay" onClick={cerrarModal}>
                            <div className="modal-content historial-modal" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Historial de Muestreos - {selectedPropietario.nombre_completo}</h3>
                                    <button className="close-btn" onClick={cerrarModal}>×</button>
                                </div>
                                <div className="modal-body">
                                    <div className="propietario-resumen">
                                        <div className="resumen-info">
                                            <p><strong>Cédula:</strong> {selectedPropietario.cedula}</p>
                                            <p><strong>Organización:</strong> {selectedPropietario.organizacion_nombre}</p>
                                            <p><strong>Total Lotes:</strong> {selectedPropietario.total_lotes}</p>
                                            <p><strong>Total Quintales:</strong> {selectedPropietario.total_quintales.toFixed(1)}</p>
                                        </div>
                                    </div>

                                    <div className="historial-muestreos">
                                        <h4>Historial de Muestreos ({historialMuestreos.length})</h4>
                                        
                                        {historialMuestreos.length > 0 ? (
                                            <div className="muestreos-timeline">
                                                {historialMuestreos.map((muestra, index) => (
                                                    <div key={`${muestra.id}-${index}`} className="timeline-item">
                                                        <div className="timeline-marker">
                                                            <span 
                                                                className="estado-dot"
                                                                style={{ backgroundColor: getEstadoColor(muestra.estado) }}
                                                            ></span>
                                                        </div>
                                                        <div className="timeline-content">
                                                            <div className="timeline-header">
                                                                <h5>Lote: {muestra.lote_info.numero_lote}</h5>
                                                                <span 
                                                                    className="estado-badge"
                                                                    style={{ backgroundColor: getEstadoColor(muestra.estado) }}
                                                                >
                                                                    {getEstadoTexto(muestra.estado)}
                                                                </span>
                                                            </div>
                                                            <div className="timeline-details">
                                                                <p><strong>Fecha:</strong> {new Date(muestra.fecha_toma_muestra).toLocaleDateString()}</p>
                                                                <p><strong>Muestra:</strong> {muestra.numero_muestra}</p>
                                                                <p><strong>Quintales entregados:</strong> {muestra.propietario_info.quintales_entregados}</p>
                                                                {muestra.resultado_analisis && (
                                                                    <p><strong>Resultado:</strong> {muestra.resultado_analisis}</p>
                                                                )}
                                                                {muestra.observaciones && (
                                                                    <p><strong>Observaciones:</strong> {muestra.observaciones}</p>
                                                                )}
                                                                {muestra.fecha_analisis && (
                                                                    <p><strong>Fecha de análisis:</strong> {new Date(muestra.fecha_analisis).toLocaleDateString()}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="no-muestreos">
                                                <p>Este propietario no tiene muestreos registrados</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button className="btn-secondary" onClick={cerrarModal}>Cerrar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal de Edición */}
                    {showModal && modalType === 'editar' && propietarioEditando && (
                        <div className="modal-overlay" onClick={cerrarModal}>
                            <div className="modal-content editar-modal" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Editar Propietario - {propietarioEditando.nombre_completo}</h3>
                                    <button className="close-btn" onClick={cerrarModal}>×</button>
                                </div>
                                <div className="modal-body">
                                    <form onSubmit={actualizarPropietario}>
                                        <div className="form-group">
                                            <label>Nombre Completo</label>
                                            <input 
                                                type="text" 
                                                name="nombre_completo" 
                                                value={formEditarPropietario.nombre_completo} 
                                                onChange={handleFormChange} 
                                                required 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Teléfono</label>
                                            <input 
                                                type="text" 
                                                name="telefono" 
                                                value={formEditarPropietario.telefono} 
                                                onChange={handleFormChange} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Departamento</label>
                                            <input 
                                                type="text" 
                                                name="departamento" 
                                                value={formEditarPropietario.departamento} 
                                                onChange={handleFormChange} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Municipio</label>
                                            <input 
                                                type="text" 
                                                name="municipio" 
                                                value={formEditarPropietario.municipio} 
                                                onChange={handleFormChange} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Comunidad</label>
                                            <input 
                                                type="text" 
                                                name="comunidad" 
                                                value={formEditarPropietario.comunidad} 
                                                onChange={handleFormChange} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Calle</label>
                                            <input 
                                                type="text" 
                                                name="calle" 
                                                value={formEditarPropietario.calle} 
                                                onChange={handleFormChange} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Número de Casa</label>
                                            <input 
                                                type="text" 
                                                name="numero_casa" 
                                                value={formEditarPropietario.numero_casa} 
                                                onChange={handleFormChange} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Referencias</label>
                                            <textarea 
                                                name="referencias" 
                                                value={formEditarPropietario.referencias} 
                                                onChange={handleFormChange} 
                                            ></textarea>
                                        </div>
                                        <div className="form-actions">
                                            <button type="submit" className="btn-primary">Guardar Cambios</button>
                                            <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
                                        </div>
                                    </form>
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

export default Personal;