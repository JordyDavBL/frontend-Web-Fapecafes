import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { getCurrentUser, isAdmin } from '../../../utils/auth';
import '../../../styles/detalle-proceso.css';

const DetalleProceso = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [proceso, setProceso] = useState(location.state?.proceso || null);
    const [loading, setLoading] = useState(false);
    const [activeStep, setActiveStep] = useState('PILADO');
    const [showPiladoForm, setShowPiladoForm] = useState(false);
    const [showClasificacionForm, setShowClasificacionForm] = useState(false);
    const [showDensidadForm, setShowDensidadForm] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showColorForm, setShowColorForm] = useState(false);
    const [showEmpaquetadoForm, setShowEmpaquetadoForm] = useState(false);

    const [fasesCompletadas, setFasesCompletadas] = useState({
        PILADO: false,
        CLASIFICACION: false,
        DENSIDAD: false,
        COLOR: false,
        EMPAQUETADO: false
    });

    const [densidadPasos, setDensidadPasos] = useState({
        clasificacion_densidad: false,
        densimetria_2: false
    });

    const [piladoData, setPiladoData] = useState({
        tipo_impureza_encontrada: '',
        peso_impurezas_removidas: '',
        observaciones: '',
        tareas_realizadas: {
            canteado: false,
            tiempo_canteado: '',
            interno: false
        }
    });

    const [clasificacionData, setClasificacionData] = useState({
        numero_malla_ocupada: '',
        peso_cafe_caracolillo: '',
        peso_cafe_exportacion: '',
        observaciones: ''
    });

    const [densidadData, setDensidadData] = useState({
        peso_cafe_densidad_1: '',
        observaciones_densidad_1: ''
    });

    const [densimetria2Data, setDensimetria2Data] = useState({
        peso_cafe_densidad_2: '',
        observaciones_densidad_2: ''
    });

    const [tareaData, setTareaData] = useState({
        descripcion: '',
        hora_inicio: '',
        hora_fin: '',
        insumo_utilizado: '',
        cantidad: '',
        tiempo_uso: '',
        peso_usado: ''
    });

    const [insumosDisponibles, setInsumosDisponibles] = useState([
        { id: 1, nombre: 'Sacos de empaque', codigo: 'SAC001' },
        { id: 2, nombre: 'Etiquetas', codigo: 'ETQ001' },
        { id: 3, nombre: 'Sellos de calidad', codigo: 'SEL001' },
        { id: 4, nombre: 'Material protector', codigo: 'MAT001' },
        { id: 5, nombre: 'Cintas adhesivas', codigo: 'CIN001' }
    ]);

    const [colorData, setColorData] = useState({
        observaciones_separacion: '',
        clasificacion_colores: {
            'Verde Claro': { peso: '', porcentaje: '' },
            'Verde Oscuro': { peso: '', porcentaje: '' },
            'Amarillo': { peso: '', porcentaje: '' },
            'Marrón': { peso: '', porcentaje: '' },
            'Negro/Defectuoso': { peso: '', porcentaje: '' }
        }
    });

    const [empaquetadoData, setEmpaquetadoData] = useState({
        cafe_caracolillo: '',
        cafe_descarte: '',
        cafe_exportacion: '',
        observaciones_empaquetado: ''
    });

    useEffect(() => {
        const verificarAcceso = async () => {
            try {
                const userData = await getCurrentUser();
                const adminCheck = await isAdmin();
                const empleadoCheck = userData?.rol === 'EMPLEADO';

                if (userData && (adminCheck || empleadoCheck)) {
                    setIsAuthenticated(true);
                } else {
                    alert('Acceso denegado. Esta sección requiere permisos de administrador o empleado.');
                    navigate('/procesos');
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
        if (isAuthenticated && !proceso) {
            cargarDatos();
        } else if (isAuthenticated && proceso) {
            cargarInsumos();
            inicializarEstadoFases();
        }
    }, [isAuthenticated, id, proceso]);

    useEffect(() => {
        if (proceso && proceso.datos_densidad_1 && proceso.datos_densidad_2 && proceso.datos_color) {
            // Calcular automáticamente los resultados del empaquetado basados en datos del backend
            const pesoDensidad1 = parseFloat(proceso.datos_densidad_1?.peso_cafe_densidad_1 || 0);
            const pesoDensidad2 = parseFloat(proceso.datos_densidad_2?.peso_cafe_densidad_2 || 0);
            
            // Calcular total de peso de colores desde los datos guardados
            let totalPesoColor = 0;
            if (proceso.datos_color?.clasificacion_colores) {
                totalPesoColor = Object.values(proceso.datos_color.clasificacion_colores)
                    .reduce((total, color) => total + (parseFloat(color.peso) || 0), 0);
            }

            // También considerar datos de clasificación si están disponibles
            const pesoCaracolilloClasificacion = parseFloat(proceso.datos_clasificacion?.peso_cafe_caracolillo || 0);
            const pesoExportacionClasificacion = parseFloat(proceso.datos_clasificacion?.peso_cafe_exportacion || 0);

            console.log('=== CÁLCULO AUTOMÁTICO DEL EMPAQUETADO ===');
            console.log('- Peso Densidad 1:', pesoDensidad1, 'kg');
            console.log('- Peso Densidad 2:', pesoDensidad2, 'kg');
            console.log('- Total Peso Color:', totalPesoColor, 'kg');
            console.log('- Peso Caracolillo (Clasificación):', pesoCaracolilloClasificacion, 'kg');
            console.log('- Peso Exportación (Clasificación):', pesoExportacionClasificacion, 'kg');

            // Solo calcular automáticamente si no hay datos de empaquetado ya guardados
            if (!proceso.datos_empaquetado) {
                // Algoritmo mejorado de cálculo basado en las fases anteriores
                let cafeCaracolillo = 0;
                let cafeDescarte = 0;
                let cafeExportacion = 0;

                // 1. Usar datos de clasificación si están disponibles (más precisos)
                if (pesoCaracolilloClasificacion > 0) {
                    cafeCaracolillo = pesoCaracolilloClasificacion;
                }

                if (pesoExportacionClasificacion > 0) {
                    cafeExportacion = pesoExportacionClasificacion;
                }

                // 2. Si no hay datos de clasificación, calcular basado en densidad
                if (cafeCaracolillo === 0 && pesoDensidad1 > 0) {
                    // Aproximadamente 20-30% del peso de densidad 1 es caracolillo
                    cafeCaracolillo = pesoDensidad1 * 0.25;
                }

                // 3. Calcular descarte basado en densidad 2 y separación por color
                if (pesoDensidad2 > 0) {
                    // Aproximadamente 15-25% del peso de densidad 2 es descarte
                    cafeDescarte = pesoDensidad2 * 0.20;
                }

                // 4. Si hay separación por color, considerar los defectuosos como descarte adicional
                if (proceso.datos_color?.clasificacion_colores) {
                    const defectuosos = parseFloat(proceso.datos_color.clasificacion_colores['Negro/Defectuoso']?.peso || 0);
                    cafeDescarte += defectuosos;
                }

                // 5. Si no se calculó exportación de clasificación, usar el resto
                if (cafeExportacion === 0 && totalPesoColor > 0) {
                    // El café de exportación es la diferencia del total menos caracolillo y descarte
                    cafeExportacion = Math.max(0, totalPesoColor - cafeCaracolillo - cafeDescarte);
                }

                // Redondear a 2 decimales
                cafeCaracolillo = parseFloat(cafeCaracolillo.toFixed(2));
                cafeDescarte = parseFloat(cafeDescarte.toFixed(2));
                cafeExportacion = parseFloat(cafeExportacion.toFixed(2));

                setEmpaquetadoData({
                    cafe_caracolillo: cafeCaracolillo,
                    cafe_descarte: cafeDescarte,
                    cafe_exportacion: cafeExportacion,
                    observaciones_empaquetado: `Resultados calculados automáticamente basados en las fases anteriores:
- Densidad 1: ${pesoDensidad1} kg
- Densidad 2: ${pesoDensidad2} kg  
- Total separación por color: ${totalPesoColor} kg
- Caracolillo de clasificación: ${pesoCaracolilloClasificacion} kg
- Exportación de clasificación: ${pesoExportacionClasificacion} kg

Cálculo realizado el ${new Date().toLocaleString('es-ES')}`
                });

                console.log('✅ Resultados calculados automáticamente:', {
                    cafeCaracolillo,
                    cafeDescarte,
                    cafeExportacion,
                    total: cafeCaracolillo + cafeDescarte + cafeExportacion
                });
            } else {
                // Si ya hay datos guardados, usar esos datos
                setEmpaquetadoData({
                    cafe_caracolillo: proceso.datos_empaquetado.cafe_caracolillo || '',
                    cafe_descarte: proceso.datos_empaquetado.cafe_descarte || '',
                    cafe_exportacion: proceso.datos_empaquetado.cafe_exportacion || '',
                    observaciones_empaquetado: proceso.datos_empaquetado.observaciones_empaquetado || ''
                });

                console.log('✅ Usando datos de empaquetado ya guardados:', proceso.datos_empaquetado);
            }
        }
        // También verificar si solo hay algunas fases completadas para hacer cálculos parciales
        else if (proceso && (proceso.datos_densidad_1 || proceso.datos_clasificacion)) {
            console.log('ℹ️ Haciendo cálculo parcial del empaquetado con datos disponibles...');
            
            // Cálculo parcial con los datos disponibles
            const pesoCaracolilloClasificacion = parseFloat(proceso.datos_clasificacion?.peso_cafe_caracolillo || 0);
            const pesoExportacionClasificacion = parseFloat(proceso.datos_clasificacion?.peso_cafe_exportacion || 0);
            const pesoDensidad1 = parseFloat(proceso.datos_densidad_1?.peso_cafe_densidad_1 || 0);

            if (!proceso.datos_empaquetado && (pesoCaracolilloClasificacion > 0 || pesoExportacionClasificacion > 0 || pesoDensidad1 > 0)) {
                setEmpaquetadoData({
                    cafe_caracolillo: pesoCaracolilloClasificacion || (pesoDensidad1 * 0.25).toFixed(2),
                    cafe_descarte: '0.00',
                    cafe_exportacion: pesoExportacionClasificacion || '0.00',
                    observaciones_empaquetado: `Cálculo parcial basado en datos disponibles. Se actualizará automáticamente cuando se completen todas las fases.`
                });
            }
        }
    }, [proceso]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            await Promise.all([
                cargarProceso(),
                cargarInsumos()
            ]);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarProceso = async () => {
        try {
            const response = await axiosInstance.get(`/procesos/${id}/`);
            setProceso(response.data);
        } catch (error) {
            console.error('Error al cargar proceso:', error);
            alert('Error al cargar el proceso');
            navigate('/procesos');
        }
    };

    const cargarInsumos = async () => {
        try {
            const response = await axiosInstance.get('/insumos/');
            const insumosActivos = response.data.filter(insumo => insumo.activo);
            setInsumosDisponibles(insumosActivos);
            console.log('Insumos disponibles cargados exitosamente:', insumosActivos.length);
        } catch (error) {
            console.error('Error al cargar insumos:', error);
            setInsumosDisponibles([]);
        }
    };

    const inicializarEstadoFases = () => {
        if (!proceso) return;

        const fasesCompletadasIniciales = {
            PILADO: false,
            CLASIFICACION: false,
            DENSIDAD: false,
            COLOR: false,
            EMPAQUETADO: false
        };

        if (proceso.notas_tecnicas) {
            Object.keys(proceso.notas_tecnicas).forEach(fase => {
                if (fase in fasesCompletadasIniciales) {
                    fasesCompletadasIniciales[fase] = true;
                }
            });
        }

        const ordeFases = ['PILADO', 'CLASIFICACION', 'DENSIDAD', 'COLOR', 'EMPAQUE'];
        const indiceActual = ordeFases.indexOf(proceso.fase_actual);

        if (indiceActual > 0) {
            for (let i = 0; i < indiceActual; i++) {
                const fase = ordeFases[i];
                if (fase in fasesCompletadasIniciales) {
                    fasesCompletadasIniciales[fase] = true;
                }
            }
        }

        console.log('Inicializando fases completadas desde backend:', fasesCompletadasIniciales);
        console.log('Fase actual del proceso:', proceso.fase_actual);

        setFasesCompletadas(fasesCompletadasIniciales);
        setActiveStep(proceso.fase_actual || 'PILADO');

        if (proceso.fase_actual === 'CLASIFICACION') {
            setShowClasificacionForm(true);
            setShowPiladoForm(false);
        }
    };

    const handleStepClick = (step) => {
        const faseActual = getCurrentPhase();
        const stepOrder = ['PILADO', 'CLASIFICACION', 'DENSIDAD', 'COLOR', 'EMPAQUE'];
        const currentIndex = stepOrder.indexOf(faseActual);
        const clickedIndex = stepOrder.indexOf(step);

        if (clickedIndex > currentIndex) {
            alert(`⚠️ Debe completar la fase ${faseActual} antes de acceder a ${step}`);
            return;
        }

        if (fasesCompletadas[step]) {
            alert(`✅ La fase ${step} ya ha sido completada y no se puede modificar`);
            return;
        }

        setActiveStep(step);
        if (step === 'PILADO') {
            setShowPiladoForm(true);
            setShowClasificacionForm(false);
            setShowDensidadForm(false);
            setShowEmpaquetadoForm(false);
        } else if (step === 'CLASIFICACION') {
            setShowClasificacionForm(true);
            setShowPiladoForm(false);
            setShowDensidadForm(false);
            setShowEmpaquetadoForm(false);
        } else if (step === 'DENSIDAD') {
            setShowDensidadForm(true);
            setShowPiladoForm(false);
            setShowClasificacionForm(false);
            setShowEmpaquetadoForm(false);
        } else if (step === 'COLOR') {
            setShowColorForm(true);
            setShowPiladoForm(false);
            setShowClasificacionForm(false);
            setShowDensidadForm(false);
            setShowEmpaquetadoForm(false);
        } else if (step === 'EMPAQUE') {
            setShowEmpaquetadoForm(true);
            setShowPiladoForm(false);
            setShowClasificacionForm(false);
            setShowDensidadForm(false);
            setShowColorForm(false);
        } else {
            setShowPiladoForm(false);
            setShowClasificacionForm(false);
            setShowDensidadForm(false);
            setShowColorForm(false);
            setShowEmpaquetadoForm(false);
        }
    };

    const getCurrentPhase = () => {
        if (!fasesCompletadas.PILADO) return 'PILADO';
        if (!fasesCompletadas.CLASIFICACION) return 'CLASIFICACION';
        if (!fasesCompletadas.DENSIDAD) return 'DENSIDAD';
        if (!fasesCompletadas.COLOR) return 'COLOR';
        if (!fasesCompletadas.EMPAQUETADO) return 'EMPAQUE';
        return 'FINALIZADO';
    };

    const isFaseDisponible = (fase) => {
        const faseActual = getCurrentPhase();
        const stepOrder = ['PILADO', 'CLASIFICACION', 'DENSIDAD', 'COLOR', 'EMPAQUE'];
        const currentIndex = stepOrder.indexOf(faseActual);
        const faseIndex = stepOrder.indexOf(fase);

        return faseIndex <= currentIndex && !fasesCompletadas[fase];
    };

    const getStepStyle = (step) => {
        if (fasesCompletadas[step.id]) {
            return {
                backgroundColor: '#28a745',
                cursor: 'not-allowed'
            };
        } else if (step.id === activeStep) {
            return {
                backgroundColor: step.color,
                cursor: 'pointer'
            };
        } else if (isFaseDisponible(step.id)) {
            return {
                backgroundColor: '#ffc107',
                cursor: 'pointer'
            };
        } else {
            return {
                backgroundColor: '#dc3545',
                cursor: 'not-allowed'
            };
        }
    };

    const handlePiladoChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setPiladoData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setPiladoData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleClasificacionChange = (field, value) => {
        setClasificacionData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleDensidadChange = (field, value) => {
        setDensidadData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleDensimetria2Change = (field, value) => {
        setDensimetria2Data(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleTareaChange = (field, value) => {
        setTareaData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleColorChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setColorData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setColorData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleColorClassificationChange = (color, campo, valor) => {
        setColorData(prev => ({
            ...prev,
            clasificacion_colores: {
                ...prev.clasificacion_colores,
                [color]: {
                    ...prev.clasificacion_colores[color],
                    [campo]: valor
                }
            }
        }));

        if (campo === 'peso' && valor && proceso) {
            const pesoTotalEnKg = proceso.quintales_totales * 46;
            const porcentaje = ((parseFloat(valor) / pesoTotalEnKg) * 100).toFixed(2);
            setColorData(prev => ({
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

    const calcularTotalPesoColor = () => {
        return Object.values(colorData.clasificacion_colores)
            .reduce((total, color) => total + (parseFloat(color.peso) || 0), 0);
    };

    const handleEmpaquetadoChange = (e) => {
        const { name, value } = e.target;
        setEmpaquetadoData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const guardarTareaPilado = async () => {
        if (!tareaData.descripcion.trim()) {
            alert('La descripción de la tarea es requerida');
            return;
        }

        if (!tareaData.insumo_utilizado) {
            alert('Debe seleccionar un insumo utilizado');
            return;
        }

        try {
            setLoading(true);

            if (proceso.lotes && proceso.lotes.length > 0) {
                console.log(`Creando tareas de pilado para ${proceso.lotes.length} lotes...`);

                // 1. Crear TareaInsumo para cada lote
                const tareasLotes = proceso.lotes.map((lote, index) => {
                    console.log(`DEBUG - Procesando lote ${index}:`, lote);

                    let loteId;
                    let numeroLote;

                    // Verificar la estructura del lote
                    if (typeof lote === 'object' && lote !== null && lote.id) {
                        loteId = lote.id;
                        numeroLote = lote.numero_lote || `Lote-${loteId}`;
                        console.log(`DEBUG - Lote es objeto completo. ID: ${loteId}, Numero: ${numeroLote}`);
                    } else if (typeof lote === 'number' || (typeof lote === 'string' && !isNaN(parseInt(lote)))) {
                        loteId = typeof lote === 'string' ? parseInt(lote, 10) : lote;
                        numeroLote = `Lote-${loteId}`;
                        console.log(`DEBUG - Lote es ID primitivo. ID: ${loteId}, Numero generado: ${numeroLote}`);
                    } else {
                        console.error(`ERROR - Lote ${index} no tiene estructura válida:`, lote);
                        return null;
                    }

                    // Validación del ID
                    if (!loteId || isNaN(loteId) || loteId <= 0) {
                        console.error(`ERROR - ID del lote ${index} no es válido:`, loteId);
                        return null;
                    }

                    // ✅ CORRECCIÓN PRINCIPAL: Asegurar que los datos se envían correctamente
                    const datosTarea = {
                        descripcion: `${tareaData.descripcion} - Lote: ${numeroLote}`,
                        hora_inicio: tareaData.hora_inicio || null,
                        hora_fin: tareaData.hora_fin || null,
                        insumo: parseInt(tareaData.insumo_utilizado),
                        cantidad: tareaData.cantidad ? parseFloat(tareaData.cantidad) : null,
                        tiempo_uso: tareaData.tiempo_uso ? parseInt(tareaData.tiempo_uso) : null,
                        peso_usado: tareaData.peso_usado ? parseFloat(tareaData.peso_usado) : null,
                        // ✅ CORRECCIÓN: No enviar muestra como null, omitirla completamente
                        lote: loteId,
                        resultado_analisis: 'PROCESO_PILADO'
                    };

                    // ✅ VALIDACIÓN CORREGIDA: Para procesos, siempre debe haber un lote
                    if (!datosTarea.lote) {
                        console.error('Error: No se pudo identificar el lote para la tarea');
                        return null;
                    }

                    console.log(`DEBUG - Tarea creada correctamente para lote ${loteId}:`, datosTarea);
                    return datosTarea;
                }).filter(Boolean);

                if (tareasLotes.length === 0) {
                    throw new Error('No se pudieron crear tareas válidas para los lotes. Verifique que los lotes tengan IDs válidos.');
                }

                // ✅ ENVIAR TAREAS UNA POR UNA PARA MEJOR DEBUG
                console.log('=== ENVIANDO TAREAS AL SERVIDOR ===');
                const resultados = [];
                for (let i = 0; i < tareasLotes.length; i++) {
                    const tarea = tareasLotes[i];
                    console.log(`Enviando tarea ${i + 1}/${tareasLotes.length}:`, tarea);
                    
                    try {
                        const response = await axiosInstance.post('/tareas/', tarea);
                        console.log(`✅ Tarea ${i + 1} creada exitosamente:`, response.data);
                        resultados.push(response.data);
                    } catch (error) {
                        console.error(`❌ Error al crear tarea ${i + 1}:`, error);
                        console.error('Datos que causaron el error:', tarea);
                        console.error('Respuesta del servidor:', error.response?.data);
                        
                        // Mostrar error específico
                        const errorMsg = error.response?.data?.detail || 
                                       error.response?.data?.error || 
                                       error.response?.data?.non_field_errors?.[0] ||
                                       JSON.stringify(error.response?.data) ||
                                       error.message;
                        throw new Error(`Error en tarea ${i + 1}: ${errorMsg}`);
                    }
                }

                console.log(`✅ ${tareasLotes.length} tareas insumo de pilado creadas exitosamente`);

                // 2. Crear TareaProceso para el proceso
                const tareaProceso = {
                    proceso: proceso.id,
                    tipo_tarea: 'PILADO_CANTEADO',
                    descripcion: tareaData.descripcion,
                    fase: 'PILADO',
                    hora_inicio: tareaData.hora_inicio || null,
                    hora_fin: tareaData.hora_fin || null,
                    fecha_ejecucion: new Date().toISOString().split('T')[0],
                    observaciones: `Tarea aplicada a ${proceso.lotes.length} lotes del proceso. Insumo utilizado: ${insumosDisponibles.find(i => i.id == tareaData.insumo_utilizado)?.nombre || 'No especificado'}`,
                    completada: true,
                    canteado_realizado: true
                };

                const responseTareaProceso = await axiosInstance.post('/procesos/tareas/', tareaProceso);
                console.log('TareaProceso de pilado creada exitosamente:', responseTareaProceso.data);
            } else {
                throw new Error('No se encontraron lotes en el proceso');
            }

            alert(`✅ Tarea de pilado guardada exitosamente`);

            setTareaData({
                descripcion: '',
                hora_inicio: '',
                hora_fin: '',
                insumo_utilizado: '',
                cantidad: '',
                tiempo_uso: '',
                peso_usado: ''
            });

            await cargarProceso();

        } catch (error) {
            console.error('Error al guardar tarea de pilado:', error);
            const errorMsg = error.response?.data?.detail || 
                           error.response?.data?.error || 
                           error.response?.data?.non_field_errors?.[0] ||
                           error.message;
            alert(`Error al guardar la tarea: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const guardarTareaClasificacion = async () => {
        if (!tareaData.descripcion.trim()) {
            alert('La descripción de la tarea es requerida');
            return;
        }

        if (!tareaData.insumo_utilizado) {
            alert('Debe seleccionar un insumo utilizado');
            return;
        }

        try {
            setLoading(true);

            if (proceso.lotes && proceso.lotes.length > 0) {
                console.log(`Creando tareas de clasificación para ${proceso.lotes.length} lotes...`);

                // 1. Crear TareaInsumo para cada lote
                const tareasLotes = proceso.lotes.map((lote, index) => {
                    console.log(`DEBUG - Procesando lote ${index}:`, lote);

                    let loteId;
                    let numeroLote;

                    // Verificar la estructura del lote
                    if (typeof lote === 'object' && lote !== null && lote.id) {
                        loteId = lote.id;
                        numeroLote = lote.numero_lote || `Lote-${loteId}`;
                    } else if (typeof lote === 'number' || (typeof lote === 'string' && !isNaN(parseInt(lote)))) {
                        loteId = typeof lote === 'string' ? parseInt(lote, 10) : lote;
                        numeroLote = `Lote-${loteId}`;
                    } else {
                        console.error(`ERROR - Lote ${index} no tiene estructura válida:`, lote);
                        return null;
                    }

                    // Validación del ID
                    if (!loteId || isNaN(loteId) || loteId <= 0) {
                        console.error(`ERROR - ID del lote ${index} no es válido:`, loteId);
                        return null;
                    }

                    // ✅ CORRECCIÓN PRINCIPAL: Asegurar que los datos se envían correctamente
                    const datosTarea = {
                        descripcion: `${tareaData.descripcion} - Lote: ${numeroLote}`,
                        hora_inicio: tareaData.hora_inicio || null,
                        hora_fin: tareaData.hora_fin || null,
                        insumo: parseInt(tareaData.insumo_utilizado),
                        cantidad: tareaData.cantidad ? parseFloat(tareaData.cantidad) : null,
                        tiempo_uso: tareaData.tiempo_uso ? parseInt(tareaData.tiempo_uso) : null,
                        peso_usado: tareaData.peso_usado ? parseFloat(tareaData.peso_usado) : null,
                        // ✅ CORRECCIÓN: No enviar muestra como null, omitirla completamente
                        lote: loteId,
                        resultado_analisis: 'PROCESO_CLASIFICACION'
                    };

                    // ✅ VALIDACIÓN CORREGIDA: Para procesos, siempre debe haber un lote
                    if (!datosTarea.lote) {
                        console.error('Error: No se pudo identificar el lote para la tarea');
                        return null;
                    }

                    return datosTarea;
                }).filter(Boolean);

                if (tareasLotes.length === 0) {
                    throw new Error('No se pudieron crear tareas válidas para los lotes. Verifique que los lotes tengan IDs válidos.');
                }

                // ✅ ENVIAR TAREAS UNA POR UNA PARA MEJOR DEBUG
                console.log('=== ENVIANDO TAREAS DE CLASIFICACIÓN AL SERVIDOR ===');
                const resultados = [];
                for (let i = 0; i < tareasLotes.length; i++) {
                    const tarea = tareasLotes[i];
                    console.log(`Enviando tarea de clasificación ${i + 1}/${tareasLotes.length}:`, tarea);
                    
                    try {
                        const response = await axiosInstance.post('/tareas/', tarea);
                        console.log(`✅ Tarea clasificación ${i + 1} creada exitosamente:`, response.data);
                        resultados.push(response.data);
                    } catch (error) {
                        console.error(`❌ Error al crear tarea clasificación ${i + 1}:`, error);
                        console.error('Datos que causaron el error:', tarea);
                        console.error('Respuesta del servidor:', error.response?.data);
                        
                        // Mostrar error específico
                        const errorMsg = error.response?.data?.detail || 
                                       error.response?.data?.error || 
                                       error.response?.data?.non_field_errors?.[0] ||
                                       error.response?.data?.descripcion?.[0] ||
                                       error.response?.data?.insumo?.[0] ||
                                       error.response?.data?.lote?.[0] ||
                                       JSON.stringify(error.response?.data) ||
                                       error.message;
                        throw new Error(`Error en tarea clasificación ${i + 1}: ${errorMsg}`);
                    }
                }

                console.log(`✅ ${tareasLotes.length} tareas insumo de clasificación creadas exitosamente`);

                // 2. Crear TareaProceso para el proceso
                const tareaProceso = {
                    proceso: proceso.id,
                    tipo_tarea: 'CLASIFICACION_INICIO',
                    descripcion: tareaData.descripcion,
                    fase: 'CLASIFICACION',
                    hora_inicio: tareaData.hora_inicio || null,
                    hora_fin: tareaData.hora_fin || null,
                    fecha_ejecucion: new Date().toISOString().split('T')[0],
                    observaciones: `Tarea aplicada a ${proceso.lotes.length} lotes del proceso. Insumo utilizado: ${insumosDisponibles.find(i => i.id == tareaData.insumo_utilizado)?.nombre || 'No especificado'}`,
                    completada: true
                };

                const responseTareaProceso = await axiosInstance.post('/procesos/tareas/', tareaProceso);
                console.log('TareaProceso de clasificación creada exitosamente:', responseTareaProceso.data);
            } else {
                throw new Error('No se encontraron lotes en el proceso');
            }

            alert(`✅ Tarea de clasificación guardada exitosamente`);

            setTareaData({
                descripcion: '',
                hora_inicio: '',
                hora_fin: '',
                insumo_utilizado: '',
                cantidad: '',
                tiempo_uso: '',
                peso_usado: ''
            });

            await cargarProceso();

        } catch (error) {
            console.error('Error al guardar tarea de clasificación:', error);
            const errorMsg = error.response?.data?.detail || 
                           error.response?.data?.error || 
                           error.response?.data?.non_field_errors?.[0] ||
                           error.message;
            alert(`Error al guardar la tarea: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const guardarTareaDensidad1 = async () => {
        if (!tareaData.descripcion.trim()) {
            alert('La descripción de la tarea es requerida');
            return;
        }

        if (!tareaData.insumo_utilizado) {
            alert('Debe seleccionar un insumo utilizado');
            return;
        }

        try {
            setLoading(true);

            // ✅ LÓGICA MEJORADA PARA OBTENER LOTES DEL PROCESO
            let lotesDisponibles = [];
            
            console.log('DEBUG - Estructura completa del proceso:', proceso);
            
            // Función auxiliar para obtener lotes de diferentes estructuras
            const obtenerLotesDelProceso = async () => {
                // Prioridad 1: usar proceso.lotes_info (estructura correcta del backend)
                if (proceso.lotes_info && Array.isArray(proceso.lotes_info) && proceso.lotes_info.length > 0) {
                    console.log('✅ Usando proceso.lotes_info:', proceso.lotes_info);
                    return proceso.lotes_info;
                }
                
                // Prioridad 2: usar proceso.lotes como fallback
                if (proceso.lotes && Array.isArray(proceso.lotes) && proceso.lotes.length > 0) {
                    console.log('✅ Usando proceso.lotes:', proceso.lotes);
                    return proceso.lotes;
                }
                
                // Prioridad 3: intentar recargar el proceso desde el servidor
                console.log('⚠️ No se encontraron lotes en el proceso actual. Recargando desde servidor...');
                try {
                    const procesoActualizado = await axiosInstance.get(`/procesos/${proceso.id}/`);
                    const procesoFresco = procesoActualizado.data;
                    
                    console.log('DEBUG - Proceso recargado:', procesoFresco);
                    
                    if (procesoFresco.lotes_info && Array.isArray(procesoFresco.lotes_info) && procesoFresco.lotes_info.length > 0) {
                        console.log('✅ Lotes encontrados después de recargar (lotes_info):', procesoFresco.lotes_info);
                        // Actualizar el estado del proceso con los datos frescos
                        setProceso(procesoFresco);
                        return procesoFresco.lotes_info;
                    } else if (procesoFresco.lotes && Array.isArray(procesoFresco.lotes) && procesoFresco.lotes.length > 0) {
                        console.log('✅ Lotes encontrados después de recargar (lotes):', procesoFresco.lotes);
                        setProceso(procesoFresco);
                        return procesoFresco.lotes;
                    } else {
                        console.error('❌ No se encontraron lotes después de recargar. Proceso:', procesoFresco);
                        console.error('- total_lotes:', procesoFresco.total_lotes);
                        console.error('- lotes_info length:', procesoFresco.lotes_info?.length || 0);
                        console.error('- lotes length:', procesoFresco.lotes?.length || 0);
                        return [];
                    }
                } catch (reloadError) {
                    console.error('Error al recargar proceso:', reloadError);
                    return [];
                }
            };

            lotesDisponibles = await obtenerLotesDelProceso();

            if (lotesDisponibles.length === 0) {
                // ✅ MENSAJE DE ERROR MÁS INFORMATIVO
                const mensajeError = `No se encontraron lotes asociados a este proceso.

Detalles del proceso:
- ID: ${proceso.id}
- Número: ${proceso.numero || 'Sin número'}
- Total lotes (según backend): ${proceso.total_lotes || 0}
- Estado: ${proceso.estado || 'Sin estado'}

Posibles causas:
1. El proceso fue creado sin lotes asignados
2. Los lotes fueron desvinculados del proceso
3. Error en la sincronización con el backend

Por favor:
1. Verifique que el proceso tenga lotes asignados en la vista principal
2. Si el problema persiste, contacte al administrador del sistema`;

                console.error('❌ ERROR DETALLADO:', mensajeError);
                alert(mensajeError);
                return;
            }

            console.log(`✅ Procesando ${lotesDisponibles.length} lotes para densidad 1`);

            // 1. Crear TareaInsumo para cada lote
            const tareasLotes = lotesDisponibles.map((lote, index) => {
                console.log(`DEBUG - Procesando lote ${index}:`, lote);

                let loteId;
                let numeroLote;

                // Verificar la estructura del lote (viene del serializer LoteCafeSerializer)
                if (typeof lote === 'object' && lote !== null && lote.id) {
                    loteId = lote.id;
                    numeroLote = lote.numero_lote || `Lote-${loteId}`;
                    console.log(`DEBUG - Lote es objeto completo. ID: ${loteId}, Numero: ${numeroLote}`);
                } else if (typeof lote === 'number' || (typeof lote === 'string' && !isNaN(parseInt(lote)))) {
                    loteId = typeof lote === 'string' ? parseInt(lote, 10) : lote;
                    numeroLote = `Lote-${loteId}`;
                    console.log(`DEBUG - Lote es ID primitivo. ID: ${loteId}, Numero generado: ${numeroLote}`);
                } else {
                    console.error(`ERROR - Lote ${index} no tiene estructura válida:`, lote);
                    return null;
                }

                // Validación del ID
                if (!loteId || isNaN(loteId) || loteId <= 0) {
                    console.error(`ERROR - ID del lote ${index} no es válido:`, loteId);
                    return null;
                }

                const datosTarea = {
                    descripcion: `${tareaData.descripcion} - ${numeroLote}`,
                    hora_inicio: tareaData.hora_inicio || null,
                    hora_fin: tareaData.hora_fin || null,
                    insumo: parseInt(tareaData.insumo_utilizado),
                    cantidad: tareaData.cantidad ? parseFloat(tareaData.cantidad) : null,
                    tiempo_uso: tareaData.tiempo_uso ? parseInt(tareaData.tiempo_uso) : null,
                    peso_usado: tareaData.peso_usado ? parseFloat(tareaData.peso_usado) : null,
                    muestra: null,
                    lote: loteId,
                    resultado_analisis: 'PROCESO_DENSIDAD_1'
                };

                console.log(`DEBUG - Datos de tarea para lote ${index}:`, datosTarea);
                return datosTarea;
            }).filter(Boolean);

            console.log(`Se crearán ${tareasLotes.length} tareas de densidad 1`);

            if (tareasLotes.length === 0) {
                throw new Error('No se pudieron crear tareas válidas para los lotes. Verifique que los lotes tengan IDs válidos.');
            }

            // Crear todas las tareas
            const promesasTareas = tareasLotes.map((tareaLote, index) => {
                console.log(`DEBUG - Enviando tarea ${index} al servidor:`, tareaLote);
                return axiosInstance.post('/tareas/', tareaLote);
            });

            const resultados = await Promise.all(promesasTareas);
            console.log(`${tareasLotes.length} tareas insumo de densidad 1 creadas exitosamente`);

            // 2. Crear TareaProceso para el proceso
            const userData = await getCurrentUser();
            const tareaProceso = {
                proceso: proceso.id,
                tipo_tarea: 'DENSIDAD_INICIO',
                descripcion: tareaData.descripcion,
                fase: 'DENSIDAD',
                empleado: userData?.id || 1,
                hora_inicio: tareaData.hora_inicio || null,
                hora_fin: tareaData.hora_fin || null,
                fecha_ejecucion: new Date().toISOString().split('T')[0],
                observaciones: `Tarea aplicada a ${lotesDisponibles.length} lotes del proceso. Insumo utilizado: ${insumosDisponibles.find(i => i.id == tareaData.insumo_utilizado)?.nombre || 'No especificado'}`,
                completada: true
            };

            const responseTareaProceso = await axiosInstance.post('/procesos/tareas/', tareaProceso);
            console.log('TareaProceso de densidad 1 creada exitosamente:', responseTareaProceso.data);

            alert(`✅ Tarea de densidad 1 guardada exitosamente para ${lotesDisponibles.length} lotes`);

            // Limpiar el formulario
            setTareaData({
                descripcion: '',
                hora_inicio: '',
                hora_fin: '',
                insumo_utilizado: '',
                cantidad: '',
                tiempo_uso: '',
                peso_usado: ''
            });

            // Recargar datos del proceso
            await cargarProceso();

        } catch (error) {
            console.error('Error al guardar tarea de densidad 1:', error);
            console.error('Detalles del error:', error.response?.data);

            let errorMsg = 'Error al guardar la tarea';
            if (error.message && error.message.includes('No se encontraron lotes')) {
                errorMsg = error.message;
            } else if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMsg = error.response.data;
                } else if (error.response.data.detail) {
                    errorMsg = error.response.data.detail;
                } else if (error.response.data.error) {
                    errorMsg = error.response.data.error;
                } else if (error.response.data.message) {
                    errorMsg = error.response.data.message;
                } else {
                    // Si hay errores de validación específicos
                    const errorFields = Object.keys(error.response.data);
                    if (errorFields.length > 0) {
                        const firstField = errorFields[0];
                        const fieldError = error.response.data[firstField];
                        if (Array.isArray(fieldError)) {
                            errorMsg = `Error en ${firstField}: ${fieldError[0]}`;
                        } else {
                            errorMsg = `Error en ${firstField}: ${fieldError}`;
                        }
                    }
                }
            }

            alert(`Error al guardar la tarea: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const guardarTareaDensidad2 = async () => {
        if (!tareaData.descripcion.trim()) {
            alert('La descripción de la tarea es requerida');
            return;
        }

        if (!tareaData.insumo_utilizado) {
            alert('Debe seleccionar un insumo utilizado');
            return;
        }

        try {
            setLoading(true);

            if (proceso.lotes && proceso.lotes.length > 0) {
                console.log(`Creando tareas de densidad 2 para ${proceso.lotes.length} lotes...`);

                // 1. Crear TareaInsumo para cada lote - usando la misma lógica que densidad 1
                const tareasLotes = proceso.lotes.map((lote, index) => {
                    console.log(`DEBUG - Procesando lote ${index} para densidad 2:`, lote);

                    let loteId;
                    let numeroLote;

                    // Verificar si el lote es un objeto o solo un ID
                    if (typeof lote === 'object' && lote !== null) {
                        // Es un objeto lote completo
                        loteId = lote.id;
                        numeroLote = lote.numero_lote || lote.codigo || loteId;
                        console.log(`DEBUG - Lote es objeto. ID: ${loteId}, Numero: ${numeroLote}`);
                    } else if (typeof lote === 'number' || (typeof lote === 'string' && !isNaN(parseInt(lote)))) {
                        // Es solo un ID numérico
                        loteId = typeof lote === 'string' ? parseInt(lote, 10) : lote;
                        numeroLote = `Lote-${loteId}`;
                        console.log(`DEBUG - Lote es ID primitivo. ID: ${loteId}, Numero generado: ${numeroLote}`);
                    } else {
                        console.error(`ERROR - Lote ${index} no es válido:`, lote);
                        return null;
                    }

                    // Validación del ID
                    if (!loteId || isNaN(loteId) || loteId <= 0) {
                        console.error(`ERROR - ID del lote ${index} no es válido:`, loteId);
                        return null;
                    }

                    const datosTarea = {
                        descripcion: `${tareaData.descripcion} - ${numeroLote}`,
                        hora_inicio: tareaData.hora_inicio || null,
                        hora_fin: tareaData.hora_fin || null,
                        insumo: parseInt(tareaData.insumo_utilizado),
                        cantidad: tareaData.cantidad ? parseFloat(tareaData.cantidad) : null,
                        tiempo_uso: tareaData.tiempo_uso ? parseInt(tareaData.tiempo_uso) : null,
                        peso_usado: tareaData.peso_usado ? parseFloat(tareaData.peso_usado) : null,
                        muestra: null,
                        lote: loteId,
                        resultado_analisis: 'PROCESO_DENSIDAD_2'
                    };

                    console.log(`DEBUG - Datos de tarea para lote ${index}:`, datosTarea);
                    return datosTarea;
                }).filter(Boolean);

                console.log(`Se crearán ${tareasLotes.length} tareas de densidad 2`);

                if (tareasLotes.length === 0) {
                    throw new Error('No se pudieron crear tareas válidas para los lotes. Verifique que los lotes tengan IDs válidos.');
                }

                const promesasTareas = tareasLotes.map(tareaLote =>
                    axiosInstance.post('/tareas/', tareaLote)
                );

                await Promise.all(promesasTareas);
                console.log(`${tareasLotes.length} tareas insumo de densidad 2 creadas exitosamente`);

                // 2. Crear TareaProceso para el proceso
                const tareaProceso = {
                    proceso: proceso.id,
                    tipo_tarea: 'DENSIDAD_CONTROL',
                    descripcion: tareaData.descripcion,
                    fase: 'DENSIDAD',
                    empleado: getCurrentUser()?.id || 1, // Agregamos el empleado requerido
                    hora_inicio: tareaData.hora_inicio || null,
                    hora_fin: tareaData.hora_fin || null,
                    fecha_ejecucion: new Date().toISOString().split('T')[0],
                    observaciones: `Tarea aplicada a ${proceso.lotes.length} lotes del proceso. Insumo utilizado: ${insumosDisponibles.find(i => i.id == tareaData.insumo_utilizado)?.nombre || 'No especificado'}`,
                    completada: true
                };

                const responseTareaProceso = await axiosInstance.post('/procesos/tareas/', tareaProceso);
                console.log('TareaProceso de densidad 2 creada exitosamente:', responseTareaProceso.data);
            }

            alert(`✅ Tarea de densidad 2 guardada exitosamente`);

            setTareaData({
                descripcion: '',
                hora_inicio: '',
                hora_fin: '',
                insumo_utilizado: '',
                cantidad: '',
                tiempo_uso: '',
                peso_usado: ''
            });

            await cargarProceso();

        } catch (error) {
            console.error('Error al guardar tarea de densidad 2:', error);
            console.error('Detalles del error:', error.response?.data);

            let errorMsg = 'Error al guardar la tarea';
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMsg = error.response.data;
                } else if (error.response.data.detail) {
                    errorMsg = error.response.data.detail;
                } else if (error.response.data.error) {
                    errorMsg = error.response.data.error;
                } else if (error.response.data.message) {
                    errorMsg = error.response.data.message;
                } else {
                    // Si hay errores de validación específicos
                    const errorFields = Object.keys(error.response.data);
                    if (errorFields.length > 0) {
                        const firstField = errorFields[0];
                        const fieldError = error.response.data[firstField];
                        if (Array.isArray(fieldError)) {
                            errorMsg = `Error en ${firstField}: ${fieldError[0]}`;
                        } else {
                            errorMsg = `Error en ${firstField}: ${fieldError}`;
                        }
                    }
                }
            }

            alert(`Error al guardar la tarea: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const guardarTareaColor = async () => {
        if (!tareaData.descripcion.trim()) {
            alert('La descripción de la tarea es requerida');
            return;
        }

        if (!tareaData.insumo_utilizado) {
            alert('Debe seleccionar un insumo utilizado');
            return;
        }

        try {
            setLoading(true);

            if (proceso.lotes && proceso.lotes.length > 0) {
                console.log(`Creando tareas de color para ${proceso.lotes.length} lotes...`);

                // 1. Crear TareaInsumo para cada lote - usando la misma lógica que densidad
                const tareasLotes = proceso.lotes.map((lote, index) => {
                    console.log(`DEBUG - Procesando lote ${index} para color:`, lote);

                    let loteId;
                    let numeroLote;

                    // Verificar si el lote es un objeto o solo un ID
                    if (typeof lote === 'object' && lote !== null) {
                        // Es un objeto lote completo
                        loteId = lote.id;
                        numeroLote = lote.numero_lote || lote.codigo || loteId;
                        console.log(`DEBUG - Lote es objeto. ID: ${loteId}, Numero: ${numeroLote}`);
                    } else if (typeof lote === 'number' || (typeof lote === 'string' && !isNaN(parseInt(lote)))) {
                        // Es solo un ID numérico
                        loteId = typeof lote === 'string' ? parseInt(lote, 10) : lote;
                        numeroLote = `Lote-${loteId}`;
                        console.log(`DEBUG - Lote es ID primitivo. ID: ${loteId}, Numero generado: ${numeroLote}`);
                    } else {
                        console.error(`ERROR - Lote ${index} no es válido:`, lote);
                        return null;
                    }

                    // Validación del ID
                    if (!loteId || isNaN(loteId) || loteId <= 0) {
                        console.error(`ERROR - ID del lote ${index} no es válido:`, loteId);
                        return null;
                    }

                    const datosTarea = {
                        descripcion: `${tareaData.descripcion} - ${numeroLote}`,
                        hora_inicio: tareaData.hora_inicio || null,
                        hora_fin: tareaData.hora_fin || null,
                        insumo: parseInt(tareaData.insumo_utilizado),
                        cantidad: tareaData.cantidad ? parseFloat(tareaData.cantidad) : null,
                        tiempo_uso: tareaData.tiempo_uso ? parseInt(tareaData.tiempo_uso) : null,
                        peso_usado: tareaData.peso_usado ? parseFloat(tareaData.peso_usado) : null,
                        muestra: null,
                        lote: loteId,
                        resultado_analisis: 'PROCESO_COLOR'
                    };

                    console.log(`DEBUG - Datos de tarea para lote ${index}:`, datosTarea);
                    return datosTarea;
                }).filter(Boolean);

                console.log(`Se crearán ${tareasLotes.length} tareas de color`);

                if (tareasLotes.length === 0) {
                    throw new Error('No se pudieron crear tareas válidas para los lotes. Verifique que los lotes tengan IDs válidos.');
                }

                const promesasTareas = tareasLotes.map(tareaLote =>
                    axiosInstance.post('/tareas/', tareaLote)
                );

                await Promise.all(promesasTareas);
                console.log(`${tareasLotes.length} tareas insumo de color creadas exitosamente`);

                // 2. Crear TareaProceso para el proceso
                const tareaProceso = {
                    proceso: proceso.id,
                    tipo_tarea: 'COLOR_INICIO',
                    descripcion: tareaData.descripcion,
                    fase: 'COLOR',
                    empleado: getCurrentUser()?.id || 1, // Agregamos el empleado requerido
                    hora_inicio: tareaData.hora_inicio || null,
                    hora_fin: tareaData.hora_fin || null,
                    fecha_ejecucion: new Date().toISOString().split('T')[0],
                    observaciones: `Tarea de clasificación por color aplicada a ${proceso.lotes.length} lotes del proceso. Insumo utilizado: ${insumosDisponibles.find(i => i.id == tareaData.insumo_utilizado)?.nombre || 'No especificado'}`,
                    completada: true
                };

                const responseTareaProceso = await axiosInstance.post('/procesos/tareas/', tareaProceso);
                console.log('TareaProceso de color creada exitosamente:', responseTareaProceso.data);
            } else {
                throw new Error('No se encontraron lotes en el proceso');
            }

            alert(`✅ Tarea de clasificación por color guardada exitosamente`);

            setTareaData({
                descripcion: '',
                hora_inicio: '',
                hora_fin: '',
                insumo_utilizado: '',
                cantidad: '',
                tiempo_uso: '',
                peso_usado: ''
            });

            await cargarProceso();

        } catch (error) {
            console.error('Error al guardar tarea de color:', error);
            console.error('Detalles del error:', error.response?.data);

            let errorMsg = 'Error al guardar la tarea';
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMsg = error.response.data;
                } else if (error.response.data.detail) {
                    errorMsg = error.response.data.detail;
                } else if (error.response.data.error) {
                    errorMsg = error.response.data.error;
                } else if (error.response.data.message) {
                    errorMsg = error.response.data.message;
                } else {
                    // Si hay errores de validación específicos
                    const errorFields = Object.keys(error.response.data);
                    if (errorFields.length > 0) {
                        const firstField = errorFields[0];
                        const fieldError = error.response.data[firstField];
                        if (Array.isArray(fieldError)) {
                            errorMsg = `Error en ${firstField}: ${fieldError[0]}`;
                        } else {
                            errorMsg = `Error en ${firstField}: ${fieldError}`;
                        }
                    }
                }
            }

            alert(`Error al guardar la tarea: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const guardarTareaEmpaquetado = async () => {
        if (!tareaData.descripcion.trim()) {
            alert('La descripción de la tarea es requerida');
            return;
        }

        if (!tareaData.insumo_utilizado) {
            alert('Debe seleccionar un insumo utilizado');
            return;
        }

        try {
            setLoading(true);

            // Debug completo del proceso y lotes
            console.log('=== DEBUG EMPAQUETADO ===');
            console.log('Proceso completo:', JSON.stringify(proceso, null, 2));
            console.log('Lotes del proceso:', proceso.lotes);
            console.log('Tipo de lotes:', typeof proceso.lotes);
            console.log('Es array:', Array.isArray(proceso.lotes));
            console.log('Longitud de lotes:', proceso.lotes?.length);

            if (proceso.lotes && proceso.lotes.length > 0) {
                console.log(`Creando tareas de empaquetado para ${proceso.lotes.length} lotes...`);

                // 1. Crear TareaInsumo para cada lote - usando la misma lógica que densidad y color
                const tareasLotes = proceso.lotes.map((lote, index) => {
                    console.log(`\n--- PROCESANDO LOTE ${index} ---`);
                    console.log('Lote raw:', lote);
                    console.log('Tipo del lote:', typeof lote);
                    
                    let loteId;
                    let numeroLote;
                    
                    // Verificar si el lote es un objeto o solo un ID
                    if (typeof lote === 'object' && lote !== null) {
                        // Es un objeto lote completo
                        loteId = lote.id;
                        numeroLote = lote.numero_lote || lote.codigo || `Lote-${loteId}`;
                        console.log(`✓ Lote es objeto. ID: ${loteId}, Numero: ${numeroLote}`);
                        console.log('Propiedades del lote:', Object.keys(lote));
                    } else if (typeof lote === 'number' || (typeof lote === 'string' && !isNaN(parseInt(lote)))) {
                        // Es solo un ID numérico
                        loteId = typeof lote === 'string' ? parseInt(lote, 10) : lote;
                        numeroLote = `Lote-${loteId}`;
                        console.log(`✓ Lote es ID primitivo. ID: ${loteId}, Numero generado: ${numeroLote}`);
                    } else {
                        console.error(`✗ ERROR - Lote ${index} no es válido:`, lote);
                        return null;
                    }
                    
                    // Validación del ID
                    if (!loteId || isNaN(loteId) || loteId <= 0) {
                        console.error(`✗ ERROR - ID del lote ${index} no es válido:`, loteId);
                        return null;
                    }

                    const datosTarea = {
                        descripcion: `${tareaData.descripcion} - ${numeroLote}`,
                        hora_inicio: tareaData.hora_inicio || null,
                        hora_fin: tareaData.hora_fin || null,
                        insumo: parseInt(tareaData.insumo_utilizado),
                        cantidad: tareaData.cantidad ? parseFloat(tareaData.cantidad) : null,
                        tiempo_uso: tareaData.tiempo_uso ? parseInt(tareaData.tiempo_uso) : null,
                        peso_usado: tareaData.peso_usado ? parseFloat(tareaData.peso_usado) : null,
                        muestra: null,
                        lote: loteId,
                        resultado_analisis: 'PROCESO_EMPAQUETADO'
                    };

                    console.log(`✓ Datos de tarea generados:`, datosTarea);
                    return datosTarea;
                }).filter(Boolean);

                console.log(`\n=== RESUMEN ===`);
                console.log(`Total lotes procesados: ${proceso.lotes.length}`);
                console.log(`Tareas válidas creadas: ${tareasLotes.length}`);
                console.log('Todas las tareas a crear:', JSON.stringify(tareasLotes, null, 2));

                if (tareasLotes.length === 0) {
                    throw new Error('No se pudieron crear tareas válidas para los lotes. Verifique que los lotes tengan IDs válidos.');
                }

                // Enviar una tarea a la vez para identificar cuál falla
                console.log('\n=== ENVIANDO TAREAS AL SERVIDOR ===');
                const resultados = [];
                for (let i = 0; i < tareasLotes.length; i++) {
                    const tarea = tareasLotes[i];
                    console.log(`\nEnviando tarea ${i + 1}/${tareasLotes.length}:`, tarea);
                    
                    try {
                        const resultado = await axiosInstance.post('/tareas/', tarea);
                        console.log(`✓ Tarea ${i + 1} creada exitosamente:`, resultado.data);
                        resultados.push(resultado);
                    } catch (error) {
                        console.error(`✗ ERROR en tarea ${i + 1}:`, error.response?.data || error.message);
                        console.error('Datos de la tarea que falló:', tarea);
                        throw error; // Re-lanzar el error para que se maneje en el catch principal
                    }
                }

                console.log(`✅ ${tareasLotes.length} tareas insumo de empaquetado creadas exitosamente`);

                // 2. Crear TareaProceso para el proceso
                console.log('\n=== CREANDO TAREA PROCESO ===');
                const currentUser = await getCurrentUser();
                console.log('Usuario actual:', currentUser);
                
                const tareaProceso = {
                    proceso: proceso.id,
                    tipo_tarea: 'EMPAQUE_PROCESO',
                    descripcion: tareaData.descripcion,
                    fase: 'EMPAQUE',
                    empleado: currentUser?.id || 1,
                    hora_inicio: tareaData.hora_inicio || null,
                    hora_fin: tareaData.hora_fin || null,
                    fecha_ejecucion: new Date().toISOString().split('T')[0],
                    observaciones: `Tarea de empaquetado aplicada a ${proceso.lotes.length} lotes del proceso. Insumo utilizado: ${insumosDisponibles.find(i => i.id == tareaData.insumo_utilizado)?.nombre || 'No especificado'}`,
                    completada: true
                };

                console.log('Datos de TareaProceso:', tareaProceso);
                
                const responseTareaProceso = await axiosInstance.post('/procesos/tareas/', tareaProceso);
                console.log('✅ TareaProceso de empaquetado creada exitosamente:', responseTareaProceso.data);
            } else {
                throw new Error('No se encontraron lotes en el proceso');
            }

            alert(`✅ Tarea de empaquetado guardada exitosamente`);

            setTareaData({
                descripcion: '',
                hora_inicio: '',
                hora_fin: '',
                insumo_utilizado: '',
                cantidad: '',
                tiempo_uso: '',
                peso_usado: ''
            });

            await cargarProceso();

        } catch (error) {
            console.error('=== ERROR COMPLETO ===');
            console.error('Error principal:', error);
            console.error('Respuesta del servidor:', error.response);
            console.error('Status:', error.response?.status);
            console.error('Data completa:', error.response?.data);
            console.error('Headers:', error.response?.headers);
            console.error('Config de la request:', error.config);
            
            let errorMsg = 'Error al guardar la tarea';
            if (error.response?.data) {
                console.log('Analizando error de respuesta...');
                
                if (typeof error.response.data === 'string') {
                    errorMsg = error.response.data;
                } else if (error.response.data.detail) {
                    errorMsg = error.response.data.detail;
                } else if (error.response.data.error) {
                    errorMsg = error.response.data.error;
                } else if (error.response.data.message) {
                    errorMsg = error.response.data.message;
                } else {
                    // Si hay errores de validación específicos
                    const errorFields = Object.keys(error.response.data);
                    console.log('Campos con errores:', errorFields);
                    
                    if (errorFields.length > 0) {
                        const firstField = errorFields[0];
                        const fieldError = error.response.data[firstField];
                        console.log(`Error en campo ${firstField}:`, fieldError);
                        
                        if (Array.isArray(fieldError)) {
                            errorMsg = `Error en ${firstField}: ${fieldError[0]}`;
                        } else {
                            errorMsg = `Error en ${firstField}: ${fieldError}`;
                        }
                    }
                }
            }
            
            console.log('Mensaje de error final:', errorMsg);
            alert(`Error al guardar la tarea: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const finalizarEmpaquetado = async () => {
        const tieneCafe = empaquetadoData.cafe_caracolillo ||
            empaquetadoData.cafe_descarte ||
            empaquetadoData.cafe_exportacion;

        if (!tieneCafe) {
            alert('Debe especificar al menos un tipo de café empaquetado');
            return;
        }

        try {
            setLoading(true);

            const datosEmpaquetado = {
                cafe_caracolillo: empaquetadoData.cafe_caracolillo ? parseFloat(empaquetadoData.cafe_caracolillo) : 0,
                cafe_descarte: empaquetadoData.cafe_descarte ? parseFloat(empaquetadoData.cafe_descarte) : 0,
                cafe_exportacion: empaquetadoData.cafe_exportacion ? parseFloat(empaquetadoData.cafe_exportacion) : 0,
                observaciones_empaquetado: empaquetadoData.observaciones_empaquetado || ''
            };

            console.log('=== FINALIZANDO EMPAQUETADO ===');
            console.log('Datos de empaquetado a guardar:', datosEmpaquetado);

            // 1. Guardar datos específicos de empaquetado usando el nuevo endpoint
            const response = await axiosInstance.post(`/procesos/${proceso.id}/guardar-empaquetado/`, datosEmpaquetado);
            console.log('✅ Datos de empaquetado guardados en la base de datos:', response.data);

            // 2. Actualizar el proceso para marcarlo como completado
            const updateResponse = await axiosInstance.patch(`/procesos/${proceso.id}/`, {
                estado: 'COMPLETADO',
                fase_actual: 'EMPAQUE',
                progreso: 100,
                fecha_fin_real: new Date().toISOString(),
                notas_tecnicas: {
                    ...proceso.notas_tecnicas,
                    EMPAQUETADO: [
                        ...(proceso.notas_tecnicas?.EMPAQUETADO || []),
                        {
                            fecha: new Date().toISOString(),
                            nota: `Proceso de empaquetado finalizado. Caracolillo: ${datosEmpaquetado.cafe_caracolillo} pf, Descarte: ${datosEmpaquetado.cafe_descarte} pf, Exportación: ${datosEmpaquetado.cafe_exportacion} pf. Observaciones: ${datosEmpaquetado.observaciones_empaquetado}`
                        }
                    ]
                }
            });

            console.log('✅ Proceso finalizado exitosamente:', updateResponse.data);

            setProceso(updateResponse.data);

            setFasesCompletadas(prev => ({
                ...prev,
                EMPAQUETADO: true
            }));

            alert('🎉 ¡Proceso de empaquetado finalizado exitosamente! Los datos han sido guardados en la base de datos y el proceso ha sido completado al 100%.');

            setShowEmpaquetadoForm(false);

        } catch (error) {
            console.error('Error al finalizar empaquetado:', error);
            console.error('Detalles del error:', error.response?.data);

            let errorMsg = 'Error al finalizar el proceso de empaquetado';
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMsg = error.response.data;
                } else if (error.response.data.error) {
                    errorMsg = error.response.data.error;
                } else if (error.response.data.detail) {
                    errorMsg = error.response.data.detail;
                } else if (error.response.data.message) {
                    errorMsg = error.response.data.message;
                } else {
                    const errorFields = Object.keys(error.response.data);
                    if (errorFields.length > 0) {
                        errorMsg = `Error en campos: ${errorFields.join(', ')}`;
                    }
                }
            }

            alert(`❌ ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const volverAProcesos = () => {
        navigate('/procesos');
    };

    // Funciones auxiliares para finalizar cada fase
    const finalizarPilado = async () => {
        try {
            setLoading(true);

            // 1. Guardar datos específicos del pilado usando el nuevo endpoint
            const response = await axiosInstance.post(`/procesos/${proceso.id}/guardar-pilado/`, piladoData);
            console.log('✅ Datos de pilado guardados en la base de datos:', response.data);

            // 2. Actualizar el proceso
            const updateResponse = await axiosInstance.patch(`/procesos/${proceso.id}/`, {
                fase_actual: 'CLASIFICACION',
                progreso: 20,
                notas_tecnicas: {
                    ...proceso.notas_tecnicas,
                    PILADO: [
                        ...(proceso.notas_tecnicas?.PILADO || []),
                        {
                            fecha: new Date().toISOString(),
                            nota: `Pilado completado. Impurezas: ${piladoData.tipo_impureza_encontrada}, Peso removido: ${piladoData.peso_impurezas_removidas} kg. Observaciones: ${piladoData.observaciones}`
                        }
                    ]
                }
            });

            setProceso(updateResponse.data);
            setFasesCompletadas(prev => ({ ...prev, PILADO: true }));
            setActiveStep('CLASIFICACION');
            setShowPiladoForm(false);
            setShowClasificacionForm(true);

            alert('✅ Fase de PILADO completada exitosamente y datos guardados en la base de datos');

        } catch (error) {
            console.error('Error al finalizar pilado:', error);
            const errorMsg = error.response?.data?.error || error.message;
            alert(`Error al finalizar la fase de pilado: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const finalizarClasificacion = async () => {
        try {
            setLoading(true);

            // 1. Guardar datos específicos de la clasificación usando el nuevo endpoint
            const response = await axiosInstance.post(`/procesos/${proceso.id}/guardar-clasificacion/`, clasificacionData);
            console.log('✅ Datos de clasificación guardados en la base de datos:', response.data);

            // 2. Actualizar el proceso
            const updateResponse = await axiosInstance.patch(`/procesos/${proceso.id}/`, {
                fase_actual: 'DENSIDAD',
                progreso: 40,
                notas_tecnicas: {
                    ...proceso.notas_tecnicas,
                    CLASIFICACION: [
                        ...(proceso.notas_tecnicas?.CLASIFICACION || []),
                        {
                            fecha: new Date().toISOString(),
                            nota: `Clasificación completada. Malla: ${clasificacionData.numero_malla_ocupada}, Caracolillo: ${clasificacionData.peso_cafe_caracolillo} kg, Exportación: ${clasificacionData.peso_cafe_exportacion} kg. Observaciones: ${clasificacionData.observaciones}`
                        }
                    ]
                }
            });

            setProceso(updateResponse.data);
            setFasesCompletadas(prev => ({ ...prev, CLASIFICACION: true }));
            setActiveStep('DENSIDAD');
            setShowClasificacionForm(false);
            setShowDensidadForm(true);

            alert('✅ Fase de CLASIFICACIÓN completada exitosamente y datos guardados en la base de datos');

        } catch (error) {
            console.error('Error al finalizar clasificación:', error);
            const errorMsg = error.response?.data?.error || error.message;
            alert(`Error al finalizar la fase de clasificación: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const finalizarDensidad1 = async () => {
        try {
            setLoading(true);

            // 1. Guardar datos específicos de densidad 1 usando el nuevo endpoint
            const response = await axiosInstance.post(`/procesos/${proceso.id}/guardar-densidad-1/`, densidadData);
            console.log('✅ Datos de densidad 1 guardados en la base de datos:', response.data);

            // 2. Actualizar el proceso
            const updateResponse = await axiosInstance.patch(`/procesos/${proceso.id}/`, {
                notas_tecnicas: {
                    ...proceso.notas_tecnicas,
                    DENSIDAD_1: [
                        ...(proceso.notas_tecnicas?.DENSIDAD_1 || []),
                        {
                            fecha: new Date().toISOString(),
                            nota: `Densidad 1 completada. Peso: ${densidadData.peso_cafe_densidad_1} kg. Observaciones: ${densidadData.observaciones_densidad_1}`
                        }
                    ]
                }
            });

            setProceso(updateResponse.data);
            setDensidadPasos(prev => ({ ...prev, clasificacion_densidad: true }));

            alert('✅ Clasificación por densidad completada y datos guardados. Continúe con densimetría 2');

        } catch (error) {
            console.error('Error al finalizar densidad 1:', error);
            const errorMsg = error.response?.data?.error || error.message;
            alert(`Error al finalizar clasificación por densidad: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const finalizarDensidad = async () => {
        try {
            setLoading(true);

            // 1. Guardar datos específicos de densidad 2 usando el nuevo endpoint
            const response = await axiosInstance.post(`/procesos/${proceso.id}/guardar-densidad-2/`, densimetria2Data);
            console.log('✅ Datos de densidad 2 guardados en la base de datos:', response.data);

            // 2. Actualizar el proceso
            const updateResponse = await axiosInstance.patch(`/procesos/${proceso.id}/`, {
                fase_actual: 'COLOR',
                progreso: 60,
                notas_tecnicas: {
                    ...proceso.notas_tecnicas,
                    DENSIDAD_2: [
                        ...(proceso.notas_tecnicas?.DENSIDAD_2 || []),
                        {
                            fecha: new Date().toISOString(),
                            nota: `Densidad 2 completada. Peso: ${densimetria2Data.peso_cafe_densidad_2} kg. Observaciones: ${densimetria2Data.observaciones_densidad_2}`
                        }
                    ]
                }
            });

            setProceso(updateResponse.data);
            setFasesCompletadas(prev => ({ ...prev, DENSIDAD: true }));
            setDensidadPasos(prev => ({ ...prev, densimetria_2: true }));
            setActiveStep('COLOR');
            setShowDensidadForm(false);
            setShowColorForm(true);

            alert('✅ Fase de DENSIDAD completada exitosamente y datos guardados en la base de datos');

        } catch (error) {
            console.error('Error al finalizar densidad:', error);
            const errorMsg = error.response?.data?.error || error.message;
            alert(`Error al finalizar la fase de densidad: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const finalizarColor = async () => {
        const totalPeso = calcularTotalPesoColor();
        if (totalPeso === 0) {
            alert('Debe especificar al menos un peso para la clasificación por colores');
            return;
        }

        try {
            setLoading(true);

            // Filtrar colores que tienen peso
            const clasificacionLimpia = {};
            Object.entries(colorData.clasificacion_colores).forEach(([color, datos]) => {
                if (datos.peso && !isNaN(parseFloat(datos.peso)) && parseFloat(datos.peso) > 0) {
                    clasificacionLimpia[color] = {
                        peso: parseFloat(datos.peso),
                        porcentaje: parseFloat(datos.porcentaje) || 0
                    };
                }
            });

            const datosColorCompletos = {
                ...colorData,
                clasificacion_colores: clasificacionLimpia
            };

            // 1. Guardar datos específicos de color usando el nuevo endpoint
            const response = await axiosInstance.post(`/procesos/${proceso.id}/guardar-color/`, datosColorCompletos);
            console.log('✅ Datos de color guardados en la base de datos:', response.data);

            // 2. Actualizar el proceso
            const updateResponse = await axiosInstance.patch(`/procesos/${proceso.id}/`, {
                fase_actual: 'EMPAQUE',
                progreso: 80,
                notas_tecnicas: {
                    ...proceso.notas_tecnicas,
                    COLOR: [
                        ...(proceso.notas_tecnicas?.COLOR || []),
                        {
                            fecha: new Date().toISOString(),
                            nota: `Color completado. Total separado: ${totalPeso} kg. Observaciones: ${colorData.observaciones_separacion}`
                        }
                    ]
                }
            });

            setProceso(updateResponse.data);
            setFasesCompletadas(prev => ({ ...prev, COLOR: true }));
            setActiveStep('EMPAQUE');
            setShowColorForm(false);
            setShowEmpaquetadoForm(true);

            alert('✅ Fase de COLOR completada exitosamente y datos guardados en la base de datos');

        } catch (error) {
            console.error('Error al finalizar color:', error);
            const errorMsg = error.response?.data?.error || error.message;
            alert(`Error al finalizar la fase de color: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return <div>Verificando acceso...</div>;
    }

    if (!proceso) {
        return (
            <>
                <Sidebar />
                <BottomNavigator />
                <div className="detalle-proceso-container">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Cargando proceso...</p>
                    </div>
                </div>
            </>
        );
    }

    const steps = [
        { id: 'PILADO', name: 'PILADO', number: 1, color: '#2c5530' },
        { id: 'CLASIFICACION', name: 'CLASIFICACION', number: 2, color: '#dc3545' },
        { id: 'DENSIDAD', name: 'DENSIDAD', number: 3, color: '#dc3545' },
        { id: 'COLOR', name: 'COLOR', number: 4, color: '#dc3545' },
        { id: 'EMPAQUE', name: 'EMPAQUE', number: 5, color: '#dc3545' }
    ];

    return (
        <>
            <Sidebar />
            <BottomNavigator />

            <div className="detalle-proceso-container">
                <div className="proceso-detalle-header">
                    <div className="header-content">
                        <button className="btn-volver" onClick={volverAProcesos}>
                            ← Atrás
                        </button>
                        <div className="proceso-title">
                            <h1>Proceso {proceso.numero || proceso.id}</h1>
                            <p>Proceso en curso: {proceso.nombre || `Proceso ${proceso.numero}`}</p>
                            <div className="proceso-lotes-info">
                                <span>📦 {proceso.lotes?.length || 0} lotes incluidos</span>
                                <span>📊 {proceso.quintales_totales || 0} quintales totales</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="proceso-progress-section">
                    <div className="progress-container">
                        <div className="progress-line"></div>
                        <div className="steps-container">
                            {steps.map((step, index) => (
                                <div key={step.id} className="step-wrapper">
                                    <div
                                        className={`step-circle ${step.id === activeStep ? 'active' : 'inactive'}`}
                                        style={getStepStyle(step)}
                                        onClick={() => handleStepClick(step.id)}
                                        title={
                                            fasesCompletadas[step.id] ?
                                                `✅ ${step.name} - Completada` :
                                                isFaseDisponible(step.id) ?
                                                    `🔄 ${step.name} - Disponible` :
                                                    `🔒 ${step.name} - Bloqueada`
                                        }
                                    >
                                        {fasesCompletadas[step.id] ? '✓' : step.number}
                                    </div>
                                    <span className={`step-label ${fasesCompletadas[step.id] ? 'completed' : ''}`}>
                                        <span className="phase-name">{step.name}</span>
                                        {fasesCompletadas[step.id] && (
                                            <span className="completion-status">✅ COMPLETADA</span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="progress-indicator">
                            <p><strong>Fase Actual:</strong> {getCurrentPhase()}</p>
                            <p><strong>Progreso:</strong> {Object.values(fasesCompletadas).filter(Boolean).length} de 5 fases completadas</p>
                        </div>
                    </div>
                </div>

                {showPiladoForm && (
                    <div className="pilado-forms-section">
                        <div className="forms-container">
                            <div className="form-card main-form">
                                <div className="form-header">
                                    <h3>Proceso {proceso.numero}</h3>
                                    <span className="form-subtitle">Pilado</span>
                                </div>

                                <div className="form-content">
                                    <div className="form-group">
                                        <label>Tipo de impureza encontrada</label>
                                        <input
                                            type="text"
                                            value={piladoData.tipo_impureza_encontrada}
                                            onChange={(e) => handlePiladoChange('tipo_impureza_encontrada', e.target.value)}
                                            placeholder="Ej: Piedras, palos, hojas, etc."
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Peso de impurezas removidas (kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={piladoData.peso_impurezas_removidas}
                                            onChange={(e) => handlePiladoChange('peso_impurezas_removidas', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Observaciones</label>
                                        <textarea
                                            value={piladoData.observaciones}
                                            onChange={(e) => handlePiladoChange('observaciones', e.target.value)}
                                            placeholder="Ingrese observaciones..."
                                            rows="4"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-card tasks-form">
                                <div className="form-header">
                                    <h3>📝 Registrar Tarea para Todos los Lotes</h3>
                                    <p className="form-description">
                                        Esta tarea se aplicará a todos los {proceso.lotes?.length || 0} lotes del proceso
                                    </p>
                                </div>

                                <div className="form-content">
                                    <div className="form-group">
                                        <label>Descripción de la tarea *</label>
                                        <textarea
                                            value={tareaData.descripcion}
                                            onChange={(e) => handleTareaChange('descripcion', e.target.value)}
                                            placeholder="Describa la tarea realizada para esta fase del proceso..."
                                            rows="3"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Hora inicio</label>
                                        <input
                                            type="time"
                                            value={tareaData.hora_inicio}
                                            onChange={(e) => handleTareaChange('hora_inicio', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Hora Fin</label>
                                        <input
                                            type="time"
                                            value={tareaData.hora_fin}
                                            onChange={(e) => handleTareaChange('hora_fin', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Insumo Utilizado *</label>
                                        <select
                                            value={tareaData.insumo_utilizado}
                                            onChange={(e) => handleTareaChange('insumo_utilizado', e.target.value)}
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
                                            step="0.01"
                                            value={tareaData.cantidad}
                                            onChange={(e) => handleTareaChange('cantidad', e.target.value)}
                                            placeholder="Cantidad utilizada"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Tiempo de Uso (minutos)</label>
                                        <input
                                            type="number"
                                            value={tareaData.tiempo_uso}
                                            onChange={(e) => handleTareaChange('tiempo_uso', e.target.value)}
                                            placeholder="Tiempo en minutos"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Peso Usado (kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={tareaData.peso_usado}
                                            onChange={(e) => handleTareaChange('peso_usado', e.target.value)}
                                            placeholder="Peso en kilogramos"
                                        />
                                    </div>

                                    <button
                                        className="btn-crear-tarea"
                                        onClick={guardarTareaPilado}
                                        disabled={!tareaData.descripcion.trim() || !tareaData.insumo_utilizado || loading}
                                    >
                                        {loading ? '⏳ Creando...' : '✅ Crear Tarea para Todos los Lotes'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button className="btn-secondary" onClick={() => setShowPiladoForm(false)}>
                                Atrás
                            </button>
                            <button className="btn-primary" onClick={finalizarPilado} disabled={loading}>
                                {loading ? '⏳ Finalizando...' : '🏁 Finalizar Pilado'}
                            </button>
                        </div>
                    </div>
                )}

                {showClasificacionForm && (
                    <div className="clasificacion-forms-section">
                        <div className="forms-container">
                            <div className="form-card main-form">
                                <div className="form-header">
                                    <h3>Proceso {proceso.numero}</h3>
                                    <span className="form-subtitle">Clasificación por Tamaño</span>
                                </div>

                                <div className="form-content">
                                    <div className="form-group">
                                        <label>Número de malla ocupada</label>
                                        <input
                                            type="text"
                                            value={clasificacionData.numero_malla_ocupada}
                                            onChange={(e) => handleClasificacionChange('numero_malla_ocupada', e.target.value)}
                                            placeholder="Ej: Malla 18, Malla 16, etc."
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Peso de café caracolillo (kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={clasificacionData.peso_cafe_caracolillo}
                                            onChange={(e) => handleClasificacionChange('peso_cafe_caracolillo', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Peso de café exportación (kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={clasificacionData.peso_cafe_exportacion}
                                            onChange={(e) => handleClasificacionChange('peso_cafe_exportacion', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Observaciones</label>
                                        <textarea
                                            value={clasificacionData.observaciones}
                                            onChange={(e) => handleClasificacionChange('observaciones', e.target.value)}
                                            placeholder="Ingrese observaciones..."
                                            rows="4"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-card tasks-form">
                                <div className="form-header">
                                    <h3>📝 Registrar Tarea para Todos los Lotes</h3>
                                    <p className="form-description">
                                        Esta tarea se aplicará a todos los {proceso.lotes?.length || 0} lotes del proceso
                                    </p>
                                </div>

                                <div className="form-content">
                                    <div className="form-group">
                                        <label className="required">Descripción de la tarea</label>
                                        <textarea
                                            value={tareaData.descripcion}
                                            onChange={(e) => handleTareaChange('descripcion', e.target.value)}
                                            placeholder="Describa la tarea realizada para esta fase del proceso..."
                                            rows="3"
                                            required
                                            className="form-control"
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group time-field">
                                            <label>Hora inicio</label>
                                            <input
                                                type="time"
                                                value={tareaData.hora_inicio}
                                                onChange={(e) => handleTareaChange('hora_inicio', e.target.value)}
                                                className="form-control"
                                            />
                                        </div>

                                        <div className="form-group time-field">
                                            <label>Hora Fin</label>
                                            <input
                                                type="time"
                                                value={tareaData.hora_fin}
                                                onChange={(e) => handleTareaChange('hora_fin', e.target.value)}
                                                className="form-control"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="required">Insumo Utilizado</label>
                                        <select
                                            value={tareaData.insumo_utilizado}
                                            onChange={(e) => handleTareaChange('insumo_utilizado', e.target.value)}
                                            required
                                            className="form-control"
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

                                    <div className="form-row-3">
                                        <div className="form-group number-field">
                                            <label>Cantidad</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tareaData.cantidad}
                                                onChange={(e) => handleTareaChange('cantidad', e.target.value)}
                                                placeholder="0.00"
                                                className="form-control"
                                            />
                                        </div>

                                        <div className="form-group number-field">
                                            <label>Tiempo de Uso (min)</label>
                                            <input
                                                type="number"
                                                value={tareaData.tiempo_uso}
                                                onChange={(e) => handleTareaChange('tiempo_uso', e.target.value)}
                                                placeholder="Minutos"
                                                className="form-control"
                                            />
                                        </div>

                                        <div className="form-group number-field">
                                            <label>Peso Usado (kg)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tareaData.peso_usado}
                                                onChange={(e) => handleTareaChange('peso_usado', e.target.value)}
                                                placeholder="0.00 kg"
                                                className="form-control"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        className="btn-crear-tarea"
                                        onClick={guardarTareaClasificacion}
                                        disabled={!tareaData.descripcion.trim() || !tareaData.insumo_utilizado || loading}
                                    >
                                        {loading ? '⏳ Creando...' : '✅ Crear Tarea para Todos los Lotes'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button className="btn-secondary" onClick={() => setShowClasificacionForm(false)}>
                                Atrás
                            </button>
                            <button className="btn-primary" onClick={finalizarClasificacion} disabled={loading}>
                                {loading ? '⏳ Finalizando...' : '🏁 Finalizar Clasificación por Tamaño'}
                            </button>
                        </div>
                    </div>
                )}

                {showDensidadForm && (
                    <div className="densidad-forms-section">
                        <div className="densidad-header">
                            <h2>🔬 CLASIFICACIÓN POR DENSIDAD</h2>
                            <div className="densidad-progress">
                                <div className="densidad-steps">
                                    <div className={`densidad-step ${!densidadPasos.clasificacion_densidad ? 'active' : 'completed'}`}>
                                        <div className="step-indicator">
                                            {densidadPasos.clasificacion_densidad ? '✓' : '1'}
                                        </div>
                                        <span>Clasificación por Densidad</span>
                                    </div>
                                    <div className={`densidad-step ${densidadPasos.clasificacion_densidad && !densidadPasos.densimetria_2 ? 'active' : densidadPasos.densimetria_2 ? 'completed' : 'pending'}`}>
                                        <div className="step-indicator">
                                            {densidadPasos.densimetria_2 ? '✓' : '2'}
                                        </div>
                                        <span>Densimetría 2</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!densidadPasos.clasificacion_densidad && (
                            <div className="densidad-paso-1">
                                <div className="forms-container">
                                    <div className="form-card main-form">
                                        <div className="form-header">
                                            <h3>Proceso {proceso.numero || proceso.id}</h3>
                                            <span className="form-subtitle">Resultados Densimetría 1</span>
                                        </div>

                                        <div className="form-content">
                                            <div className="form-group">
                                                <label>Peso café densidad 1</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={densidadData.peso_cafe_densidad_1}
                                                    onChange={(e) => handleDensidadChange('peso_cafe_densidad_1', e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Observaciones</label>
                                                <textarea
                                                    value={densidadData.observaciones_densidad_1}
                                                    onChange={(e) => handleDensidadChange('observaciones_densidad_1', e.target.value)}
                                                    placeholder="Ingrese observaciones para la clasificación por densidad..."
                                                    rows="4"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-card tasks-form">
                                        <div className="form-header">
                                            <h3>📝 Tareas realizadas</h3>
                                            <p className="form-description">
                                                Descripción de la tarea
                                            </p>
                                        </div>

                                        <div className="form-content">
                                            <div className="form-group">
                                                <label>Descripción de la tarea *</label>
                                                <textarea
                                                    value={tareaData.descripcion}
                                                    onChange={(e) => handleTareaChange('descripcion', e.target.value)}
                                                    placeholder="Describa la tarea realizada para clasificación por densidad..."
                                                    rows="3"
                                                    required
                                                />
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Hora inicio</label>
                                                    <input
                                                        type="time"
                                                        value={tareaData.hora_inicio}
                                                        onChange={(e) => handleTareaChange('hora_inicio', e.target.value)}
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label>Hora Fin</label>
                                                    <input
                                                        type="time"
                                                        value={tareaData.hora_fin}
                                                        onChange={(e) => handleTareaChange('hora_fin', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Insumo Utilizado *</label>
                                                <select
                                                    value={tareaData.insumo_utilizado}
                                                    onChange={(e) => handleTareaChange('insumo_utilizado', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Seleccionar insumo</option>
                                                    {insumosDisponibles.map(insumo => (
                                                        <option key={insumo.id} value={insumo.id}>
                                                            {insumo.nombre} ({insumo.codigo}) - {insumo.tipo_display}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Cantidad</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={tareaData.cantidad}
                                                        onChange={(e) => handleTareaChange('cantidad', e.target.value)}
                                                        placeholder="Cantidad utilizada"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label>Tiempo de Uso (min)</label>
                                                    <input
                                                        type="number"
                                                        value={tareaData.tiempo_uso}
                                                        onChange={(e) => handleTareaChange('tiempo_uso', e.target.value)}
                                                        placeholder="Tiempo en minutos"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label>Peso Usado (kg)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={tareaData.peso_usado}
                                                        onChange={(e) => handleTareaChange('peso_usado', e.target.value)}
                                                        placeholder="Peso en kg"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                className="btn-crear-tarea"
                                                onClick={guardarTareaDensidad1}
                                                disabled={!tareaData.descripcion.trim() || !tareaData.insumo_utilizado || loading}
                                            >
                                                {loading ? '⏳ Creando...' : 'Crear Tarea'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button className="btn-secondary" onClick={() => setShowDensidadForm(false)}>
                                        Atrás
                                    </button>
                                    <button className="btn-primary" onClick={finalizarDensidad1} disabled={loading}>
                                        {loading ? '⏳ Finalizando...' : 'Finalizar Clasificación por densidad'}
                                    </button>
                                    <button className="btn-next" onClick={finalizarDensidad1} disabled={loading}>
                                        Pasar a densimetría 2 →
                                    </button>
                                </div>
                            </div>
                        )}

                        {densidadPasos.clasificacion_densidad && !densidadPasos.densimetria_2 && (
                            <div className="densidad-paso-2">
                                <div className="forms-container">
                                    <div className="form-card main-form">
                                        <div className="form-header">
                                            <h3>Proceso {proceso.numero || proceso.id}</h3>
                                            <span className="form-subtitle">Resultados Densimetría 2</span>
                                        </div>

                                        <div className="form-content">
                                            <div className="form-group">
                                                <label>Peso café densidad 2</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={densimetria2Data.peso_cafe_densidad_2}
                                                    onChange={(e) => handleDensimetria2Change('peso_cafe_densidad_2', e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Observaciones</label>
                                                <textarea
                                                    value={densimetria2Data.observaciones_densidad_2}
                                                    onChange={(e) => handleDensimetria2Change('observaciones_densidad_2', e.target.value)}
                                                    placeholder="Ingrese observaciones para densimetría 2..."
                                                    rows="4"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-card tasks-form">
                                        <div className="form-header">
                                            <h3>📝 Tareas realizadas</h3>
                                            <p className="form-description">
                                                Descripción de la tarea
                                            </p>
                                        </div>

                                        <div className="form-content">
                                            <div className="form-group">
                                                <label>Descripción de la tarea *</label>
                                                <textarea
                                                    value={tareaData.descripcion}
                                                    onChange={(e) => handleTareaChange('descripcion', e.target.value)}
                                                    placeholder="Describa la tarea realizada para densimetría 2..."
                                                    rows="3"
                                                    required
                                                />
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Hora inicio</label>
                                                    <input
                                                        type="time"
                                                        value={tareaData.hora_inicio}
                                                        onChange={(e) => handleTareaChange('hora_inicio', e.target.value)}
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label>Hora Fin</label>
                                                    <input
                                                        type="time"
                                                        value={tareaData.hora_fin}
                                                        onChange={(e) => handleTareaChange('hora_fin', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Insumo Utilizado *</label>
                                                <select
                                                    value={tareaData.insumo_utilizado}
                                                    onChange={(e) => handleTareaChange('insumo_utilizado', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Seleccionar insumo</option>
                                                    {insumosDisponibles.map(insumo => (
                                                        <option key={insumo.id} value={insumo.id}>
                                                            {insumo.nombre} ({insumo.codigo}) - {insumo.tipo_display}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Cantidad</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={tareaData.cantidad}
                                                        onChange={(e) => handleTareaChange('cantidad', e.target.value)}
                                                        placeholder="Cantidad"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label>Tiempo de Uso (min)</label>
                                                    <input
                                                        type="number"
                                                        value={tareaData.tiempo_uso}
                                                        onChange={(e) => handleTareaChange('tiempo_uso', e.target.value)}
                                                        placeholder="Tiempo por el insumo"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label>Peso Usado (kg)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={tareaData.peso_usado}
                                                        onChange={(e) => handleTareaChange('peso_usado', e.target.value)}
                                                        placeholder="Peso usado por el insumo"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                className="btn-crear-tarea"
                                                onClick={guardarTareaDensidad2}
                                                disabled={!tareaData.descripcion.trim() || !tareaData.insumo_utilizado || loading}
                                            >
                                                {loading ? '⏳ Creando...' : 'Crear Tarea'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button className="btn-secondary" onClick={() => setDensidadPasos(prev => ({ ...prev, clasificacion_densidad: false }))}>
                                            ← Atrás
                                        </button>
                                        <button className="btn-primary" onClick={finalizarDensidad} disabled={loading}>
                                            {loading ? '⏳ Finalizando...' : '🏁 Finalizar Densidad Completa'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {densidadPasos.clasificacion_densidad && densidadPasos.densimetria_2 && (
                            <div className="densidad-completa">
                                <div className="completion-card">
                                    <h3>✅ Fase de Densidad Completada</h3>
                                    <div className="completion-summary">
                                        <div className="summary-item">
                                            <strong>Peso Densidad 1:</strong> {densidadData.peso_cafe_densidad_1 || 0} kg
                                        </div>
                                        <div className="summary-item">
                                            <strong>Peso Densidad 2:</strong> {densimetria2Data.peso_cafe_densidad_2 || 0} kg
                                        </div>
                                        <div className="summary-item">
                                            <strong>Observaciones Paso 1:</strong> {densidadData.observaciones_densidad_1 || 'Sin observaciones'}
                                        </div>
                                        <div className="summary-item">
                                            <strong>Observaciones Paso 2:</strong> {densimetria2Data.observaciones_densidad_2 || 'Sin observaciones'}
                                        </div>
                                    </div>
                                    <p>La fase de densidad ha sido completada exitosamente. Puede continuar con la siguiente fase.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {showColorForm && (
                    <div className="color-forms-section">
                        <div className="color-header">
                            <h2>🎨 CLASIFICACIÓN POR COLOR</h2>
                        </div>

                        <div className="forms-container">
                            <div className="form-card main-form">
                                <div className="form-header">
                                    <h3>Proceso {proceso.numero || proceso.id}</h3>
                                    <span className="form-subtitle">Resultados de descarte por selección óptica</span>
                                </div>

                                <div className="form-content">
                                    <div className="clasificacion-colores">
                                        <h4>Clasificación por Colores</h4>
                                        <div className="colores-simple">
                                            <div className="color-labels">
                                                <span>Verde claro</span>
                                                <span>Verde Oscuro</span>
                                                <span>Amarillo</span>
                                                <span>Marrón</span>
                                                <span>Negro</span>
                                            </div>
                                            <div className="color-inputs-row">
                                                {Object.entries(colorData.clasificacion_colores).map(([color, datos]) => (
                                                    <div key={color} className="color-input-simple">
                                                        <input
                                                            type="number"
                                                            placeholder="Peso (kg)"
                                                            value={datos.peso}
                                                            onChange={(e) => handleColorClassificationChange(color, 'peso', e.target.value)}
                                                            step="0.1"
                                                            min="0"
                                                        />
                                                        <small>{datos.porcentaje}%</small>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="total-separado">
                                                <strong>Total Separado: {calcularTotalPesoColor().toFixed(2)} kg</strong>
                                                {proceso && proceso.quintales_totales && (
                                                    <small>
                                                        ({((calcularTotalPesoColor() / (proceso.quintales_totales * 46)) * 100).toFixed(2)}% del proceso)
                                                    </small>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Observaciones</label>
                                            <textarea
                                                value={colorData.observaciones_separacion}
                                                onChange={(e) => handleColorChange('observaciones_separacion', e.target.value)}
                                                placeholder="Observaciones del proceso de separación por color..."
                                                rows="4"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-card tasks-form">
                                <div className="form-header">
                                    <h3>📝 Tareas realizadas</h3>
                                    <p className="form-description">
                                        Descripción de la tarea
                                    </p>
                                </div>

                                <div className="form-content">
                                    <div className="form-group">
                                        <label>Descripción de la tarea *</label>
                                        <textarea
                                            value={tareaData.descripcion}
                                            onChange={(e) => handleTareaChange('descripcion', e.target.value)}
                                            placeholder="Describa la tarea realizada para clasificación por color..."
                                            rows="3"
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Hora inicio</label>
                                            <input
                                                type="time"
                                                value={tareaData.hora_inicio}
                                                onChange={(e) => handleTareaChange('hora_inicio', e.target.value)}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Hora Fin</label>
                                            <input
                                                type="time"
                                                value={tareaData.hora_fin}
                                                onChange={(e) => handleTareaChange('hora_fin', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Insumo Utilizado *</label>
                                        <select
                                            value={tareaData.insumo_utilizado}
                                            onChange={(e) => handleTareaChange('insumo_utilizado', e.target.value)}
                                            required
                                        >
                                            <option value="">Seleccionar insumo</option>
                                            {insumosDisponibles.map(insumo => (
                                                <option key={insumo.id} value={insumo.id}>
                                                    {insumo.nombre} ({insumo.codigo}) - {insumo.tipo_display}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Cantidad</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tareaData.cantidad}
                                                onChange={(e) => handleTareaChange('cantidad', e.target.value)}
                                                placeholder="Cantidad"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Tiempo de Uso (min)</label>
                                            <input
                                                type="number"
                                                value={tareaData.tiempo_uso}
                                                onChange={(e) => handleTareaChange('tiempo_uso', e.target.value)}
                                                placeholder="Tiempo por el insumo"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Peso Usado (kg)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tareaData.peso_usado}
                                                onChange={(e) => handleTareaChange('peso_usado', e.target.value)}
                                                placeholder="Peso usado por el insumo"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        className="btn-crear-tarea"
                                        onClick={guardarTareaColor}
                                        disabled={!tareaData.descripcion.trim() || !tareaData.insumo_utilizado || loading}
                                    >
                                        {loading ? '⏳ Creando...' : 'Crear Tarea'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showColorForm && (
                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => setShowColorForm(false)}>
                            Atrás
                        </button>
                        <button className="btn-primary" onClick={finalizarColor} disabled={loading}>
                            {loading ? '⏳ Finalizando...' : '🏁 Finalizar Clasificación por color'}
                        </button>
                    </div>
                )}

                {showEmpaquetadoForm && (
                    <div className="empaquetado-forms-section">
                        <div className="empaquetado-header">
                            <h2>📦 EMPAQUETADO</h2>
                        </div>

                        <div className="empaquetado-container">
                            <div className="empaquetado-left-panel">
                                <div className="proceso-card">
                                    <div className="proceso-header">
                                        <h3>Proceso 001</h3>
                                    </div>

                                    <div className="proceso-content">
                                        <div className="resultados-empaquetado">
                                            <h4>Resultados del empaquetado</h4>

                                            <div className="resultado-row">
                                                <label>Café Caracolillo</label>
                                                <div className="input-container">
                                                    <input
                                                        type="number"
                                                        name="cafe_caracolillo"
                                                        value={empaquetadoData.cafe_caracolillo}
                                                        onChange={handleEmpaquetadoChange}
                                                        placeholder="pf"
                                                        step="0.01"
                                                        min="0"
                                                        className="resultado-input"
                                                    />
                                                </div>
                                            </div>

                                            <div className="resultado-row">
                                                <label>Café Descarte</label>
                                                <div className="input-container">
                                                    <input
                                                        type="number"
                                                        name="cafe_descarte"
                                                        value={empaquetadoData.cafe_descarte}
                                                        onChange={handleEmpaquetadoChange}
                                                        placeholder="pf"
                                                        step="0.01"
                                                        min="0"
                                                        className="resultado-input"
                                                    />
                                                </div>
                                            </div>

                                            <div className="resultado-row">
                                                <label>Café Exportación</label>
                                                <div className="input-container">
                                                    <input
                                                        type="number"
                                                        name="cafe_exportacion"
                                                        value={empaquetadoData.cafe_exportacion}
                                                        onChange={handleEmpaquetadoChange}
                                                        placeholder="pf"
                                                        step="0.01"
                                                        min="0"
                                                        className="resultado-input"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="observaciones-empaquetado">
                                            <label>Observaciones</label>
                                            <textarea
                                                name="observaciones_empaquetado"
                                                value={empaquetadoData.observaciones_empaquetado}
                                                onChange={handleEmpaquetadoChange}
                                                placeholder=""
                                                rows="4"
                                                className="observaciones-textarea"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="empaquetado-right-panel">
                                <div className="tareas-card">
                                    <div className="tareas-header">
                                        <h3>Tareas realizadas</h3>
                                    </div>

                                    <div className="tareas-content">
                                        <div className="tarea-form">
                                            <div className="form-field">
                                                <label>Descripción de la tarea</label>
                                                <textarea
                                                    value={tareaData.descripcion}
                                                    onChange={(e) => handleTareaChange('descripcion', e.target.value)}
                                                    placeholder=""
                                                    rows="3"
                                                    className="descripcion-textarea"
                                                />
                                            </div>

                                            <div className="form-row-empaquetado">
                                                <div className="form-field-small">
                                                    <label>Hora inicio</label>
                                                    <input
                                                        type="time"
                                                        value={tareaData.hora_inicio}
                                                        onChange={(e) => handleTareaChange('hora_inicio', e.target.value)}
                                                        className="time-input"
                                                    />
                                                </div>

                                                <div className="form-field-small">
                                                    <label>Hora Fin</label>
                                                    <input
                                                        type="time"
                                                        value={tareaData.hora_fin}
                                                        onChange={(e) => handleTareaChange('hora_fin', e.target.value)}
                                                        className="time-input"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-field">
                                                <label>Insumo utilizado</label>
                                                <select
                                                    value={tareaData.insumo_utilizado}
                                                    onChange={(e) => handleTareaChange('insumo_utilizado', e.target.value)}
                                                    className="insumo-select"
                                                >
                                                    <option value="">Seleccionar insumo</option>
                                                    {insumosDisponibles.map(insumo => (
                                                        <option key={insumo.id} value={insumo.id}>
                                                            {insumo.nombre} ({insumo.codigo})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="form-row-empaquetado">
                                                <div className="form-field-small">
                                                    <label>Cantidad</label>
                                                    <input
                                                        type="number"
                                                        value={tareaData.cantidad}
                                                        onChange={(e) => handleTareaChange('cantidad', e.target.value)}
                                                        placeholder=""
                                                        step="0.01"
                                                        className="cantidad-input"
                                                    />
                                                </div>

                                                <div className="form-field-small">
                                                    <label>Tiempo de uso</label>
                                                    <input
                                                        type="number"
                                                        value={tareaData.tiempo_uso}
                                                        onChange={(e) => handleTareaChange('tiempo_uso', e.target.value)}
                                                        placeholder="Tiempo utilizado por el insumo"
                                                        className="tiempo-input"
                                                    />
                                                </div>

                                                <div className="form-field-small">
                                                    <label>Peso usado por el insumo</label>
                                                    <input
                                                        type="number"
                                                        value={tareaData.peso_usado}
                                                        onChange={(e) => handleTareaChange('peso_usado', e.target.value)}
                                                        placeholder=""
                                                        step="0.01"
                                                        className="peso-input"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                className="btn-crear-tarea-empaquetado"
                                                onClick={guardarTareaEmpaquetado}
                                                disabled={!tareaData.descripcion.trim() || !tareaData.insumo_utilizado || loading}
                                            >
                                                {loading ? 'Creando...' : 'Crear Tareas'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="empaquetado-actions">
                            <button className="btn-atras-empaquetado" onClick={() => setShowEmpaquetadoForm(false)}>
                                Atrás
                            </button>
                            <button
                                className="btn-finalizar-empaquetado"
                                onClick={finalizarEmpaquetado}
                                disabled={loading}
                            >
                                {loading ? 'Finalizando...' : 'Finalizar Empaquetado'}
                            </button>
                        </div>
                    </div>
                )}

                {proceso && (
                    <div className="proceso-info-card">
                        <h3>Información del Proceso</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <strong>Número de Proceso:</strong> {proceso.numero || proceso.id}
                            </div>
                            <div className="info-item">
                                <strong>Fase Actual:</strong> {proceso.fase_actual || 'No definida'}
                            </div>
                            <div className="info-item">
                                <strong>Lotes Incluidos:</strong> {proceso.lotes?.length || 0}
                            </div>
                            <div className="info-item">
                                <strong>Quintales Totales:</strong> {proceso.quintales_totales || 0}
                            </div>
                            <div className="info-item">
                                <strong>Progreso:</strong> {proceso.progreso || 0}%
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default DetalleProceso;