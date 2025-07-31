import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { getCurrentUser, isAdmin } from '../../../utils/auth';
import '../../../styles/analisis_muestra.css';

const AnalisisMuestra = () => {
    const navigate = useNavigate();
    const [muestras, setMuestras] = useState([]);
    const [lotes, setLotes] = useState([]); // Nuevo estado para lotes
    const [tareas, setTareas] = useState([]); // ✅ NUEVO: Estado para tareas realizadas
    const [activeTab, setActiveTab] = useState('muestras'); // Nuevo estado para pestañas
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showSeleccionModal, setShowSeleccionModal] = useState(false); // Nuevo modal para selección
    const [selectedMuestra, setSelectedMuestra] = useState(null);
    const [selectedLote, setSelectedLote] = useState(null); // Nuevo estado para lote seleccionado
    const [formData, setFormData] = useState({});
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [isAdminUser, setIsAdminUser] = useState(false);
    // Estado para almacenar los datos del análisis completado
    const [resultadoAnalisisCompletado, setResultadoAnalisisCompletado] = useState(null);
    // Nuevo estado para insumos disponibles
    const [insumosDisponibles, setInsumosDisponibles] = useState([]);
    // Nuevo estado para el modal de tareas
    const [showTareaModal, setShowTareaModal] = useState(false);
    // Nuevo estado para el formulario de tareas
    const [tareaForm, setTareaForm] = useState({
        descripcion: '',
        hora_inicio: '',
        hora_fin: '',
        insumo_utilizado: '',
        cantidad: '',
        tiempo_uso: '',
        peso_usado: ''
    });

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

    // Función para manejar errores de autenticación
    const handleAuthError = (error) => {
        if (!error) {
            console.error('Error de autenticación: Error undefined');
            return false;
        }
        
        console.error('Error de autenticación:', error.response?.status, error.response?.data);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
            alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
            navigate('/login');
            return true;
        }
        return false;
    };

    // Cargar muestras cuando el componente se monta
    useEffect(() => {
        if (isAuthenticated) {
            cargarDatos();
        }
    }, [isAuthenticated]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            await Promise.all([
                cargarMuestras(),
                cargarLotes(),
                cargarTareas(), // ✅ NUEVO: Cargar tareas realizadas
                cargarInsumos() // Agregar carga de insumos
            ]);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarMuestras = async () => {
        try {
            const response = await axiosInstance.get('http://localhost:8000/api/users/muestras/');
            const muestrasData = response.data;
            
            // Agregar logging para debugging de la estructura de datos
            console.log('Muestras cargadas (primera muestra para debugging):', muestrasData[0]);
            
            setMuestras(muestrasData);
            console.log('Muestras cargadas exitosamente');
        } catch (error) {
            console.error('Error al cargar muestras:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al cargar las muestras: ${errorMsg}`);
            }
        }
    };

    const cargarLotes = async () => {
        try {
            const response = await axiosInstance.get('http://localhost:8000/api/users/lotes/');
            // Filtrar solo los lotes en estado PENDIENTE
            const lotesPendientes = response.data.filter(lote => lote.estado === 'PENDIENTE');
            setLotes(lotesPendientes);
            console.log('Lotes pendientes cargados exitosamente');
        } catch (error) {
            console.error('Error al cargar lotes:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al cargar los lotes: ${errorMsg}`);
            }
        }
    };

    // Nueva función para cargar tareas realizadas
    const cargarTareas = async () => {
        try {
            const response = await axiosInstance.get('http://localhost:8000/api/users/tareas/');
            setTareas(response.data);
            console.log('Tareas cargadas exitosamente:', response.data.length);
        } catch (error) {
            console.error('Error al cargar tareas:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                console.warn(`Error al cargar tareas: ${errorMsg}`);
                // No mostrar alerta para este error, solo registrar en consola
                setTareas([]); // Establecer lista vacía en caso de error
            }
        }
    };

    // Nueva función para cargar insumos disponibles
    const cargarInsumos = async () => {
        try {
            const response = await axiosInstance.get('http://localhost:8000/api/users/insumos/');
            // Filtrar solo insumos activos
            const insumosActivos = response.data.filter(insumo => insumo.activo);
            setInsumosDisponibles(insumosActivos);
            console.log('Insumos disponibles cargados exitosamente:', insumosActivos.length);
        } catch (error) {
            console.error('Error al cargar insumos:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                console.warn(`Error al cargar insumos: ${errorMsg}`);
                // No mostrar alerta para este error, solo registrar en consola
                setInsumosDisponibles([]); // Establecer lista vacía en caso de error
            }
        }
    };

    const abrirModalSeleccion = (lote) => {
        setSelectedLote(lote);
        setShowSeleccionModal(true);
        setFormData({
            propietarios_seleccionados: []
        });
    };

    const cerrarModalSeleccion = () => {
        setShowSeleccionModal(false);
        setSelectedLote(null);
        setFormData({});
    };

    const seleccionarMuestras = async (e) => {
        e.preventDefault();
        
        if (!formData.propietarios_seleccionados || formData.propietarios_seleccionados.length === 0) {
            alert('Debe seleccionar al menos un propietario para tomar muestras');
            return;
        }

        try {
            setLoading(true);
            
            // Corregir la estructura de datos según lo que espera el backend
            const datosSeleccion = {
                lote_id: selectedLote.id,
                propietarios_seleccionados: formData.propietarios_seleccionados,
                fecha_toma_muestra: new Date().toISOString().split('T')[0] // Fecha actual
            };

            console.log('Enviando datos de selección de muestras:', datosSeleccion);
            
            const response = await axiosInstance.post('http://localhost:8000/api/users/muestras/seleccionar/', datosSeleccion);
            
            console.log('Respuesta del servidor:', response.data);
            alert('Muestras seleccionadas exitosamente. El lote está ahora en proceso de análisis.');
            cerrarModalSeleccion();
            
            // Recargar datos
            await cargarDatos();
            
        } catch (error) {
            console.error('Error al seleccionar muestras:', error);
            console.error('Detalles completos del error:', error.response?.data);
            
            if (error.response && error.response.status === 400) {
                const errorData = error.response.data;
                console.log('Errores de validación en selección:', errorData);
                
                let errorMessages = [];
                
                if (typeof errorData === 'object') {
                    for (const [field, messages] of Object.entries(errorData)) {
                        console.log(`Campo ${field}:`, messages);
                        if (Array.isArray(messages)) {
                            errorMessages.push(`${field}: ${messages.join(', ')}`);
                        } else if (typeof messages === 'object') {
                            errorMessages.push(`${field}: ${JSON.stringify(messages)}`);
                        } else {
                            errorMessages.push(`${field}: ${messages}`);
                        }
                    }
                }
                
                const errorText = errorMessages.length > 0 
                    ? `Errores en la selección de muestras:\n${errorMessages.join('\n')}`
                    : `Error en la selección: ${JSON.stringify(errorData)}`;
                    
                alert(errorText);
            } else if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al seleccionar muestras: ${errorMsg}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePropietarioChange = (propietarioId) => {
        setFormData(prev => {
            const propietarios = prev.propietarios_seleccionados || [];
            const isSelected = propietarios.includes(propietarioId);
            
            if (isSelected) {
                return {
                    ...prev,
                    propietarios_seleccionados: propietarios.filter(id => id !== propietarioId)
                };
            } else {
                return {
                    ...prev,
                    propietarios_seleccionados: [...propietarios, propietarioId]
                };
            }
        });
    };

    const abrirModal = (muestra) => {
        setSelectedMuestra(muestra);
        setShowModal(true);
        setFormData({});
    };

    const cerrarModal = () => {
        setShowModal(false);
        setSelectedMuestra(null);
        setFormData({});
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función para manejar cambios en el formulario de tareas
    const handleTareaInputChange = (e) => {
        const { name, value } = e.target;
        setTareaForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función para abrir el modal de tareas
    const abrirModalTarea = (resultadoAnalisis) => {
        setResultadoAnalisisCompletado(resultadoAnalisis);
        setShowTareaModal(true);
        // Limpiar el formulario de tarea
        setTareaForm({
            descripcion: '',
            hora_inicio: '',
            hora_fin: '',
            insumo_utilizado: '',
            cantidad: '',
            tiempo_uso: '',
            peso_usado: ''
        });
    };

    // Función para cerrar el modal de tareas
    const cerrarModalTarea = () => {
        setShowTareaModal(false);
        setResultadoAnalisisCompletado(null);
        setTareaForm({
            descripcion: '',
            hora_inicio: '',
            hora_fin: '',
            insumo_utilizado: '',
            cantidad: '',
            tiempo_uso: '',
            peso_usado: ''
        });
    };

    // Función para crear la tarea
    const crearTarea = async (e) => {
        e.preventDefault();
        
        if (!tareaForm.descripcion || !tareaForm.insumo_utilizado) {
            alert('Por favor complete los campos obligatorios (Descripción e Insumo utilizado)');
            return;
        }

        try {
            setLoading(true);
            
            const datosTarea = {
                descripcion: tareaForm.descripcion,
                hora_inicio: tareaForm.hora_inicio || null,
                hora_fin: tareaForm.hora_fin || null,
                insumo: parseInt(tareaForm.insumo_utilizado), 
                cantidad: tareaForm.cantidad ? parseFloat(tareaForm.cantidad) : null,
                tiempo_uso: tareaForm.tiempo_uso ? parseInt(tareaForm.tiempo_uso) : null,
                peso_usado: tareaForm.peso_usado ? parseFloat(tareaForm.peso_usado) : null,
                muestra: resultadoAnalisisCompletado?.muestra_id || null, 
                lote: resultadoAnalisisCompletado?.lote_id || null,      
                resultado_analisis: resultadoAnalisisCompletado?.estado
            };

            // ✅ VALIDACIÓN ADICIONAL: Asegurar que hay al menos muestra o lote
            if (!datosTarea.muestra && !datosTarea.lote) {
                alert('Error: No se pudo identificar la muestra o lote para la tarea');
                return;
            }

            console.log('Enviando datos de tarea:', datosTarea);
            
            const response = await axiosInstance.post('/tareas/', datosTarea);
            
            console.log('Tarea creada exitosamente:', response.data);
            alert('✅ Tarea registrada exitosamente');
            
            // Cerrar modal de tareas
            cerrarModalTarea();
            
            // ✅ CORRECCIÓN: Procesar respuesta del backend para primer muestreo contaminado
            if (resultadoAnalisisCompletado?.estado === 'CONTAMINADA') {
                if (selectedMuestra?.es_segundo_muestreo) {
                    // ✅ Es un segundo muestreo contaminado - separación definitiva
                    console.log('Segundo muestreo contaminado detectado - separación definitiva aplicada');
                    
                    const mensajeSeparacion = `
🚨 SEGUNDO MUESTREO RECHAZADO - SEPARACIÓN DEFINITIVA

La muestra ${selectedMuestra?.numero_muestra} del segundo muestreo ha sido rechazada por contaminación.

📋 Resultado final:
• El propietario ${selectedMuestra?.propietario_nombre} será separado definitivamente del lote
• Los quintales de este propietario han sido restados automáticamente
• No se realizarán más análisis para este propietario

✅ Proceso completado automáticamente por el sistema según el protocolo de análisis de café.
                    `;
                    
                    alert(mensajeSeparacion);
                    
                } else {
                    // ✅ Es un primer muestreo contaminado - verificar respuesta del backend
                    console.log('Primer muestreo contaminado - verificando respuesta del backend...');
                    
                    // El backend ya procesó el resultado, verificar si creó segundo muestreo automáticamente
                    // mediante la recarga de datos que mostrará las nuevas muestras
                    
                    const mensajeInfo = `
🔬 MUESTRA CONTAMINADA PROCESADA

La muestra ${selectedMuestra?.numero_muestra} ha sido rechazada por contaminación.

📋 El sistema está procesando automáticamente:
• Evaluación para segundo muestreo si corresponde
• O aplicación de separación de quintales

✅ Actualizando lista de muestras...
                    `;
                    
                    alert(mensajeInfo);
                }
            } else {
                // ✅ Muestra aprobada - proceso normal
                console.log('Muestra aprobada - proceso normal');
            }
            
            // Siempre recargar datos al final
            await cargarDatos();
            
        } catch (error) {
            console.error('Error al crear tarea:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                
                // ✅ MEJORAR MANEJO DE ERRORES DE VALIDACIÓN
                if (error.response && error.response.status === 400) {
                    const errorData = error.response.data;
                    let errorMessages = [];
                    
                    if (typeof errorData === 'object') {
                        for (const [field, messages] of Object.entries(errorData)) {
                            if (Array.isArray(messages)) {
                                errorMessages.push(`${field}: ${messages.join(', ')}`);
                            } else {
                                errorMessages.push(`${field}: ${messages}`);
                            }
                        }
                    }
                    
                    const errorText = errorMessages.length > 0 
                        ? `Errores de validación:\n${errorMessages.join('\n')}`
                        : `Error al crear la tarea: ${errorMsg}`;
                    
                    alert(errorText);
                } else {
                    alert(`Error al crear la tarea: ${errorMsg}`);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const registrarResultadoMuestra = async (e) => {
        e.preventDefault();
        try {
            const response = await axiosInstance.post(
                `http://localhost:8000/api/users/muestras/${selectedMuestra.id}/resultado/`,
                formData
            );
            
            const data = response.data;
            console.log('Respuesta del registro de resultado:', data);
            
            // Cerrar el modal de registro primero
            cerrarModal();
            
            // Mostrar mensaje principal
            alert(data.mensaje);
            
            // Abrir modal de tareas después de registrar el resultado
            const resultadoParaTarea = {
                muestra_id: selectedMuestra.id,
                lote_id: selectedMuestra.lote_id || selectedMuestra.lote, // ✅ Mejorar obtención del lote_id
                estado: formData.estado,
                numero_muestra: selectedMuestra.numero_muestra,
                propietario_nombre: selectedMuestra.propietario_nombre
            };
            
            console.log('Datos para tarea:', resultadoParaTarea); // ✅ Agregar log para debugging
            
            abrirModalTarea(resultadoParaTarea);
            
            // Recargar datos
            cargarMuestras();
        } catch (error) {
            console.error('Error al registrar resultado:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al registrar el resultado: ${errorMsg}`);
            }
        }
    };

    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return '#ffc107';
            case 'EN_PROCESO': return '#17a2b8';
            case 'APROBADO': return '#28a745';
            case 'RECHAZADO': return '#dc3545';
            case 'CONTAMINADA': return '#dc3545';
            case 'APROBADA': return '#28a745';
            default: return '#6c757d';
        }
    };

    const getEstadoTexto = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return 'Pendiente';
            case 'EN_PROCESO': return 'En Proceso';
            case 'APROBADO': return 'Aprobado';
            case 'RECHAZADO': return 'Rechazado';
            case 'CONTAMINADA': return 'Contaminada';
            case 'APROBADA': return 'Aprobada';
            case 'ANALIZADA': return 'Analizada';
            default: return estado;
        }
    };

    return (
        <div className="app-container">
            <Sidebar />
            
            <div className="analisis-muestra-container">
                <BottomNavigator />
                
                <div className="analisis-muestra-header">
                    <h1>🔬 Análisis de Muestras de Café</h1>
                    <p>FAPECAFES - Control de Calidad y Análisis de Laboratorio</p>
                </div>

                {/* Estadísticas rápidas */}
                <div className="estadisticas-muestras">
                    <div className="stat-card pendientes">
                        <h3>Muestras Pendientes</h3>
                        <span className="stat-number">{muestras.filter(m => m.estado === 'PENDIENTE').length}</span>
                    </div>
                    <div className="stat-card aprobadas">
                        <h3>Muestras Aprobadas</h3>
                        <span className="stat-number">{muestras.filter(m => m.estado === 'APROBADA').length}</span>
                    </div>
                    <div className="stat-card contaminadas">
                        <h3>Muestras Contaminadas</h3>
                        <span className="stat-number">{muestras.filter(m => m.estado === 'CONTAMINADA').length}</span>
                    </div>
                    <div className="stat-card tareas">
                        <h3>Tareas Realizadas</h3>
                        <span className="stat-number">{tareas.length}</span>
                    </div>
                    <div className="stat-card total">
                        <h3>Total Muestras</h3>
                        <span className="stat-number">{muestras.length}</span>
                    </div>
                </div>

                {/* Navegación por pestañas */}
                <div className="tabs-container">
                    <button 
                        className={`tab-button ${activeTab === 'lotes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('lotes')}
                    >
                        📦 Lotes Pendientes
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'muestras' ? 'active' : ''}`}
                        onClick={() => setActiveTab('muestras')}
                    >
                        🔬 Muestras para Análisis
                    </button>
                </div>

                {/* Contenido de pestañas */}
                <div className="tab-content">
                    {/* Pestaña de Lotes Pendientes */}
                    {activeTab === 'lotes' && (
                        <div className="lotes-pendientes-section">
                            <div className="section-header">
                                <h2>📦 Lotes Pendientes de Selección de Muestras</h2>
                                <p>Seleccione los lotes para proceder con la toma de muestras para análisis</p>
                                <button 
                                    className="btn-refresh"
                                    onClick={cargarLotes}
                                    disabled={loading}
                                >
                                    {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
                                </button>
                            </div>
                            
                            {lotes.length === 0 ? (
                                <div className="no-data-card">
                                    <div className="no-data-icon">📦</div>
                                    <h3>No hay lotes pendientes</h3>
                                    <p>Todos los lotes han sido procesados o no hay lotes registrados en estado pendiente.</p>
                                </div>
                            ) : (
                                <div className="lotes-grid">
                                    {lotes.map(lote => (
                                        <div key={lote.id} className="lote-card pendiente">
                                            <div className="lote-header">
                                                <h3>{lote.numero_lote}</h3>
                                                <span className="estado-badge pendiente">
                                                    ⏳ Pendiente
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
                                                    <strong>👥 Propietarios:</strong> {lote.propietarios?.length || 0}
                                                </div>
                                                <div className="info-item">
                                                    <strong>📅 Fecha Entrega:</strong> {new Date(lote.fecha_entrega).toLocaleDateString()}
                                                </div>
                                                <div className="info-item">
                                                    <strong>📝 Registrado:</strong> {new Date(lote.fecha_creacion).toLocaleDateString()}
                                                </div>
                                            </div>
                                            
                                            {lote.observaciones && (
                                                <div className="lote-observaciones">
                                                    <strong>📋 Observaciones:</strong>
                                                    <p>{lote.observaciones}</p>
                                                </div>
                                            )}
                                            
                                            <div className="lote-actions">
                                                <button 
                                                    className="btn-seleccionar-muestras"
                                                    onClick={() => abrirModalSeleccion(lote)}
                                                    disabled={loading}
                                                >
                                                    🔬 Seleccionar Muestras
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pestaña de Muestras para Análisis */}
                    {activeTab === 'muestras' && (
                        <div className="muestras-section">
                            <div className="section-header">
                                <h2>📋 Lista de Muestras para Análisis</h2>
                                <button 
                                    className="btn-refresh"
                                    onClick={cargarMuestras}
                                    disabled={loading}
                                >
                                    {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
                                </button>
                            </div>
                            
                            <div className="muestras-table-container">
                                <table className="muestras-table">
                                    <thead>
                                        <tr>
                                            <th>Número de Muestra</th>
                                            <th>Propietario</th>
                                            <th>Lote</th>
                                            <th>Estado</th>
                                            <th>Fecha Toma</th>
                                            <th>Tipo</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {muestras.length > 0 ? (
                                            muestras.map(muestra => (
                                                <tr key={muestra.id} className={`muestra-row ${muestra.estado.toLowerCase()}`}>
                                                    <td className="numero-muestra">
                                                        <strong>{muestra.numero_muestra}</strong>
                                                        {muestra.es_segundo_muestreo && (
                                                            <span className="badge-segundo">2° Muestreo</span>
                                                        )}
                                                    </td>
                                                    <td>{muestra.propietario_nombre}</td>
                                                    <td>{muestra.lote}</td>
                                                    <td>
                                                        <span 
                                                            className="estado-badge"
                                                            style={{ backgroundColor: getEstadoColor(muestra.estado) }}
                                                        >
                                                            {getEstadoTexto(muestra.estado)}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(muestra.fecha_toma_muestra).toLocaleDateString()}</td>
                                                    <td>
                                                        {muestra.es_segundo_muestreo ? (
                                                            <span className="tipo-seguimiento">🔍 Seguimiento</span>
                                                        ) : (
                                                            <span className="tipo-inicial">🧪 Inicial</span>
                                                        )}
                                                    </td>
                                                    <td className="acciones-cell">
                                                        {muestra.estado === 'PENDIENTE' && (
                                                            <button 
                                                                className="btn-analizar"
                                                                onClick={() => abrirModal(muestra)}
                                                            >
                                                                🔬 Analizar
                                                            </button>
                                                        )}
                                                        {muestra.estado !== 'PENDIENTE' && (
                                                            <span className="ya-analizada">✅ Analizada</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="no-data">
                                                    {loading ? 'Cargando muestras...' : 'No hay muestras disponibles'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal para registrar resultado */}
                {showModal && selectedMuestra && (
                    <div className="modal-overlay" onClick={cerrarModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>🔬 Registrar Resultado de Análisis</h3>
                                <button className="close-btn" onClick={cerrarModal}>×</button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={registrarResultadoMuestra}>
                                    <div className="muestra-info-card">
                                        <h4>📋 Información de la Muestra</h4>
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <strong>Número:</strong> {selectedMuestra.numero_muestra}
                                            </div>
                                            <div className="info-item">
                                                <strong>Propietario:</strong> {selectedMuestra.propietario_nombre}
                                            </div>
                                            <div className="info-item">
                                                <strong>Lote:</strong> {selectedMuestra.lote}
                                            </div>
                                            <div className="info-item">
                                                <strong>Fecha de toma:</strong> {new Date(selectedMuestra.fecha_toma_muestra).toLocaleDateString()}
                                            </div>
                                            <div className="info-item">
                                                <strong>Tipo:</strong> {selectedMuestra.es_segundo_muestreo ? 'Segundo Muestreo' : 'Muestreo Inicial'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>🧪 Resultado del Análisis *</label>
                                        <select
                                            name="estado"
                                            value={formData.estado || ''}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Seleccionar resultado</option>
                                            <option value="APROBADA">✅ Aprobada - Sin contaminación</option>
                                            <option value="CONTAMINADA">❌ Contaminada - Rechazada</option>
                                        </select>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>📝 Resultado Detallado del Análisis</label>
                                        <textarea
                                            name="resultado_analisis"
                                            value={formData.resultado_analisis || ''}
                                            onChange={handleInputChange}
                                            rows="4"
                                            placeholder="Describa los resultados del análisis de laboratorio..."
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>📋 Observaciones</label>
                                        <textarea
                                            name="observaciones"
                                            value={formData.observaciones || ''}
                                            onChange={handleInputChange}
                                            rows="3"
                                            placeholder="Observaciones adicionales..."
                                        />
                                    </div>
                                    
                                    <div className="form-actions">
                                        <button type="button" className="btn-cancel" onClick={cerrarModal}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className="btn-submit">
                                            🔬 Registrar Resultado
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal para seleccionar muestras */}
                {showSeleccionModal && selectedLote && (
                    <div className="modal-overlay" onClick={cerrarModalSeleccion}>
                        <div className="modal-content seleccion-muestras" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>🔬 Seleccionar Muestras para Análisis</h3>
                                <button className="close-btn" onClick={cerrarModalSeleccion}>×</button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={seleccionarMuestras}>
                                    <div className="lote-info-card">
                                        <h4>📦 Información del Lote</h4>
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <strong>Número de Lote:</strong> {selectedLote.numero_lote}
                                            </div>
                                            <div className="info-item">
                                                <strong>Organización:</strong> {selectedLote.organizacion_nombre}
                                            </div>
                                            <div className="info-item">
                                                <strong>Total Quintales:</strong> {selectedLote.total_quintales} qq
                                            </div>
                                            <div className="info-item">
                                                <strong>Fecha Entrega:</strong> {new Date(selectedLote.fecha_entrega).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="propietarios-seleccion">
                                        <h4>👥 Seleccione los Propietarios para Tomar Muestras</h4>
                                        <p className="seleccion-info">
                                            Marque los propietarios de los cuales desea tomar muestras para análisis de laboratorio.
                                            Se recomienda seleccionar al menos el 20% de los propietarios o máximo 5 muestras.
                                        </p>
                                        
                                        {selectedLote.propietarios && selectedLote.propietarios.length > 0 ? (
                                            <div className="propietarios-grid">
                                                {selectedLote.propietarios.map(propietario => (
                                                    <div key={propietario.id} className="propietario-card">
                                                        <label className="propietario-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.propietarios_seleccionados?.includes(propietario.id) || false}
                                                                onChange={() => handlePropietarioChange(propietario.id)}
                                                            />
                                                            <div className="propietario-info">
                                                                <h5>{propietario.nombre_completo}</h5>
                                                                <div className="propietario-detalles">
                                                                    <span className="cedula">📋 {propietario.cedula}</span>
                                                                    <span className="quintales">📊 {propietario.quintales_entregados} qq</span>
                                                                </div>
                                                                {propietario.telefono && (
                                                                    <div className="telefono">📞 {propietario.telefono}</div>
                                                                )}
                                                                {propietario.direccion && (
                                                                    <div className="direccion">📍 {propietario.direccion}</div>
                                                                )}
                                                            </div>
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="no-propietarios">
                                                <p>⚠️ No hay propietarios registrados para este lote.</p>
                                            </div>
                                        )}

                                        <div className="seleccion-summary">
                                            <strong>
                                                Propietarios seleccionados: {formData.propietarios_seleccionados?.length || 0} de {selectedLote.propietarios?.length || 0}
                                            </strong>
                                        </div>
                                    </div>
                                    
                                    <div className="form-actions">
                                        <button type="button" className="btn-cancel" onClick={cerrarModalSeleccion}>
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="btn-submit"
                                            disabled={!formData.propietarios_seleccionados || formData.propietarios_seleccionados.length === 0}
                                        >
                                            🔬 Crear Muestras Seleccionadas
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal para registrar tarea */}
                {showTareaModal && (
                    <div className="modal-overlay" onClick={cerrarModalTarea}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>📝 Registrar Tarea</h3>
                                <button className="close-btn" onClick={cerrarModalTarea}>×</button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={crearTarea}>
                                    <div className="form-group">
                                        <label>Descripción *</label>
                                        <textarea
                                            name="descripcion"
                                            value={tareaForm.descripcion}
                                            onChange={handleTareaInputChange}
                                            rows="3"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Hora de Inicio</label>
                                        <input
                                            type="time"
                                            name="hora_inicio"
                                            value={tareaForm.hora_inicio}
                                            onChange={handleTareaInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Hora de Fin</label>
                                        <input
                                            type="time"
                                            name="hora_fin"
                                            value={tareaForm.hora_fin}
                                            onChange={handleTareaInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Insumo Utilizado *</label>
                                        <select
                                            name="insumo_utilizado"
                                            value={tareaForm.insumo_utilizado}
                                            onChange={handleTareaInputChange}
                                            required
                                        >
                                            <option value="">Seleccionar insumo</option>
                                            {insumosDisponibles.map(insumo => (
                                                <option key={insumo.id} value={insumo.id}>
                                                    {insumo.nombre} ({insumo.codigo}) - {insumo.tipo_display}
                                                </option>
                                            ))}
                                        </select>
                                        {insumosDisponibles.length === 0 && (
                                            <small style={{ color: '#6c757d', fontStyle: 'italic' }}>
                                                No hay insumos disponibles. Puede crear insumos en la sección de Insumos.
                                            </small>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>Cantidad</label>
                                        <input
                                            type="number"
                                            name="cantidad"
                                            value={tareaForm.cantidad}
                                            onChange={handleTareaInputChange}
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Tiempo de Uso (minutos)</label>
                                        <input
                                            type="number"
                                            name="tiempo_uso"
                                            value={tareaForm.tiempo_uso}
                                            onChange={handleTareaInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Peso Usado (kg)</label>
                                        <input
                                            type="number"
                                            name="peso_usado"
                                            value={tareaForm.peso_usado}
                                            onChange={handleTareaInputChange}
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn-cancel" onClick={cerrarModalTarea}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className="btn-submit">
                                            Registrar Tarea
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <p>Cargando muestras...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalisisMuestra;