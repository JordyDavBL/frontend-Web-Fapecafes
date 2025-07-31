import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import { buscarPropietarioPorCedula, obtenerPropietariosMaestros } from '../../../services/api';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { checkAdminAuth } from '../../../utils/auth';
import '../../../styles/recepcion.css';

const Recepcion = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('recibir');
    const [lotes, setLotes] = useState([]);
    const [organizaciones, setOrganizaciones] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [selectedLote, setSelectedLote] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Estados para el formulario de lote
    const [formData, setFormData] = useState({
        numero_lote: '',
        organizacion: '',
        fecha_entrega: '',
        total_quintales: '',
        observaciones: ''
    });
    
    // Estados para propietarios
    const [propietarios, setPropietarios] = useState([{
        nombre_completo: '',
        cedula: '',
        quintales_entregados: '',
        telefono: '',
        departamento: '',
        municipio: '',
        comunidad: '',
        calle: '',
        numero_casa: '',
        referencias: '',
        propietario_maestro_id: null,
        es_propietario_existente: false,
        buscando: false
    }]);

    const [mostrarListaPropietarios, setMostrarListaPropietarios] = useState(false);
    const [propietariosMaestros, setPropietariosMaestros] = useState([]);
    const [cargandoPropietarios, setCargandoPropietarios] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterOrganizacion, setFilterOrganizacion] = useState('');

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

    // Cargar datos
    useEffect(() => {
        if (isAuthenticated) {
            cargarDatos();
        }
    }, [isAuthenticated]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [lotesRes, orgRes, lotesRecepcionRes] = await Promise.all([
                axiosInstance.get('http://localhost:8000/api/users/lotes/'),
                axiosInstance.get('http://localhost:8000/api/users/organizaciones/'),
                axiosInstance.get('http://localhost:8000/api/users/lotes/listos-recepcion-final/')
            ]);
            
            // Combinar lotes normales con lotes listos para recepción
            const todosLotes = [...lotesRes.data, ...lotesRecepcionRes.data.results];
            
            // Eliminar duplicados basándose en el ID
            const lotesUnicos = todosLotes.filter((lote, index, self) => 
                index === self.findIndex(l => l.id === lote.id)
            );
            
            setLotes(lotesUnicos);
            setOrganizaciones(orgRes.data);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            if (!handleAuthError(error)) {
                alert('Error al cargar los datos');
            }
        }
        setLoading(false);
    };

    // Manejar cambios en el formulario
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Manejar cambios en propietarios con búsqueda automática por cédula
    const handlePropietarioChange = (index, field, value) => {
        const nuevos = [...propietarios];
        nuevos[index][field] = value;
        
        // Si el campo es cédula y tiene 8 o más dígitos, buscar automáticamente
        if (field === 'cedula' && value.length >= 8) {
            buscarPropietarioExistente(index, value);
        }
        
        setPropietarios(nuevos);
    };

    // Función para buscar propietario existente por cédula
    const buscarPropietarioExistente = async (index, cedula) => {
        const nuevos = [...propietarios];
        nuevos[index].buscando = true;
        setPropietarios(nuevos);

        try {
            const response = await buscarPropietarioPorCedula(cedula);
            
            if (response.encontrado) {
                const propietario = response.propietario;
                nuevos[index] = {
                    ...nuevos[index],
                    propietario_maestro_id: propietario.id,
                    nombre_completo: propietario.nombre_completo,
                    telefono: propietario.telefono,
                    departamento: propietario.departamento,
                    municipio: propietario.municipio,
                    comunidad: propietario.comunidad,
                    calle: propietario.calle,
                    numero_casa: propietario.numero_casa,
                    referencias: propietario.referencias,
                    es_propietario_existente: true,
                    buscando: false
                };
            } else {
                nuevos[index] = {
                    ...nuevos[index],
                    propietario_maestro_id: null,
                    es_propietario_existente: false,
                    buscando: false
                };
            }
        } catch (error) {
            // Solo mostrar error si no es un 404 (propietario no encontrado es normal)
            if (error.response?.status !== 404) {
                console.error('Error al buscar propietario:', error);
            }
            nuevos[index] = {
                ...nuevos[index],
                propietario_maestro_id: null,
                es_propietario_existente: false,
                buscando: false
            };
        }
        
        setPropietarios(nuevos);
    };

    // Cargar propietarios maestros para el modal de selección
    const cargarPropietariosMaestros = async () => {
        setCargandoPropietarios(true);
        try {
            const response = await obtenerPropietariosMaestros();
            setPropietariosMaestros(response.results || response);
        } catch (error) {
            console.error('Error al cargar propietarios maestros:', error);
        }
        setCargandoPropietarios(false);
    };

    // Seleccionar propietario existente desde el modal
    const seleccionarPropietarioExistente = (index, propietarioMaestro) => {
        const nuevos = [...propietarios];
        nuevos[index] = {
            ...nuevos[index],
            propietario_maestro_id: propietarioMaestro.id,
            nombre_completo: propietarioMaestro.nombre_completo,
            cedula: propietarioMaestro.cedula,
            telefono: propietarioMaestro.telefono,
            departamento: propietarioMaestro.departamento,
            municipio: propietarioMaestro.municipio,
            comunidad: propietarioMaestro.comunidad,
            calle: propietarioMaestro.calle,
            numero_casa: propietarioMaestro.numero_casa,
            referencias: propietarioMaestro.referencias,
            es_propietario_existente: true
        };
        setPropietarios(nuevos);
        setMostrarListaPropietarios(false);
    };

    // Limpiar datos del propietario para crear uno nuevo
    const limpiarPropietario = (index) => {
        const nuevos = [...propietarios];
        nuevos[index] = {
            nombre_completo: '', 
            cedula: '', 
            quintales_entregados: nuevos[index].quintales_entregados,
            telefono: '', 
            departamento: '',
            municipio: '',
            comunidad: '',
            calle: '',
            numero_casa: '',
            referencias: '',
            propietario_maestro_id: null,
            es_propietario_existente: false,
            buscando: false
        };
        setPropietarios(nuevos);
    };

    // Agregar propietario
    const agregarPropietario = () => {
        setPropietarios([...propietarios, {
            nombre_completo: '',
            cedula: '',
            quintales_entregados: '',
            telefono: '',
            departamento: '',
            municipio: '',
            comunidad: '',
            calle: '',
            numero_casa: '',
            referencias: '',
            propietario_maestro_id: null,
            es_propietario_existente: false,
            buscando: false
        }]);
    };

    // Eliminar propietario
    const eliminarPropietario = (index) => {
        if (propietarios.length > 1) {
            setPropietarios(propietarios.filter((_, i) => i !== index));
        }
    };

    // Abrir modal
    const abrirModal = (tipo, lote = null) => {
        setModalType(tipo);
        setSelectedLote(lote);
        
        if (tipo === 'editar' && lote) {
            setFormData({
                numero_lote: lote.numero_lote,
                organizacion: lote.organizacion,
                fecha_entrega: lote.fecha_entrega ? new Date(lote.fecha_entrega).toISOString().split('T')[0] : '',
                total_quintales: lote.total_quintales,
                observaciones: lote.observaciones || ''
            });
            
            if (lote.propietarios && lote.propietarios.length > 0) {
                setPropietarios(lote.propietarios);
            }
        } else {
            // Reset formulario para nuevo lote
            setFormData({
                numero_lote: '',
                organizacion: '',
                fecha_entrega: '',
                total_quintales: '',
                observaciones: ''
            });
            setPropietarios([{
                nombre_completo: '',
                cedula: '',
                quintales_entregados: '',
                telefono: '',
                departamento: '',
                municipio: '',
                comunidad: '',
                calle: '',
                numero_casa: '',
                referencias: '',
                propietario_maestro_id: null,
                es_propietario_existente: false,
                buscando: false
            }]);
        }
        
        setShowModal(true);
    };

    // Cerrar modal
    const cerrarModal = () => {
        setShowModal(false);
        setModalType('');
        setSelectedLote(null);
    };

    // Crear o actualizar lote
    const guardarLote = async (e) => {
        e.preventDefault();
        
        // Validaciones
        if (!formData.numero_lote || !formData.organizacion || !formData.fecha_entrega) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }

        const propietariosValidos = propietarios.filter(p => 
            p.nombre_completo && p.cedula && p.quintales_entregados
        );

        if (propietariosValidos.length === 0) {
            alert('Debe agregar al menos un propietario válido');
            return;
        }

        try {
            const loteData = {
                ...formData,
                propietarios: propietariosValidos
            };

            if (modalType === 'editar') {
                // Actualizar lote existente
                await axiosInstance.put(`http://localhost:8000/api/users/lotes/${selectedLote.id}/`, loteData);
                alert('Lote actualizado exitosamente');
            } else {
                // Crear nuevo lote
                await axiosInstance.post('http://localhost:8000/api/users/lotes/crear-con-propietarios/', loteData);
                alert('Lote recibido y registrado exitosamente');
            }
            
            cerrarModal();
            cargarDatos();
        } catch (error) {
            console.error('Error al guardar lote:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al guardar el lote: ${errorMsg}`);
            }
        }
    };

    // Filtrar lotes - mostrar lotes separados y finalizados para recepción
    const lotesFiltrados = lotes.filter(lote => {
        // Mostrar lotes que han completado separación o ya están finalizados
        const estadosValidos = ['SEPARADO', 'FINALIZADO'];
        const esValidoParaRecepcion = estadosValidos.includes(lote.estado);
        
        // Aplicar filtros de búsqueda solo si el lote es válido para recepción
        if (!esValidoParaRecepcion) {
            return false;
        }
        
        const cumpleBusqueda = lote.numero_lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (lote.organizacion_nombre && lote.organizacion_nombre.toLowerCase().includes(searchTerm.toLowerCase()));
        const cumpleOrganizacion = !filterOrganizacion || lote.organizacion == filterOrganizacion;
        
        return cumpleBusqueda && cumpleOrganizacion;
    });

    // Función para obtener color del estado
    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return '#ffc107';
            case 'EN_PROCESO': return '#17a2b8';
            case 'APROBADO': return '#28a745';
            case 'RECHAZADO': return '#dc3545';
            case 'SEPARADO': return '#28a745';
            case 'FINALIZADO': return '#007bff';
            case 'LIMPIO': return '#20c997';
            case 'SEPARACION_PENDIENTE': return '#fd7e14';
            case 'SEPARACION_APLICADA': return '#6f42c1';
            default: return '#6c757d';
        }
    };

    const getEstadoTexto = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return 'Pendiente';
            case 'EN_PROCESO': return 'En Proceso';
            case 'APROBADO': return 'Aprobado';
            case 'RECHAZADO': return 'Rechazado';
            case 'SEPARADO': return 'Separado ';
            case 'FINALIZADO': return 'Finalizado';
            case 'LIMPIO': return 'Limpio';
            case 'SEPARACION_PENDIENTE': return 'Separación Pendiente';
            case 'SEPARACION_APLICADA': return 'Separación Aplicada';
            default: return estado;
        }
    };

    // Función para procesar recepción final
    const procesarRecepcionFinal = async (lote) => {
        if (lote.estado !== 'SEPARADO') {
            alert('Solo se pueden procesar lotes con estado SEPARADO');
            return;
        }

        const responsable = prompt('Ingrese el nombre del responsable de la recepción final:');
        if (!responsable) return;

        const calificacion = prompt('Ingrese la calificación final (A, B, C):');
        if (!calificacion) return;

        const observaciones = prompt('Observaciones finales (opcional):') || '';

        try {
            const response = await axiosInstance.post(
                'http://localhost:8000/api/users/lotes/enviar-recepcion-final/',
                {
                    lote_id: lote.id,
                    responsable_recepcion: responsable,
                    calificacion_final: calificacion,
                    observaciones_finales: observaciones,
                    fecha_recepcion_final: new Date().toISOString().split('T')[0]
                }
            );

            alert(response.data.mensaje);
            cargarDatos(); // Recargar datos para actualizar el estado
        } catch (error) {
            console.error('Error al procesar recepción final:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.error || error.message;
                alert(`Error al procesar recepción final: ${errorMsg}`);
            }
        }
    };

    return (
        <div className="app-container">
            <Sidebar userName="Usuario FAPECAFE" userRole="Cliente" />
            
            <div className="recepcion-container">
                <BottomNavigator />
                
                <div className="recepcion-content">
                    <div className="recepcion-header">
                        <h1>Recepción de Café</h1>
                        <p>Gestión de lotes recibidos de organizaciones y propietarios</p>
                    </div>

                    {/* Navegación por pestañas */}
                    <div className="tabs-container">
                        <button 
                            className={`tab-button ${activeTab === 'recibir' ? 'active' : ''}`}
                            onClick={() => setActiveTab('recibir')}
                        >
                            Recibir Lote
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'consultar' ? 'active' : ''}`}
                            onClick={() => setActiveTab('consultar')}
                        >
                            Consultar Lotes
                        </button>
                    </div>

                    {/* Contenido de pestañas */}
                    <div className="tab-content">
                        {activeTab === 'recibir' && (
                            <div className="recibir-section">
                                <div className="section-header">
                                    <h2>Lotes Listos para Recepción Final</h2>
                                    <p>Aquí se muestran los lotes que han completado la separación por colores y están listos para la recepción final</p>
                                </div>
                                
                                <div className="recientes-container">
                                    <h3>Lotes Listos para Recepción Final</h3>
                                    <p className="info-text">Solo se muestran lotes que han completado el proceso de separación por colores</p>
                                    <div className="lotes-recientes">
                                        {lotes.filter(lote => lote.estado === 'SEPARADO').slice(0, 5).map(lote => (
                                            <div key={lote.id} className="lote-reciente-card">
                                                <div className="lote-info">
                                                    <h4>{lote.numero_lote}</h4>
                                                    <p>{lote.organizacion_nombre}</p>
                                                    <p>{lote.total_quintales} quintales</p>
                                                    <p>{new Date(lote.fecha_entrega).toLocaleDateString()}</p>
                                                </div>
                                                <span 
                                                    className="estado-badge"
                                                    style={{ backgroundColor: '#28a745' }}
                                                >
                                                    SEPARADO
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'consultar' && (
                            <div className="consultar-section">
                                <div className="section-header">
                                    <h2>Consultar y Editar Lotes</h2>
                                    <div className="filtros-container">
                                        <input
                                            type="text"
                                            placeholder="Buscar por número de lote u organización..."
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
                                
                                <div className="lotes-grid">
                                    {lotesFiltrados.map(lote => (
                                        <div key={lote.id} className="lote-card">
                                            <div className="lote-header">
                                                <h3>{lote.numero_lote}</h3>
                                                <span 
                                                    className="estado-badge"
                                                    style={{ backgroundColor: getEstadoColor(lote.estado) }}
                                                >
                                                    {getEstadoTexto(lote.estado)}
                                                </span>
                                            </div>
                                            <div className="lote-info">
                                                <p><strong>Organización:</strong> {lote.organizacion_nombre}</p>
                                                <p><strong>Quintales:</strong> {lote.total_quintales}</p>
                                                <p><strong>Propietarios:</strong> {lote.propietarios?.length || 0}</p>
                                                <p><strong>Fecha:</strong> {new Date(lote.fecha_entrega).toLocaleDateString()}</p>
                                            </div>
                                            <div className="lote-actions">
                                                <button 
                                                    className="btn-secondary"
                                                    onClick={() => abrirModal('ver', lote)}
                                                >
                                                    Ver Detalle
                                                </button>
                                                <button 
                                                    className="btn-outline"
                                                    onClick={() => abrirModal('editar', lote)}
                                                >
                                                    Editar
                                                </button>
                                                {lote.estado === 'SEPARADO' && (
                                                    <button 
                                                        className="btn-primary"
                                                        onClick={() => procesarRecepcionFinal(lote)}
                                                    >
                                                        Procesar Recepción Final
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {lotesFiltrados.length === 0 && (
                                    <div className="no-results">
                                        <p>No se encontraron lotes que coincidan con los filtros aplicados</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Modal */}
                    {showModal && (
                        <div className="modal-overlay" onClick={cerrarModal}>
                            <div className="modal-content" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>
                                        {modalType === 'nuevo' && 'Recibir Nuevo Lote'}
                                        {modalType === 'editar' && 'Editar Lote'}
                                        {modalType === 'ver' && 'Detalle del Lote'}
                                    </h3>
                                    <button className="close-btn" onClick={cerrarModal}>×</button>
                                </div>
                                <div className="modal-body">
                                    {(modalType === 'nuevo' || modalType === 'editar') && (
                                        <form onSubmit={guardarLote} className="formulario-lote">
                                            {/* Información del Lote */}
                                            <div className="form-section">
                                                <h4>Información del Lote</h4>
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Número de Lote *</label>
                                                        <input
                                                            type="text"
                                                            name="numero_lote"
                                                            value={formData.numero_lote}
                                                            onChange={handleInputChange}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Organización *</label>
                                                        <select
                                                            name="organizacion"
                                                            value={formData.organizacion}
                                                            onChange={handleInputChange}
                                                            required
                                                        >
                                                            <option value="">Seleccione una organización</option>
                                                            {organizaciones.map(org => (
                                                                <option key={org.id} value={org.id}>{org.nombre}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Fecha de Entrega *</label>
                                                        <input
                                                            type="date"
                                                            name="fecha_entrega"
                                                            value={formData.fecha_entrega}
                                                            onChange={handleInputChange}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Total Quintales *</label>
                                                        <input
                                                            type="number"
                                                            name="total_quintales"
                                                            value={formData.total_quintales}
                                                            onChange={handleInputChange}
                                                            min="0"
                                                            step="0.1"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Observaciones</label>
                                                    <textarea
                                                        name="observaciones"
                                                        value={formData.observaciones}
                                                        onChange={handleInputChange}
                                                        rows="3"
                                                        placeholder="Observaciones adicionales sobre el lote..."
                                                    />
                                                </div>
                                            </div>

                                            {/* Propietarios */}
                                            <div className="form-section">
                                                <div className="section-header-form">
                                                    <h4>Propietarios del Lote</h4>
                                                    <button 
                                                        type="button" 
                                                        className="btn-add-propietario"
                                                        onClick={agregarPropietario}
                                                    >
                                                        + Agregar Propietario
                                                    </button>
                                                </div>
                                                
                                                {propietarios.map((propietario, index) => (
                                                    <div key={index} className="propietario-form">
                                                        <div className="propietario-header">
                                                            <h5>Propietario {index + 1}</h5>
                                                            {propietarios.length > 1 && (
                                                                <button 
                                                                    type="button" 
                                                                    className="btn-remove"
                                                                    onClick={() => eliminarPropietario(index)}
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="form-row">
                                                            <div className="form-group">
                                                                <label>Cédula *
                                                                    <small style={{ color: '#666', fontSize: '0.8rem', fontWeight: 'normal' }}>
                                                                        {propietario.es_propietario_existente ? 
                                                                            ' (Se encontraron datos registrados)' : 
                                                                            ' (Ingrese 8+ dígitos para buscar)'
                                                                        }
                                                                    </small>
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={propietario.cedula}
                                                                    onChange={(e) => handlePropietarioChange(index, 'cedula', e.target.value)}
                                                                    placeholder="Número de cédula"
                                                                    required
                                                                    className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                                                    readOnly={propietario.es_propietario_existente}
                                                                />
                                                                {propietario.buscando && (
                                                                    <small style={{ color: '#007bff' }}>🔍 Buscando propietario...</small>
                                                                )}
                                                            </div>
                                                            <div className="form-group">
                                                                <label>Nombre Completo *</label>
                                                                <input
                                                                    type="text"
                                                                    value={propietario.nombre_completo}
                                                                    onChange={(e) => handlePropietarioChange(index, 'nombre_completo', e.target.value)}
                                                                    placeholder="Nombre completo del propietario"
                                                                    required
                                                                    className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                                                    readOnly={propietario.es_propietario_existente}
                                                                />
                                                                {propietario.es_propietario_existente && (
                                                                    <small style={{ color: '#28a745' }}>👤 Propietario registrado encontrado</small>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="form-row">
                                                            <div className="form-group">
                                                                <label>Quintales Entregados *</label>
                                                                <input
                                                                    type="number"
                                                                    value={propietario.quintales_entregados}
                                                                    onChange={(e) => handlePropietarioChange(index, 'quintales_entregados', e.target.value)}
                                                                    placeholder="Cantidad en quintales"
                                                                    step="0.01"
                                                                    min="0"
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="form-group">
                                                                <label>Teléfono</label>
                                                                <input
                                                                    type="tel"
                                                                    value={propietario.telefono}
                                                                    onChange={(e) => handlePropietarioChange(index, 'telefono', e.target.value)}
                                                                    placeholder="Número de teléfono"
                                                                    className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                                                    readOnly={propietario.es_propietario_existente}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="direccion-section">
                                                            <h6>Dirección Detallada</h6>
                                                            
                                                            <div className="form-row">
                                                                <div className="form-group">
                                                                    <label>Provincia</label>
                                                                    <input
                                                                        type="text"
                                                                        value={propietario.departamento}
                                                                        onChange={(e) => handlePropietarioChange(index, 'departamento', e.target.value)}
                                                                        placeholder="Ej: Loja"
                                                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                                                        readOnly={propietario.es_propietario_existente}
                                                                    />
                                                                </div>
                                                                
                                                                <div className="form-group">
                                                                    <label>Ciudad</label>
                                                                    <input
                                                                        type="text"
                                                                        value={propietario.municipio}
                                                                        onChange={(e) => handlePropietarioChange(index, 'municipio', e.target.value)}
                                                                        placeholder="Ej: Catamayo"
                                                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                                                        readOnly={propietario.es_propietario_existente}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="form-row">
                                                                <div className="form-group">
                                                                    <label>Barrio</label>
                                                                    <input
                                                                        type="text"
                                                                        value={propietario.comunidad}
                                                                        onChange={(e) => handlePropietarioChange(index, 'comunidad', e.target.value)}
                                                                        placeholder="Ej: San José"
                                                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                                                        readOnly={propietario.es_propietario_existente}
                                                                    />
                                                                </div>
                                                                
                                                                <div className="form-group">
                                                                    <label>Calle/Finca</label>
                                                                    <input
                                                                        type="text"
                                                                        value={propietario.calle}
                                                                        onChange={(e) => handlePropietarioChange(index, 'calle', e.target.value)}
                                                                        placeholder="Ej: Finca El Cafetal"
                                                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                                                        readOnly={propietario.es_propietario_existente}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="form-row">
                                                                <div className="form-group">
                                                                    <label>Número de Casa</label>
                                                                    <input
                                                                        type="text"
                                                                        value={propietario.numero_casa}
                                                                        onChange={(e) => handlePropietarioChange(index, 'numero_casa', e.target.value)}
                                                                        placeholder="Ej: Casa S/N o Km 12"
                                                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                                                        readOnly={propietario.es_propietario_existente}
                                                                    />
                                                                </div>
                                                                
                                                                <div className="form-group">
                                                                    <label>Referencias</label>
                                                                    <input
                                                                        type="text"
                                                                        value={propietario.referencias}
                                                                        onChange={(e) => handlePropietarioChange(index, 'referencias', e.target.value)}
                                                                        placeholder="Ej: 500 metros después de la capilla"
                                                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                                                        readOnly={propietario.es_propietario_existente}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="form-actions">
                                                            <button 
                                                                type="button" 
                                                                className="btn-secondary"
                                                                onClick={() => {
                                                                    setMostrarListaPropietarios(true);
                                                                    cargarPropietariosMaestros();
                                                                }}
                                                            >
                                                                📋 Ver Propietarios Registrados
                                                            </button>
                                                            {propietario.es_propietario_existente && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => limpiarPropietario(index)}
                                                                    className="btn-clean"
                                                                    title="Crear nuevo propietario"
                                                                >
                                                                    🆕 Nuevo
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="form-actions">
                                                <button type="button" onClick={cerrarModal}>Cancelar</button>
                                                <button type="submit" className="btn-primary">
                                                    {modalType === 'editar' ? 'Actualizar Lote' : 'Registrar Lote'}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {modalType === 'ver' && selectedLote && (
                                        <div className="lote-detalle">
                                            <div className="detalle-section">
                                                <h4>Información del Lote</h4>
                                                <div className="detalle-grid">
                                                    <p><strong>Número:</strong> {selectedLote.numero_lote}</p>
                                                    <p><strong>Estado:</strong> 
                                                        <span 
                                                            className="estado-badge small ml-2"
                                                            style={{ backgroundColor: getEstadoColor(selectedLote.estado) }}
                                                        >
                                                            {getEstadoTexto(selectedLote.estado)}
                                                        </span>
                                                    </p>
                                                    <p><strong>Organización:</strong> {selectedLote.organizacion_nombre}</p>
                                                    <p><strong>Total Quintales:</strong> {selectedLote.total_quintales}</p>
                                                    <p><strong>Fecha Entrega:</strong> {new Date(selectedLote.fecha_entrega).toLocaleDateString()}</p>
                                                    <p><strong>Fecha Registro:</strong> {new Date(selectedLote.fecha_creacion).toLocaleDateString()}</p>
                                                </div>
                                                {selectedLote.observaciones && (
                                                    <p><strong>Observaciones:</strong> {selectedLote.observaciones}</p>
                                                )}
                                            </div>

                                            {selectedLote.propietarios && selectedLote.propietarios.length > 0 && (
                                                <div className="detalle-section">
                                                    <h4>Propietarios ({selectedLote.propietarios.length})</h4>
                                                    <div className="propietarios-detalle">
                                                        {selectedLote.propietarios.map((prop, index) => (
                                                            <div key={index} className="propietario-detalle-item">
                                                                <h6>{prop.nombre_completo}</h6>
                                                                <p><strong>Cédula:</strong> {prop.cedula}</p>
                                                                <p><strong>Quintales:</strong> {prop.quintales_entregados}</p>
                                                                {prop.telefono && <p><strong>Teléfono:</strong> {prop.telefono}</p>}
                                                                {prop.direccion && <p><strong>Dirección:</strong> {prop.direccion}</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal para lista de propietarios */}
                    {mostrarListaPropietarios && (
                        <div className="modal-overlay">
                            <div className="modal-content propietarios-modal">
                                <div className="modal-header">
                                    <h3>Propietarios Registrados</h3>
                                    <button 
                                        type="button"
                                        onClick={() => setMostrarListaPropietarios(false)}
                                        className="close-btn"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="modal-body">
                                    {cargandoPropietarios ? (
                                        <div className="loading-text">Cargando propietarios...</div>
                                    ) : (
                                        <div className="propietarios-list">
                                            {propietariosMaestros.map(propietario => (
                                                <div key={propietario.id} className="propietario-item">
                                                    <div className="propietario-info">
                                                        <h5>{propietario.nombre_completo}</h5>
                                                        <p><strong>Cédula:</strong> {propietario.cedula}</p>
                                                        <p><strong>Teléfono:</strong> {propietario.telefono || 'No registrado'}</p>
                                                        <p><strong>Ubicación:</strong> {propietario.direccion_completa}</p>
                                                        <p><strong>Entregas anteriores:</strong> {propietario.total_entregas}</p>
                                                    </div>
                                                    <div className="propietario-actions">
                                                        {propietarios.map((_, index) => (
                                                            <button
                                                                key={index}
                                                                type="button"
                                                                onClick={() => seleccionarPropietarioExistente(index, propietario)}
                                                                className="btn-small"
                                                            >
                                                                Asignar a Propietario {index + 1}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {propietariosMaestros.length === 0 && (
                                                <p className="no-data">No hay propietarios registrados aún.</p>
                                            )}
                                        </div>
                                    )}
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

export default Recepcion;