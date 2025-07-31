import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { checkLimpiezaAuth } from '../../../utils/auth';
import '../../../styles/limpieza.css';

const Limpieza = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pendientes');
    const [lotes, setLotes] = useState([]);
    const [lotesLimpios, setLotesLimpios] = useState([]);
    const [organizaciones, setOrganizaciones] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [selectedLote, setSelectedLote] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Estados para el formulario de limpieza
    const [formData, setFormData] = useState({
        peso_impurezas: '',
        impurezas_encontradas: '',
        tipo_limpieza: '',
        duracion_limpieza: '',
        responsable_limpieza: '',
        observaciones_limpieza: ''
    });

    // Estados para formulario de separación por colores
    const [formSeparacion, setFormSeparacion] = useState({
        peso_separado: '',
        tipos_defectos: '',
        metodo_separacion: '',
        duracion_separacion: '',
        responsable_separacion: '',
        observaciones_separacion: ''
    });

    // Estados para filtros
    const [filtros, setFiltros] = useState({
        organizacion: '',
        fechaInicio: '',
        fechaFin: ''
    });

    // Verificar autenticación al cargar
    useEffect(() => {
        const verificarAcceso = async () => {
            const tieneAcceso = await checkLimpiezaAuth(navigate);
            if (tieneAcceso) {
                setIsAuthenticated(true);
            }
        };
        
        verificarAcceso();
    }, [navigate]);

    // Cargar datos cuando se autentica
    useEffect(() => {
        if (isAuthenticated) {
            cargarDatos();
        }
    }, [isAuthenticated]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [lotesRes, orgRes] = await Promise.all([
                axiosInstance.get('http://localhost:8000/api/users/lotes/'),
                axiosInstance.get('http://localhost:8000/api/users/organizaciones/')
            ]);

            // Filtrar lotes por estado para las diferentes pestañas
            const todosLotes = lotesRes.data;
            
            // Lotes pendientes de limpieza (APROBADO, SEPARACION_APLICADA)
            const lotesPendientes = todosLotes.filter(lote => 
                ['APROBADO', 'SEPARACION_APLICADA'].includes(lote.estado)
            );
            
            // Lotes listos para separación (LIMPIO)
            const lotesParaSeparacion = todosLotes.filter(lote => 
                lote.estado === 'LIMPIO'
            );
            
            // Lotes finalizados (FINALIZADO)
            const lotesFinalizados = todosLotes.filter(lote => 
                lote.estado === 'FINALIZADO'
            );

            setLotes(lotesPendientes);
            setLotesLimpios(lotesParaSeparacion);
            setOrganizaciones(orgRes.data);
            
            console.log('Lotes pendientes limpieza:', lotesPendientes.length);
            console.log('Lotes para separación:', lotesParaSeparacion.length);
            console.log('Lotes finalizados:', lotesFinalizados.length);
            
        } catch (error) {
            console.error('Error al cargar datos:', error);
            alert('Error al cargar los datos');
        }
        setLoading(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSeparacionInputChange = (e) => {
        const { name, value } = e.target;
        setFormSeparacion(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const abrirModal = (tipo, lote = null) => {
        setModalType(tipo);
        setSelectedLote(lote);
        setShowModal(true);
        
        // Limpiar formularios
        setFormData({
            peso_impurezas: '',
            impurezas_encontradas: '',
            tipo_limpieza: '',
            duracion_limpieza: '',
            responsable_limpieza: '',
            observaciones_limpieza: ''
        });
        
        setFormSeparacion({
            peso_separado: '',
            tipos_defectos: '',
            metodo_separacion: '',
            duracion_separacion: '',
            responsable_separacion: '',
            observaciones_separacion: ''
        });
    };

    const cerrarModal = () => {
        setShowModal(false);
        setModalType('');
        setSelectedLote(null);
    };

    const procesarLimpieza = async (e) => {
        e.preventDefault();
        
        if (!selectedLote) return;
        
        try {
            const dataToSend = {
                lote_id: selectedLote.id,
                ...formData
            };
            
            const response = await axiosInstance.post(
                'http://localhost:8000/api/users/lotes/procesar-limpieza/',
                dataToSend
            );
            
            alert(`✅ ${response.data.mensaje}\n\n📊 Detalles del proceso:\n• Peso antes: ${response.data.detalles_proceso.peso_antes_limpieza} kg\n• Impurezas removidas: ${response.data.detalles_proceso.peso_impurezas_removidas} kg\n• Peso después: ${response.data.detalles_proceso.peso_despues_limpieza} kg\n• Reducción: ${response.data.detalles_proceso.porcentaje_impurezas}%\n\n✨ El lote está listo para separación por colores.`);
            
            cerrarModal();
            cargarDatos();
            
        } catch (error) {
            console.error('Error al procesar limpieza:', error);
            const errorMsg = error.response?.data?.error || error.message;
            alert(`Error al procesar limpieza: ${errorMsg}`);
        }
    };

    const procesarSeparacionColores = async (e) => {
        e.preventDefault();
        
        if (!selectedLote) return;
        
        try {
            const dataToSend = {
                lote_id: selectedLote.id,
                ...formSeparacion
            };
            
            const response = await axiosInstance.post(
                'http://localhost:8000/api/users/lotes/procesar-separacion-colores/',
                dataToSend
            );
            
            const resumen = response.data.resumen_total_proceso;
            
            alert(`✅ ${response.data.mensaje}\n\n📊 Resumen del proceso completo:\n• Peso inicial del lote: ${resumen.peso_inicial_lote} kg\n• Peso final del lote: ${resumen.peso_final_lote} kg\n• Pérdida total: ${resumen.perdida_total} kg (${resumen.porcentaje_perdida_total}%)\n\n💧 Desglose de pérdidas:\n• Impurezas (limpieza): ${resumen.peso_impurezas} kg\n• Granos defectuosos (separación): ${resumen.peso_granos_defectuosos} kg\n\n🎉 El lote está FINALIZADO y listo para comercialización.`);
            
            cerrarModal();
            cargarDatos();
            
        } catch (error) {
            console.error('Error al procesar separación:', error);
            const errorMsg = error.response?.data?.error || error.message;
            alert(`Error al procesar separación: ${errorMsg}`);
        }
    };

    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'LIMPIO': return '#17a2b8';
            case 'APROBADO': return '#28a745';
            case 'SEPARACION_APLICADA': return '#ffc107';
            case 'SEPARADO': return '#6c757d';
            case 'FINALIZADO': return '#28a745';
            default: return '#6c757d';
        }
    };

    const getEstadoTexto = (estado) => {
        switch (estado) {
            case 'LIMPIO': return 'Listo para Limpieza';
            case 'APROBADO': return 'Aprobado';
            case 'SEPARACION_APLICADA': return 'Separación Aplicada';
            case 'SEPARADO': return 'Limpio';
            case 'FINALIZADO': return 'Finalizado';
            default: return estado;
        }
    };

    const lotesFiltrados = lotes.filter(lote => {
        if (filtros.organizacion && lote.organizacion !== parseInt(filtros.organizacion)) return false;
        if (filtros.fechaInicio && new Date(lote.fecha_entrega) < new Date(filtros.fechaInicio)) return false;
        if (filtros.fechaFin && new Date(lote.fecha_entrega) > new Date(filtros.fechaFin)) return false;
        return true;
    });

    const lotesLimpiosFiltrados = lotesLimpios.filter(lote => {
        if (filtros.organizacion && lote.organizacion !== parseInt(filtros.organizacion)) return false;
        if (filtros.fechaInicio && new Date(lote.fecha_entrega) < new Date(filtros.fechaInicio)) return false;
        if (filtros.fechaFin && new Date(lote.fecha_entrega) > new Date(filtros.fechaFin)) return false;
        return true;
    });

    return (
        <div className="app-container">
            <Sidebar />
            
            <div className="limpieza-container">
                <BottomNavigator />
                
                <div className="limpieza-header">
                    <h1>🧼 Gestión de Limpieza y Separación</h1>
                    <p>FAPECAFES - Procesamiento Post-Análisis</p>
                </div>

                {/* Estadísticas */}
                <div className="estadisticas-grid">
                    <div className="stat-card">
                        <h3>Pendientes Limpieza</h3>
                        <span className="stat-number">{lotesFiltrados.length}</span>
                    </div>
                    <div className="stat-card">
                        <h3>Listos para Separación</h3>
                        <span className="stat-number">{lotesLimpiosFiltrados.length}</span>
                    </div>
                    <div className="stat-card">
                        <h3>Total en Proceso</h3>
                        <span className="stat-number">{lotesFiltrados.length + lotesLimpiosFiltrados.length}</span>
                    </div>
                </div>

                {/* Filtros */}
                <div className="filtros-section">
                    <h3>🔍 Filtros</h3>
                    <div className="filtros-container">
                        <div className="filtro-group">
                            <label>Organización:</label>
                            <select
                                value={filtros.organizacion}
                                onChange={(e) => setFiltros({...filtros, organizacion: e.target.value})}
                            >
                                <option value="">Todas</option>
                                {organizaciones.map(org => (
                                    <option key={org.id} value={org.id}>{org.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filtro-group">
                            <label>Fecha desde:</label>
                            <input
                                type="date"
                                value={filtros.fechaInicio}
                                onChange={(e) => setFiltros({...filtros, fechaInicio: e.target.value})}
                            />
                        </div>
                        <div className="filtro-group">
                            <label>Fecha hasta:</label>
                            <input
                                type="date"
                                value={filtros.fechaFin}
                                onChange={(e) => setFiltros({...filtros, fechaFin: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                {/* Navegación por pestañas */}
                <div className="tabs-container">
                    <button 
                        className={`tab-button ${activeTab === 'pendientes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pendientes')}
                    >
                        🧼 Pendientes de Limpieza ({lotesFiltrados.length})
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'separacion' ? 'active' : ''}`}
                        onClick={() => setActiveTab('separacion')}
                    >
                        🎨 Listos para Separación ({lotesLimpiosFiltrados.length})
                    </button>
                </div>

                {/* Contenido de pestañas */}
                <div className="tab-content">
                    {activeTab === 'pendientes' && (
                        <div className="lotes-section">
                            <div className="section-header">
                                <h2>Lotes Pendientes de Limpieza</h2>
                                <p>Lotes que han completado el análisis y están listos para el proceso de limpieza</p>
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
                                            <p><strong>Peso actual:</strong> {lote.peso_total_final || lote.peso_total_inicial || 'No registrado'} kg</p>
                                            <p><strong>Quintales:</strong> {lote.total_quintales} qq</p>
                                            <p><strong>Fecha:</strong> {new Date(lote.fecha_entrega).toLocaleDateString()}</p>
                                            
                                        </div>
                                        <div className="lote-actions">
                                            <button 
                                                className="btn-primary"
                                                onClick={() => abrirModal('limpieza', lote)}
                                            >
                                                🧼 Procesar Limpieza
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {lotesFiltrados.length === 0 && (
                                <div className="no-results">
                                    <p>No hay lotes pendientes de limpieza</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'separacion' && (
                        <div className="lotes-section">
                            <div className="section-header">
                                <h2>Lotes Listos para Separación por Colores</h2>
                                <p>Lotes que han completado la limpieza y están listos para separación por colores</p>
                            </div>
                            
                            <div className="lotes-grid">
                                {lotesLimpiosFiltrados.map(lote => (
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
                                            <p><strong>Peso después de limpieza:</strong> {lote.peso_total_final || 'No registrado'} kg</p>
                                            <p><strong>Impurezas removidas:</strong> {lote.peso_impurezas || 0} kg</p>
                                            <p><strong>Tipo de limpieza:</strong> {lote.tipo_limpieza || 'No especificado'}</p>
                                            <p><strong>Responsable limpieza:</strong> {lote.responsable_limpieza || 'No especificado'}</p>
                                        </div>
                                        <div className="lote-actions">
                                            <button 
                                                className="btn-primary"
                                                onClick={() => abrirModal('separacion', lote)}
                                                style={{ backgroundColor: '#6c757d' }}
                                            >
                                                🎨 Procesar Separación
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {lotesLimpiosFiltrados.length === 0 && (
                                <div className="no-results">
                                    <p>No hay lotes listos para separación por colores</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal para procesos */}
                {showModal && (
                    <div className="modal-overlay" onClick={cerrarModal}>
                        <div className="modal-content proceso-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>
                                    {modalType === 'limpieza' && '🧼 Procesar Limpieza'}
                                    {modalType === 'separacion' && '🎨 Procesar Separación por Colores'}
                                </h3>
                                <button className="close-btn" onClick={cerrarModal}>×</button>
                            </div>
                            <div className="modal-body">
                                {modalType === 'limpieza' && selectedLote && (
                                    <form onSubmit={procesarLimpieza}>
                                        <div className="lote-info-modal">
                                            <h4>Información del Lote</h4>
                                            <p><strong>Número:</strong> {selectedLote.numero_lote}</p>
                                            <p><strong>Organización:</strong> {selectedLote.organizacion_nombre}</p>
                                            <p><strong>Peso actual:</strong> {selectedLote.peso_total_final || selectedLote.peso_total_inicial || 'No registrado'} kg</p>
                                            <p><strong>Estado:</strong> {getEstadoTexto(selectedLote.estado)}</p>
                                        </div>

                                        <div className="form-section">
                                            <h4>Datos del Proceso de Limpieza</h4>
                                            
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Peso de Impurezas Removidas (kg) *</label>
                                                    <input
                                                        type="number"
                                                        name="peso_impurezas"
                                                        value={formData.peso_impurezas}
                                                        onChange={handleInputChange}
                                                        step="0.01"
                                                        min="0"
                                                        required
                                                        placeholder="Ej: 15.50"
                                                    />
                                                    <small>Peso exacto de las impurezas que se removieron</small>
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Duración del Proceso (minutos)</label>
                                                    <input
                                                        type="number"
                                                        name="duracion_limpieza"
                                                        value={formData.duracion_limpieza}
                                                        onChange={handleInputChange}
                                                        min="0"
                                                        placeholder="Ej: 120"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Tipo de Limpieza</label>
                                                    <select
                                                        name="tipo_limpieza"
                                                        value={formData.tipo_limpieza}
                                                        onChange={handleInputChange}
                                                    >
                                                        <option value="">Seleccionar tipo</option>
                                                        <option value="Manual">Limpieza Manual</option>
                                                        <option value="Mecánica">Limpieza Mecánica</option>
                                                        <option value="Soplado">Limpieza por Soplado</option>
                                                        <option value="Cribado">Limpieza por Cribado</option>
                                                        <option value="Combinada">Limpieza Combinada</option>
                                                    </select>
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Responsable del Proceso</label>
                                                    <input
                                                        type="text"
                                                        name="responsable_limpieza"
                                                        value={formData.responsable_limpieza}
                                                        onChange={handleInputChange}
                                                        placeholder="Nombre del responsable"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Tipos de Impurezas Encontradas</label>
                                                <input
                                                    type="text"
                                                    name="impurezas_encontradas"
                                                    value={formData.impurezas_encontradas}
                                                    onChange={handleInputChange}
                                                    placeholder="Ej: Piedras, palos, hojas secas, tierra"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Observaciones del Proceso</label>
                                                <textarea
                                                    name="observaciones_limpieza"
                                                    value={formData.observaciones_limpieza}
                                                    onChange={handleInputChange}
                                                    rows="3"
                                                    placeholder="Observaciones adicionales sobre el proceso de limpieza..."
                                                />
                                            </div>
                                        </div>

                                        <div className="form-actions">
                                            <button type="button" onClick={cerrarModal}>Cancelar</button>
                                            <button type="submit" className="btn-primary">🧼 Procesar Limpieza</button>
                                        </div>
                                    </form>
                                )}

                                {modalType === 'separacion' && selectedLote && (
                                    <form onSubmit={procesarSeparacionColores}>
                                        <div className="lote-info-modal">
                                            <h4>Información del Lote</h4>
                                            <p><strong>Número:</strong> {selectedLote.numero_lote}</p>
                                            <p><strong>Organización:</strong> {selectedLote.organizacion_nombre}</p>
                                            <p><strong>Peso después de limpieza:</strong> {selectedLote.peso_total_final || 'No registrado'} kg</p>
                                            <p><strong>Impurezas removidas:</strong> {selectedLote.peso_impurezas || 0} kg</p>
                                        </div>

                                        <div className="form-section">
                                            <h4>Datos del Proceso de Separación por Colores</h4>
                                            
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Peso de Granos Defectuosos Separados (kg) *</label>
                                                    <input
                                                        type="number"
                                                        name="peso_separado"
                                                        value={formSeparacion.peso_separado}
                                                        onChange={handleSeparacionInputChange}
                                                        step="0.01"
                                                        min="0"
                                                        required
                                                        placeholder="Ej: 8.25"
                                                    />
                                                    <small>Peso exacto de los granos defectuosos separados</small>
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Duración del Proceso (minutos)</label>
                                                    <input
                                                        type="number"
                                                        name="duracion_separacion"
                                                        value={formSeparacion.duracion_separacion}
                                                        onChange={handleSeparacionInputChange}
                                                        min="0"
                                                        placeholder="Ej: 90"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Método de Separación</label>
                                                    <select
                                                        name="metodo_separacion"
                                                        value={formSeparacion.metodo_separacion}
                                                        onChange={handleSeparacionInputChange}
                                                    >
                                                        <option value="">Seleccionar método</option>
                                                        <option value="Manual">Separación Manual</option>
                                                        <option value="Óptica">Separación Óptica</option>
                                                        <option value="Gravimetrica">Separación Gravimétrica</option>
                                                        <option value="Magnetica">Separación Magnética</option>
                                                        <option value="Combinada">Separación Combinada</option>
                                                    </select>
                                                </div>
                                                
                                                <div className="form-group">
                                                    <label>Responsable del Proceso</label>
                                                    <input
                                                        type="text"
                                                        name="responsable_separacion"
                                                        value={formSeparacion.responsable_separacion}
                                                        onChange={handleSeparacionInputChange}
                                                        placeholder="Nombre del responsable"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Tipos de Defectos Encontrados</label>
                                                <input
                                                    type="text"
                                                    name="tipos_defectos"
                                                    value={formSeparacion.tipos_defectos}
                                                    onChange={handleSeparacionInputChange}
                                                    placeholder="Ej: Granos negros, partidos, verdes, decolorados"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Observaciones del Proceso</label>
                                                <textarea
                                                    name="observaciones_separacion"
                                                    value={formSeparacion.observaciones_separacion}
                                                    onChange={handleSeparacionInputChange}
                                                    rows="3"
                                                    placeholder="Observaciones adicionales sobre el proceso de separación..."
                                                />
                                            </div>
                                        </div>

                                        <div className="form-actions">
                                            <button type="button" onClick={cerrarModal}>Cancelar</button>
                                            <button type="submit" className="btn-primary">🎨 Procesar Separación</button>
                                        </div>
                                    </form>
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
    );
};

export default Limpieza;