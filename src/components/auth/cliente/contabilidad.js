import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { getCurrentUser, isAdmin, isSecretaria } from '../../../utils/auth';
import '../../../styles/contabilidad.css';

const ContabilidadCostos = () => {
    const navigate = useNavigate();
    const [lotes, setLotes] = useState([]);
    const [registrosDescarga, setRegistrosDescarga] = useState([]);
    const [registrosUsoMaquinaria, setRegistrosUsoMaquinaria] = useState([]);
    const [insumos, setInsumos] = useState([]);
    const [tareasInsumo, setTareasInsumo] = useState([]);
    const [tareasProceso, setTareasProceso] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [isSecretariaUser, setIsSecretariaUser] = useState(false);
    const [loteSeleccionado, setLoteSeleccionado] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [datosContabilidad, setDatosContabilidad] = useState(null);

    // Verificar autenticación y rol del usuario
    useEffect(() => {
        const verificarAcceso = async () => {
            try {
                const userData = await getCurrentUser();
                const adminCheck = await isAdmin();
                const secretariaCheck = await isSecretaria();
                
                if (userData && (adminCheck || secretariaCheck)) {
                    setIsAuthenticated(true);
                    setUserRole(userData.rol);
                    setIsAdminUser(adminCheck);
                    setIsSecretariaUser(secretariaCheck);
                } else {
                    alert('Acceso denegado. Esta sección requiere permisos de administrador o secretaria.');
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

    useEffect(() => {
        if (isAuthenticated) {
            cargarDatos();
        }
    }, [isAuthenticated]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [procesosRes, descargasRes, maquinariaRes, insumosRes, tareasInsumoRes, tareasProcesoRes] = await Promise.all([
                axiosInstance.get('http://localhost:8000/api/users/procesos/'),
                axiosInstance.get('http://localhost:8000/api/users/descargas/'),
                axiosInstance.get('http://localhost:8000/api/users/uso-maquinaria/'),
                axiosInstance.get('http://localhost:8000/api/users/insumos/'),
                axiosInstance.get('http://localhost:8000/api/users/tareas/'),
                axiosInstance.get('http://localhost:8000/api/users/procesos/tareas/')
            ]);
            
            setLotes(procesosRes.data); // Ahora contiene procesos
            setRegistrosDescarga(descargasRes.data);
            setRegistrosUsoMaquinaria(maquinariaRes.data);
            setInsumos(insumosRes.data);
            setTareasInsumo(tareasInsumoRes.data);
            setTareasProceso(tareasProcesoRes.data);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            alert('Error al cargar los datos de contabilidad');
        }
        setLoading(false);
    };

    const calcularContabilidadLote = (proceso) => {
        // Para procesos, necesitamos obtener los lotes asociados y luego buscar las actividades
        const lotesDelProceso = proceso.lotes_info || proceso.lotes || [];
        const lotesIds = lotesDelProceso.map(lote => lote.id);
        
        console.log('Proceso:', proceso.nombre || proceso.numero);
        console.log('Lotes del proceso:', lotesIds);
        console.log('Total registros descarga:', registrosDescarga.length);
        console.log('Total registros maquinaria:', registrosUsoMaquinaria.length);
        console.log('Total tareas insumo:', tareasInsumo.length);
        console.log('Total tareas proceso:', tareasProceso.length);
        
        // Filtrar actividades relacionadas con los lotes del proceso
        const descargasProceso = registrosDescarga.filter(reg => {
            const loteId = reg.lote || reg.lote_id;
            return lotesIds.includes(loteId);
        });
        
        const usoMaquinariaProceso = registrosUsoMaquinaria.filter(reg => {
            const loteId = reg.lote || reg.lote_id;
            return lotesIds.includes(loteId);
        });
        
        // Filtrar tareas de insumos relacionadas con los lotes
        const tareasInsumoProceso = tareasInsumo.filter(tarea => {
            const loteId = tarea.lote || tarea.lote_id;
            return lotesIds.includes(loteId);
        });
        
        // Filtrar tareas de proceso relacionadas con el proceso actual
        const tareasProcesoActual = tareasProceso.filter(tarea => {
            return tarea.proceso === proceso.id || tarea.proceso_id === proceso.id;
        });
        
        console.log('Descargas encontradas:', descargasProceso.length);
        console.log('Uso maquinaria encontrado:', usoMaquinariaProceso.length);
        console.log('Tareas insumo encontradas:', tareasInsumoProceso.length);
        console.log('Tareas proceso encontradas:', tareasProcesoActual.length);
        
        const empleados = {};
        
        // Procesar descargas
        descargasProceso.forEach(descarga => {
            const empleadoNombre = descarga.empleado_nombre || descarga.empleado_username || 'Empleado desconocido';
            
            if (!empleados[empleadoNombre]) {
                empleados[empleadoNombre] = {
                    tareas: [],
                    tiempoTotal: 0,
                    insumosUtilizados: {}
                };
            }
            
            const insumoUtilizado = descarga.insumo_nombre || 'Sin insumo especificado';
            const cantidadInsumo = descarga.cantidad_insumo_usado || 0;
            const tiempoUsoInsumo = descarga.tiempo_uso_insumo || 0;
            
            empleados[empleadoNombre].tareas.push({
                tipo: 'Descarga',
                detalle: `Descarga de ${descarga.peso_descargado} kg`,
                tiempoDuracion: descarga.tiempo_descarga_minutos || 0,
                insumoUtilizado: insumoUtilizado,
                cantidadInsumo: cantidadInsumo,
                tiempoUsoInsumo: tiempoUsoInsumo,
                fecha: descarga.fecha_registro
            });
            
            empleados[empleadoNombre].tiempoTotal += descarga.tiempo_descarga_minutos || 0;
            
            // Agregar insumo utilizado
            if (cantidadInsumo > 0) {
                if (!empleados[empleadoNombre].insumosUtilizados[insumoUtilizado]) {
                    empleados[empleadoNombre].insumosUtilizados[insumoUtilizado] = {
                        cantidad: 0,
                        tiempoUso: 0
                    };
                }
                empleados[empleadoNombre].insumosUtilizados[insumoUtilizado].cantidad += cantidadInsumo;
                empleados[empleadoNombre].insumosUtilizados[insumoUtilizado].tiempoUso += tiempoUsoInsumo;
            }
        });
        
        // Procesar uso de maquinaria
        usoMaquinariaProceso.forEach(usoMaq => {
            const empleadoNombre = usoMaq.empleado_nombre || usoMaq.empleado_username || 'Empleado desconocido';
            
            if (!empleados[empleadoNombre]) {
                empleados[empleadoNombre] = {
                    tareas: [],
                    tiempoTotal: 0,
                    insumosUtilizados: {}
                };
            }
            
            const maquinariaNombre = usoMaq.insumo_nombre || usoMaq.maquinaria_nombre || usoMaq.tipo_maquinaria_display || 'Maquinaria no especificada';
            
            empleados[empleadoNombre].tareas.push({
                tipo: 'Uso de Maquinaria',
                detalle: `Uso de ${maquinariaNombre}`,
                tiempoDuracion: usoMaq.tiempo_uso_minutos || 0,
                insumoUtilizado: maquinariaNombre,
                cantidadInsumo: 1,
                tiempoUsoInsumo: usoMaq.tiempo_uso_minutos || 0,
                fecha: usoMaq.fecha_registro
            });
            
            empleados[empleadoNombre].tiempoTotal += usoMaq.tiempo_uso_minutos || 0;
            
            // Agregar maquinaria utilizada
            if (!empleados[empleadoNombre].insumosUtilizados[maquinariaNombre]) {
                empleados[empleadoNombre].insumosUtilizados[maquinariaNombre] = {
                    cantidad: 0,
                    tiempoUso: 0
                };
            }
            empleados[empleadoNombre].insumosUtilizados[maquinariaNombre].cantidad += 1;
            empleados[empleadoNombre].insumosUtilizados[maquinariaNombre].tiempoUso += usoMaq.tiempo_uso_minutos || 0;
        });
        
        // Procesar tareas con insumos
        tareasInsumoProceso.forEach(tarea => {
            const empleadoNombre = tarea.empleado_nombre || tarea.empleado_username || 'Empleado desconocido';
            
            if (!empleados[empleadoNombre]) {
                empleados[empleadoNombre] = {
                    tareas: [],
                    tiempoTotal: 0,
                    insumosUtilizados: {}
                };
            }
            
            const insumoUtilizado = tarea.insumo_nombre || 'Insumo no especificado';
            const cantidadInsumo = tarea.cantidad || 0;
            const tiempoUso = tarea.tiempo_uso || 0;
            
            empleados[empleadoNombre].tareas.push({
                tipo: 'Tarea con Insumo',
                detalle: tarea.descripcion || 'Tarea con insumo',
                tiempoDuracion: tiempoUso,
                insumoUtilizado: insumoUtilizado,
                cantidadInsumo: cantidadInsumo,
                tiempoUsoInsumo: tiempoUso,
                fecha: tarea.fecha_creacion
            });
            
            empleados[empleadoNombre].tiempoTotal += tiempoUso || 0;
            
            // Agregar insumo utilizado
            if (cantidadInsumo > 0) {
                if (!empleados[empleadoNombre].insumosUtilizados[insumoUtilizado]) {
                    empleados[empleadoNombre].insumosUtilizados[insumoUtilizado] = {
                        cantidad: 0,
                        tiempoUso: 0
                    };
                }
                empleados[empleadoNombre].insumosUtilizados[insumoUtilizado].cantidad += cantidadInsumo;
                empleados[empleadoNombre].insumosUtilizados[insumoUtilizado].tiempoUso += tiempoUso || 0;
            }
        });
        
        // Procesar tareas de proceso
        tareasProcesoActual.forEach(tarea => {
            const empleadoNombre = tarea.empleado_nombre || tarea.empleado_username || 'Empleado desconocido';
            
            if (!empleados[empleadoNombre]) {
                empleados[empleadoNombre] = {
                    tareas: [],
                    tiempoTotal: 0,
                    insumosUtilizados: {}
                };
            }
            
            const tipoTarea = tarea.tipo_tarea_display || tarea.tipo_tarea || 'Tarea de proceso';
            const fase = tarea.fase_display || tarea.fase || '';
            const duracion = tarea.duracion_minutos || 0;
            
            empleados[empleadoNombre].tareas.push({
                tipo: 'Tarea de Proceso',
                detalle: `${tipoTarea} - Fase: ${fase}`,
                tiempoDuracion: duracion,
                insumoUtilizado: 'Proceso de producción',
                cantidadInsumo: 1,
                tiempoUsoInsumo: duracion,
                fecha: tarea.fecha_registro
            });
            
            empleados[empleadoNombre].tiempoTotal += duracion || 0;
            
            // Agregar actividad de proceso
            const actividadProceso = `Tarea: ${tipoTarea}`;
            if (!empleados[empleadoNombre].insumosUtilizados[actividadProceso]) {
                empleados[empleadoNombre].insumosUtilizados[actividadProceso] = {
                    cantidad: 0,
                    tiempoUso: 0
                };
            }
            empleados[empleadoNombre].insumosUtilizados[actividadProceso].cantidad += 1;
            empleados[empleadoNombre].insumosUtilizados[actividadProceso].tiempoUso += duracion || 0;
        });
        
        console.log('Empleados con actividad:', Object.keys(empleados));
        return empleados;
    };

    const abrirDetalleContabilidad = (lote) => {
        const datosContabilidadLote = calcularContabilidadLote(lote);
        setDatosContabilidad(datosContabilidadLote);
        setLoteSeleccionado(lote);
        setShowModal(true);
    };

    const cerrarModal = () => {
        setShowModal(false);
        setLoteSeleccionado(null);
        setDatosContabilidad(null);
    };

    if (!isAuthenticated) {
        return <div>Verificando acceso...</div>;
    }

    return (
        <div className="app-container">
            <Sidebar />
            
            <div className="contabilidad-container">
                <BottomNavigator />
                
                <div className="contabilidad-header">
                    <h1>Contabilidad de Costos</h1>
                    <p>FAPECAFES - Control de Costos por Lote</p>
                </div>

                {/* Tabla de procesos */}
                <div className="lotes-contabilidad-section">
                    <h2>Procesos con Actividad Registrada</h2>
                    
                    <div className="lotes-contabilidad-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Proceso</th>
                                    <th>Fecha de Creación</th>
                                    <th>Total Quintales</th>
                                    <th>Estado</th>
                                    <th>Fase Actual</th>
                                    <th>Actividades</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lotes.map(proceso => {
                                    const contabilidadProceso = calcularContabilidadLote(proceso);
                                    const tieneActividad = Object.keys(contabilidadProceso).length > 0;
                                    
                                    return (
                                        <tr key={proceso.id} className={tieneActividad ? 'con-actividad' : 'sin-actividad'}>
                                            <td>{proceso.nombre || proceso.numero}</td>
                                            <td>{new Date(proceso.fecha_inicio).toLocaleDateString()}</td>
                                            <td>{proceso.quintales_totales || 0}</td>
                                            <td>
                                                <span className={`estado-badge ${proceso.estado?.toLowerCase()}`}>
                                                    {proceso.estado}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`fase-badge ${proceso.fase_actual?.toLowerCase()}`}>
                                                    {proceso.fase_actual}
                                                </span>
                                            </td>
                                            <td>
                                                {tieneActividad ? (
                                                    <span className="actividad-badge si">
                                                        {Object.keys(contabilidadProceso).length} empleado(s)
                                                    </span>
                                                ) : (
                                                    <span className="actividad-badge no">Sin actividad</span>
                                                )}
                                            </td>
                                            <td>
                                                <button 
                                                    className="btn-ver-detalle"
                                                    onClick={() => abrirDetalleContabilidad(proceso)}
                                                    disabled={!tieneActividad}
                                                >
                                                    Ver Detalle
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal de detalle de contabilidad */}
                {showModal && loteSeleccionado && datosContabilidad && (
                    <div className="modal-overlay" onClick={cerrarModal}>
                        <div className="modal-content contabilidad-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Contabilidad de Costos</h3>
                                <button className="close-btn" onClick={cerrarModal}>×</button>
                            </div>
                            
                            <div className="modal-body">
                                <div className="lote-info-header">
                                    <h4>Datos del Lote</h4>
                                    <div className="lote-info-grid">
                                        <div><strong>Nombre lote:</strong> {loteSeleccionado.numero_lote}</div>
                                        <div><strong>Organización:</strong> {loteSeleccionado.organizacion_nombre}</div>
                                        <div><strong>Fecha de entrega:</strong> {new Date(loteSeleccionado.fecha_entrega).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <div className="informacion-procesos">
                                    <h4>Información de procesos</h4>
                                    
                                    <div className="contabilidad-tabla">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Nombre empleado</th>
                                                    <th>Tarea realizada</th>
                                                    <th>Tiempo duración tarea (minutos)</th>
                                                    <th>Insumo utilizado</th>
                                                    <th>Cantidad de insumo utilizado</th>
                                                    <th>Tiempo de uso insumo (minutos)</th>
                                                    <th>Fecha</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(datosContabilidad).map(([empleadoNombre, datos]) => (
                                                    datos.tareas.map((tarea, index) => (
                                                        <tr key={`${empleadoNombre}-${index}`}>
                                                            <td>{empleadoNombre}</td>
                                                            <td>{tarea.detalle}</td>
                                                            <td>{tarea.tiempoDuracion}</td>
                                                            <td>{tarea.insumoUtilizado}</td>
                                                            <td>{tarea.cantidadInsumo}</td>
                                                            <td>{tarea.tiempoUsoInsumo}</td>
                                                            <td>{new Date(tarea.fecha).toLocaleDateString()}</td>
                                                        </tr>
                                                    ))
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={cerrarModal}>
                                    Cerrar
                                </button>
                                <button className="btn-primary" onClick={() => window.print()}>
                                    🖨️ Imprimir
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner">Cargando datos de contabilidad...</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContabilidadCostos;