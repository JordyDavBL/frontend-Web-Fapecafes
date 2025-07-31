import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { getAxiosConfig, handleAuthError, checkLimpiezaAuth } from '../../../utils/auth';
import '../../../styles/insumos.css';

const Insumos = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('registros'); // 'registros', 'insumos', 'nuevo-registro', 'inventario'
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Estados para insumos (anteriormente maquinaria)
    const [insumos, setInsumos] = useState([]);
    const [tiposInsumo, setTiposInsumo] = useState([]);
    const [unidadesMedida, setUnidadesMedida] = useState([]);
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

    // Estados para registros de uso de maquinaria
    const [registrosUso, setRegistrosUso] = useState([]);
    const [lotesDisponibles, setLotesDisponibles] = useState([]);
    const [registroForm, setRegistroForm] = useState({
        trabajador_nombre: '',
        maquinaria: '',
        tipo_maquinaria: '',
        lote: '',
        hora_inicio: '',
        hora_fin: '',
        peso_total_descargado: '',
        observaciones: ''
    });

    // Estados para filtros
    const [filtros, setFiltros] = useState({
        fecha_desde: '',
        fecha_hasta: '',
        maquinaria: '',
        lote: ''
    });

    // Estados para estadísticas de inventario
    const [estadisticasInventario, setEstadisticasInventario] = useState(null);

    // Verificar autenticación
    useEffect(() => {
        const verificarAcceso = async () => {
            const tieneAcceso = await checkLimpiezaAuth(navigate);
            if (tieneAcceso) {
                setIsAuthenticated(true);
            }
        };
        
        verificarAcceso();
    }, [navigate]);

    // Cargar datos iniciales
    useEffect(() => {
        if (isAuthenticated) {
            cargarDatos();
        }
    }, [isAuthenticated]);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            await Promise.all([
                cargarInsumos(),
                cargarTiposInsumo(),
                cargarRegistrosUso(),
                cargarLotesDisponibles(),
                cargarEstadisticasInventario()
            ]);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setCargando(false);
        }
    };

    const cargarInsumos = async () => {
        try {
            const axiosConfig = getAxiosConfig();
            const response = await axiosInstance.get('/insumos/', axiosConfig);
            setInsumos(response.data);
        } catch (error) {
            console.error('Error al cargar insumos:', error);
            const authErrorHandled = await handleAuthError(error, navigate);
            if (!authErrorHandled) {
                setError('Error al cargar insumos');
            }
        }
    };

    const cargarTiposInsumo = async () => {
        try {
            const axiosConfig = getAxiosConfig();
            const response = await axiosInstance.get('/tipos-insumos/', axiosConfig);
            
            if (response.data.success) {
                setTiposInsumo(response.data.tipos_disponibles || []);
                setUnidadesMedida(response.data.unidades_medida || []);
            } else {
                console.warn('Error en la respuesta de tipos de insumos:', response.data);
                // Usar tipos por defecto
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
        } catch (error) {
            console.error('Error al cargar tipos de insumo:', error);
            // En caso de error, usar tipos por defecto
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
    };

    const cargarRegistrosUso = async () => {
        try {
            const axiosConfig = getAxiosConfig();
            let url = '/uso-maquinaria/';
            
            // Agregar filtros si existen
            const params = new URLSearchParams();
            if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
            if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
            if (filtros.maquinaria) params.append('maquinaria', filtros.maquinaria);
            if (filtros.lote) params.append('lote', filtros.lote);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await axiosInstance.get(url, axiosConfig);
            setRegistrosUso(response.data);
        } catch (error) {
            console.error('Error al cargar registros de uso:', error);
            const authErrorHandled = await handleAuthError(error, navigate);
            if (!authErrorHandled) {
                setError('Error al cargar registros de uso');
            }
        }
    };

    const cargarLotesDisponibles = async () => {
        try {
            const axiosConfig = getAxiosConfig();
            const response = await axiosInstance.get('/lotes-disponibles-descarga/', axiosConfig);
            
            // Manejar tanto formato de array directo como objeto con results
            if (Array.isArray(response.data)) {
                setLotesDisponibles(response.data);
            } else if (response.data && Array.isArray(response.data.results)) {
                setLotesDisponibles(response.data.results);
            } else if (response.data && response.data.count !== undefined) {
                // Si tiene count pero no results, usar array vacío
                setLotesDisponibles(response.data.results || []);
            } else {
                console.warn('La respuesta de lotes disponibles no tiene el formato esperado:', response.data);
                setLotesDisponibles([]);
            }
        } catch (error) {
            console.error('Error al cargar lotes disponibles:', error);
            setLotesDisponibles([]);
        }
    };

    const cargarEstadisticasInventario = async () => {
        try {
            const axiosConfig = getAxiosConfig();
            const response = await axiosInstance.get('/inventario/estadisticas/', axiosConfig);
            setEstadisticasInventario(response.data);
        } catch (error) {
            console.error('Error al cargar estadísticas de inventario:', error);
        }
    };

    const validarCodigoUnico = async (codigo) => {
        if (!codigo.trim()) return true;
        
        try {
            const axiosConfig = getAxiosConfig();
            const response = await axiosInstance.get('/insumos/', axiosConfig);
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
            setCargando(true);
            setError(''); // Limpiar errores previos
            setMensaje(''); // Limpiar mensajes previos
            
            const axiosConfig = getAxiosConfig();
            
            const datos = {
                ...insumoForm,
                codigo: insumoForm.codigo.trim().toUpperCase(), // Normalizar código
                nombre: insumoForm.nombre.trim(),
                cantidad_disponible: parseFloat(insumoForm.cantidad_disponible) || 0,
                cantidad_minima: parseFloat(insumoForm.cantidad_minima) || 0,
                capacidad_maxima: insumoForm.capacidad_maxima ? parseFloat(insumoForm.capacidad_maxima) : null
            };

            console.log('Datos del insumo a enviar:', datos);

            await axiosInstance.post('/insumos/', datos, axiosConfig);
            
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
            
            // Recargar insumos
            await cargarInsumos();
            await cargarEstadisticasInventario();
            
        } catch (error) {
            console.error('Error al registrar insumo:', error);
            
            // Manejar diferentes tipos de errores
            if (error.response?.status === 400) {
                // Error de validación
                const errorData = error.response.data;
                console.error('Detalles del error 400:', errorData);
                
                let mensajeError = '';
                
                if (typeof errorData === 'object') {
                    // Manejar errores específicos de campos
                    const errores = [];
                    
                    Object.keys(errorData).forEach(campo => {
                        let errorCampo = '';
                        if (Array.isArray(errorData[campo])) {
                            errorCampo = errorData[campo].join(', ');
                        } else {
                            errorCampo = errorData[campo];
                        }
                        
                        // Traducir mensajes de error específicos
                        if (campo === 'codigo') {
                            if (errorCampo.includes('already exists') || errorCampo.includes('ya existe')) {
                                errores.push(`El código "${insumoForm.codigo}" ya está en uso. Por favor, elija un código diferente.`);
                            } else {
                                errores.push(`Código: ${errorCampo}`);
                            }
                        } else if (campo === 'nombre') {
                            errores.push(`Nombre: ${errorCampo}`);
                        } else if (campo === 'tipo') {
                            errores.push(`Tipo: ${errorCampo}`);
                        } else if (campo === 'unidad_medida') {
                            errores.push(`Unidad de medida: ${errorCampo}`);
                        } else {
                            errores.push(`${campo}: ${errorCampo}`);
                        }
                    });
                    
                    mensajeError = errores.length > 0 ? errores.join('\n') : 'Error de validación en los datos del insumo.';
                } else if (typeof errorData === 'string') {
                    mensajeError = errorData;
                } else {
                    mensajeError = 'Datos inválidos. Verifique que todos los campos estén correctos.';
                }
                
                setError(mensajeError);
            } else {
                const authErrorHandled = await handleAuthError(error, navigate);
                if (!authErrorHandled) {
                    setError(error.response?.data?.error || error.response?.data?.detail || 'Error al registrar insumo');
                }
            }
        } finally {
            setCargando(false);
        }
    };

    const handleRegistroUsoSubmit = async (e) => {
        e.preventDefault();
        
        if (!registroForm.trabajador_nombre.trim() || !registroForm.lote || 
            !registroForm.hora_inicio || !registroForm.hora_fin) {
            setError('Todos los campos obligatorios deben ser completados');
            return;
        }

        if (!registroForm.maquinaria && !registroForm.tipo_maquinaria) {
            setError('Debe seleccionar un insumo específico o especificar el tipo');
            return;
        }

        try {
            setCargando(true);
            const axiosConfig = getAxiosConfig();
            
            const datos = {
                ...registroForm,
                peso_total_descargado: parseFloat(registroForm.peso_total_descargado) || 0,
                maquinaria: registroForm.maquinaria || null,
                tipo_maquinaria: registroForm.tipo_maquinaria || null
            };

            await axiosInstance.post('/uso-maquinaria/', datos, axiosConfig);
            
            setMensaje('Registro de uso de insumo guardado exitosamente');
            setRegistroForm({
                trabajador_nombre: '',
                maquinaria: '',
                tipo_maquinaria: '',
                lote: '',
                hora_inicio: '',
                hora_fin: '',
                peso_total_descargado: '',
                observaciones: ''
            });
            
            // Recargar registros
            await cargarRegistrosUso();
            
        } catch (error) {
            console.error('Error al registrar uso de insumo:', error);
            const authErrorHandled = await handleAuthError(error, navigate);
            if (!authErrorHandled) {
                setError(error.response?.data?.error || error.response?.data?.detail || 'Error al registrar uso de insumo');
            }
        } finally {
            setCargando(false);
        }
    };

    const aplicarFiltros = () => {
        cargarRegistrosUso();
    };

    const limpiarFiltros = () => {
        setFiltros({
            fecha_desde: '',
            fecha_hasta: '',
            maquinaria: '',
            lote: ''
        });
        // Recargar sin filtros
        setTimeout(() => {
            cargarRegistrosUso();
        }, 100);
    };

    const calcularTiempoUso = (horaInicio, horaFin) => {
        if (!horaInicio || !horaFin) return '';
        
        const inicio = new Date(horaInicio);
        const fin = new Date(horaFin);
        const diferencia = fin - inicio;
        const minutos = Math.floor(diferencia / (1000 * 60));
        
        return minutos > 0 ? `${minutos} min` : '';
    };

    const eliminarInsumo = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este insumo?')) {
            return;
        }

        try {
            setCargando(true);
            const axiosConfig = getAxiosConfig();
            await axiosInstance.delete(`/insumos/${id}/`, axiosConfig);
            
            setMensaje('Insumo eliminado exitosamente');
            await cargarInsumos();
            await cargarEstadisticasInventario();
            
        } catch (error) {
            console.error('Error al eliminar insumo:', error);
            setError('Error al eliminar insumo');
        } finally {
            setCargando(false);
        }
    };

    const actualizarStock = async (insumoId, nuevaCantidad, tipoMovimiento = 'AJUSTE', observaciones = '') => {
        try {
            setCargando(true);
            const axiosConfig = getAxiosConfig();
            
            const datos = {
                nueva_cantidad: parseFloat(nuevaCantidad),
                tipo_movimiento: tipoMovimiento,
                observaciones: observaciones
            };

            await axiosInstance.post(`/insumos/${insumoId}/actualizar-stock/`, datos, axiosConfig);
            
            setMensaje('Stock actualizado exitosamente');
            await cargarInsumos();
            await cargarEstadisticasInventario();
            
        } catch (error) {
            console.error('Error al actualizar stock:', error);
            setError(error.response?.data?.error || 'Error al actualizar stock');
        } finally {
            setCargando(false);
        }
    };

    if (!isAuthenticated) {
        return <div className="loading">Verificando acceso...</div>;
    }

    return (
        <div className="app-container">
            <Sidebar />
            
            <div className="insumos-container">
                <BottomNavigator />
                
                <div className="insumos-content">
                    <div className="header-insumos">
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

                    {/* Botones de navegación superior */}
                    <div className="top-navigation-buttons">
                        <button 
                            className={`nav-btn ${activeTab === 'registros' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('registros');
                                setMensaje('');
                                setError('');
                            }}
                        >
                            <i className="fas fa-clipboard-list"></i>
                            Registros de Uso
                        </button>
                        <button 
                            className={`nav-btn ${activeTab === 'nuevo-registro' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('nuevo-registro');
                                setMensaje('');
                                setError('');
                            }}
                        >
                            <i className="fas fa-plus"></i>
                            Nuevo Registro
                        </button>
                        <button 
                            className={`nav-btn ${activeTab === 'insumos' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('insumos');
                                setMensaje('');
                                setError('');
                            }}
                        >
                            <i className="fas fa-boxes"></i>
                            Insumos
                        </button>
                        <button 
                            className={`nav-btn ${activeTab === 'inventario' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('inventario');
                                setMensaje('');
                                setError('');
                                cargarEstadisticasInventario();
                            }}
                        >
                            <i className="fas fa-chart-bar"></i>
                            Estadísticas
                        </button>
                    </div>

                    {/* Contenido basado en el tab activo */}
                    {/* Tab de registros de uso */}
                    {activeTab === 'registros' && (
                        <div className="registros-tab">
                            <div className="filtros-container">
                                <h3>Filtros de Búsqueda</h3>
                                <div className="filtros-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Fecha Desde</label>
                                            <input
                                                type="date"
                                                value={filtros.fecha_desde}
                                                onChange={(e) => setFiltros(prev => ({...prev, fecha_desde: e.target.value}))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Fecha Hasta</label>
                                            <input
                                                type="date"
                                                value={filtros.fecha_hasta}
                                                onChange={(e) => setFiltros(prev => ({...prev, fecha_hasta: e.target.value}))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Insumo/Maquinaria</label>
                                            <select
                                                value={filtros.maquinaria}
                                                onChange={(e) => setFiltros(prev => ({...prev, maquinaria: e.target.value}))}
                                            >
                                                <option value="">Todos los insumos</option>
                                                {Array.isArray(insumos) && insumos.map(insumo => (
                                                    <option key={insumo.id} value={insumo.id}>
                                                        {insumo.nombre} ({insumo.codigo})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Lote</label>
                                            <select
                                                value={filtros.lote}
                                                onChange={(e) => setFiltros(prev => ({...prev, lote: e.target.value}))}
                                            >
                                                <option value="">Todos los lotes</option>
                                                {Array.isArray(lotesDisponibles) && lotesDisponibles.map(lote => (
                                                    <option key={lote.id} value={lote.id}>
                                                        {lote.numero_lote}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="filtros-actions">
                                        <button className="btn-primary" onClick={aplicarFiltros}>
                                            <i className="fas fa-search"></i>
                                            Aplicar Filtros
                                        </button>
                                        <button className="btn-secondary" onClick={limpiarFiltros}>
                                            <i className="fas fa-times"></i>
                                            Limpiar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="registros-lista">
                                <h3>Registros de Uso de Insumos/Maquinaria</h3>
                                {cargando ? (
                                    <div className="loading">
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Cargando registros...
                                    </div>
                                ) : registrosUso.length === 0 ? (
                                    <div className="no-data">
                                        <i className="fas fa-clipboard"></i>
                                        <p>No hay registros de uso de insumos</p>
                                        <small>Los registros aparecerán aquí cuando se creen</small>
                                    </div>
                                ) : (
                                    <div className="registros-table">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Fecha/Hora</th>
                                                    <th>Trabajador</th>
                                                    <th>Insumo/Maquinaria</th>
                                                    <th>Lote</th>
                                                    <th>Tiempo de Uso</th>
                                                    <th>Peso Descargado</th>
                                                    <th>Supervisor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.isArray(registrosUso) && registrosUso.map(registro => (
                                                    <tr key={registro.id}>
                                                        <td>
                                                            <div className="fecha-info">
                                                                <div>{new Date(registro.fecha_registro).toLocaleDateString()}</div>
                                                                <small>
                                                                    {new Date(registro.hora_inicio).toLocaleTimeString()} - 
                                                                    {new Date(registro.hora_fin).toLocaleTimeString()}
                                                                </small>
                                                            </div>
                                                        </td>
                                                        <td>{registro.trabajador_nombre}</td>
                                                        <td>
                                                            <div className="insumo-info">
                                                                <div>
                                                                    {registro.insumo_nombre || registro.tipo_maquinaria_display}
                                                                </div>
                                                                {registro.insumo_codigo && (
                                                                    <small>Código: {registro.insumo_codigo}</small>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>{registro.lote_numero}</td>
                                                        <td>
                                                            <span className="tiempo-uso">
                                                                {registro.tiempo_uso_minutos} min
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="peso-descargado">
                                                                {registro.peso_total_descargado} kg
                                                            </span>
                                                        </td>
                                                        <td>{registro.empleado_nombre}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab de nuevo registro de uso */}
                    {activeTab === 'nuevo-registro' && (
                        <div className="nuevo-registro-tab">
                            <h3>Registrar Uso de Insumo/Maquinaria</h3>
                            <form onSubmit={handleRegistroUsoSubmit} className="registro-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Nombre del Trabajador *</label>
                                        <input
                                            type="text"
                                            value={registroForm.trabajador_nombre}
                                            onChange={(e) => setRegistroForm(prev => ({...prev, trabajador_nombre: e.target.value}))}
                                            placeholder="Nombre completo del trabajador"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Lote *</label>
                                        <select
                                            value={registroForm.lote}
                                            onChange={(e) => setRegistroForm(prev => ({...prev, lote: e.target.value}))}
                                            required
                                        >
                                            <option value="">Seleccionar lote</option>
                                            {Array.isArray(lotesDisponibles) && lotesDisponibles.map(lote => (
                                                <option key={lote.id} value={lote.id}>
                                                    {lote.numero_lote} - {lote.organizacion_nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Insumo/Maquinaria Específica</label>
                                        <select
                                            value={registroForm.maquinaria}
                                            onChange={(e) => {
                                                setRegistroForm(prev => ({
                                                    ...prev, 
                                                    maquinaria: e.target.value,
                                                    tipo_maquinaria: e.target.value ? '' : prev.tipo_maquinaria
                                                }));
                                            }}
                                        >
                                            <option value="">Seleccionar insumo específico</option>
                                            {Array.isArray(insumos) && insumos.filter(insumo => insumo.activo).map(insumo => (
                                                <option key={insumo.id} value={insumo.id}>
                                                    {insumo.nombre} ({insumo.codigo}) - {insumo.tipo_display}
                                                </option>
                                            ))}
                                        </select>
                                        <small>O especifique el tipo general abajo</small>
                                    </div>
                                    <div className="form-group">
                                        <label>Tipo de Maquinaria (General)</label>
                                        <select
                                            value={registroForm.tipo_maquinaria}
                                            onChange={(e) => {
                                                setRegistroForm(prev => ({
                                                    ...prev, 
                                                    tipo_maquinaria: e.target.value,
                                                    maquinaria: e.target.value ? '' : prev.maquinaria
                                                }));
                                            }}
                                            disabled={!!registroForm.maquinaria}
                                        >
                                            <option value="">Seleccionar tipo</option>
                                            <option value="MONTACARGAS">Montacargas</option>
                                            <option value="GRUA">Grúa</option>
                                            <option value="BANDA_TRANSPORTADORA">Banda Transportadora</option>
                                            <option value="CARRETILLA">Carretilla</option>
                                            <option value="OTRO">Otro</option>
                                        </select>
                                        <small>Solo si no seleccionó insumo específico</small>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Hora de Inicio *</label>
                                        <input
                                            type="datetime-local"
                                            value={registroForm.hora_inicio}
                                            onChange={(e) => setRegistroForm(prev => ({...prev, hora_inicio: e.target.value}))}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Hora de Fin *</label>
                                        <input
                                            type="datetime-local"
                                            value={registroForm.hora_fin}
                                            onChange={(e) => setRegistroForm(prev => ({...prev, hora_fin: e.target.value}))}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Peso Total Descargado (kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={registroForm.peso_total_descargado}
                                            onChange={(e) => setRegistroForm(prev => ({...prev, peso_total_descargado: e.target.value}))}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="form-group tiempo-calculado">
                                        <label>Tiempo de Uso Calculado</label>
                                        <div className="tiempo-display">
                                            {calcularTiempoUso(registroForm.hora_inicio, registroForm.hora_fin) || 'Ingrese horas para calcular'}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Observaciones</label>
                                    <textarea
                                        value={registroForm.observaciones}
                                        onChange={(e) => setRegistroForm(prev => ({...prev, observaciones: e.target.value}))}
                                        placeholder="Observaciones sobre el uso del insumo/maquinaria..."
                                        rows="3"
                                    ></textarea>
                                </div>

                                <div className="form-actions">
                                    <button type="submit" className="btn-primary" disabled={cargando}>
                                        {cargando ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i>
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-save"></i>
                                                Registrar Uso
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Tab de insumos */}
                    {activeTab === 'insumos' && (
                        <div className="insumos-tab">
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
                                        <button type="submit" className="btn-primary" disabled={cargando}>
                                            {cargando ? (
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
                                                        <span className={`stock-badge ${insumo.estado_inventario.toLowerCase()}`}>
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
                                                        disabled={cargando}
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
                        </div>
                    )}

                    {/* Tab de estadísticas de inventario */}
                    {activeTab === 'inventario' && estadisticasInventario && (
                        <div className="inventario-tab">
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

                            <div className="stats-tables">
                                <div className="stats-section">
                                    <h4>Insumos Críticos (Agotados)</h4>
                                    {estadisticasInventario.insumos_criticos?.length > 0 ? (
                                        <div className="critical-table">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Nombre</th>
                                                        <th>Código</th>
                                                        <th>Tipo</th>
                                                        <th>Cantidad Mínima</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {estadisticasInventario.insumos_criticos.map(insumo => (
                                                        <tr key={insumo.id}>
                                                            <td>{insumo.nombre}</td>
                                                            <td>{insumo.codigo}</td>
                                                            <td>{insumo.tipo}</td>
                                                            <td>{insumo.cantidad_minima}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="no-critical">¡Excelente! No hay insumos agotados</p>
                                    )}
                                </div>

                                <div className="stats-section">
                                    <h4>Insumos con Stock Bajo</h4>
                                    {estadisticasInventario.insumos_bajo_stock?.length > 0 ? (
                                        <div className="low-stock-table">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Nombre</th>
                                                        <th>Código</th>
                                                        <th>Tipo</th>
                                                        <th>Stock Actual</th>
                                                        <th>Cantidad Mínima</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {estadisticasInventario.insumos_bajo_stock.map(insumo => (
                                                        <tr key={insumo.id}>
                                                            <td>{insumo.nombre}</td>
                                                            <td>{insumo.codigo}</td>
                                                            <td>{insumo.tipo}</td>
                                                            <td className="warning">{insumo.cantidad_disponible}</td>
                                                            <td>{insumo.cantidad_minima}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="no-low-stock">¡Perfecto! Todos los insumos tienen stock adecuado</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Insumos;