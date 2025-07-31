import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import '../../../styles/empleado.css';

function EmpleadoDashboard() {
  const [activeTab, setActiveTab] = useState('registrar-descarga');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para registro de descarga
  const [lotesDisponibles, setLotesDisponibles] = useState([]);
  const [insumosDisponibles, setInsumosDisponibles] = useState([]);
  const [descargaForm, setDescargaForm] = useState({
    lote: '',
    insumo: '',
    cantidad_insumo_usado: '',
    tiempo_uso_insumo: '',
    peso_descargado: '',
    hora_inicio: '',
    hora_fin: '',
    observaciones: ''
  });
  
  // Estados para estadísticas y historial (solo descargas)
  const [estadisticasEmpleado, setEstadisticasEmpleado] = useState(null);
  const [historialActividades, setHistorialActividades] = useState({
    descargas: []
  });

  // Nuevos estados para procesamiento de café
  const [lotesProcesamiento, setLotesProcesamiento] = useState([]);
  const [muestrasAnalisis, setMuestrasAnalisis] = useState([]);
  const [showModalProcesos, setShowModalProcesos] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedLote, setSelectedLote] = useState(null);
  const [selectedMuestra, setSelectedMuestra] = useState(null);
  const [formDataProcesos, setFormDataProcesos] = useState({});
  
  // Estados para segundo muestreo
  const [showSegundoMuestreoModal, setShowSegundoMuestreoModal] = useState(false);
  const [muestrasContaminadasData, setMuestrasContaminadasData] = useState([]);
  const [loteParaSegundoMuestreo, setLoteParaSegundoMuestreo] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);

      // Cargar datos del usuario
      const userResponse = await axiosInstance.get('/users/me/');
      setUserData(userResponse.data);

      // Verificar que el usuario es empleado
      if (userResponse.data.rol !== 'EMPLEADO') {
        navigate('/dashboard');
        return;
      }

      // Cargar lotes disponibles para descarga
      try {
        const lotesResponse = await axiosInstance.get('/users/lotes-disponibles-descarga/');
        console.log('Respuesta de lotes disponibles:', lotesResponse.data);
        setLotesDisponibles(lotesResponse.data?.results || lotesResponse.data || []);
      } catch (error) {
        console.error('Error cargando lotes:', error);
        setLotesDisponibles([]);
      }

      // Cargar insumos disponibles
      try {
        const insumosResponse = await axiosInstance.get('/users/insumos/');
        console.log('Respuesta de insumos disponibles:', insumosResponse.data);
        setInsumosDisponibles(insumosResponse.data?.results || insumosResponse.data || []);
      } catch (error) {
        console.error('Error cargando insumos:', error);
        setInsumosDisponibles([]);
      }

      // Cargar estadísticas del empleado usando el nuevo endpoint
      try {
        const statsResponse = await axiosInstance.get('/users/empleados/mis-estadisticas/');
        console.log('Estadísticas del empleado cargadas:', statsResponse.data);
        setEstadisticasEmpleado(statsResponse.data);
      } catch (error) {
        console.error('Error cargando estadísticas del empleado:', error);
        setEstadisticasEmpleado({
          descargas_realizadas: { total: 0, peso_total: 0, hoy: 0, esta_semana: 0, este_mes: 0 }
        });
      }

      // Cargar historial de actividades usando el nuevo endpoint
      try {
        const historialResponse = await axiosInstance.get('/users/empleados/mi-historial/');
        console.log('Historial de actividades cargado:', historialResponse.data);
        setHistorialActividades({
          descargas: historialResponse.data.descargas || []
        });
      } catch (error) {
        console.error('Error cargando historial de actividades:', error);
        setHistorialActividades({
          descargas: []
        });
      }

      // Cargar lotes para procesamiento
      try {
        const procesosResponse = await axiosInstance.get('/users/lotes/');
        console.log('Lotes para procesamiento cargados:', procesosResponse.data);
        setLotesProcesamiento(procesosResponse.data || []);
      } catch (error) {
        console.error('Error cargando lotes para procesamiento:', error);
        setLotesProcesamiento([]);
      }

      // Cargar muestras para análisis
      try {
        const muestrasResponse = await axiosInstance.get('/users/muestras/');
        console.log('Muestras para análisis cargadas:', muestrasResponse.data);
        setMuestrasAnalisis(muestrasResponse.data || []);
      } catch (error) {
        console.error('Error cargando muestras para análisis:', error);
        setMuestrasAnalisis([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setLoading(false);
      
      // Si es un error de autenticación que no se pudo resolver automáticamente
      if (error.response?.status === 401) {
        alert('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login');
      } else {
        alert('Error cargando los datos. Por favor, recargue la página.');
      }
    }
  };

  const registrarDescarga = async (e) => {
    e.preventDefault();
    
    if (!descargaForm.lote || !descargaForm.peso_descargado) {
      alert('Por favor, complete todos los campos requeridos');
      return;
    }

    // Validar cantidad de insumo si se especificó un insumo
    if (descargaForm.insumo && !descargaForm.cantidad_insumo_usado) {
      alert('Por favor, especifique la cantidad de insumo utilizado');
      return;
    }

    try {
      // Preparar datos para el registro - NO incluir 'empleado' ya que se asigna automáticamente en el backend
      const descargaData = {
        lote: parseInt(descargaForm.lote),
        peso_descargado: parseFloat(descargaForm.peso_descargado),
        observaciones: descargaForm.observaciones || ''
      };

      // Incluir insumo, cantidad y tiempo de uso si se especificaron
      if (descargaForm.insumo) {
        descargaData.insumo = parseInt(descargaForm.insumo);
        if (descargaForm.cantidad_insumo_usado) {
          descargaData.cantidad_insumo_usado = parseFloat(descargaForm.cantidad_insumo_usado);
        }
        if (descargaForm.tiempo_uso_insumo) {
          descargaData.tiempo_uso_insumo = parseInt(descargaForm.tiempo_uso_insumo);
        }
      }

      // Solo incluir horas si ambas están presentes
      if (descargaForm.hora_inicio && descargaForm.hora_fin) {
        descargaData.hora_inicio = descargaForm.hora_inicio;
        descargaData.hora_fin = descargaForm.hora_fin;
      }

      console.log('Datos de descarga a enviar:', descargaData);

      await axiosInstance.post('/users/descargas/', descargaData);
      
      const insumoInfo = descargaForm.insumo && descargaForm.cantidad_insumo_usado 
        ? `\nInsumo usado: ${descargaForm.cantidad_insumo_usado} unidades${descargaForm.tiempo_uso_insumo ? ` durante ${descargaForm.tiempo_uso_insumo} minutos` : ''}`
        : '';
      
      alert(`¡Descarga registrada exitosamente!\n\nPeso descargado: ${descargaForm.peso_descargado} kg${insumoInfo}\nRegistrado por: ${userData.nombre_completo || userData.username}`);
      
      // Limpiar formulario
      setDescargaForm({
        lote: '', insumo: '', cantidad_insumo_usado: '', tiempo_uso_insumo: '', peso_descargado: '', hora_inicio: '', hora_fin: '', observaciones: ''
      });
      
      // Recargar datos
      cargarDatosIniciales();
      
    } catch (error) {
      console.error('Error registrando descarga:', error);
      if (error.response?.data) {
        console.error('Detalles del error:', error.response.data);
        const errorMessage = typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data);
        alert(`Error: ${errorMessage}`);
      } else if (error.response?.status === 401) {
        alert('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login');
      } else {
        alert('Error al registrar la descarga. Por favor, inténtelo de nuevo.');
      }
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-ES');
  };

  const formatearHora = (hora) => {
    return new Date(hora).toLocaleTimeString('es-ES');
  };

  const obtenerLoteInfo = (loteId) => {
    const lote = lotesDisponibles.find(l => l.id == loteId);
    return lote || null;
  };

  // Funciones para procesamiento de café
  const abrirModalProcesos = (tipo, lote = null, muestra = null) => {
    setModalType(tipo);
    setSelectedLote(lote);
    setSelectedMuestra(muestra);
    setShowModalProcesos(true);
    setFormDataProcesos({});
  };

  const cerrarModalProcesos = () => {
    setShowModalProcesos(false);
    setModalType('');
    setSelectedLote(null);
    setSelectedMuestra(null);
    setFormDataProcesos({});
  };

  const handleInputChangeProcesos = (e) => {
    const { name, value } = e.target;
    setFormDataProcesos(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const seleccionarMuestras = async (e) => {
    e.preventDefault();
    if (!selectedLote || !formDataProcesos.propietarios_seleccionados?.length) {
      alert('Por favor, seleccione al menos un propietario para las muestras');
      return;
    }

    try {
      const datosSeleccion = {
        lote_id: selectedLote.id,
        propietarios_seleccionados: formDataProcesos.propietarios_seleccionados
      };

      await axiosInstance.post('/users/muestras/seleccionar/', datosSeleccion);
      alert('Muestras seleccionadas exitosamente. El lote está ahora en proceso de análisis.');
      cerrarModalProcesos();
      cargarDatosIniciales();
    } catch (error) {
      console.error('Error al seleccionar muestras:', error);
      alert('Error al seleccionar muestras: ' + (error.response?.data?.error || error.message));
    }
  };

  const registrarResultadoMuestra = async (e) => {
    e.preventDefault();
    if (!selectedMuestra || !formDataProcesos.estado) {
      alert('Por favor, complete todos los campos requeridos');
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/users/muestras/${selectedMuestra.id}/resultado/`,
        formDataProcesos
      );
      
      const data = response.data;
      cerrarModalProcesos();
      alert(data.mensaje);
      
      // Verificar si requiere segundo muestreo
      if (data.requiere_segundo_muestreo) {
        setMuestrasContaminadasData(data.muestras_contaminadas);
        setLoteParaSegundoMuestreo(selectedMuestra.lote);
        setShowSegundoMuestreoModal(true);
      }
      
      cargarDatosIniciales();
    } catch (error) {
      console.error('Error al registrar resultado:', error);
      alert('Error al registrar resultado: ' + (error.response?.data?.error || error.message));
    }
  };

  const procesarLimpieza = async (e) => {
    e.preventDefault();
    if (!selectedLote || !formDataProcesos.peso_impurezas || !formDataProcesos.tipo_limpieza) {
      alert('Por favor, complete todos los campos requeridos');
      return;
    }

    try {
      const datosEnvio = {
        lote_id: selectedLote.id,
        peso_impurezas: formDataProcesos.peso_impurezas,
        tipo_limpieza: formDataProcesos.tipo_limpieza,
        responsable_limpieza: formDataProcesos.responsable_limpieza,
        duracion_limpieza: formDataProcesos.duracion_limpieza,
        impurezas_encontradas: formDataProcesos.impurezas_encontradas,
        observaciones_limpieza: formDataProcesos.observaciones_limpieza
      };

      const response = await axiosInstance.post(
        '/users/lotes/procesar-limpieza/',
        datosEnvio
      );
      
      const data = response.data;
      alert(`✅ LIMPIEZA PROCESADA EXITOSAMENTE\n\n${data.mensaje}`);
      cerrarModalProcesos();
      cargarDatosIniciales();
    } catch (error) {
      console.error('Error al procesar limpieza:', error);
      alert('Error al procesar limpieza: ' + (error.response?.data?.error || error.message));
    }
  };

  const procesarSeparacionColores = async (e) => {
    e.preventDefault();
    if (!selectedLote || !formDataProcesos.responsable_separacion) {
      alert('Por favor, complete todos los campos requeridos');
      return;
    }

    try {
      // Construir clasificación por colores
      const clasificacion_colores = {};
      ['verde', 'amarillo', 'rojo', 'negro', 'mixto'].forEach(color => {
        const peso = formDataProcesos[`color_${color}_peso`];
        const porcentaje = formDataProcesos[`color_${color}_porcentaje`];
        if (peso || porcentaje) {
          clasificacion_colores[color] = {
            peso: peso || 0,
            porcentaje: porcentaje || 0
          };
        }
      });

      const datosEnvio = {
        lote_id: selectedLote.id,
        responsable_separacion: formDataProcesos.responsable_separacion,
        fecha_separacion: formDataProcesos.fecha_separacion,
        calidad_general: formDataProcesos.calidad_general,
        duracion_proceso: formDataProcesos.duracion_proceso || 0,
        observaciones_separacion: formDataProcesos.observaciones_separacion || '',
        clasificacion_colores: clasificacion_colores
      };

      const response = await axiosInstance.post(
        '/users/lotes/procesar-separacion-colores/',
        datosEnvio
      );
      
      const data = response.data;
      alert(`✅ SEPARACIÓN POR COLORES COMPLETADA\n\n${data.mensaje}`);
      cerrarModalProcesos();
      cargarDatosIniciales();
    } catch (error) {
      console.error('Error al procesar separación por colores:', error);
      alert('Error al procesar separación por colores: ' + (error.response?.data?.error || error.message));
    }
  };

  const procesarRecepcionFinal = async (e) => {
    e.preventDefault();
    if (!selectedLote || !formDataProcesos.responsable_recepcion) {
      alert('Por favor, complete todos los campos requeridos');
      return;
    }

    try {
      const datosEnvio = {
        lote_id: selectedLote.id,
        responsable_recepcion: formDataProcesos.responsable_recepcion,
        fecha_recepcion_final: formDataProcesos.fecha_recepcion_final,
        calificacion_final: formDataProcesos.calificacion_final,
        observaciones_finales: formDataProcesos.observaciones_finales || ''
      };

      const response = await axiosInstance.post(
        '/users/lotes/enviar-recepcion-final/',
        datosEnvio
      );
      
      const data = response.data;
      alert(`✅ RECEPCIÓN FINAL COMPLETADA\n\n${data.mensaje}`);
      cerrarModalProcesos();
      cargarDatosIniciales();
    } catch (error) {
      console.error('Error al procesar recepción final:', error);
      alert('Error al procesar recepción final: ' + (error.response?.data?.error || error.message));
    }
  };

  const enviarParteLimpiaALimpieza = async (loteId) => {
    try {
      const response = await axiosInstance.post(
        `/users/lotes/${loteId}/enviar-parte-limpia-limpieza/`,
        {}
      );
      
      const data = response.data;
      alert(`✅ SEPARACIÓN EXITOSA Y ENVIADO A LIMPIEZA\n\n${data.mensaje}`);
      cargarDatosIniciales();
    } catch (error) {
      console.error('Error al enviar parte limpia a limpieza:', error);
      alert('Error al enviar a limpieza: ' + (error.response?.data?.error || error.message));
    }
  };

  const confirmarSegundoMuestreo = async () => {
    try {
      const muestrasContaminadasIds = muestrasContaminadasData.map(m => m.id);
      const response = await axiosInstance.post(
        '/users/muestras/segundo-muestreo/',
        {
          lote_id: loteParaSegundoMuestreo,
          muestras_contaminadas: muestrasContaminadasIds
        }
      );
      
      alert(`${response.data.mensaje}\nAhora debe analizar las nuevas muestras de seguimiento.`);
      setShowSegundoMuestreoModal(false);
      cargarDatosIniciales();
    } catch (error) {
      console.error('Error al crear segundo muestreo:', error);
      alert('Error al crear segundo muestreo: ' + (error.response?.data?.error || error.message));
    }
  };

  const cancelarSegundoMuestreo = () => {
    setShowSegundoMuestreoModal(false);
    setMuestrasContaminadasData([]);
    setLoteParaSegundoMuestreo(null);
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return 'Pendiente';
      case 'EN_PROCESO': return 'En Proceso';
      case 'APROBADO': return 'Aprobado';
      case 'RECHAZADO': return 'Rechazado';
      case 'SEPARACION_PENDIENTE': return 'Separación Pendiente';
      case 'SEPARACION_APLICADA': return 'Separación Aplicada';
      case 'LIMPIO': return 'Limpio';
      case 'SEPARADO': return 'Separado';
      case 'FINALIZADO': return 'Finalizado';
      default: return estado;
    }
  };

  // Función para aprobar/rechazar muestra directamente
  const procesarMuestraDirecta = async (muestra, estado) => {
    try {
      const datosResultado = {
        estado: estado,
        resultado_analisis: estado === 'APROBADA' ? 'Muestra aprobada - Sin contaminación detectada' : 'Muestra rechazada - Contaminación detectada',
        observaciones: `Procesado directamente por empleado: ${userData.nombre_completo || userData.username}`
      };

      const response = await axiosInstance.post(
        `/users/muestras/${muestra.id}/resultado/`,
        datosResultado
      );
      
      const data = response.data;
      alert(data.mensaje);
      
      // Verificar si requiere segundo muestreo
      if (data.requiere_segundo_muestreo) {
        setMuestrasContaminadasData(data.muestras_contaminadas);
        setLoteParaSegundoMuestreo(muestra.lote);
        setShowSegundoMuestreoModal(true);
      }
      
      // Recargar datos
      cargarDatosIniciales();
      
    } catch (error) {
      console.error('Error al procesar muestra:', error);
      alert('Error al procesar muestra: ' + (error.response?.data?.error || error.message));
    }
  };

  // Función para confirmar antes de procesar
  const confirmarProcesarMuestra = (muestra, estado) => {
    const accion = estado === 'APROBADA' ? 'aprobar' : 'rechazar';
    const mensaje = `¿Está seguro que desea ${accion} la muestra ${muestra.numero_muestra} del propietario ${muestra.propietario_nombre}?`;
    
    if (window.confirm(mensaje)) {
      procesarMuestraDirecta(muestra, estado);
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

  if (loading) {
    return (
      <div className="empleado-container">
        <div className="loading">Cargando dashboard del empleado...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="empleado-container">
        <div className="error">Error cargando datos del usuario</div>
      </div>
    );
  }

  return (
    <div className="empleado-container">
      <header className="empleado-header">
        <div className="empleado-title">
          <h1>Dashboard de Empleado</h1>
          <p>Empleado: {userData.nombre_completo || userData.username}</p>
          <small>Registre aquí las actividades de descarga</small>
        </div>
        <button 
          className="btn-logout"
          onClick={() => {
            localStorage.removeItem('access_token');
            navigate('/login');
          }}
        >
          Cerrar Sesión
        </button>
      </header>

      <nav className="empleado-nav">
        <button 
          className={`nav-btn ${activeTab === 'registrar-descarga' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrar-descarga')}
        >
          📦 Registrar Tareas
        </button>
        <button 
          className={`nav-btn ${activeTab === 'analisis-muestras' ? 'active' : ''}`}
          onClick={() => setActiveTab('analisis-muestras')}
        >
          🔬 Análisis de Muestras
        </button>
        <button 
          className={`nav-btn ${activeTab === 'procesamiento' ? 'active' : ''}`}
          onClick={() => setActiveTab('procesamiento')}
        >
          🧽 Procesamiento
        </button>
        <button 
          className={`nav-btn ${activeTab === 'estadisticas' ? 'active' : ''}`}
          onClick={() => setActiveTab('estadisticas')}
        >
          📊 Estadísticas
        </button>
        <button 
          className={`nav-btn ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
        >
          📋 Historial
        </button>
      </nav>

      <div className="empleado-content">
        {/* Tab: Registrar Descarga */}
        {activeTab === 'registrar-descarga' && (
          <div className="tab-content">
            <h2>Registrar Tareas</h2>
            <div className="info-card">
              <p><strong>Instrucciones:</strong> Registre aquí el trabajo de descarga realizado. 
              Especifique la cantidad de kilogramos que descargó de un lote específico.</p>
            </div>

            <div className="form-card">
              <form onSubmit={registrarDescarga}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="lote">
                      <span className="required">*</span> Lote que se está descargando:
                    </label>
                    <select
                      id="lote"
                      value={descargaForm.lote}
                      onChange={(e) => setDescargaForm({...descargaForm, lote: e.target.value})}
                      required
                    >
                      <option value="">Seleccione el lote</option>
                      {Array.isArray(lotesDisponibles) && lotesDisponibles.map(lote => (
                        <option key={lote.id} value={lote.id}>
                          Lote {lote.numero_lote} - {lote.organizacion_nombre || lote.organizacion?.nombre || 'Sin organización'} 
                          (Pendiente: {lote.peso_pendiente?.toFixed(2)} kg)
                        </option>
                      ))}
                    </select>
                    {descargaForm.lote && (
                      <div className="lote-info">
                        {(() => {
                          const loteInfo = obtenerLoteInfo(descargaForm.lote);
                          return loteInfo ? (
                            <div className="info-box">
                              <p><strong>Información del lote:</strong></p>
                              <p>• Total: {loteInfo.total_quintales} quintales ({loteInfo.peso_total_kg} kg)</p>
                              <p>• Ya descargado: {loteInfo.peso_descargado?.toFixed(2)} kg ({loteInfo.porcentaje_descargado}%)</p>
                              <p>• Pendiente por descargar: {loteInfo.peso_pendiente?.toFixed(2)} kg</p>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="insumo">Insumo utilizado:</label>
                  <select
                    id="insumo"
                    value={descargaForm.insumo}
                    onChange={(e) => setDescargaForm({...descargaForm, insumo: e.target.value, cantidad_insumo_usado: ''})}
                  >
                    <option value="">Seleccione el insumo</option>
                    {Array.isArray(insumosDisponibles) && insumosDisponibles.map(insumo => (
                      <option key={insumo.id} value={insumo.id}>
                        {insumo.nombre} - {insumo.descripcion} (Stock: {insumo.cantidad_disponible} {insumo.unidad_medida_display})
                      </option>
                    ))}
                  </select>
                </div>

                {descargaForm.insumo && (
                  <div className="form-group">
                    <label htmlFor="cantidad_insumo_usado">
                      Cantidad de insumo utilizado:
                    </label>
                    <input
                      type="number"
                      id="cantidad_insumo_usado"
                      step="0.1"
                      min="0.1"
                      value={descargaForm.cantidad_insumo_usado}
                      onChange={(e) => setDescargaForm({...descargaForm, cantidad_insumo_usado: e.target.value})}
                      placeholder="Ej: 2"
                    />
                    <small>
                      {(() => {
                        const insumoSeleccionado = insumosDisponibles.find(ins => ins.id == descargaForm.insumo);
                        if (insumoSeleccionado) {
                          const tiposQueRestan = ['CONTENEDOR', 'EQUIPO_MEDICION', 'OTRO'];
                          const debeRestarStock = tiposQueRestan.includes(insumoSeleccionado.tipo);
                          return `Unidad: ${insumoSeleccionado.unidad_medida_display}. Stock actual: ${insumoSeleccionado.cantidad_disponible}. ${debeRestarStock ? '⚠️ Este insumo restará del stock automáticamente.' : 'ℹ️ Este insumo no afecta el stock.'}`;
                        }
                        return 'Especifique cuántas unidades del insumo utilizó';
                      })()}
                    </small>
                  </div>
                )}

                {descargaForm.insumo && (
                  <div className="form-group">
                    <label htmlFor="tiempo_uso_insumo">
                      Tiempo de uso del insumo (minutos):
                    </label>
                    <input
                      type="number"
                      id="tiempo_uso_insumo"
                      min="1"
                      max="480"
                      value={descargaForm.tiempo_uso_insumo}
                      onChange={(e) => setDescargaForm({...descargaForm, tiempo_uso_insumo: e.target.value})}
                      placeholder="Ej: 30"
                    />
                    <small>
                      Especifique por cuántos minutos utilizó el insumo (opcional)
                    </small>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="peso_descargado">
                    <span className="required">*</span> Peso descargado (kg):
                  </label>
                  <input
                    type="number"
                    id="peso_descargado"
                    step="0.1"
                    min="0.1"
                    max="1000"
                    value={descargaForm.peso_descargado}
                    onChange={(e) => setDescargaForm({...descargaForm, peso_descargado: e.target.value})}
                    placeholder="Ejemplo: 25.5"
                    required
                  />
                  <small>Ingrese la cantidad descargada</small>
                </div>

                <div className="form-group">
                  <label htmlFor="hora_inicio">Hora de inicio:</label>
                  <input
                    type="datetime-local"
                    id="hora_inicio"
                    value={descargaForm.hora_inicio}
                    onChange={(e) => setDescargaForm({...descargaForm, hora_inicio: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hora_fin">Hora de fin:</label>
                  <input
                    type="datetime-local"
                    id="hora_fin"
                    value={descargaForm.hora_fin}
                    onChange={(e) => setDescargaForm({...descargaForm, hora_fin: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="observaciones">Observaciones (opcional):</label>
                  <textarea
                    id="observaciones"
                    value={descargaForm.observaciones}
                    onChange={(e) => setDescargaForm({...descargaForm, observaciones: e.target.value})}
                    placeholder="Ejemplo: Descarga realizada en turno matutino, café en buen estado"
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    ✅ Registrar Tarea
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setDescargaForm({ lote: '', insumo: '', cantidad_insumo_usado: '', tiempo_uso_insumo: '', peso_descargado: '', hora_inicio: '', hora_fin: '', observaciones: '' })}
                  >
                    🔄 Limpiar Formulario
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Estadísticas */}
        {activeTab === 'estadisticas' && (
          <div className="tab-content">
            <h2>📊 Mis Estadísticas Personales</h2>
            <div className="info-card">
              <p><strong>Resumen de tu trabajo:</strong> Aquí puedes ver un resumen completo de las actividades de descarga que has realizado en el sistema.</p>
            </div>

            <div className="estadisticas-container">
              {/* Estadísticas principales - solo descargas */}
              <div className="estadisticas-grid">
                <div className="stat-card descargas">
                  <div className="stat-icon">📦</div>
                  <div className="stat-content">
                    <h3>Descargas Realizadas</h3>
                    <div className="stat-number">{estadisticasEmpleado?.descargas_realizadas?.total || 0}</div>
                    <div className="stat-details">
                      <span>Peso total: {estadisticasEmpleado?.descargas_realizadas?.peso_total?.toFixed(1) || 0} kg</span>
                      <span>Esta semana: {estadisticasEmpleado?.descargas_realizadas?.esta_semana || 0}</span>
                      <span>Este mes: {estadisticasEmpleado?.descargas_realizadas?.este_mes || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estadísticas de rendimiento */}
              <div className="rendimiento-section">
                <h3>📈 Rendimiento Semanal</h3>
                <div className="rendimiento-grid">
                  <div className="rendimiento-card">
                    <h4>Esta Semana</h4>
                    <div className="rendimiento-stats">
                      <div className="rendimiento-item">
                        <span className="label">Descargas:</span>
                        <span className="value">{estadisticasEmpleado?.descargas_realizadas?.esta_semana || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rendimiento-card">
                    <h4>Este Mes</h4>
                    <div className="rendimiento-stats">
                      <div className="rendimiento-item">
                        <span className="label">Descargas:</span>
                        <span className="value">{estadisticasEmpleado?.descargas_realizadas?.este_mes || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Historial */}
        {activeTab === 'historial' && (
          <div className="tab-content">
            <h2>📋 Historial de Actividades</h2>
            <div className="info-card">
              <p><strong>Registro completo:</strong> Aquí puedes ver todas las descargas que has registrado, ordenadas por fecha más reciente.</p>
            </div>

            <div className="historial-container">
              <div className="historial-section">
                <h3>Historial de Descargas</h3>
                {historialActividades.descargas.length === 0 ? (
                  <div className="no-data">
                    <p>📭 No tienes descargas registradas aún.</p>
                    <p>Utiliza la pestaña "Registrar Tareas" para añadir tu primera descarga.</p>
                  </div>
                ) : (
                  <div className="registros-list">
                    {historialActividades.descargas.map(descarga => (
                      <div key={descarga.id} className="registro-card descarga-card">
                        <div className="registro-header">
                          <h4>📦 Descarga #{descarga.id}</h4>
                          <span className="fecha-badge">
                            {formatearFecha(descarga.fecha_registro)}
                          </span>
                        </div>
                        
                        <div className="registro-content">
                          <div className="info-row">
                            <span className="info-label">🏷️ Lote:</span>
                            <span className="info-value">{descarga.lote_numero}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">🏢 Organización:</span>
                            <span className="info-value">{descarga.organizacion_nombre}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">⚖️ Peso descargado:</span>
                            <span className="info-value weight">{descarga.peso_descargado} kg</span>
                          </div>
                          {descarga.insumo && (
                            <>
                              <div className="info-row">
                                <span className="info-label">🔧 Insumo utilizado:</span>
                                <span className="info-value">{descarga.insumo.nombre} ({descarga.insumo.codigo})</span>
                              </div>
                              <div className="info-row">
                                <span className="info-label">📦 Tipo de insumo:</span>
                                <span className="info-value">{descarga.insumo.tipo}</span>
                              </div>
                              {descarga.cantidad_insumo_usado && (
                                <div className="info-row">
                                  <span className="info-label">📊 Cantidad usada:</span>
                                  <span className="info-value weight">{descarga.cantidad_insumo_usado} {descarga.insumo.unidad_medida}</span>
                                </div>
                              )}
                              {descarga.tiempo_uso_insumo && (
                                <div className="info-row">
                                  <span className="info-label">⏱️ Tiempo de uso:</span>
                                  <span className="info-value">{descarga.tiempo_uso_insumo} minutos</span>
                                </div>
                              )}
                            </>
                          )}
                          {descarga.hora_inicio && descarga.hora_fin && (
                            <>
                              <div className="info-row">
                                <span className="info-label">🕐 Inicio:</span>
                                <span className="info-value">{formatearHora(descarga.hora_inicio)}</span>
                              </div>
                              <div className="info-row">
                                <span className="info-label">🕐 Fin:</span>
                                <span className="info-value">{formatearHora(descarga.hora_fin)}</span>
                              </div>
                              <div className="info-row">
                                <span className="info-label">⏱️ Duración:</span>
                                <span className="info-value">{descarga.tiempo_descarga_minutos || 0} minutos</span>
                              </div>
                            </>
                          )}
                          {descarga.observaciones && (
                            <div className="observaciones">
                              <span className="info-label">📝 Observaciones:</span>
                              <p className="observaciones-text">{descarga.observaciones}</p>
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
        )}

        {/* Tab: Análisis de Muestras */}
        {activeTab === 'analisis-muestras' && (
          <div className="tab-content">
            <h2>🔬 Análisis de Muestras</h2>
            <div className="info-card">
              <p><strong>Análisis de laboratorio:</strong> Aquí puedes ver las muestras pendientes de análisis y registrar los resultados.</p>
            </div>

            <div className="muestras-container">
              {muestrasAnalisis.length === 0 ? (
                <div className="no-data">
                  <p>🔬 No hay muestras pendientes de análisis.</p>
                </div>
              ) : (
                <div className="muestras-grid">
                  {muestrasAnalisis.map(muestra => (
                    <div key={muestra.id} className="muestra-card">
                      <div className="muestra-header">
                        <h4>{muestra.numero_muestra}</h4>
                        <span className={`estado-badge ${muestra.estado.toLowerCase()}`} style={{ backgroundColor: getEstadoColor(muestra.estado) }}>
                          {muestra.estado}
                        </span>
                      </div>
                      
                      <div className="muestra-info">
                        <p><strong>Propietario:</strong> {muestra.propietario_nombre}</p>
                        <p><strong>Lote:</strong> {muestra.lote}</p>
                        <p><strong>Fecha toma:</strong> {formatearFecha(muestra.fecha_toma_muestra)}</p>
                        {muestra.es_segundo_muestreo && (
                          <p><strong>Tipo:</strong> <span className="segundo-muestreo">Segundo Muestreo</span></p>
                        )}
                      </div>

                      <div className="muestra-actions">
                        {muestra.estado === 'PENDIENTE' && (
                          <>
                            <button 
                              className="btn-primary btn-small"
                              onClick={() => abrirModalProcesos('registrarResultado', null, muestra)}
                            >
                              📋 Registrar Resultado
                            </button>
                            <button 
                              className="btn-success btn-small"
                              onClick={() => confirmarProcesarMuestra(muestra, 'APROBADA')}
                            >
                              ✅ Aprobar
                            </button>
                            <button 
                              className="btn-danger btn-small"
                              onClick={() => confirmarProcesarMuestra(muestra, 'RECHAZADA')}
                            >
                              ❌ Rechazar
                            </button>
                          </>
                        )}
                        {muestra.estado !== 'PENDIENTE' && (
                          <div className="resultado-info">
                            <p><strong>Resultado:</strong> {muestra.estado}</p>
                            {muestra.fecha_analisis && (
                              <p><strong>Analizado:</strong> {formatearFecha(muestra.fecha_analisis)}</p>
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
        )}

        {/* Tab: Procesamiento */}
        {activeTab === 'procesamiento' && (
          <div className="tab-content">
            <h2>🧽 Procesamiento de Café</h2>
            <div className="info-card">
              <p><strong>Procesos de producción:</strong> Aquí puedes gestionar los procesos de limpieza, separación por colores y recepción final.</p>
            </div>

            <div className="procesamiento-container">
              {lotesProcesamiento.length === 0 ? (
                <div className="no-data">
                  <p>🧽 No hay lotes disponibles para procesamiento.</p>
                </div>
              ) : (
                <div className="lotes-procesamiento-grid">
                  {lotesProcesamiento.map(lote => (
                    <div key={lote.id} className="lote-procesamiento-card">
                      <div className="lote-header">
                        <h4>{lote.numero_lote}</h4>
                        <span className={`estado-badge ${lote.estado.toLowerCase()}`}>
                          {getEstadoTexto(lote.estado)}
                        </span>
                      </div>
                      
                      <div className="lote-info">
                        <p><strong>Organización:</strong> {lote.organizacion_nombre}</p>
                        <p><strong>Quintales:</strong> {lote.total_quintales}</p>
                        <p><strong>Propietarios:</strong> {lote.propietarios?.length || 0}</p>
                        <p><strong>Fecha:</strong> {formatearFecha(lote.fecha_entrega)}</p>
                        {lote.peso_total_final && (
                          <p><strong>Peso actual:</strong> {lote.peso_total_final} kg</p>
                        )}
                      </div>

                      <div className="lote-actions">
                        {lote.estado === 'PENDIENTE' && (
                          <button 
                            className="btn-secondary btn-small"
                            onClick={() => abrirModalProcesos('seleccionarMuestras', lote)}
                          >
                            🔬 Seleccionar Muestras
                          </button>
                        )}
                        
                        {(lote.estado === 'SEPARACION_PENDIENTE' || lote.estado === 'SEPARACION_APLICADA') && (
                          <button 
                            className="btn-success btn-small"
                            onClick={() => enviarParteLimpiaALimpieza(lote.id)}
                          >
                            🧼 Enviar a Limpieza
                          </button>
                        )}
                        
                        {lote.estado === 'APROBADO' && (
                          <button 
                            className="btn-primary btn-small"
                            onClick={() => abrirModalProcesos('procesarLimpieza', lote)}
                          >
                            🧽 Procesar Limpieza
                          </button>
                        )}
                        
                        {lote.estado === 'LIMPIO' && (
                          <button 
                            className="btn-warning btn-small"
                            onClick={() => abrirModalProcesos('separacionColores', lote)}
                          >
                            🎨 Separación por Colores
                          </button>
                        )}
                        
                        {lote.estado === 'SEPARADO' && (
                          <button 
                            className="btn-success btn-small"
                            onClick={() => abrirModalProcesos('recepcionFinal', lote)}
                          >
                            ✅ Recepción Final
                          </button>
                        )}
                        
                        <button 
                          className="btn-outline btn-small"
                          onClick={() => abrirModalProcesos('verDetalle', lote)}
                        >
                          👁️ Ver Detalle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ...existing code... */}
      </div>

      {/* Bottom Navigator */}
      <div className="bottom-navigator">
        <button 
          className={`nav-item ${activeTab === 'registrar-descarga' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrar-descarga')}
        >
          <span className="nav-icon">📦</span>
          <span className="nav-label">Tareas</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'analisis-muestras' ? 'active' : ''}`}
          onClick={() => setActiveTab('analisis-muestras')}
        >
          <span className="nav-icon">🔬</span>
          <span className="nav-label">Análisis</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'procesamiento' ? 'active' : ''}`}
          onClick={() => setActiveTab('procesamiento')}
        >
          <span className="nav-icon">🧽</span>
          <span className="nav-label">Procesos</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'estadisticas' ? 'active' : ''}`}
          onClick={() => setActiveTab('estadisticas')}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Stats</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">Historial</span>
        </button>
      </div>

      {/* Modales para procesamiento de café */}
      {showModalProcesos && (
        <div className="modal-overlay" onClick={cerrarModalProcesos}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === 'registrarResultado' && '🔬 Registrar Resultado de Análisis'}
                {modalType === 'seleccionarMuestras' && '📋 Seleccionar Muestras'}
                {modalType === 'procesarLimpieza' && '🧽 Procesar Limpieza'}
                {modalType === 'separacionColores' && '🎨 Separación por Colores'}
                {modalType === 'recepcionFinal' && '✅ Recepción Final'}
                {modalType === 'verDetalle' && '👁️ Detalle del Lote'}
              </h3>
              <button className="close-btn" onClick={cerrarModalProcesos}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Modal para registrar resultado de análisis */}
              {modalType === 'registrarResultado' && selectedMuestra && (
                <form onSubmit={registrarResultadoMuestra}>
                  <div className="muestra-info">
                    <h4>Muestra: {selectedMuestra.numero_muestra}</h4>
                    <p><strong>Propietario:</strong> {selectedMuestra.propietario_nombre}</p>
                    <p><strong>Fecha de toma:</strong> {formatearFecha(selectedMuestra.fecha_toma_muestra)}</p>
                  </div>
                  
                  <div className="form-group">
                    <label>Resultado del Análisis *</label>
                    <select
                      name="estado"
                      value={formDataProcesos.estado || ''}
                      onChange={handleInputChangeProcesos}
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
                      value={formDataProcesos.resultado_analisis || ''}
                      onChange={handleInputChangeProcesos}
                      rows="4"
                      placeholder="Describa los resultados del análisis de laboratorio..."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Observaciones</label>
                    <textarea
                      name="observaciones"
                      value={formDataProcesos.observaciones || ''}
                      onChange={handleInputChangeProcesos}
                      rows="3"
                      placeholder="Observaciones adicionales..."
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button type="button" onClick={cerrarModalProcesos}>Cancelar</button>
                    <button type="submit" className="btn-primary">Registrar Resultado</button>
                  </div>
                </form>
              )}

              {/* Modal para seleccionar muestras */}
              {modalType === 'seleccionarMuestras' && selectedLote && (
                <form onSubmit={seleccionarMuestras}>
                  <div className="lote-info">
                    <h4>Lote: {selectedLote.numero_lote}</h4>
                    <p><strong>Organización:</strong> {selectedLote.organizacion_nombre}</p>
                    <p><strong>Total propietarios:</strong> {selectedLote.propietarios?.length || 0}</p>
                  </div>
                  
                  <div className="form-group">
                    <label>Seleccionar propietarios para muestras:</label>
                    <div className="propietarios-checkbox-list">
                      {selectedLote.propietarios?.map(propietario => (
                        <label key={propietario.id} className="checkbox-item">
                          <input
                            type="checkbox"
                            value={propietario.id}
                            onChange={(e) => {
                              const propietarioId = parseInt(e.target.value);
                              const isChecked = e.target.checked;
                              const currentSelection = formDataProcesos.propietarios_seleccionados || [];
                              
                              if (isChecked) {
                                setFormDataProcesos({
                                  ...formDataProcesos,
                                  propietarios_seleccionados: [...currentSelection, propietarioId]
                                });
                              } else {
                                setFormDataProcesos({
                                  ...formDataProcesos,
                                  propietarios_seleccionados: currentSelection.filter(id => id !== propietarioId)
                                });
                              }
                            }}
                          />
                          {propietario.nombre_completo} ({propietario.quintales_entregados} qq)
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button type="button" onClick={cerrarModalProcesos}>Cancelar</button>
                    <button type="submit" className="btn-primary">Seleccionar Muestras</button>
                  </div>
                </form>
              )}

              {/* Modal para procesar limpieza */}
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
                        value={formDataProcesos.peso_impurezas || ''}
                        onChange={handleInputChangeProcesos}
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
                        value={formDataProcesos.tipo_limpieza || ''}
                        onChange={handleInputChangeProcesos}
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
                        value={formDataProcesos.responsable_limpieza || ''}
                        onChange={handleInputChangeProcesos}
                        required
                        placeholder="Nombre del responsable"
                      />
                    </div>
                    <div className="form-group">
                      <label>Duración del Proceso (minutos)</label>
                      <input
                        type="number"
                        name="duracion_limpieza"
                        value={formDataProcesos.duracion_limpieza || ''}
                        onChange={handleInputChangeProcesos}
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
                      value={formDataProcesos.impurezas_encontradas || ''}
                      onChange={handleInputChangeProcesos}
                      placeholder="Ej: Piedras, palos, hojas"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Observaciones del Proceso</label>
                    <textarea
                      name="observaciones_limpieza"
                      value={formDataProcesos.observaciones_limpieza || ''}
                      onChange={handleInputChangeProcesos}
                      rows="3"
                      placeholder="Observaciones adicionales sobre el proceso de limpieza..."
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button type="button" onClick={cerrarModalProcesos}>Cancelar</button>
                    <button type="submit" className="btn-primary">🧽 Procesar Limpieza</button>
                  </div>
                </form>
              )}

              {/* Modal para separación por colores */}
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
                        value={formDataProcesos.responsable_separacion || ''}
                        onChange={handleInputChangeProcesos}
                        required
                        placeholder="Nombre del responsable"
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha de Separación *</label>
                      <input
                        type="datetime-local"
                        name="fecha_separacion"
                        value={formDataProcesos.fecha_separacion || ''}
                        onChange={handleInputChangeProcesos}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Calidad General *</label>
                      <select
                        name="calidad_general"
                        value={formDataProcesos.calidad_general || ''}
                        onChange={handleInputChangeProcesos}
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
                        value={formDataProcesos.duracion_proceso || ''}
                        onChange={handleInputChangeProcesos}
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
                            value={formDataProcesos[`color_${color.toLowerCase()}_peso`] || ''}
                            onChange={handleInputChangeProcesos}
                            step="0.1"
                            min="0"
                            placeholder="Peso (kg)"
                          />
                          <input
                            type="number"
                            name={`color_${color.toLowerCase()}_porcentaje`}
                            value={formDataProcesos[`color_${color.toLowerCase()}_porcentaje`] || ''}
                            onChange={handleInputChangeProcesos}
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
                      value={formDataProcesos.observaciones_separacion || ''}
                      onChange={handleInputChangeProcesos}
                      rows="3"
                      placeholder="Observaciones sobre la separación por colores..."
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button type="button" onClick={cerrarModalProcesos}>Cancelar</button>
                    <button type="submit" className="btn-primary">🎨 Procesar Separación</button>
                  </div>
                </form>
              )}

              {/* Modal para recepción final */}
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
                        value={formDataProcesos.responsable_recepcion || ''}
                        onChange={handleInputChangeProcesos}
                        required
                        placeholder="Nombre del responsable"
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha de Recepción Final *</label>
                      <input
                        type="datetime-local"
                        name="fecha_recepcion_final"
                        value={formDataProcesos.fecha_recepcion_final || ''}
                        onChange={handleInputChangeProcesos}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Calificación Final *</label>
                    <select
                      name="calificacion_final"
                      value={formDataProcesos.calificacion_final || ''}
                      onChange={handleInputChangeProcesos}
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
                      value={formDataProcesos.observaciones_finales || ''}
                      onChange={handleInputChangeProcesos}
                      rows="4"
                      placeholder="Observaciones finales del proceso completo..."
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button type="button" onClick={cerrarModalProcesos}>Cancelar</button>
                    <button type="submit" className="btn-primary">✅ Finalizar Recepción</button>
                  </div>
                </form>
              )}

              {/* Modal para ver detalle del lote */}
              {modalType === 'verDetalle' && selectedLote && (
                <div className="lote-detalle">
                  <div className="detalle-section">
                    <h4>Información del Lote</h4>
                    <div className="detalle-grid">
                      <p><strong>Número:</strong> {selectedLote.numero_lote}</p>
                      <p><strong>Estado:</strong> {getEstadoTexto(selectedLote.estado)}</p>
                      <p><strong>Organización:</strong> {selectedLote.organizacion_nombre}</p>
                      <p><strong>Total Quintales:</strong> {selectedLote.total_quintales}</p>
                      <p><strong>Fecha Entrega:</strong> {formatearFecha(selectedLote.fecha_entrega)}</p>
                      <p><strong>Fecha Registro:</strong> {formatearFecha(selectedLote.fecha_creacion)}</p>
                    </div>
                    {selectedLote.observaciones && (
                      <p><strong>Observaciones:</strong> {selectedLote.observaciones}</p>
                    )}
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

      {/* Modal de segundo muestreo */}
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
    </div>
  );
}

export default EmpleadoDashboard;