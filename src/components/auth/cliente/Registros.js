import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import FormularioLote from './FormularioLote';
import SeleccionMuestras from './SeleccionMuestras';
import { getCurrentUser, isAdmin, isSecretaria, getAxiosConfig, handleAuthError } from '../../../utils/auth';
import '../../../styles/Registros.css';
import '../../../styles/insumos.css';

const Registros = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('organizaciones'); // Cambiar default a organizaciones
    const [lotes, setLotes] = useState([]);
    const [organizaciones, setOrganizaciones] = useState([]);
    const [muestras, setMuestras] = useState([]);
    const [estadisticas, setEstadisticas] = useState({});
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [selectedLote, setSelectedLote] = useState(null);
    const [selectedMuestra, setSelectedMuestra] = useState(null);
    const [formData, setFormData] = useState({});
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Nuevo estado para el rol del usuario
    const [userRole, setUserRole] = useState(null);
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [isSecretariaUser, setIsSecretariaUser] = useState(false);
    const [isEmpleadoUser, setIsEmpleadoUser] = useState(false);
    
    // Estados para el modal de segundo muestreo
    const [showSegundoMuestreoModal, setShowSegundoMuestreoModal] = useState(false);
    const [muestrasContaminadasData, setMuestrasContaminadasData] = useState([]);
    const [loteParaSegundoMuestreo, setLoteParaSegundoMuestreo] = useState(null);

    // Estados adicionales para manejo de separación
    const [showSeparacionModal, setShowSeparacionModal] = useState(false);
    const [datosParaSeparacion, setDatosParaSeparacion] = useState(null);
    const [loadingSeparacion, setLoadingSeparacion] = useState(false);

    // Nuevo estado para el modal de separación inteligente
    const [showSeparacionInteligenteModal, setShowSeparacionInteligenteModal] = useState(false);
    const [datosSeparacionInteligente, setDatosSeparacionInteligente] = useState(null);
    
    // Estados para insumos
    const [insumos, setInsumos] = useState([]);
    const [tiposInsumo, setTiposInsumo] = useState([]);
    const [unidadesMedida, setUnidadesMedida] = useState([]);
    const [estadisticasInventario, setEstadisticasInventario] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [insumoForm, setInsumoForm] = useState({
        nombre: '',
        tipo: '',
        codigo: '',
        descripcion: '',
        cantidad_disponible: '',
        cantidad_minima: '',
        unidad_medida: 'UNIDAD',
        capacidad_maxima: '',
        marca: '',
        modelo: '',
        activo: true,
        observaciones: ''
    });
    
    // Verificar autenticación y rol del usuario
    useEffect(() => {
        const verificarAcceso = async () => {
            try {
                const userData = await getCurrentUser();
                const adminCheck = await isAdmin();
                const secretariaCheck = await isSecretaria();
                const empleadoCheck = userData?.rol === 'EMPLEADO';
                
                if (userData && (adminCheck || secretariaCheck || empleadoCheck)) {
                    setIsAuthenticated(true);
                    setUserRole(userData.rol);
                    setIsAdminUser(adminCheck);
                    setIsSecretariaUser(secretariaCheck);
                    setIsEmpleadoUser(empleadoCheck);
                    
                    // Establecer la pestaña por defecto según el rol
                    if (secretariaCheck) {
                        setActiveTab('organizaciones');
                    } else if (empleadoCheck) {
                        setActiveTab('lotes'); // Empleados pueden ver lotes
                    } else if (adminCheck) {
                        setActiveTab('lotes'); // Para administradores, mantener lotes como default
                    }
                } else {
                    alert('Acceso denegado. Esta sección requiere permisos de administrador, secretaria o empleado.');
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
        // Validar que error existe y tiene la estructura esperada
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

    useEffect(() => {
        if (isAuthenticated) {
            cargarDatos();
        }
    }, [isAuthenticated]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            console.log('Cargando datos con axiosInstance');
            
            // Para secretarias, cargar organizaciones, lotes, estadísticas e insumos
            if (isSecretariaUser) {
                const [orgRes, lotesRes, statsRes, insumosRes, tiposRes, estadisticasInventarioRes] = await Promise.all([
                    axiosInstance.get('http://localhost:8000/api/users/organizaciones/'),
                    axiosInstance.get('http://localhost:8000/api/users/lotes/'),
                    axiosInstance.get('http://localhost:8000/api/users/estadisticas/'),
                    axiosInstance.get('http://localhost:8000/api/users/insumos/'),
                    axiosInstance.get('http://localhost:8000/api/users/tipos-insumos/'),
                    axiosInstance.get('http://localhost:8000/api/users/inventario/estadisticas/')
                ]);
                
                setOrganizaciones(orgRes.data);
                setLotes(lotesRes.data);
                setEstadisticas(statsRes.data);
                setInsumos(insumosRes.data);
                setEstadisticasInventario(estadisticasInventarioRes.data);
                
                // Manejar tipos de insumos para secretarias también
                if (tiposRes.data.success) {
                    setTiposInsumo(tiposRes.data.tipos_disponibles || []);
                    setUnidadesMedida(tiposRes.data.unidades_medida || []);
                } else {
                    // Usar tipos por defecto si hay error
                    setTiposInsumo([
                        { id: 'MAQUINARIA', nombre: 'Maquinaria', tipo_display: 'Maquinaria' },
                        { id: 'BALANZA', nombre: 'Balanza/Báscula', tipo_display: 'Balanza/Báscula' },
                        { id: 'CONTENEDOR', nombre: 'Contenedor/Saco/Bolsa', tipo_display: 'Contenedor/Saco/Bolsa' },
                        { id: 'HERRAMIENTA', nombre: 'Herramienta', tipo_display: 'Herramienta' },
                        { id: 'EQUIPO_MEDICION', nombre: 'Equipo de Medición', tipo_display: 'Equipo de Medición' },
                        { id: 'MATERIAL_EMPAQUE', nombre: 'Material de Empaque', tipo_display: 'Material de Empaque' },
                        { id: 'EQUIPO_TRANSPORTE', nombre: 'Equipo de Transporte', tipo_display: 'Equipo de Transporte' },
                        { id: 'OTRO', nombre: 'Otro', tipo_display: 'Otro' }
                    ]);
                    setUnidadesMedida([
                        { id: 'UNIDAD', nombre: 'Unidad' },
                        { id: 'KG', nombre: 'Kilogramos' },
                        { id: 'LIBRA', nombre: 'Libras' },
                        { id: 'METRO', nombre: 'Metros' },
                        { id: 'LITRO', nombre: 'Litros' },
                        { id: 'SACO', nombre: 'Sacos' },
                        { id: 'CAJA', nombre: 'Cajas' },
                        { id: 'PAR', nombre: 'Par' }
                    ]);
                }
            } else {
                // Para administradores y empleados, cargar todos los datos incluyendo insumos
                const [lotesRes, orgRes, muestrasRes, statsRes, insumosRes, tiposRes, estadisticasInventarioRes] = await Promise.all([
                    axiosInstance.get('http://localhost:8000/api/users/lotes/'),
                    axiosInstance.get('http://localhost:8000/api/users/organizaciones/'),
                    axiosInstance.get('http://localhost:8000/api/users/muestras/'),
                    axiosInstance.get('http://localhost:8000/api/users/estadisticas/'),
                    axiosInstance.get('http://localhost:8000/api/users/insumos/'),
                    axiosInstance.get('http://localhost:8000/api/users/tipos-insumos/'),
                    axiosInstance.get('http://localhost:8000/api/users/inventario/estadisticas/')
                ]);
                
                setLotes(lotesRes.data);
                setOrganizaciones(orgRes.data);
                setMuestras(muestrasRes.data);
                setEstadisticas(statsRes.data);
                setInsumos(insumosRes.data);
                setEstadisticasInventario(estadisticasInventarioRes.data);
                
                // Manejar tipos de insumos
                if (tiposRes.data.success) {
                    setTiposInsumo(tiposRes.data.tipos_disponibles || []);
                    setUnidadesMedida(tiposRes.data.unidades_medida || []);
                } else {
                    // Usar tipos por defecto si hay error
                    setTiposInsumo([
                        { id: 'MAQUINARIA', nombre: 'Maquinaria', tipo_display: 'Maquinaria' },
                        { id: 'BALANZA', nombre: 'Balanza/Báscula', tipo_display: 'Balanza/Báscula' },
                        { id: 'CONTENEDOR', nombre: 'Contenedor/Saco/Bolsa', tipo_display: 'Contenedor/Saco/Bolsa' },
                        { id: 'HERRAMIENTA', nombre: 'Herramienta', tipo_display: 'Herramienta' },
                        { id: 'EQUIPO_MEDICION', nombre: 'Equipo de Medición', tipo_display: 'Equipo de Medición' },
                        { id: 'MATERIAL_EMPAQUE', nombre: 'Material de Empaque', tipo_display: 'Material de Empaque' },
                        { id: 'EQUIPO_TRANSPORTE', nombre: 'Equipo de Transporte', tipo_display: 'Equipo de Transporte' },
                        { id: 'OTRO', nombre: 'Otro', tipo_display: 'Otro' }
                    ]);
                    setUnidadesMedida([
                        { id: 'UNIDAD', nombre: 'Unidad' },
                        { id: 'KG', nombre: 'Kilogramos' },
                        { id: 'LIBRA', nombre: 'Libras' },
                        { id: 'METRO', nombre: 'Metros' },
                        { id: 'LITRO', nombre: 'Litros' },
                        { id: 'SACO', nombre: 'Sacos' },
                        { id: 'CAJA', nombre: 'Cajas' },
                        { id: 'PAR', nombre: 'Par' }
                    ]);
                }
            }
            
            console.log('Datos cargados exitosamente');
        } catch (error) {
            console.error('Error al cargar datos:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al cargar los datos: ${errorMsg}`);
            }
        }
        setLoading(false);
    };

    // Funciones específicas para insumos
    const validarCodigoUnico = async (codigo) => {
        if (!codigo.trim()) return true;
        
        try {
            const axiosConfig = getAxiosConfig();
            const response = await axiosInstance.get('/users/insumos/', axiosConfig);
            const insumos = Array.isArray(response.data) ? response.data : response.data.results || [];
            
            // Verificar si el código ya existe
            const codigoExiste = insumos.some(insumo => 
                insumo.codigo.toLowerCase() === codigo.toLowerCase()
            );
            
            return !codigoExiste;
        } catch (error) {
            console.error('Error al validar código:', error);
            return true; // En caso de error, permitir continuar
        }
    };

    const handleInsumoSubmit = async (e) => {
        e.preventDefault();
        
        if (!insumoForm.nombre.trim() || !insumoForm.tipo || !insumoForm.codigo.trim()) {
            setError('Todos los campos obligatorios deben ser completados');
            return;
        }

        // Validar que el código sea único
        const codigoEsUnico = await validarCodigoUnico(insumoForm.codigo.trim());
        if (!codigoEsUnico) {
            setError(`El código "${insumoForm.codigo}" ya existe. Por favor, use un código diferente.`);
            return;
        }

        try {
            setLoading(true);
            setError('');
            setMensaje('');
            
            const axiosConfig = getAxiosConfig();
            
            const datos = {
                ...insumoForm,
                codigo: insumoForm.codigo.trim().toUpperCase(),
                nombre: insumoForm.nombre.trim(),
                cantidad_disponible: parseFloat(insumoForm.cantidad_disponible) || 0,
                cantidad_minima: parseFloat(insumoForm.cantidad_minima) || 0,
                capacidad_maxima: insumoForm.capacidad_maxima ? parseFloat(insumoForm.capacidad_maxima) : null
            };

            await axiosInstance.post('/users/insumos/', datos, axiosConfig);
            
            setMensaje(`¡Insumo "${datos.nombre}" registrado exitosamente con código "${datos.codigo}"!`);
            setInsumoForm({
                nombre: '',
                tipo: '',
                codigo: '',
                descripcion: '',
                cantidad_disponible: '',
                cantidad_minima: '',
                unidad_medida: 'UNIDAD',
                capacidad_maxima: '',
                marca: '',
                modelo: '',
                activo: true,
                observaciones: ''
            });
            
            // Recargar datos
            await cargarDatos();
            
        } catch (error) {
            console.error('Error al registrar insumo:', error);
            
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                let mensajeError = '';
                
                if (typeof errorData === 'object') {
                    const errores = [];
                    
                    Object.keys(errorData).forEach(campo => {
                        let errorCampo = '';
                        if (Array.isArray(errorData[campo])) {
                            errorCampo = errorData[campo].join(', ');
                        } else {
                            errorCampo = errorData[campo];
                        }
                        
                        if (campo === 'codigo') {
                            if (errorCampo.includes('already exists') || errorCampo.includes('ya existe')) {
                                errores.push(`El código "${insumoForm.codigo}" ya está en uso. Por favor, elija un código diferente.`);
                            } else {
                                errores.push(`Código: ${errorCampo}`);
                            }
                        } else {
                            errores.push(`${campo}: ${errorCampo}`);
                        }
                    });
                    
                    mensajeError = errores.length > 0 ? errores.join('\n') : 'Error de validación en los datos del insumo.';
                } else {
                    mensajeError = errorData;
                }
                
                setError(mensajeError);
            } else {
                const authErrorHandled = await handleAuthError(error);
                if (!authErrorHandled) {
                    setError(error.response?.data?.error || error.response?.data?.detail || 'Error al registrar insumo');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const eliminarInsumo = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este insumo?')) {
            return;
        }

        try {
            setLoading(true);
            const axiosConfig = getAxiosConfig();
            await axiosInstance.delete(`/users/insumos/${id}/`, axiosConfig);
            
            setMensaje('Insumo eliminado exitosamente');
            await cargarDatos();
            
        } catch (error) {
            console.error('Error al eliminar insumo:', error);
            setError('Error al eliminar insumo');
        } finally {
            setLoading(false);
        }
    };

    const actualizarStock = async (insumoId, nuevaCantidad, tipoMovimiento = 'AJUSTE', observaciones = '') => {
        try {
            setLoading(true);
            const axiosConfig = getAxiosConfig();
            
            const datos = {
                nueva_cantidad: parseFloat(nuevaCantidad),
                tipo_movimiento: tipoMovimiento,
                observaciones: observaciones
            };

            // URL correcta sin el prefijo /users/ duplicado
            await axiosInstance.post(`/insumos/${insumoId}/actualizar-stock/`, datos, axiosConfig);
            
            setMensaje('Stock actualizado exitosamente');
            await cargarDatos();
            
        } catch (error) {
            console.error('Error al actualizar stock:', error);
            setError(error.response?.data?.error || 'Error al actualizar stock');
        } finally {
            setLoading(false);
        }
    };

    const abrirModal = (tipo, data = null) => {
        setModalType(tipo);
        if (tipo === 'seleccionarMuestras' || tipo === 'verDetalle') {
            setSelectedLote(data);
        } else if (tipo === 'registrarResultado') {
            setSelectedMuestra(data);
        }
        setShowModal(true);
        setFormData({});
    };

    const cerrarModal = () => {
        setShowModal(false);
        setModalType('');
        setSelectedLote(null);
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

    const crearOrganizacion = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post('http://localhost:8000/api/users/organizaciones/', formData);
            alert('Organización creada exitosamente');
            cerrarModal();
            cargarDatos();
        } catch (error) {
            console.error('Error al crear organización:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al crear la organización: ${errorMsg}`);
            }
        }
    };

    const crearLoteConPropietarios = async (loteData) => {
        try {
            console.log('Enviando datos del lote:', loteData);
            await axiosInstance.post('http://localhost:8000/api/users/lotes/crear-con-propietarios/', loteData);
            alert('Lote creado exitosamente con todos los propietarios');
            cerrarModal();
            cargarDatos();
        } catch (error) {
            console.error('Error al crear lote:', error);
            console.error('Detalles completos del error:', error.response?.data);
            
            if (error.response && error.response.status === 400) {
                const errorData = error.response.data;
                console.log('Errores de validación:', errorData);
                
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
                    ? `Errores de validación:\n${errorMessages.join('\n')}`
                    : `Error de validación: ${JSON.stringify(errorData)}`;
                    
                alert(errorText);
            } else if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al crear el lote: ${errorMsg}`);
            }
        }
    };

    const seleccionarMuestras = async (datosSeleccion) => {
        try {
            console.log('Enviando datos de selección de muestras:', datosSeleccion);
            const response = await axiosInstance.post('http://localhost:8000/api/users/muestras/seleccionar/', datosSeleccion);
            console.log('Respuesta del servidor:', response.data);
            alert('Muestras seleccionadas exitosamente. El lote está ahora en proceso de análisis.');
            cerrarModal();
            cargarDatos();
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
            
            // Verificar si requiere segundo muestreo
            if (data.requiere_segundo_muestreo) {
                console.log('Se requiere segundo muestreo');
                console.log('Muestras contaminadas:', data.muestras_contaminadas);
                
                // Configurar datos para el segundo muestreo
                setMuestrasContaminadasData(data.muestras_contaminadas);
                setLoteParaSegundoMuestreo(selectedMuestra.lote);
                
                // Si hay datos de separación inteligente, mostrar ese modal primero
                if (data.separacion_requerida && data.propietarios_a_separar && data.propietarios_a_separar.length > 0) {
                    const quintalesContaminados = data.propietarios_a_separar.reduce((total, prop) => total + prop.quintales, 0);
                    const quintalesLimpios = selectedMuestra.lote_info?.total_quintales - quintalesContaminados || 0;
                    const totalQuintales = selectedMuestra.lote_info?.total_quintales || 1;
                    
                    // Validar y corregir porcentajes para evitar valores erróneos
                    let porcentajeContaminado = Math.min(100, Math.max(0, (quintalesContaminados / totalQuintales * 100)));
                    let porcentajeLimpio = Math.min(100, Math.max(0, (quintalesLimpios / totalQuintales * 100)));
                    
                    // Asegurar que los porcentajes sumen 100% o menos
                    if (porcentajeContaminado + porcentajeLimpio > 100) {
                        const factor = 100 / (porcentajeContaminado + porcentajeLimpio);
                        porcentajeContaminado *= factor;
                        porcentajeLimpio *= factor;
                    }
                    
                    setDatosSeparacionInteligente({
                        muestras_contaminadas: data.muestras_contaminadas,
                        propietarios_a_separar: data.propietarios_a_separar,
                        quintales_contaminados: quintalesContaminados,
                        quintales_limpios: quintalesLimpios,
                        total_quintales: totalQuintales,
                        numero_lote: selectedMuestra.lote_info?.numero_lote || selectedMuestra.lote,
                        // Usar los porcentajes validados y corregidos
                        porcentaje_contaminado: porcentajeContaminado.toFixed(1),
                        porcentaje_limpio: porcentajeLimpio.toFixed(1)
                    });
                    
                    // Mostrar modal de separación inteligente con timeout para asegurar que se vea
                    setTimeout(() => {
                        setShowSeparacionInteligenteModal(true);
                    }, 500);
                } else {
                    // Mostrar directamente el modal de segundo muestreo
                    setTimeout(() => {
                        setShowSegundoMuestreoModal(true);
                    }, 500);
                }
            }
            
            // Recargar datos
            cargarDatos();
        } catch (error) {
            console.error('Error al registrar resultado:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al registrar el resultado: ${errorMsg}`);
            }
        }
    };

    const cerrarModalSeparacionInteligente = () => {
        setShowSeparacionInteligenteModal(false);
        setDatosSeparacionInteligente(null);
    };

    const procederConSegundoMuestreo = () => {
        setShowSeparacionInteligenteModal(false);
        setShowSegundoMuestreoModal(true);
    };

    const confirmarSegundoMuestreo = async () => {
        try {
            const muestrasContaminadasIds = muestrasContaminadasData.map(m => m.id);
            await crearSegundoMuestreo(loteParaSegundoMuestreo, muestrasContaminadasIds);
            setShowSegundoMuestreoModal(false);
        } catch (error) {
            console.error('Error al confirmar segundo muestreo:', error);
        }
    };

    const cancelarSegundoMuestreo = () => {
        setShowSegundoMuestreoModal(false);
        setMuestrasContaminadasData([]);
        setLoteParaSegundoMuestreo(null);
    };

    const crearSegundoMuestreo = async (loteId, muestrasContaminadasIds) => {
        try {
            const response = await axiosInstance.post(
                'http://localhost:8000/api/users/muestras/segundo-muestreo/',
                {
                    lote_id: loteId,
                    muestras_contaminadas: muestrasContaminadasIds
                }
            );
            
            alert(`${response.data.mensaje}\nAhora debe analizar las nuevas muestras de seguimiento.`);
            cargarDatos();
        } catch (error) {
            console.error('Error al crear segundo muestreo:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al crear segundo muestreo: ${errorMsg}`);
            }
        }
    };

    const generarReporteSeparacion = async (loteId) => {
        try {
            setLoadingSeparacion(true);
            const response = await axiosInstance.get(`http://localhost:8000/api/users/lotes/${loteId}/reporte-separacion/`);
            
            setDatosParaSeparacion(response.data);
            setShowSeparacionModal(true);
        } catch (error) {
            console.error('Error al generar reporte de separación:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
                alert(`Error al generar el reporte de separación: ${errorMsg}`);
            }
        } finally {
            setLoadingSeparacion(false);
        }
    };

    const cerrarModalSeparacion = () => {
        setShowSeparacionModal(false);
        setDatosParaSeparacion(null);
    };

    const enviarParteLimpiaALimpieza = async (loteId) => {
        try {
            const response = await axiosInstance.post(
                `http://localhost:8000/api/users/lotes/${loteId}/enviar-parte-limpia-limpieza/`,
                {}
            );
            
            const data = response.data;
            console.log('Respuesta del servidor:', data);
            
            // Verificar si la respuesta tiene la estructura esperada
            if (data && data.detalles) {
                const mensaje = `
✅ SEPARACIÓN EXITOSA Y ENVIADO A LIMPIEZA

${data.mensaje || 'Proceso completado exitosamente'}

📊 DETALLES DE LA SEPARACIÓN:
• Quintales enviados a limpieza: ${data.detalles.quintales_enviados_limpieza || 'N/A'} qq
• Quintales separados (contaminados): ${data.detalles.quintales_separados || 'N/A'} qq
• Propietarios aprobados: ${data.detalles.propietarios_aprobados || 'N/A'}
• Porcentaje salvado: ${data.detalles.porcentaje_salvado || 'N/A'}%

👥 PROPIETARIOS INCLUIDOS EN LIMPIEZA:
${data.detalles.propietarios_incluidos ? data.detalles.propietarios_incluidos.map(p => `• ${p.nombre} (${p.cedula}): ${p.quintales} qq`).join('\n') : 'Información no disponible'}

💰 BENEFICIO: Se salvó el ${data.detalles.porcentaje_salvado || 'N/A'}% del lote gracias a la separación inteligente.
                `;
                alert(mensaje);
            } else {
                // Si no tiene la estructura esperada, mostrar mensaje básico
                alert(data.mensaje || 'Lote enviado a limpieza exitosamente');
            }
            
            cargarDatos();
            
        } catch (error) {
            console.error('Error al enviar parte limpia a limpieza:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.error || error.response?.data?.mensaje || error.message;
                alert(`Error al enviar a limpieza: ${errorMsg}`);
            }
        }
    };

    const procesarLimpieza = async (e) => {
        e.preventDefault();
        try {
            const response = await axiosInstance.post(
                `http://localhost:8000/api/users/lotes/${selectedLote.id}/procesar-limpieza/`,
                formData
            );
            
            const data = response.data;
            console.log('Respuesta del procesamiento de limpieza:', data);
            
            // Mostrar mensaje de éxito
            alert(`✅ LIMPIEZA PROCESADA EXITOSAMENTE\n\n${data.mensaje}\n\nDetalles:\n• Peso antes: ${data.detalles_proceso?.peso_antes_limpieza || 'N/A'} kg\n• Impurezas removidas: ${data.detalles_proceso?.peso_impurezas_removidas || 'N/A'} kg\n• Peso después: ${data.detalles_proceso?.peso_despues_limpieza || 'N/A'} kg\n• Porcentaje de impurezas: ${data.detalles_proceso?.porcentaje_impurezas || 'N/A'}%`);
            
            cerrarModal();
            cargarDatos();
            
        } catch (error) {
            console.error('Error al procesar limpieza:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.error || error.response?.data?.mensaje || error.message;
                alert(`Error al procesar limpieza: ${errorMsg}`);
            }
        }
    };

    const procesarSeparacionColores = async (e) => {
        e.preventDefault();
        try {
            // Construir el objeto de clasificación por colores
            const clasificacion_colores = {};
            ['verde', 'amarillo', 'rojo', 'negro', 'mixto'].forEach(color => {
                const peso = formData[`color_${color}_peso`];
                const porcentaje = formData[`color_${color}_porcentaje`];
                if (peso || porcentaje) {
                    clasificacion_colores[color] = {
                        peso: peso || 0,
                        porcentaje: porcentaje || 0
                    };
                }
            });

            const datosEnvio = {
                lote_id: selectedLote.id,
                responsable_separacion: formData.responsable_separacion,
                fecha_separacion: formData.fecha_separacion,
                calidad_general: formData.calidad_general,
                duracion_proceso: formData.duracion_proceso || 0,
                observaciones_separacion: formData.observaciones_separacion || '',
                clasificacion_colores: clasificacion_colores
            };

            const response = await axiosInstance.post(
                `http://localhost:8000/api/users/lotes/procesar-separacion-colores/`,
                datosEnvio
            );
            
            const data = response.data;
            console.log('Respuesta del procesamiento de separación:', data);
            
            alert(`✅ SEPARACIÓN POR COLORES COMPLETADA\n\n${data.mensaje}\n\nEl lote está ahora listo para recepción final.`);
            
            cerrarModal();
            cargarDatos();
            
        } catch (error) {
            console.error('Error al procesar separación por colores:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.error || error.response?.data?.mensaje || error.message;
                alert(`Error al procesar separación por colores: ${errorMsg}`);
            }
        }
    };

    const procesarRecepcionFinal = async (e) => {
        e.preventDefault();
        try {
            const datosEnvio = {
                lote_id: selectedLote.id,
                responsable_recepcion: formData.responsable_recepcion,
                fecha_recepcion_final: formData.fecha_recepcion_final,
                calificacion_final: formData.calificacion_final,
                observaciones_finales: formData.observaciones_finales || ''
            };

            const response = await axiosInstance.post(
                `http://localhost:8000/api/users/lotes/enviar-recepcion-final/`,
                datosEnvio
            );
            
            const data = response.data;
            console.log('Respuesta de recepción final:', data);
            
            alert(`✅ RECEPCIÓN FINAL COMPLETADA\n\n${data.mensaje}\n\nEl lote está ahora FINALIZADO y listo para comercialización.`);
            
            cerrarModal();
            cargarDatos();
            
        } catch (error) {
            console.error('Error al procesar recepción final:', error);
            if (!handleAuthError(error)) {
                const errorMsg = error.response?.data?.error || error.response?.data?.mensaje || error.message;
                alert(`Error al procesar recepción final: ${errorMsg}`);
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
            
            <div className="registros-container">
                <BottomNavigator />
                
                <div className="registros-header">
                    <h1>Sistema de Gestión de Muestras de Café</h1>
                    <p>FAPECAFES - Control de Calidad {isSecretariaUser ? '(Gestión de Organizaciones)' : ''}</p>
                </div>

                {/* Estadísticas - Solo mostrar las relevantes según el rol */}
                <div className="estadisticas-grid">
                    {isAdminUser && (
                        <>
                            <div className="stat-card">
                                <h3>Total Lotes</h3>
                                <span className="stat-number">{estadisticas?.lotes?.total || 0}</span>
                            </div>
                            <div className="stat-card">
                                <h3>En Proceso</h3>
                                <span className="stat-number">{estadisticas?.lotes?.en_proceso || 0}</span>
                            </div>
                            <div className="stat-card">
                                <h3>Aprobados</h3>
                                <span className="stat-number">{estadisticas?.lotes?.aprobados || 0}</span>
                            </div>
                            <div className="stat-card">
                                <h3>Muestras</h3>
                                <span className="stat-number">{estadisticas?.muestras?.total || 0}</span>
                            </div>
                        </>
                    )}
                    {isSecretariaUser && (
                        <>
                            <div className="stat-card">
                                <h3>Total Organizaciones</h3>
                                <span className="stat-number">{organizaciones?.length || 0}</span>
                            </div>
                            <div className="stat-card">
                                <h3>Cooperativas</h3>
                                <span className="stat-number">{organizaciones?.filter(org => org.tipo === 'Cooperativa')?.length || 0}</span>
                            </div>
                            <div className="stat-card">
                                <h3>Asociaciones</h3>
                                <span className="stat-number">{organizaciones?.filter(org => org.tipo === 'Asociación')?.length || 0}</span>
                            </div>
                            <div className="stat-card">
                                <h3>Otros</h3>
                                <span className="stat-number">{organizaciones?.filter(org => !['Cooperativa', 'Asociación'].includes(org.tipo))?.length || 0}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Navegación por pestañas - Condicional según el rol */}
                <div className="tabs-container">
                    {(isAdminUser || isEmpleadoUser || isSecretariaUser) && (
                        <button 
                            className={`tab-button ${activeTab === 'lotes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('lotes')}
                        >
                            Lotes de Café
                        </button>
                    )}
                    <button 
                        className={`tab-button ${activeTab === 'organizaciones' ? 'active' : ''}`}
                        onClick={() => setActiveTab('organizaciones')}
                    >
                        Organizaciones
                    </button>
                    {/* Nueva pestaña de Insumos para administradores, empleados y secretarias */}
                    {(isAdminUser || isEmpleadoUser || isSecretariaUser) && (
                        <button 
                            className={`tab-button ${activeTab === 'insumos' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('insumos');
                                setMensaje('');
                                setError('');
                            }}
                        >
                            <i className="fas fa-boxes"></i>
                            Insumos
                        </button>
                    )}
                </div>

                {/* Contenido de pestañas */}
                <div className="tab-content">
                    {/* Lotes - Para administradores y empleados */}
                    {activeTab === 'lotes' && (isAdminUser || isEmpleadoUser || isSecretariaUser) && (
                        <div className="lotes-section">
                            <div className="section-header">
                                <h2>Lotes de Café</h2>
                                {(isAdminUser || isSecretariaUser) && (
                                    <button 
                                        className="btn-primary"
                                        onClick={() => abrirModal('nuevoLote')}
                                    >
                                        Nuevo Lote
                                    </button>
                                )}
                            </div>
                            
                            <div className="lotes-grid">
                                {lotes.map(lote => (
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
                                            <p><strong>Muestras:</strong> {lote.total_muestras || 0}</p>
                                            <p><strong>Fecha:</strong> {new Date(lote.fecha_entrega).toLocaleDateString()}</p>

                                        </div>
                                        <div className="lote-actions">
                                            {lote.estado === 'PENDIENTE' && !isSecretariaUser && (
                                                <button 
                                                    className="btn-secondary"
                                                    onClick={() => abrirModal('seleccionarMuestras', lote)}
                                                >
                                                    Seleccionar Muestras
                                                </button>
                                            )}
                                            {/* Botón de "Enviar Parte Limpia a Limpieza" ocultado */}
                                            {/* {(lote.estado === 'SEPARACION_PENDIENTE' || lote.estado === 'SEPARACION_APLICADA') && !isSecretariaUser && (
                                                <button 
                                                    className="btn-primary"
                                                    onClick={() => enviarParteLimpiaALimpieza(lote.id)}
                                                    style={{ backgroundColor: '#28a745' }}
                                                >
                                                    🧼 Enviar Parte Limpia a Limpieza
                                                </button>
                                            )} */}
                                            {lote.estado === 'APROBADO' && !isSecretariaUser && (
                                                <button 
                                                    className="btn-primary"
                                                    onClick={() => abrirModal('procesarLimpieza', lote)}
                                                    style={{ backgroundColor: '#007bff' }}
                                                >
                                                    🧽 Procesar Limpieza
                                                </button>
                                            )}
                                            <button 
                                                className="btn-outline"
                                                onClick={() => abrirModal('verDetalle', lote)}
                                            >
                                                Ver Detalle
                                            </button>
                                            {!isSecretariaUser && (
                                                <button 
                                                    className="btn-outline"
                                                    onClick={() => generarReporteSeparacion(lote.id)}
                                                >
                                                    Generar Reporte de Separación
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Organizaciones - Para ambos roles */}
                    {activeTab === 'organizaciones' && (
                        <div className="organizaciones-section">
                            <div className="section-header">
                                <h2>Organizaciones</h2>
                                <button 
                                    className="btn-primary"
                                    onClick={() => abrirModal('nuevaOrganizacion')}
                                >
                                    Nueva Organización
                                </button>
                            </div>
                            
                            <div className="organizaciones-grid">
                                {organizaciones.map(org => (
                                    <div key={org.id} className="org-card">
                                        <h3>{org.nombre}</h3>
                                        <p><strong>Tipo:</strong> {org.tipo || 'N/A'}</p>
                                        <p><strong>RUC:</strong> {org.ruc || 'N/A'}</p>
                                        <p><strong>Mail:</strong> {org.mail || 'N/A'}</p>
                                        <p><strong>Teléfono:</strong> {org.telefono || 'N/A'}</p>
                                        <p><strong>Registrada:</strong> {new Date(org.fecha_creacion).toLocaleDateString()}</p>
                                        {isSecretariaUser && (
                                            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '6px', fontSize: '0.85rem', color: '#155724' }}>
                                                <strong>📋 Acceso Secretaria:</strong> Gestión completa de organizaciones
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Nueva pestaña de Insumos - Para administradores, empleados y secretarias */}
                    {activeTab === 'insumos' && (isAdminUser || isEmpleadoUser || isSecretariaUser) && (
                        <div className="insumos-section">
                            <div className="insumos-header">
                                <h2>Gestión de Inventario e Insumos</h2>
                                <p>Administre el inventario de insumos, materiales y maquinaria de la empresa</p>
                            </div>

                            {mensaje && (
                                <div className="alert alert-success">
                                    <i className="fas fa-check-circle"></i>
                                    {mensaje}
                                </div>
                            )}

                            {error && (
                                <div className="alert alert-error">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    {error}
                                </div>
                            )}

                            {/* Formulario para agregar nuevo insumo */}
                            <div className="insumo-form-container">
                                <h3>Agregar Nuevo Insumo</h3>
                                <form onSubmit={handleInsumoSubmit} className="insumo-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Nombre *</label>
                                            <input
                                                type="text"
                                                value={insumoForm.nombre}
                                                onChange={(e) => setInsumoForm(prev => ({...prev, nombre: e.target.value}))}
                                                placeholder="Nombre del insumo"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Código *</label>
                                            <input
                                                type="text"
                                                value={insumoForm.codigo}
                                                onChange={(e) => setInsumoForm(prev => ({...prev, codigo: e.target.value}))}
                                                placeholder="Código único"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Tipo *</label>
                                            <select
                                                value={insumoForm.tipo}
                                                onChange={(e) => setInsumoForm(prev => ({...prev, tipo: e.target.value}))}
                                                required
                                            >
                                                <option value="">Seleccionar tipo</option>
                                                {Array.isArray(tiposInsumo) && tiposInsumo.map(tipo => (
                                                    <option key={tipo.id} value={tipo.id}>
                                                        {tipo.tipo_display}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Unidad de Medida *</label>
                                            <select
                                                value={insumoForm.unidad_medida}
                                                onChange={(e) => setInsumoForm(prev => ({...prev, unidad_medida: e.target.value}))}
                                                required
                                            >
                                                {Array.isArray(unidadesMedida) && unidadesMedida.map(unidad => (
                                                    <option key={unidad.id} value={unidad.id}>
                                                        {unidad.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Cantidad Disponible *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={insumoForm.cantidad_disponible}
                                                onChange={(e) => setInsumoForm(prev => ({...prev, cantidad_disponible: e.target.value}))}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Cantidad Mínima</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={insumoForm.cantidad_minima}
                                                onChange={(e) => setInsumoForm(prev => ({...prev, cantidad_minima: e.target.value}))}
                                                placeholder="0.00"
                                            />
                                            <small>Para alertas de stock bajo</small>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Marca</label>
                                            <input
                                                type="text"
                                                value={insumoForm.marca}
                                                onChange={(e) => setInsumoForm(prev => ({...prev, marca: e.target.value}))}
                                                placeholder="Marca del insumo"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Modelo</label>
                                            <input
                                                type="text"
                                                value={insumoForm.modelo}
                                                onChange={(e) => setInsumoForm(prev => ({...prev, modelo: e.target.value}))}
                                                placeholder="Modelo del insumo"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Capacidad Máxima</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={insumoForm.capacidad_maxima}
                                                onChange={(e) => setInsumoForm(prev => ({...prev, capacidad_maxima: e.target.value}))}
                                                placeholder="Para maquinaria/equipos"
                                            />
                                            <small>Solo para maquinaria o equipos con capacidad</small>
                                        </div>
                                        <div className="form-group">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={insumoForm.activo}
                                                    onChange={(e) => setInsumoForm(prev => ({...prev, activo: e.target.checked}))}
                                                />
                                                Insumo activo
                                            </label>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Descripción</label>
                                        <textarea
                                            value={insumoForm.descripcion}
                                            onChange={(e) => setInsumoForm(prev => ({...prev, descripcion: e.target.value}))}
                                            placeholder="Descripción detallada del insumo..."
                                            rows="3"
                                        ></textarea>
                                    </div>

                                    <div className="form-group">
                                        <label>Observaciones</label>
                                        <textarea
                                            value={insumoForm.observaciones}
                                            onChange={(e) => setInsumoForm(prev => ({...prev, observaciones: e.target.value}))}
                                            placeholder="Observaciones adicionales..."
                                            rows="2"
                                        ></textarea>
                                    </div>

                                    <div className="form-actions">
                                        <button type="submit" className="btn-primary" disabled={loading}>
                                            {loading ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                    Guardando...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-plus"></i>
                                                    Agregar Insumo
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Lista de insumos registrados */}
                            <div className="insumos-lista">
                                <h3>Insumos Registrados</h3>
                                {insumos.length === 0 ? (
                                    <div className="no-data">
                                        <i className="fas fa-boxes"></i>
                                        <p>No hay insumos registrados</p>
                                        <small>Agregue insumos usando el formulario arriba</small>
                                    </div>
                                ) : (
                                    <div className="insumos-grid">
                                        {Array.isArray(insumos) && insumos.map(insumo => (
                                            <div key={insumo.id} className={`insumo-card ${!insumo.activo ? 'inactiva' : ''} ${insumo.estado_inventario === 'AGOTADO' ? 'agotado' : insumo.estado_inventario === 'BAJO' ? 'bajo-stock' : ''}`}>
                                                <div className="insumo-header">
                                                    <h4>{insumo.nombre}</h4>
                                                    <div className="badges">
                                                        <span className={`estado-badge ${insumo.activo ? 'activa' : 'inactiva'}`}>
                                                            {insumo.activo ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                        <span className={`stock-badge ${insumo.estado_inventario?.toLowerCase()}`}>
                                                            {insumo.estado_inventario === 'NORMAL' ? 'Stock Normal' : 
                                                             insumo.estado_inventario === 'BAJO' ? 'Stock Bajo' : 'Agotado'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="insumo-info">
                                                    <p><strong>Código:</strong> {insumo.codigo}</p>
                                                    <p><strong>Tipo:</strong> {insumo.tipo_display}</p>
                                                    <p><strong>Stock:</strong> {insumo.cantidad_disponible} {insumo.unidad_medida_display}</p>
                                                    <p><strong>Mínimo:</strong> {insumo.cantidad_minima} {insumo.unidad_medida_display}</p>
                                                    {insumo.marca && <p><strong>Marca:</strong> {insumo.marca}</p>}
                                                    {insumo.modelo && <p><strong>Modelo:</strong> {insumo.modelo}</p>}
                                                    {insumo.capacidad_maxima && <p><strong>Capacidad:</strong> {insumo.capacidad_maxima}</p>}
                                                    <p><strong>Registrado:</strong> {new Date(insumo.fecha_creacion).toLocaleDateString()}</p>
                                                </div>
                                                <div className="insumo-actions">
                                                    <button 
                                                        className="btn-secondary-small"
                                                        onClick={() => {
                                                            const nuevaCantidad = prompt('Nueva cantidad:', insumo.cantidad_disponible);
                                                            if (nuevaCantidad !== null && !isNaN(nuevaCantidad)) {
                                                                actualizarStock(insumo.id, nuevaCantidad);
                                                            }
                                                        }}
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                        Actualizar Stock
                                                    </button>
                                                    <button 
                                                        className="btn-danger-small"
                                                        onClick={() => eliminarInsumo(insumo.id)}
                                                        disabled={loading}
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Estadísticas de inventario */}
                            {estadisticasInventario && (
                                <div className="inventario-estadisticas">
                                    <h3>Estadísticas de Inventario</h3>
                                    
                                    <div className="stats-overview">
                                        <div className="stat-card">
                                            <div className="stat-icon">
                                                <i className="fas fa-boxes"></i>
                                            </div>
                                            <div className="stat-info">
                                                <h4>Total Insumos</h4>
                                                <span className="stat-number">{estadisticasInventario.estadisticas_generales?.total_insumos || 0}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="stat-card normal">
                                            <div className="stat-icon">
                                                <i className="fas fa-check-circle"></i>
                                            </div>
                                            <div className="stat-info">
                                                <h4>Stock Normal</h4>
                                                <span className="stat-number">{estadisticasInventario.estadisticas_generales?.insumos_normal || 0}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="stat-card warning">
                                            <div className="stat-icon">
                                                <i className="fas fa-exclamation-triangle"></i>
                                            </div>
                                            <div className="stat-info">
                                                <h4>Stock Bajo</h4>
                                                <span className="stat-number">{estadisticasInventario.estadisticas_generales?.insumos_bajo_stock || 0}</span>
                                                <small>{estadisticasInventario.estadisticas_generales?.porcentaje_bajo_stock || 0}%</small>
                                            </div>
                                        </div>
                                        
                                        <div className="stat-card danger">
                                            <div className="stat-icon">
                                                <i className="fas fa-times-circle"></i>
                                            </div>
                                            <div className="stat-info">
                                                <h4>Agotados</h4>
                                                <span className="stat-number">{estadisticasInventario.estadisticas_generales?.insumos_agotados || 0}</span>
                                                <small>{estadisticasInventario.estadisticas_generales?.porcentaje_agotados || 0}%</small>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Insumos críticos */}
                                    {estadisticasInventario.insumos_criticos?.length > 0 && (
                                        <div className="critical-items">
                                            <h4>⚠️ Insumos Críticos (Agotados)</h4>
                                            <div className="critical-list">
                                                {estadisticasInventario.insumos_criticos.map(insumo => (
                                                    <div key={insumo.id} className="critical-item">
                                                        <strong>{insumo.nombre}</strong> ({insumo.codigo}) - {insumo.tipo}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Insumos con stock bajo */}
                                    {estadisticasInventario.insumos_bajo_stock?.length > 0 && (
                                        <div className="low-stock-items">
                                            <h4>⚠️ Insumos con Stock Bajo</h4>
                                            <div className="low-stock-list">
                                                {estadisticasInventario.insumos_bajo_stock.map(insumo => (
                                                    <div key={insumo.id} className="low-stock-item">
                                                        <strong>{insumo.nombre}</strong> ({insumo.codigo}) - 
                                                        Stock: {insumo.cantidad_disponible} / Mínimo: {insumo.cantidad_minima}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal - Solo mostrar modales permitidos según el rol */}
                {showModal && (
                    <div className="modal-overlay" onClick={cerrarModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>
                                    {modalType === 'nuevaOrganizacion' && 'Nueva Organización'}
                                    {modalType === 'nuevoLote' && isAdminUser && 'Nuevo Lote con Propietarios'}
                                    {modalType === 'seleccionarMuestras' && isAdminUser && 'Seleccionar Muestras'}
                                    {modalType === 'registrarResultado' && isAdminUser && 'Registrar Resultado de Análisis'}
                                    {modalType === 'verDetalle' && isAdminUser && 'Detalle del Lote'}
                                    {modalType === 'procesarLimpieza' && isAdminUser && 'Procesar Limpieza'}
                                    {modalType === 'separacionColores' && isAdminUser && 'Separación por Colores'}
                                    {modalType === 'recepcionFinal' && isAdminUser && 'Recepción Final'}
                                </h3>
                                <button className="close-btn" onClick={cerrarModal}>×</button>
                            </div>
                            <div className="modal-body">
                                {/* Modal de Nueva Organización - Disponible para ambos roles */}
                                {modalType === 'nuevaOrganizacion' && (
                                    <form onSubmit={crearOrganizacion}>
                                        <div className="form-group">
                                            <label>Nombre de la Organización</label>
                                            <input
                                                type="text"
                                                name="nombre"
                                                value={formData.nombre || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Tipo de Organización</label>
                                            <select
                                                name="tipo"
                                                value={formData.tipo || ''}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Seleccione un tipo</option>
                                                <option value="Cooperativa">Cooperativa</option>
                                                <option value="Asociación">Asociación</option>
                                                <option value="Empresa">Empresa</option>
                                                <option value="Productor Individual">Productor Individual</option>
                                                <option value="Otro">Otro</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>RUC</label>
                                            <input
                                                type="text"
                                                name="ruc"
                                                value={formData.ruc || ''}
                                                onChange={handleInputChange}
                                                placeholder="Ej: 0123456789001"
                                                maxLength="13"
                                                title="RUC de la organización (hasta 13 dígitos)"
                                            />
                                        </div>
                                        
                                        {/* Sección de Información de Contacto */}
                                        <div className="form-section">
                                            <h4>Información de Contacto</h4>
                                            <div className="form-group">
                                                <label>Mail</label>
                                                <input
                                                    type="email"
                                                    name="mail"
                                                    value={formData.mail || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="correo@ejemplo.com"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Teléfono</label>
                                                <input
                                                    type="text"
                                                    name="telefono"
                                                    value={formData.telefono || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="Ej: 07-2123456"
                                                />
                                            </div>
                                        </div>

                                        {/* Sección de Ubicación */}
                                        <div className="form-section">
                                            <h4>Ubicación</h4>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Provincia</label>
                                                    <select
                                                        name="provincia"
                                                        value={formData.provincia || ''}
                                                        onChange={handleInputChange}
                                                    >
                                                        <option value="">Seleccione una provincia</option>
                                                        <option value="Azuay">Azuay</option>
                                                        <option value="Bolívar">Bolívar</option>
                                                        <option value="Cañar">Cañar</option>
                                                        <option value="Carchi">Carchi</option>
                                                        <option value="Chimborazo">Chimborazo</option>
                                                        <option value="Cotopaxi">Cotopaxi</option>
                                                        <option value="El Oro">El Oro</option>
                                                        <option value="Esmeraldas">Esmeraldas</option>
                                                        <option value="Galápagos">Galápagos</option>
                                                        <option value="Guayas">Guayas</option>
                                                        <option value="Imbabura">Imbabura</option>
                                                        <option value="Loja">Loja</option>
                                                        <option value="Los Ríos">Los Ríos</option>
                                                        <option value="Manabí">Manabí</option>
                                                        <option value="Morona Santiago">Morona Santiago</option>
                                                        <option value="Napo">Napo</option>
                                                        <option value="Orellana">Orellana</option>
                                                        <option value="Pastaza">Pastaza</option>
                                                        <option value="Pichincha">Pichincha</option>
                                                        <option value="Santa Elena">Santa Elena</option>
                                                        <option value="Santo Domingo de los Tsáchilas">Santo Domingo de los Tsáchilas</option>
                                                        <option value="Sucumbíos">Sucumbíos</option>
                                                        <option value="Tungurahua">Tungurahua</option>
                                                        <option value="Zamora Chinchipe">Zamora Chinchipe</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Cantón</label>
                                                    <input
                                                        type="text"
                                                        name="canton"
                                                        value={formData.canton || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Ej: Loja, Quito, Cuenca"
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Ciudad</label>
                                                    <input
                                                        type="text"
                                                        name="ciudad"
                                                        value={formData.ciudad || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Ej: Loja, Quito, Cuenca"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Plus Code (Google Maps)</label>
                                                    <input
                                                        type="text"
                                                        name="plus_code"
                                                        value={formData.plus_code || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Ej: XQCV+56Q Loja"
                                                        title="Código Plus de Google Maps para ubicación exacta"
                                                    />
                                                    <small style={{ color: '#666', fontSize: '0.8rem' }}>
                                                        💡 Obtén el Plus Code desde Google Maps compartiendo la ubicación
                                                    </small>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-actions">
                                            <button type="button" onClick={cerrarModal}>Cancelar</button>
                                            <button type="submit" className="btn-primary">Crear</button>
                                        </div>
                                    </form>
                                )}

                                {/* Otros modales para administradores y secretarias */}
                                {(isAdminUser || isSecretariaUser) && (
                                    <>
                                        {modalType === 'nuevoLote' && (
                                            <FormularioLote 
                                                organizaciones={organizaciones}
                                                onSubmit={crearLoteConPropietarios}
                                                onCancel={cerrarModal}
                                            />
                                        )}
                                    </>
                                )}

                                {/* Otros modales solo para administradores */}
                                {isAdminUser && (
                                    <>
                                        {modalType === 'seleccionarMuestras' && selectedLote && (
                                            <SeleccionMuestras 
                                                lote={selectedLote}
                                                onSubmit={seleccionarMuestras}
                                                onCancel={cerrarModal}
                                            />
                                        )}

                                        {modalType === 'registrarResultado' && selectedMuestra && (
                                            <form onSubmit={registrarResultadoMuestra}>
                                                <div className="muestra-info">
                                                    <h4>Muestra: {selectedMuestra.numero_muestra}</h4>
                                                    <p><strong>Propietario:</strong> {selectedMuestra.propietario_nombre}</p>
                                                    <p><strong>Fecha de toma:</strong> {new Date(selectedMuestra.fecha_toma_muestra).toLocaleDateString()}</p>
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Resultado del Análisis *</label>
                                                    <select
                                                        name="estado"
                                                        value={formData.estado || ''}
                                                        onChange={handleInputChange}
                                                        required
                                                    >
                                                        <option value="">Seleccionar resultado</option>
                                                        <option value="APROBADA">Aprobada - Sin contaminación</option>
                                                        <option value="CONTAMINADA">Contaminada - Rechazada</option>
                                                    </select>
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Resultado Detallado del Análisis</label>
                                                    <textarea
                                                        name="resultado_analisis"
                                                        value={formData.resultado_analisis || ''}
                                                        onChange={handleInputChange}
                                                        rows="4"
                                                        placeholder="Describa los resultados del análisis de laboratorio..."
                                                    />
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Observaciones</label>
                                                    <textarea
                                                        name="observaciones"
                                                        value={formData.observaciones || ''}
                                                        onChange={handleInputChange}
                                                        rows="3"
                                                        placeholder="Observaciones adicionales..."
                                                    />
                                                </div>
                                                
                                                <div className="form-actions">
                                                    <button type="button" onClick={cerrarModal}>Cancelar</button>
                                                    <button type="submit" className="btn-primary">Registrar Resultado</button>
                                                </div>
                                            </form>
                                        )}

                                        {modalType === 'verDetalle' && selectedLote && (
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

                                                {/* Sección de Información de Peso */}
                                                <div className="detalle-section">
                                                    <h4>Información de Peso</h4>
                                                    <div className="peso-info">
                                                        <div className="peso-grid">
                                                            <div className="peso-item">
                                                                <span className="peso-label">Peso Inicial:</span>
                                                                <span className="peso-valor">
                                                                    {selectedLote.peso_total_inicial ? `${selectedLote.peso_total_inicial} kg` : 'No registrado'}
                                                                </span>
                                                            </div>
                                                            <div className="peso-item">
                                                                <span className="peso-label">Peso Final:</span>
                                                                <span className="peso-valor">
                                                                    {selectedLote.peso_total_final ? `${selectedLote.peso_total_final} kg` : 'Proceso en curso'}
                                                                </span>
                                                            </div>
                                                            {selectedLote.diferencia_peso && (
                                                                <div className="peso-item">
                                                                    <span className="peso-label">Diferencia:</span>
                                                                    <span className="peso-valor diferencia">
                                                                        {selectedLote.diferencia_peso} kg
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {selectedLote.porcentaje_perdida && (
                                                                <div className="peso-item">
                                                                    <span className="peso-label">% Pérdida:</span>
                                                                    <span className="peso-valor porcentaje">
                                                                        {selectedLote.porcentaje_perdida.toFixed(2)}%
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {selectedLote.observaciones_peso && (
                                                            <div className="observaciones-peso">
                                                                <strong>Observaciones del Peso:</strong>
                                                                <p>{selectedLote.observaciones_peso}</p>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Botón para registrar peso final */}
                                                        {!selectedLote.peso_total_final && selectedLote.estado === 'FINALIZADO' && (
                                                            <button 
                                                                className="btn-primary"
                                                                onClick={() => abrirModal('registrarPesoFinal', selectedLote)}
                                                                style={{ marginTop: '15px' }}
                                                            >
                                                                📏 Registrar Peso Final
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {selectedLote.propietarios && selectedLote.propietarios.length > 0 && (
                                                    <div className="detalle-section">
                                                        <h4>Propietarios ({selectedLote.propietarios.length})</h4>
                                                        <div className="propietarios-detalle">
                                                            {selectedLote.propietarios.map(prop => (
                                                                <div key={prop.id} className="propietario-detalle-item">
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

                                                {selectedLote.muestras && selectedLote.muestras.length > 0 && (
                                                    <div className="detalle-section">
                                                        <h4>Muestras ({selectedLote.muestras.length})</h4>
                                                        <div className="muestras-detalle">
                                                            {selectedLote.muestras.map(muestra => (
                                                                <div key={muestra.id} className="muestra-detalle-item">
                                                                    <h6>{muestra.numero_muestra}</h6>
                                                                    <p><strong>Propietario:</strong> {muestra.propietario_nombre}</p>
                                                                    <p><strong>Estado:</strong> 
                                                                        <span 
                                                                            className="estado-badge small ml-1"
                                                                            style={{ backgroundColor: getEstadoColor(muestra.estado) }}
                                                                        >
                                                                            {getEstadoTexto(muestra.estado)}
                                                                        </span>
                                                                    </p>
                                                                    <p><strong>Fecha toma:</strong> {new Date(muestra.fecha_toma_muestra).toLocaleDateString()}</p>
                                                                    {muestra.resultado_analisis && (
                                                                        <p><strong>Resultado:</strong> {muestra.resultado_analisis}</p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {modalType === 'procesarLimpieza' && selectedLote && (
                                            <form onSubmit={procesarLimpieza}>
                                                <div className="lote-info">
                                                    <h4>Procesar Limpieza - Lote: {selectedLote.numero_lote}</h4>
                                                    <p><strong>Estado actual:</strong> {getEstadoTexto(selectedLote.estado)}</p>
                                                    <p><strong>Peso actual:</strong> {selectedLote.peso_total_final || selectedLote.peso_total_inicial} kg</p>
                                                </div>
                                                
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Peso de Impurezas Removidas (kg) *</label>
                                                        <input
                                                            type="number"
                                                            name="peso_impurezas"
                                                            value={formData.peso_impurezas || ''}
                                                            onChange={handleInputChange}
                                                            step="0.1"
                                                            min="0"
                                                            required
                                                            placeholder="Ej: 5.2"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Tipo de Limpieza *</label>
                                                        <select
                                                            name="tipo_limpieza"
                                                            value={formData.tipo_limpieza || ''}
                                                            onChange={handleInputChange}
                                                            required
                                                        >
                                                            <option value="">Seleccionar tipo</option>
                                                            <option value="MANUAL">Limpieza Manual</option>
                                                            <option value="MECANICA">Limpieza Mecánica</option>
                                                            <option value="COMBINADA">Limpieza Combinada</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Responsable de Limpieza *</label>
                                                        <input
                                                            type="text"
                                                            name="responsable_limpieza"
                                                            value={formData.responsable_limpieza || ''}
                                                            onChange={handleInputChange}
                                                            required
                                                            placeholder="Nombre del responsable"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Duración del Proceso (minutos)</label>
                                                        <input
                                                            type="number"
                                                            name="duracion_limpieza"
                                                            value={formData.duracion_limpieza || ''}
                                                            onChange={handleInputChange}
                                                            min="1"
                                                            placeholder="Ej: 120"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Impurezas Encontradas</label>
                                                    <input
                                                        type="text"
                                                        name="impurezas_encontradas"
                                                        value={formData.impurezas_encontradas || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Ej: Piedras, palos, hojas"
                                                    />
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Observaciones del Proceso</label>
                                                    <textarea
                                                        name="observaciones_limpieza"
                                                        value={formData.observaciones_limpieza || ''}
                                                        onChange={handleInputChange}
                                                        rows="3"
                                                        placeholder="Observaciones adicionales sobre el proceso de limpieza..."
                                                    />
                                                </div>
                                                
                                                <div className="form-actions">
                                                    <button type="button" onClick={cerrarModal}>Cancelar</button>
                                                    <button type="submit" className="btn-primary">🧽 Procesar Limpieza</button>
                                                </div>
                                            </form>
                                        )}

                                        {modalType === 'separacionColores' && selectedLote && (
                                            <form onSubmit={procesarSeparacionColores}>
                                                <div className="lote-info">
                                                    <h4>Separación por Colores - Lote: {selectedLote.numero_lote}</h4>
                                                    <p><strong>Estado actual:</strong> {getEstadoTexto(selectedLote.estado)}</p>
                                                    <p><strong>Peso después de limpieza:</strong> {selectedLote.peso_total_final} kg</p>
                                                </div>
                                                
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Responsable de Separación *</label>
                                                        <input
                                                            type="text"
                                                            name="responsable_separacion"
                                                            value={formData.responsable_separacion || ''}
                                                            onChange={handleInputChange}
                                                            required
                                                            placeholder="Nombre del responsable"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Fecha de Separación *</label>
                                                        <input
                                                            type="datetime-local"
                                                            name="fecha_separacion"
                                                            value={formData.fecha_separacion || ''}
                                                            onChange={handleInputChange}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Calidad General *</label>
                                                        <select
                                                            name="calidad_general"
                                                            value={formData.calidad_general || ''}
                                                            onChange={handleInputChange}
                                                            required
                                                        >
                                                            <option value="">Seleccionar calidad</option>
                                                            <option value="EXCELENTE">Excelente</option>
                                                            <option value="BUENA">Buena</option>
                                                            <option value="REGULAR">Regular</option>
                                                            <option value="BAJA">Baja</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Duración del Proceso (minutos)</label>
                                                        <input
                                                            type="number"
                                                            name="duracion_proceso"
                                                            value={formData.duracion_proceso || ''}
                                                            onChange={handleInputChange}
                                                            min="1"
                                                            placeholder="Ej: 180"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="clasificacion-colores">
                                                    <h4>Clasificación por Colores</h4>
                                                    <div className="colores-grid">
                                                        {['Verde', 'Amarillo', 'Rojo', 'Negro', 'Mixto'].map(color => (
                                                            <div key={color} className="color-item">
                                                                <label>{color}</label>
                                                                <input
                                                                    type="number"
                                                                    name={`color_${color.toLowerCase()}_peso`}
                                                                    value={formData[`color_${color.toLowerCase()}_peso`] || ''}
                                                                    onChange={handleInputChange}
                                                                    step="0.1"
                                                                    min="0"
                                                                    placeholder="Peso (kg)"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    name={`color_${color.toLowerCase()}_porcentaje`}
                                                                    value={formData[`color_${color.toLowerCase()}_porcentaje`] || ''}
                                                                    onChange={handleInputChange}
                                                                    step="0.1"
                                                                    min="0"
                                                                    max="100"
                                                                    placeholder="% del total"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Observaciones de Separación</label>
                                                    <textarea
                                                        name="observaciones_separacion"
                                                        value={formData.observaciones_separacion || ''}
                                                        onChange={handleInputChange}
                                                        rows="3"
                                                        placeholder="Observaciones sobre la separación por colores..."
                                                    />
                                                </div>
                                                
                                                <div className="form-actions">
                                                    <button type="button" onClick={cerrarModal}>Cancelar</button>
                                                    <button type="submit" className="btn-primary">🎨 Procesar Separación</button>
                                                </div>
                                            </form>
                                        )}

                                        {modalType === 'recepcionFinal' && selectedLote && (
                                            <form onSubmit={procesarRecepcionFinal}>
                                                <div className="lote-info">
                                                    <h4>Recepción Final - Lote: {selectedLote.numero_lote}</h4>
                                                    <p><strong>Estado actual:</strong> {getEstadoTexto(selectedLote.estado)}</p>
                                                    <p><strong>Peso final:</strong> {selectedLote.peso_total_final} kg</p>
                                                </div>
                                                
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Responsable de Recepción *</label>
                                                        <input
                                                            type="text"
                                                            name="responsable_recepcion"
                                                            value={formData.responsable_recepcion || ''}
                                                            onChange={handleInputChange}
                                                            required
                                                            placeholder="Nombre del responsable"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Fecha de Recepción Final *</label>
                                                        <input
                                                            type="datetime-local"
                                                            name="fecha_recepcion_final"
                                                            value={formData.fecha_recepcion_final || ''}
                                                            onChange={handleInputChange}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Calificación Final *</label>
                                                    <select
                                                        name="calificacion_final"
                                                        value={formData.calificacion_final || ''}
                                                        onChange={handleInputChange}
                                                        required
                                                    >
                                                        <option value="">Seleccionar calificación</option>
                                                        <option value="A">A - Excelente</option>
                                                        <option value="B">B - Buena</option>
                                                        <option value="C">C - Regular</option>
                                                        <option value="D">D - Baja</option>
                                                    </select>
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Observaciones Finales</label>
                                                    <textarea
                                                        name="observaciones_finales"
                                                        value={formData.observaciones_finales || ''}
                                                        onChange={handleInputChange}
                                                        rows="4"
                                                        placeholder="Observaciones finales del proceso completo..."
                                                    />
                                                </div>
                                                
                                                <div className="form-actions">
                                                    <button type="button" onClick={cerrarModal}>Cancelar</button>
                                                    <button type="submit" className="btn-primary">✅ Finalizar Recepción</button>
                                                </div>
                                            </form>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Segundo Muestreo */}
                {showSegundoMuestreoModal && (
                    <div className="modal-overlay">
                        <div className="modal-content segundo-muestreo-modal">
                            <div className="modal-header">
                                <h3>⚠️ Segundo Muestreo Requerido</h3>
                                <button className="close-btn" onClick={cancelarSegundoMuestreo}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="segundo-muestreo-info">
                                    <p className="mensaje-importante">
                                        Se ha detectado contaminación en algunas muestras del lote. 
                                        Se requiere un segundo muestreo para confirmar los resultados antes de tomar decisiones finales.
                                    </p>
                                    
                                    <div className="muestras-contaminadas-lista">
                                        <h4>Muestras que requieren segundo análisis:</h4>
                                        {muestrasContaminadasData.map(muestra => (
                                            <div key={muestra.id} className="muestra-contaminada-item">
                                                <span className="numero-muestra">{muestra.numero_muestra}</span>
                                                <span className="propietario">{muestra.propietario__nombre_completo}</span>
                                                <span className="estado-badge contaminada">Contaminada</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="beneficios-segundo-muestreo">
                                        <h4>✅ Beneficios del segundo muestreo:</h4>
                                        <ul>
                                            <li>Confirma si la contaminación es real o un falso positivo</li>
                                            <li>Permite recuperar propietarios que pueden estar limpios</li>
                                            <li>Evita pérdidas innecesarias del lote</li>
                                            <li>Proporciona mayor certeza en las decisiones</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div className="form-actions">
                                    <button 
                                        type="button" 
                                        onClick={cancelarSegundoMuestreo}
                                        className="btn-secondary"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={confirmarSegundoMuestreo}
                                        className="btn-primary"
                                    >
                                        🔬 Crear Segundo Muestreo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Separación Inteligente */}
                {showSeparacionInteligenteModal && datosSeparacionInteligente && (
                    <div className="modal-overlay">
                        <div className="modal-content separacion-inteligente-modal">
                            <div className="modal-header">
                                <h3>🧠 Análisis de Separación Inteligente</h3>
                                <button className="close-btn" onClick={cerrarModalSeparacionInteligente}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="separacion-info">
                                    <div className="lote-summary">
                                        <h4>Resumen del Lote: {datosSeparacionInteligente.numero_lote}</h4>
                                        <div className="estadisticas-separacion">
                                            <div className="stat-item">
                                                <span className="stat-label">Total del Lote:</span>
                                                <span className="stat-value">{datosSeparacionInteligente.total_quintales} qq</span>
                                            </div>
                                            <div className="stat-item contaminado">
                                                <span className="stat-label">Quintales Contaminados:</span>
                                                <span className="stat-value">{datosSeparacionInteligente.quintales_contaminados} qq ({datosSeparacionInteligente.porcentaje_contaminado}%)</span>
                                            </div>
                                            <div className="stat-item limpio">
                                                <span className="stat-label">Quintales Limpios:</span>
                                                <span className="stat-value">{datosSeparacionInteligente.quintales_limpios} qq ({datosSeparacionInteligente.porcentaje_limpio}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="opciones-decision">
                                        <h4>💡 Opciones Disponibles:</h4>
                                        <div className="opcion-card recomendada">
                                            <div className="opcion-header">
                                                <h5>🔬 Opción Recomendada: Segundo Muestreo</h5>
                                                <span className="tag-recomendada">Recomendada</span>
                                            </div>
                                            <p>
                                                Realizar un segundo análisis para verificar si la contaminación es real. 
                                                Si resulta ser un falso positivo, esto puede recuperar hasta {datosSeparacionInteligente.quintales_contaminados} quintales 
                                                ({datosSeparacionInteligente.porcentaje_contaminado}% del lote total).
                                            </p>
                                            <div className="beneficios">
                                                <strong>Beneficios potenciales:</strong>
                                                <ul>
                                                    <li>Posibilidad de recuperar {datosSeparacionInteligente.quintales_contaminados} qq</li>
                                                    <li>Mayor certeza en la decisión final</li>
                                                    <li>Minimiza pérdidas económicas</li>
                                                </ul>
                                            </div>
                                        </div>
                                        
                                        <div className="opcion-card alternativa">
                                            <div className="opcion-header">
                                                <h5>⚡ Separación Inmediata</h5>
                                                <span className="tag-alternativa">Alternativa</span>
                                            </div>
                                            <p>
                                                Separar inmediatamente los quintales contaminados y proceder con la parte limpia. 
                                                Conserva {datosSeparacionInteligente.quintales_limpios} qq ({datosSeparacionInteligente.porcentaje_limpio}%) del lote.
                                            </p>
                                        </div>
                                        
                                        <div className="propietarios-afectados">
                                            <h4>👥 Propietarios Afectados por Contaminación:</h4>
                                            <div className="propietarios-lista">
                                                {datosSeparacionInteligente.propietarios_a_separar.map(prop => (
                                                    <div key={prop.id} className="propietario-afectado">
                                                        <span className="nombre">{prop.nombre}</span>
                                                        <span className="quintales">{prop.quintales} qq</span>
                                                        <span className="cedula">({prop.cedula})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="form-actions">
                                    <button 
                                        type="button" 
                                        onClick={cerrarModalSeparacionInteligente}
                                        className="btn-secondary"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={procederConSegundoMuestreo}
                                        className="btn-primary recomendado"
                                    >
                                        🔬 Proceder con Segundo Muestreo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Reporte de Separación */}
                {showSeparacionModal && datosParaSeparacion && (
                    <div className="modal-overlay">
                        <div className="modal-content reporte-separacion-modal">
                            <div className="modal-header">
                                <h3>📊 Reporte de Separación de Quintales</h3>
                                <button className="close-btn" onClick={cerrarModalSeparacion}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="reporte-content">
                                    <div className="lote-info-header">
                                        <h4>Lote: {datosParaSeparacion.lote.numero_lote}</h4>
                                        <span 
                                            className="estado-badge"
                                            style={{ backgroundColor: getEstadoColor(datosParaSeparacion.lote.estado) }}
                                        >
                                            {getEstadoTexto(datosParaSeparacion.lote.estado)}
                                        </span>
                                    </div>
                                    
                                    <div className="totales-resumen">
                                        <div className="total-item aprobados">
                                            <span className="total-label">Quintales Aprobados:</span>
                                            <span className="total-value">{datosParaSeparacion.totales.quintales_aprobados} qq</span>
                                        </div>
                                        <div className="total-item contaminados">
                                            <span className="total-label">Quintales Contaminados:</span>
                                            <span className="total-value">{datosParaSeparacion.totales.quintales_contaminados} qq</span>
                                        </div>
                                        <div className="total-item pendientes">
                                            <span className="total-label">Quintales Pendientes:</span>
                                            <span className="total-value">{datosParaSeparacion.totales.quintales_pendientes} qq</span>
                                        </div>
                                        <div className="total-item total">
                                            <span className="total-label">Total del Lote:</span>
                                            <span className="total-value">{datosParaSeparacion.totales.total_lote} qq</span>
                                        </div>
                                    </div>
                                    
                                    <div className="recomendacion-section">
                                        <h4>💡 Recomendación del Sistema:</h4>
                                        <div className={`recomendacion-card ${datosParaSeparacion.recomendacion.tipo.toLowerCase()}`}>
                                            <strong>{datosParaSeparacion.recomendacion.tipo.replace('_', ' ')}:</strong>
                                            <p>{datosParaSeparacion.recomendacion.mensaje}</p>
                                        </div>
                                    </div>
                                    
                                    {datosParaSeparacion.propietarios_aprobados.length > 0 && (
                                        <div className="propietarios-section aprobados">
                                            <h4>✅ Propietarios Aprobados ({datosParaSeparacion.propietarios_aprobados.length})</h4>
                                            <div className="propietarios-grid">
                                                {datosParaSeparacion.propietarios_aprobados.map((item, index) => (
                                                    <div key={index} className="propietario-card aprobado">
                                                        <h6>{item.propietario.nombre_completo}</h6>
                                                        <p>Quintales: {item.propietario.quintales_entregados} qq</p>
                                                        <p>Estado: {item.estado_muestra}</p>
                                                        <p>Acción: {item.accion}</p>
                                                        {item.observaciones && <p><em>{item.observaciones}</em></p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {datosParaSeparacion.propietarios_contaminados.length > 0 && (
                                        <div className="propietarios-section contaminados">
                                            <h4>❌ Propietarios Contaminados ({datosParaSeparacion.propietarios_contaminados.length})</h4>
                                            <div className="propietarios-grid">
                                                {datosParaSeparacion.propietarios_contaminados.map((item, index) => (
                                                    <div key={index} className="propietario-card contaminado">
                                                        <h6>{item.propietario.nombre_completo}</h6>
                                                        <p>Quintales: {item.propietario.quintales_entregados} qq</p>
                                                        <p>Estado: {item.estado_muestra}</p>
                                                        <p>Acción: {item.accion}</p>
                                                        {item.observaciones && <p><em>{item.observaciones}</em></p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {datosParaSeparacion.propietarios_sin_analizar.length > 0 && (
                                        <div className="propietarios-section pendientes">
                                            <h4>⏳ Propietarios Pendientes de Análisis ({datosParaSeparacion.propietarios_sin_analizar.length})</h4>
                                            <div className="propietarios-grid">
                                                {datosParaSeparacion.propietarios_sin_analizar.map((item, index) => (
                                                    <div key={index} className="propietario-card pendiente">
                                                        <h6>{item.propietario.nombre_completo}</h6>
                                                        <p>Quintales: {item.propietario.quintales_entregados} qq</p>
                                                        <p>Estado: {item.estado_muestra}</p>
                                                        <p>Acción: {item.accion}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="form-actions">
                                    <button 
                                        type="button" 
                                        onClick={cerrarModalSeparacion}
                                        className="btn-secondary"
                                    >
                                        Cerrar
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => window.print()}
                                        className="btn-outline"
                                    >
                                        🖨️ Imprimir Reporte
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner">Cargando...</div>
                    </div>
                )}

                {/* Loading Separación */}
                {loadingSeparacion && (
                    <div className="loading-overlay">
                        <div className="loading-spinner">Generando reporte de separación...</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Registros;