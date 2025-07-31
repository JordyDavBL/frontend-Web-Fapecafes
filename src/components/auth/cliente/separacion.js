import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { getAxiosConfig, handleAuthError, getAuthToken, checkLimpiezaAuth } from '../../../utils/auth';
import '../../../styles/separacion.css';

const SeparacionColores = () => {
    const navigate = useNavigate();
    const [lotes, setLotes] = useState([]);
    const [loteSeleccionado, setLoteSeleccionado] = useState(null);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Estados del formulario de separación
    const [datosFormulario, setDatosFormulario] = useState({
        responsable_separacion: '',
        fecha_separacion: new Date().toISOString().split('T')[0],
        calidad_general: 'BUENA',
        duracion_proceso: '',
        observaciones_separacion: '',
        clasificacion_colores: {
            'Verde Claro': { peso: '', porcentaje: '' },
            'Verde Oscuro': { peso: '', porcentaje: '' },
            'Amarillo': { peso: '', porcentaje: '' },
            'Marrón': { peso: '', porcentaje: '' },
            'Negro/Defectuoso': { peso: '', porcentaje: '' }
        }
    });

    // Estados para recepción final
    const [mostrarRecepcionFinal, setMostrarRecepcionFinal] = useState(false);
    const [datosRecepcionFinal, setDatosRecepcionFinal] = useState({
        responsable_recepcion: '',
        fecha_recepcion_final: new Date().toISOString().split('T')[0],
        calificacion_final: 'A',
        observaciones_finales: ''
    });

    // Verificar autenticación y rol de administrador
    useEffect(() => {
        const verificarAcceso = async () => {
            const tieneAcceso = await checkLimpiezaAuth(navigate);
            if (tieneAcceso) {
                setIsAuthenticated(true);
            }
        };
        
        verificarAcceso();
    }, [navigate]);

    useEffect(() => {
        if (isAuthenticated) {
            cargarLotesLimpios();
        }
    }, [isAuthenticated]);

    const cargarLotesLimpios = async () => {
        try {
            setCargando(true);
            const axiosConfig = getAxiosConfig();
            console.log('Cargando lotes con configuración:', axiosConfig);
            
            const response = await axiosInstance.get('http://localhost:8000/api/users/lotes/', axiosConfig);
            
            // Filtrar solo lotes con estado LIMPIO
            const lotesLimpios = response.data.filter(lote => lote.estado === 'LIMPIO');
            setLotes(lotesLimpios);
            setError(''); // Limpiar errores previos
        } catch (error) {
            console.error('Error al cargar lotes:', error);
            const authErrorHandled = await handleAuthError(error, navigate);
            if (!authErrorHandled) {
                setError('Error al cargar los lotes limpios');
            }
        } finally {
            setCargando(false);
        }
    };

    const handleSeleccionarLote = (lote) => {
        setLoteSeleccionado(lote);
        setMostrarFormulario(true);
        setMensaje('');
        setError('');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setDatosFormulario(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleColorChange = (color, campo, valor) => {
        setDatosFormulario(prev => ({
            ...prev,
            clasificacion_colores: {
                ...prev.clasificacion_colores,
                [color]: {
                    ...prev.clasificacion_colores[color],
                    [campo]: valor
                }
            }
        }));
        
        // Calcular porcentajes automáticamente si se ingresa peso
        if (campo === 'peso' && valor && loteSeleccionado) {
            // Convertir quintales a kg para el cálculo (1 quintal = 46 kg)
            const pesoLoteEnKg = loteSeleccionado.total_quintales * 46;
            const porcentaje = ((parseFloat(valor) / pesoLoteEnKg) * 100).toFixed(2);
            setDatosFormulario(prev => ({
                ...prev,
                clasificacion_colores: {
                    ...prev.clasificacion_colores,
                    [color]: {
                        ...prev.clasificacion_colores[color],
                        porcentaje: porcentaje
                    }
                }
            }));
        }
    };

    const calcularTotalPeso = () => {
        return Object.values(datosFormulario.clasificacion_colores)
            .reduce((total, color) => total + (parseFloat(color.peso) || 0), 0);
    };

    const validarFormulario = () => {
        if (!datosFormulario.responsable_separacion.trim()) {
            setError('El responsable de la separación es requerido');
            return false;
        }

        const totalPeso = calcularTotalPeso();
        if (totalPeso === 0) {
            setError('Debe especificar al menos un peso para la clasificación por colores');
            return false;
        }

        // Verificar que el total no exceda el peso del lote (con margen de tolerancia)
        // Convertir quintales a kg para la validación (1 quintal = 46 kg)
        const pesoLoteEnKg = loteSeleccionado.total_quintales * 46;
        const tolerancia = pesoLoteEnKg * 0.05; // 5% de tolerancia
        if (totalPeso > (pesoLoteEnKg + tolerancia)) {
            setError(`El peso total clasificado (${totalPeso} kg) excede el peso del lote (${pesoLoteEnKg} kg)`);
            return false;
        }

        // Validar que todos los campos de peso sean números válidos o estén vacíos
        for (const [color, datos] of Object.entries(datosFormulario.clasificacion_colores)) {
            if (datos.peso && isNaN(parseFloat(datos.peso))) {
                setError(`El peso para ${color} debe ser un número válido`);
                return false;
            }
        }

        return true;
    };

    const procesarSeparacion = async () => {
        if (!validarFormulario()) return;

        try {
            setCargando(true);
            const axiosConfig = getAxiosConfig();
            
            // Filtrar y limpiar los datos de clasificación de colores
            const clasificacionLimpia = {};
            Object.entries(datosFormulario.clasificacion_colores).forEach(([color, datos]) => {
                // Solo incluir colores que tengan peso válido
                if (datos.peso && !isNaN(parseFloat(datos.peso)) && parseFloat(datos.peso) > 0) {
                    clasificacionLimpia[color] = {
                        peso: parseFloat(datos.peso),
                        porcentaje: parseFloat(datos.porcentaje) || 0
                    };
                }
            });

            if (Object.keys(clasificacionLimpia).length === 0) {
                setError('Debe especificar al menos un peso válido para la clasificación por colores');
                setCargando(false);
                return;
            }
            
            const datosEnvio = {
                lote_id: loteSeleccionado.id,
                responsable_separacion: datosFormulario.responsable_separacion,
                fecha_separacion: datosFormulario.fecha_separacion,
                calidad_general: datosFormulario.calidad_general,
                duracion_proceso: datosFormulario.duracion_proceso ? parseInt(datosFormulario.duracion_proceso) : 0,
                observaciones_separacion: datosFormulario.observaciones_separacion,
                clasificacion_colores: clasificacionLimpia
            };

            console.log('Enviando datos de separación:', datosEnvio);

            const response = await axiosInstance.post(
                'http://localhost:8000/api/users/lotes/procesar-separacion-colores/',
                datosEnvio,
                axiosConfig
            );

            setMensaje('✅ Proceso de separación por colores completado exitosamente. El lote está ahora listo para recepción final.');
            setMostrarFormulario(false);
            setMostrarRecepcionFinal(true);
            setError(''); // Limpiar errores previos
            
            // Actualizar el lote seleccionado con los nuevos datos
            setLoteSeleccionado(response.data.lote);
            
            // Recargar la lista de lotes para reflejar el cambio de estado
            await cargarLotesLimpios();
            
        } catch (error) {
            console.error('Error al procesar separación:', error);
            console.error('Detalles del error:', error.response?.data);
            const authErrorHandled = await handleAuthError(error, navigate);
            if (!authErrorHandled) {
                const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Error al procesar la separación por colores';
                setError(errorMsg);
            }
        } finally {
            setCargando(false);
        }
    };

    const handleRecepcionFinalChange = (e) => {
        const { name, value } = e.target;
        setDatosRecepcionFinal(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const enviarRecepcionFinal = async () => {
        if (!datosRecepcionFinal.responsable_recepcion.trim()) {
            setError('El responsable de la recepción final es requerido');
            return;
        }

        try {
            setCargando(true);
            const axiosConfig = getAxiosConfig();
            
            const datosEnvio = {
                lote_id: loteSeleccionado.id,
                ...datosRecepcionFinal
            };

            await axiosInstance.post(
                'http://localhost:8000/api/users/lotes/enviar-recepcion-final/',
                datosEnvio,
                axiosConfig
            );

            setMensaje('Lote enviado a recepción final exitosamente. Proceso completado.');
            setMostrarRecepcionFinal(false);
            setLoteSeleccionado(null);
            
            // Recargar lotes
            cargarLotesLimpios();
            
        } catch (error) {
            console.error('Error en recepción final:', error);
            const authErrorHandled = await handleAuthError(error, navigate);
            if (!authErrorHandled) {
                setError(error.response?.data?.error || 'Error al enviar a recepción final');
            }
        } finally {
            setCargando(false);
        }
    };

    const cerrarModal = () => {
        setMostrarFormulario(false);
        setMostrarRecepcionFinal(false);
        setLoteSeleccionado(null);
        setMensaje('');
        setError('');
        
        // Resetear formularios
        setDatosFormulario({
            responsable_separacion: '',
            fecha_separacion: new Date().toISOString().split('T')[0],
            calidad_general: 'BUENA',
            duracion_proceso: '',
            observaciones_separacion: '',
            clasificacion_colores: {
                'Verde Claro': { peso: '', porcentaje: '' },
                'Verde Oscuro': { peso: '', porcentaje: '' },
                'Amarillo': { peso: '', porcentaje: '' },
                'Marrón': { peso: '', porcentaje: '' },
                'Negro/Defectuoso': { peso: '', porcentaje: '' }
            }
        });
        
        setDatosRecepcionFinal({
            responsable_recepcion: '',
            fecha_recepcion_final: new Date().toISOString().split('T')[0],
            calificacion_final: 'A',
            observaciones_finales: ''
        });
    };

    return (
        <div className="app-container">
            <Sidebar userName="Usuario FAPECAFE" userRole="Cliente" />
            
            <div className="separacion-container">
                <BottomNavigator />
                
                <div className="separacion-colores-container">
                    <div className="header-separacion">
                        <h2>Separación por Colores</h2>
                        <p>Procese la separación por colores de lotes que han completado la limpieza</p>
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

                    {cargando && (
                        <div className="loading">
                            <i className="fas fa-spinner fa-spin"></i>
                            Cargando...
                        </div>
                    )}

                    <div className="lotes-disponibles">
                        <h3>Lotes Listos para Separación por Colores</h3>
                        {lotes.length === 0 ? (
                            <div className="no-data">
                                <i className="fas fa-coffee"></i>
                                <p>No hay lotes disponibles para separación por colores</p>
                                <small>Los lotes deben haber completado el proceso de limpieza</small>
                            </div>
                        ) : (
                            <div className="lotes-grid">
                                {lotes.map(lote => (
                                    <div key={lote.id} className="lote-card">
                                        <div className="lote-header">
                                            <h4>{lote.numero_lote}</h4>
                                            <span className="estado-badge estado-limpio">
                                                {lote.estado}
                                            </span>
                                        </div>
                                        <div className="lote-info">
                                            <p><strong>Organización:</strong> {lote.organizacion_nombre}</p>
                                            <p><strong>Total:</strong> {lote.total_quintales} quintales</p>
                                            <p><strong>Fecha entrega:</strong> {new Date(lote.fecha_entrega).toLocaleDateString()}</p>
                                            <p><strong>Propietarios:</strong> {lote.propietarios?.length || 0}</p>
                                        </div>
                                        <button 
                                            className="btn-procesar"
                                            onClick={() => handleSeleccionarLote(lote)}
                                            disabled={cargando}
                                        >
                                            <i className="fas fa-palette"></i>
                                            Procesar Separación
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Modal para formulario de separación */}
                    {mostrarFormulario && loteSeleccionado && (
                        <div className="modal-overlay">
                            <div className="modal-separacion">
                                <div className="modal-header">
                                    <h3>Separación por Colores - {loteSeleccionado.numero_lote}</h3>
                                    <button className="btn-close" onClick={cerrarModal}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>

                                <div className="modal-body">
                                    <div className="info-lote">
                                        <p><strong>Lote:</strong> {loteSeleccionado.numero_lote}</p>
                                        <p><strong>Total quintales:</strong> {loteSeleccionado.total_quintales} quintales ({(loteSeleccionado.total_quintales * 46).toFixed(1)} kg)</p>
                                        <p><strong>Organización:</strong> {loteSeleccionado.organizacion_nombre}</p>
                                    </div>

                                    <form className="formulario-separacion">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Responsable de Separación *</label>
                                                <input
                                                    type="text"
                                                    name="responsable_separacion"
                                                    value={datosFormulario.responsable_separacion}
                                                    onChange={handleInputChange}
                                                    placeholder="Nombre del responsable"
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Fecha de Separación</label>
                                                <input
                                                    type="date"
                                                    name="fecha_separacion"
                                                    value={datosFormulario.fecha_separacion}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Calidad General</label>
                                                <select
                                                    name="calidad_general"
                                                    value={datosFormulario.calidad_general}
                                                    onChange={handleInputChange}
                                                >
                                                    <option value="EXCELENTE">Excelente</option>
                                                    <option value="BUENA">Buena</option>
                                                    <option value="REGULAR">Regular</option>
                                                    <option value="DEFICIENTE">Deficiente</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Duración del Proceso (minutos)</label>
                                                <input
                                                    type="number"
                                                    name="duracion_proceso"
                                                    value={datosFormulario.duracion_proceso}
                                                    onChange={handleInputChange}
                                                    placeholder="Tiempo en minutos"
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="clasificacion-colores">
                                            <h4>Clasificación por Colores</h4>
                                            <div className="colores-grid">
                                                {Object.entries(datosFormulario.clasificacion_colores).map(([color, datos]) => (
                                                    <div key={color} className="color-item">
                                                        <div className="color-header">
                                                            <span className={`color-indicator color-${color.toLowerCase().replace(/\s+/g, '-').replace('/', '-')}`}></span>
                                                            <label>{color}</label>
                                                        </div>
                                                        <div className="color-inputs">
                                                            <input
                                                                type="number"
                                                                placeholder="Peso (kg)"
                                                                value={datos.peso}
                                                                onChange={(e) => handleColorChange(color, 'peso', e.target.value)}
                                                                step="0.1"
                                                                min="0"
                                                            />
                                                            <input
                                                                type="number"
                                                                placeholder="% automático"
                                                                value={datos.porcentaje}
                                                                onChange={(e) => handleColorChange(color, 'porcentaje', e.target.value)}
                                                                step="0.01"
                                                                min="0"
                                                                max="100"
                                                                readOnly
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="total-separado">
                                                <strong>Total Separado: {calcularTotalPeso().toFixed(2)} kg</strong>
                                                <small>
                                                    ({((calcularTotalPeso() / (loteSeleccionado.total_quintales * 46)) * 100).toFixed(2)}% del lote)
                                                </small>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Observaciones</label>
                                            <textarea
                                                name="observaciones_separacion"
                                                value={datosFormulario.observaciones_separacion}
                                                onChange={handleInputChange}
                                                placeholder="Observaciones del proceso de separación..."
                                                rows="4"
                                            ></textarea>
                                        </div>
                                    </form>
                                </div>

                                <div className="modal-footer">
                                    <button 
                                        className="btn-cancel" 
                                        onClick={cerrarModal}
                                        disabled={cargando}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        className="btn-confirm" 
                                        onClick={procesarSeparacion}
                                        disabled={cargando}
                                    >
                                        {cargando ? 'Procesando...' : 'Procesar Separación'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal para recepción final */}
                    {mostrarRecepcionFinal && (
                        <div className="modal-overlay">
                            <div className="modal-recepcion-final">
                                <div className="modal-header">
                                    <h3>Recepción Final - {loteSeleccionado?.numero_lote}</h3>
                                    <button className="btn-close" onClick={cerrarModal}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>

                                <div className="modal-body">
                                    <div className="success-message">
                                        <i className="fas fa-check-circle"></i>
                                        <p>Separación por colores completada exitosamente</p>
                                    </div>

                                    <form className="formulario-recepcion-final">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Responsable de Recepción Final *</label>
                                                <input
                                                    type="text"
                                                    name="responsable_recepcion"
                                                    value={datosRecepcionFinal.responsable_recepcion}
                                                    onChange={handleRecepcionFinalChange}
                                                    placeholder="Nombre del responsable de recepción"
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Fecha de Recepción Final</label>
                                                <input
                                                    type="date"
                                                    name="fecha_recepcion_final"
                                                    value={datosRecepcionFinal.fecha_recepcion_final}
                                                    onChange={handleRecepcionFinalChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Calificación Final</label>
                                            <select
                                                name="calificacion_final"
                                                value={datosRecepcionFinal.calificacion_final}
                                                onChange={handleRecepcionFinalChange}
                                            >
                                                <option value="A">A - Excelente</option>
                                                <option value="B">B - Buena</option>
                                                <option value="C">C - Regular</option>
                                                <option value="D">D - Deficiente</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Observaciones Finales</label>
                                            <textarea
                                                name="observaciones_finales"
                                                value={datosRecepcionFinal.observaciones_finales}
                                                onChange={handleRecepcionFinalChange}
                                                placeholder="Observaciones finales del proceso..."
                                                rows="4"
                                            ></textarea>
                                        </div>
                                    </form>
                                </div>

                                <div className="modal-footer">
                                    <button 
                                        className="btn-cancel" 
                                        onClick={cerrarModal}
                                        disabled={cargando}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        className="btn-confirm" 
                                        onClick={enviarRecepcionFinal}
                                        disabled={cargando}
                                    >
                                        {cargando ? 'Enviando...' : 'Finalizar Proceso'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeparacionColores;