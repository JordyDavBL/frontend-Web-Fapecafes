import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { checkAuth, getCurrentUser } from '../../../utils/auth';
import '../../../styles/descarga.css';

const Descarga = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Estados para el formulario
    const [formData, setFormData] = useState({
        descripcion: '',
        hora_inicio: '',
        hora_fin: '',
        lote_seleccionado: '',
        insumo_utilizado: '',
        cantidad: '',
        tiempo_uso: '',
        peso_usado: ''
    });
    
    // Estados para datos de la aplicación
    const [insumosDisponibles, setInsumosDisponibles] = useState([]);
    const [lotesDisponibles, setLotesDisponibles] = useState([]);
    const [tareasCompletadas, setTareasCompletadas] = useState([]);

    // Verificar autenticación
    useEffect(() => {
        const verificarAcceso = async () => {
            try {
                const userData = await getCurrentUser();
                if (userData) {
                    setIsAuthenticated(true);
                    setUserRole(userData.rol);
                } else {
                    alert('Acceso denegado. Por favor, inicia sesión.');
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

    // Cargar datos iniciales
    useEffect(() => {
        if (isAuthenticated) {
            cargarInsumosDisponibles();
            cargarLotesDisponibles();
            cargarTareasCompletadas();
        }
    }, [isAuthenticated]);

    const cargarInsumosDisponibles = async () => {
        try {
            const response = await axiosInstance.get('/insumos/');
            setInsumosDisponibles(response.data.results || response.data);
        } catch (error) {
            console.error('Error al cargar insumos:', error);
        }
    };

    const cargarLotesDisponibles = async () => {
        try {
            const response = await axiosInstance.get('/lotes-disponibles-descarga/');
            setLotesDisponibles(response.data.results || []);
        } catch (error) {
            console.error('Error al cargar lotes disponibles:', error);
        }
    };

    const cargarTareasCompletadas = async () => {
        try {
            const response = await axiosInstance.get('/descargas/');
            setTareasCompletadas(response.data.results || response.data);
        } catch (error) {
            console.error('Error al cargar tareas completadas:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const limpiarFormulario = () => {
        setFormData({
            descripcion: '',
            hora_inicio: '',
            hora_fin: '',
            lote_seleccionado: '',
            insumo_utilizado: '',
            cantidad: '',
            tiempo_uso: '',
            peso_usado: ''
        });
    };

    const crearTarea = async (e) => {
        e.preventDefault();
        
        if (!formData.descripcion.trim()) {
            alert('La descripción de la tarea es requerida');
            return;
        }

        if (!formData.lote_seleccionado) {
            alert('Debe seleccionar un lote para registrar la descarga');
            return;
        }

        try {
            setLoading(true);
            
            const datosDescarga = {
                lote: parseInt(formData.lote_seleccionado),
                peso_descargado: formData.peso_usado ? parseFloat(formData.peso_usado) : 0,
                hora_inicio: formData.hora_inicio ? new Date().toISOString().split('T')[0] + 'T' + formData.hora_inicio : null,
                hora_fin: formData.hora_fin ? new Date().toISOString().split('T')[0] + 'T' + formData.hora_fin : null,
                insumo: formData.insumo_utilizado ? parseInt(formData.insumo_utilizado) : null,
                cantidad_insumo_usado: formData.cantidad ? parseFloat(formData.cantidad) : null,
                tiempo_uso_insumo: formData.tiempo_uso ? parseInt(formData.tiempo_uso) : null,
                observaciones: formData.descripcion
            };

            console.log('Datos a enviar:', datosDescarga);
            const response = await axiosInstance.post('/descargas/', datosDescarga);
            
            alert('✅ Tarea de descarga registrada exitosamente');
            limpiarFormulario();
            cargarTareasCompletadas();
            
        } catch (error) {
            console.error('Error completo:', error);
            console.error('Response data:', error.response?.data);
            console.error('Status:', error.response?.status);
            
            let errorMessage = 'Error al registrar la tarea';
            
            if (error.response?.status === 400 && error.response?.data) {
                const errorData = error.response.data;
                
                if (typeof errorData === 'object') {
                    const errores = [];
                    Object.keys(errorData).forEach(campo => {
                        if (Array.isArray(errorData[campo])) {
                            errores.push(`${campo}: ${errorData[campo].join(', ')}`);
                        } else {
                            errores.push(`${campo}: ${errorData[campo]}`);
                        }
                    });
                    errorMessage = `Errores de validación:\n${errores.join('\n')}`;
                } else {
                    errorMessage = errorData.toString();
                }
            } else {
                errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message;
            }
            
            alert(`Error al registrar la tarea:\n${errorMessage}`);
        } finally {
            setLoading(false);
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
        
        try {
            // Si es un string de tiempo (HH:mm:ss o HH:mm), parsearlo directamente
            if (typeof hora === 'string') {
                // Extraer solo HH:mm del string
                const timeMatch = hora.match(/(\d{2}):(\d{2})/);
                if (timeMatch) {
                    const [, horas, minutos] = timeMatch;
                    return `${horas}:${minutos}`;
                }
            }
            
            // Fallback: intentar parsearlo como Date
            const fecha = new Date(`2000-01-01T${hora}`);
            if (!isNaN(fecha.getTime())) {
                return fecha.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            return 'Hora inválida';
        } catch (error) {
            console.error('Error al formatear hora:', error, hora);
            return 'Hora inválida';
        }
    };

    return (
        <div className="app-container">
            <Sidebar userName={`Usuario FAPECAFE`} userRole={userRole || 'Usuario'} />
            
            <div className="descarga-container">
                <BottomNavigator />
                
                <div className="descarga-content">
                    <div className="descarga-header">
                        <h1>📦 Registro de Descargas</h1>
                        <p>Registro de tareas de descarga realizadas</p>
                    </div>

                    {/* Formulario principal */}
                    <div className="formulario-descarga">
                        <div className="form-card">
                            <div className="form-header">
                                <h2>Tareas realizadas</h2>
                            </div>
                            
                            <form onSubmit={crearTarea} className="descarga-form">
                                <div className="form-group">
                                    <label>Descripción de la tarea:</label>
                                    <textarea
                                        name="descripcion"
                                        value={formData.descripcion}
                                        onChange={handleInputChange}
                                        placeholder="Describe la tarea de descarga realizada..."
                                        rows="4"
                                        required
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Hora inicio:</label>
                                        <input
                                            type="time"
                                            name="hora_inicio"
                                            value={formData.hora_inicio}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Hora Fin:</label>
                                        <input
                                            type="time"
                                            name="hora_fin"
                                            value={formData.hora_fin}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Seleccionar lote *:</label>
                                    <select
                                        name="lote_seleccionado"
                                        value={formData.lote_seleccionado}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Seleccionar lote</option>
                                        {lotesDisponibles.map(lote => (
                                            <option key={lote.id} value={lote.id}>
                                                {lote.numero_lote} - {lote.organizacion_nombre} ({lote.total_quintales} qq)
                                            </option>
                                        ))}
                                    </select>
                                    {lotesDisponibles.length === 0 && (
                                        <small style={{ color: '#6c757d', fontStyle: 'italic' }}>
                                            No hay lotes disponibles. Contacte al administrador.
                                        </small>
                                    )}
                                </div>

                                <div className="insumo-section">
                                    <h3>Insumo utilizado:</h3>
                                    
                                    <div className="form-group">
                                        <label>Seleccionar insumo:</label>
                                        <select
                                            name="insumo_utilizado"
                                            value={formData.insumo_utilizado}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Seleccionar insumo (opcional)</option>
                                            {insumosDisponibles.map(insumo => (
                                                <option key={insumo.id} value={insumo.id}>
                                                    {insumo.nombre} ({insumo.codigo}) - {insumo.tipo_display}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="insumo-details">
                                        <div className="form-group">
                                            <label>Cantidad:</label>
                                            <input
                                                type="number"
                                                name="cantidad"
                                                value={formData.cantidad}
                                                onChange={handleInputChange}
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Tiempo de uso:</label>
                                            <input
                                                type="number"
                                                name="tiempo_uso"
                                                value={formData.tiempo_uso}
                                                onChange={handleInputChange}
                                                placeholder="Minutos"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Peso usado por el insumo:</label>
                                            <input
                                                type="number"
                                                name="peso_usado"
                                                value={formData.peso_usado}
                                                onChange={handleInputChange}
                                                step="0.01"
                                                placeholder="Kg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button 
                                        type="submit" 
                                        className="btn-crear-tarea"
                                        disabled={loading}
                                    >
                                        {loading ? '⏳ Registrando...' : 'Crear Tarea'}
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn-limpiar"
                                        onClick={limpiarFormulario}
                                    >
                                        🔄 Limpiar Formulario
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Lista de tareas completadas */}
                    <div className="tareas-completadas">
                        <div className="tareas-header">
                            <h2>📋 Tareas de Descarga Completadas</h2>
                            <button 
                                className="btn-actualizar"
                                onClick={cargarTareasCompletadas}
                            >
                                🔄 Actualizar
                            </button>
                        </div>
                        
                        {tareasCompletadas.length === 0 ? (
                            <div className="no-tareas">
                                <p>No hay tareas de descarga registradas aún.</p>
                            </div>
                        ) : (
                            <div className="tareas-grid">
                                {tareasCompletadas.map(tarea => (
                                    <div key={tarea.id} className="tarea-card">
                                        <div className="tarea-header-card">
                                            <div className="tarea-icon">📦</div>
                                            <div className="tarea-fecha">
                                                {formatearFecha(tarea.fecha_registro)}
                                            </div>
                                        </div>
                                        
                                        <div className="tarea-content">
                                            <h4>Descripción:</h4>
                                            <p>{tarea.descripcion}</p>
                                            
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
                                            
                                            {tarea.insumo_nombre && (
                                                <div className="tarea-insumo">
                                                    <h5>Insumo utilizado:</h5>
                                                    <p><strong>📦 Nombre:</strong> {tarea.insumo_nombre}</p>
                                                    {tarea.cantidad && (
                                                        <p><strong>📊 Cantidad:</strong> {tarea.cantidad}</p>
                                                    )}
                                                    {tarea.tiempo_uso && (
                                                        <p><strong>⏰ Tiempo de uso:</strong> {tarea.tiempo_uso} min</p>
                                                    )}
                                                    {tarea.peso_usado && (
                                                        <p><strong>⚖️ Peso usado:</strong> {tarea.peso_usado} kg</p>
                                                    )}
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
    );
};

export default Descarga;