import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosConfig';
import jsPDF from 'jspdf';
import Sidebar from '../common/siderbar';
import BottomNavigator from '../common/bottonnavigator';
import { checkReportesAuth } from '../../../utils/auth';
import '../../../styles/reportes.css';

const Reportes = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('organizaciones');
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Estados para datos
    const [organizaciones, setOrganizaciones] = useState([]);
    const [propietarios, setPropietarios] = useState([]);
    const [lotes, setLotes] = useState([]);
    const [muestras, setMuestras] = useState([]);
    const [procesos, setProcesos] = useState([]);
    
    // Estados para filtros
    const [selectedOrganizacion, setSelectedOrganizacion] = useState('');
    const [selectedPropietario, setSelectedPropietario] = useState('');
    const [selectedProceso, setSelectedProceso] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    
    // Estados para reportes generados
    const [reporteOrganizaciones, setReporteOrganizaciones] = useState([]);
    const [reportePropietarios, setReportePropietarios] = useState([]);
    const [reporteProcesos, setReporteProcesos] = useState([]);
    const [reporteLotes, setReporteLotes] = useState([]);
    const [estadisticasGenerales, setEstadisticasGenerales] = useState({});

    // Verificar autenticación y rol de administrador
    useEffect(() => {
        const verificarAcceso = async () => {
            const tieneAcceso = await checkReportesAuth(navigate);
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

    // Cargar datos al inicializar
    useEffect(() => {
        if (isAuthenticated) {
            cargarDatos();
        }
    }, [isAuthenticated]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [lotesRes, orgRes, muestrasRes, procesosRes] = await Promise.all([
                axiosInstance.get('http://localhost:8000/api/users/lotes/'),
                axiosInstance.get('http://localhost:8000/api/users/organizaciones/'),
                axiosInstance.get('http://localhost:8000/api/users/muestras/'),
                axiosInstance.get('http://localhost:8000/api/users/procesos/')
            ]);
            
            setLotes(lotesRes.data);
            setOrganizaciones(orgRes.data);
            setMuestras(muestrasRes.data);
            setProcesos(procesosRes.data);
            
            // Extraer propietarios únicos
            const todosPropietarios = [];
            lotesRes.data.forEach(lote => {
                if (lote.propietarios && lote.propietarios.length > 0) {
                    lote.propietarios.forEach(propietario => {
                        const existe = todosPropietarios.find(p => p.cedula === propietario.cedula);
                        if (!existe) {
                            todosPropietarios.push({
                                ...propietario,
                                organizacion_nombre: lote.organizacion_nombre,
                                organizacion_id: lote.organizacion
                            });
                        }
                    });
                }
            });
            setPropietarios(todosPropietarios);
            
            // Generar reportes automáticamente
            generarReportes(lotesRes.data, orgRes.data, muestrasRes.data, todosPropietarios, procesosRes.data);
            
        } catch (error) {
            console.error('Error al cargar datos:', error);
            if (!handleAuthError(error)) {
                alert('Error al cargar los datos');
            }
        }
        setLoading(false);
    };

    const generarReportes = (lotesData, orgData, muestrasData, propietariosData, procesosData) => {
        // Generar reporte por procesos de producción
        const reportePorProcesos = procesosData.map(proceso => {
            const lotesDelProceso = proceso.lotes_info || [];
            const totalQuintales = lotesDelProceso.reduce((sum, lote) => sum + parseFloat(lote.total_quintales || 0), 0);
            const totalPropietarios = lotesDelProceso.reduce((sum, lote) => sum + (lote.propietarios?.length || 0), 0);
            
            // Calcular estadísticas de muestras para todos los lotes del proceso
            const muestrasDelProceso = [];
            lotesDelProceso.forEach(lote => {
                const muestrasLote = muestrasData.filter(muestra => muestra.lote === lote.id);
                muestrasDelProceso.push(...muestrasLote);
            });
            
            const totalMuestras = muestrasDelProceso.length;
            const muestrasAprobadas = muestrasDelProceso.filter(m => m.estado === 'APROBADA').length;
            const muestrasContaminadas = muestrasDelProceso.filter(m => m.estado === 'CONTAMINADA').length;
            const muestrasPendientes = muestrasDelProceso.filter(m => m.estado === 'PENDIENTE').length;
            
            const porcentajeAprobacion = totalMuestras > 0 ? ((muestrasAprobadas / totalMuestras) * 100).toFixed(1) : 0;
            const porcentajeRechazo = totalMuestras > 0 ? ((muestrasContaminadas / totalMuestras) * 100).toFixed(1) : 0;
            
            // Calcular duración del proceso
            const fechaInicio = new Date(proceso.fecha_inicio);
            const fechaFin = proceso.fecha_fin_real ? new Date(proceso.fecha_fin_real) : new Date();
            const duracionDias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24));
            
            return {
                proceso: proceso,
                lotesIncluidos: lotesDelProceso,
                totalLotes: lotesDelProceso.length,
                totalQuintales: totalQuintales,
                totalPropietarios: totalPropietarios,
                duracionDias: duracionDias,
                estadisticasMuestras: {
                    total: totalMuestras,
                    aprobadas: muestrasAprobadas,
                    contaminadas: muestrasContaminadas,
                    pendientes: muestrasPendientes,
                    porcentajeAprobacion: porcentajeAprobacion,
                    porcentajeRechazo: porcentajeRechazo
                },
                faseActual: proceso.fase_actual,
                estado: proceso.estado,
                progreso: proceso.progreso || proceso.porcentaje_progreso || 0,
                responsable: proceso.responsable_nombre,
                pesoTotalInicial: proceso.peso_total_inicial,
                pesoTotalActual: proceso.peso_total_actual
            };
        });

        // Generar reporte detallado por cada lote individual
        const reporteLotesIndividuales = lotesData.map(lote => {
            const organizacion = orgData.find(org => org.id === lote.organizacion);
            const muestrasDelLote = muestrasData.filter(muestra => muestra.lote === lote.id);
            const propietariosDelLote = lote.propietarios || [];
            
            const totalMuestras = muestrasDelLote.length;
            const muestrasAprobadas = muestrasDelLote.filter(m => m.estado === 'APROBADA').length;
            const muestrasContaminadas = muestrasDelLote.filter(m => m.estado === 'CONTAMINADA').length;
            const muestrasPendientes = muestrasDelLote.filter(m => m.estado === 'PENDIENTE').length;
            
            const totalQuintales = parseFloat(lote.total_quintales || 0);
            const porcentajeAprobacion = totalMuestras > 0 ? ((muestrasAprobadas / totalMuestras) * 100).toFixed(1) : 0;
            const porcentajeRechazo = totalMuestras > 0 ? ((muestrasContaminadas / totalMuestras) * 100).toFixed(1) : 0;
            
            // Calcular estadísticas de proceso
            const pesoInicial = parseFloat(lote.peso_total_inicial || 0);
            const pesoFinal = parseFloat(lote.peso_total_final || 0);
            const perdidaPeso = pesoInicial && pesoFinal ? (pesoInicial - pesoFinal).toFixed(2) : 0;
            const porcentajePerdida = pesoInicial && pesoFinal && pesoInicial > 0 ? 
                (((pesoInicial - pesoFinal) / pesoInicial) * 100).toFixed(1) : 0;
            
            return {
                lote: lote,
                organizacion: organizacion,
                propietarios: propietariosDelLote,
                totalPropietarios: propietariosDelLote.length,
                totalQuintales: totalQuintales,
                estadisticasMuestras: {
                    total: totalMuestras,
                    aprobadas: muestrasAprobadas,
                    contaminadas: muestrasContaminadas,
                    pendientes: muestrasPendientes,
                    porcentajeAprobacion: porcentajeAprobacion,
                    porcentajeRechazo: porcentajeRechazo
                },
                procesoEstadisticas: {
                    pesoInicial: pesoInicial,
                    pesoFinal: pesoFinal,
                    perdidaPeso: perdidaPeso,
                    porcentajePerdida: porcentajePerdida,
                    fechaCreacion: lote.fecha_creacion,
                    fechaEntrega: lote.fecha_entrega,
                    estado: lote.estado
                }
            };
        });

        // Generar reporte por organizaciones (resumen)
        const reporteOrg = orgData.map(org => {
            const lotesOrg = lotesData.filter(lote => lote.organizacion === org.id);
            const propietariosOrg = propietariosData.filter(p => p.organizacion_id === org.id);
            const muestrasOrg = muestrasData.filter(muestra => 
                lotesOrg.some(lote => lote.id === muestra.lote)
            );
            
            const totalMuestras = muestrasOrg.length;
            const muestrasAprobadas = muestrasOrg.filter(m => m.estado === 'APROBADA').length;
            const muestrasContaminadas = muestrasOrg.filter(m => m.estado === 'CONTAMINADA').length;
            const muestrasPendientes = muestrasOrg.filter(m => m.estado === 'PENDIENTE').length;
            
            const totalQuintales = lotesOrg.reduce((sum, lote) => sum + parseFloat(lote.total_quintales || 0), 0);
            
            const porcentajeAprobacion = totalMuestras > 0 ? ((muestrasAprobadas / totalMuestras) * 100).toFixed(1) : 0;
            const porcentajeRechazo = totalMuestras > 0 ? ((muestrasContaminadas / totalMuestras) * 100).toFixed(1) : 0;
            
            return {
                organizacion: org,
                totalLotes: lotesOrg.length,
                totalPropietarios: propietariosOrg.length,
                totalQuintales: totalQuintales,
                estadisticasMuestras: {
                    total: totalMuestras,
                    aprobadas: muestrasAprobadas,
                    contaminadas: muestrasContaminadas,
                    pendientes: muestrasPendientes,
                    porcentajeAprobacion: porcentajeAprobacion,
                    porcentajeRechazo: porcentajeRechazo
                }
            };
        });
        
        // Generar reporte por propietarios
        const reporteProp = propietariosData.map(propietario => {
            const lotesDelPropietario = [];
            lotesData.forEach(lote => {
                if (lote.propietarios && lote.propietarios.some(p => p.cedula === propietario.cedula)) {
                    lotesDelPropietario.push(lote);
                }
            });
            
            const muestrasDelPropietario = muestrasData.filter(muestra => 
                muestra.propietario_nombre === propietario.nombre_completo
            );
            
            const totalMuestras = muestrasDelPropietario.length;
            const muestrasAprobadas = muestrasDelPropietario.filter(m => m.estado === 'APROBADA').length;
            const muestrasContaminadas = muestrasDelPropietario.filter(m => m.estado === 'CONTAMINADA').length;
            const muestrasPendientes = muestrasDelPropietario.filter(m => m.estado === 'PENDIENTE').length;
            
            const totalQuintales = lotesDelPropietario.reduce((sum, lote) => {
                const propInfo = lote.propietarios.find(p => p.cedula === propietario.cedula);
                return sum + parseFloat(propInfo?.quintales_entregados || 0);
            }, 0);
            
            const porcentajeAprobacion = totalMuestras > 0 ? ((muestrasAprobadas / totalMuestras) * 100).toFixed(1) : 0;
            const porcentajeRechazo = totalMuestras > 0 ? ((muestrasContaminadas / totalMuestras) * 100).toFixed(1) : 0;
            
            return {
                propietario: propietario,
                totalLotes: lotesDelPropietario.length,
                totalQuintales: totalQuintales,
                estadisticasMuestras: {
                    total: totalMuestras,
                    aprobadas: muestrasAprobadas,
                    contaminadas: muestrasContaminadas,
                    pendientes: muestrasPendientes,
                    porcentajeAprobacion: porcentajeAprobacion,
                    porcentajeRechazo: porcentajeRechazo
                }
            };
        });
        
        // Calcular estadísticas generales
        const totalMuestras = muestrasData.length;
        const totalAprobadas = muestrasData.filter(m => m.estado === 'APROBADA').length;
        const totalContaminadas = muestrasData.filter(m => m.estado === 'CONTAMINADA').length;
        const totalPendientes = muestrasData.filter(m => m.estado === 'PENDIENTE').length;
        
        const estadisticas = {
            totalOrganizaciones: orgData.length,
            totalPropietarios: propietariosData.length,
            totalLotes: lotesData.length,
            totalQuintales: lotesData.reduce((sum, lote) => sum + parseFloat(lote.total_quintales || 0), 0),
            totalMuestras: totalMuestras,
            muestrasAprobadas: totalAprobadas,
            muestrasContaminadas: totalContaminadas,
            muestrasPendientes: totalPendientes,
            porcentajeAprobacionGeneral: totalMuestras > 0 ? ((totalAprobadas / totalMuestras) * 100).toFixed(1) : 0,
            porcentajeRechazoGeneral: totalMuestras > 0 ? ((totalContaminadas / totalMuestras) * 100).toFixed(1) : 0
        };
        
        setReporteOrganizaciones(reporteOrg);
        setReportePropietarios(reporteProp);
        setReporteProcesos(reportePorProcesos);
        setReporteLotes(reporteLotesIndividuales);
        setEstadisticasGenerales(estadisticas);
    };

    const filtrarReportes = () => {
        let reporteOrgFiltrado = [...reporteOrganizaciones];
        let reportePropFiltrado = [...reportePropietarios];
        let reporteLotesFiltrado = [...reporteLotes];
        let reporteProcesosFiltrado = [...reporteProcesos];
        
        if (selectedOrganizacion) {
            reporteOrgFiltrado = reporteOrgFiltrado.filter(r => r.organizacion.id == selectedOrganizacion);
            reportePropFiltrado = reportePropFiltrado.filter(r => r.propietario.organizacion_id == selectedOrganizacion);
            reporteLotesFiltrado = reporteLotesFiltrado.filter(r => r.organizacion && r.organizacion.id == selectedOrganizacion);
            reporteProcesosFiltrado = reporteProcesosFiltrado.filter(r => 
                r.lotesIncluidos.some(lote => lote.organizacion === selectedOrganizacion)
            );
        }
        
        if (selectedPropietario) {
            reportePropFiltrado = reportePropFiltrado.filter(r => r.propietario.cedula === selectedPropietario);
            reporteLotesFiltrado = reporteLotesFiltrado.filter(r => 
                r.propietarios.some(p => p.cedula === selectedPropietario)
            );
            reporteProcesosFiltrado = reporteProcesosFiltrado.filter(r => 
                r.lotesIncluidos.some(lote => lote.propietarios.some(p => p.cedula === selectedPropietario))
            );
        }
        
        return { reporteOrgFiltrado, reportePropFiltrado, reporteLotesFiltrado, reporteProcesosFiltrado };
    };

    const exportarReporte = (tipo) => {
        const { reporteOrgFiltrado, reportePropFiltrado, reporteLotesFiltrado, reporteProcesosFiltrado } = filtrarReportes();
        const fecha = new Date().toLocaleDateString();
        
        // Crear nuevo documento PDF
        const doc = new jsPDF();
        
        // Configurar fuente
        doc.setFont("helvetica");
        
        // Variables de posición
        let yPosition = 20;
        const pageHeight = doc.internal.pageSize.height;
        const leftMargin = 20;
        const rightMargin = 190;
        
        // Función para agregar nueva página si es necesario
        const checkPageBreak = (spaceNeeded = 20) => {
            if (yPosition + spaceNeeded > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
                return true;
            }
            return false;
        };
        
        // Función para agregar línea con salto automático
        const addWrappedText = (text, x, y, maxWidth, fontSize = 10) => {
            doc.setFontSize(fontSize);
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, x, y);
            return lines.length * (fontSize * 0.35); // Altura aproximada de las líneas
        };
        
        if (tipo === 'procesos') {
            // Título del reporte de procesos
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text('REPORTE DETALLADO POR PROCESOS DE PRODUCCIÓN', leftMargin, yPosition);
            yPosition += 10;
            
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text(`Fecha: ${fecha}`, leftMargin, yPosition);
            yPosition += 15;
            
            // Línea separadora
            doc.setLineWidth(0.5);
            doc.line(leftMargin, yPosition, rightMargin, yPosition);
            yPosition += 10;
            
            // Resumen General
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text('RESUMEN GENERAL', leftMargin, yPosition);
            yPosition += 8;
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`• Total Procesos: ${reporteProcesosFiltrado.length}`, leftMargin + 5, yPosition);
            yPosition += 6;
            doc.text(`• Total Quintales: ${reporteProcesosFiltrado.reduce((sum, r) => sum + r.totalQuintales, 0).toFixed(1)}`, leftMargin + 5, yPosition);
            yPosition += 6;
            doc.text(`• Porcentaje Aprobación General: ${estadisticasGenerales.porcentajeAprobacionGeneral}%`, leftMargin + 5, yPosition);
            yPosition += 6;
            doc.text(`• Porcentaje Rechazo General: ${estadisticasGenerales.porcentajeRechazoGeneral}%`, leftMargin + 5, yPosition);
            yPosition += 15;
            
            // Detalle por Proceso
            checkPageBreak(20);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text('DETALLE POR PROCESO', leftMargin, yPosition);
            yPosition += 10;
            
            reporteProcesosFiltrado.forEach((reporte, index) => {
                checkPageBreak(80);
                
                // Información del proceso
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(`${index + 1}. PROCESO: ${reporte.proceso.nombre}`, leftMargin, yPosition);
                yPosition += 8;
                
                // Información básica
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`Responsable: ${reporte.responsable || 'Sin responsable'}`, leftMargin + 5, yPosition);
                yPosition += 5;
                doc.text(`Estado: ${reporte.estado}`, leftMargin + 5, yPosition);
                yPosition += 5;
                doc.text(`Duración: ${reporte.duracionDias} días`, leftMargin + 5, yPosition);
                yPosition += 5;
                doc.text(`Total Lotes: ${reporte.totalLotes}`, leftMargin + 5, yPosition);
                yPosition += 5;
                doc.text(`Total Propietarios: ${reporte.totalPropietarios}`, leftMargin + 5, yPosition);
                yPosition += 5;
                doc.text(`Total Quintales: ${reporte.totalQuintales}`, leftMargin + 5, yPosition);
                yPosition += 5;
                
                // Estadísticas de muestras
                doc.setFont("helvetica", "bold");
                doc.text('Estadísticas de Muestras:', leftMargin + 5, yPosition);
                yPosition += 5;
                
                doc.setFont("helvetica", "normal");
                doc.text(`  • Total Muestras: ${reporte.estadisticasMuestras.total}`, leftMargin + 10, yPosition);
                yPosition += 4;
                doc.text(`  • Aprobadas: ${reporte.estadisticasMuestras.aprobadas} (${reporte.estadisticasMuestras.porcentajeAprobacion}%)`, leftMargin + 10, yPosition);
                yPosition += 4;
                doc.text(`  • Contaminadas: ${reporte.estadisticasMuestras.contaminadas} (${reporte.estadisticasMuestras.porcentajeRechazo}%)`, leftMargin + 10, yPosition);
                yPosition += 4;
                doc.text(`  • Pendientes: ${reporte.estadisticasMuestras.pendientes}`, leftMargin + 10, yPosition);
                yPosition += 8;
                
                // Línea separadora entre procesos
                if (index < reporteProcesosFiltrado.length - 1) {
                    doc.setLineWidth(0.2);
                    doc.line(leftMargin, yPosition, rightMargin, yPosition);
                    yPosition += 8;
                }
            });
        } else if (tipo === 'organizaciones') {
            // ...existing code para organizaciones...
        } else if (tipo === 'lotes') {
            // ...existing code para lotes...
        } else {
            // ...existing code para propietarios...
        }
        
        // Pie de página en todas las páginas
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(`FAPECAFE - Sistema de Gestión de Café`, leftMargin, pageHeight - 10);
            doc.text(`Página ${i} de ${totalPages}`, rightMargin - 30, pageHeight - 10);
        }
        
        // Descargar el PDF
        const fileName = `reporte_${tipo}_${fecha.replace(/\//g, '-')}.pdf`;
        doc.save(fileName);
    };

    const imprimirReporte = (tipo) => {
        const { reporteOrgFiltrado, reportePropFiltrado, reporteLotesFiltrado, reporteProcesosFiltrado } = filtrarReportes();
        const fecha = new Date().toLocaleDateString();
        
        let contenidoHTML = '';
        
        if (tipo === 'procesos') {
            contenidoHTML = `
                <div class="reporte-header">
                    <h1>REPORTE DETALLADO POR PROCESOS DE PRODUCCIÓN</h1>
                    <p>Fecha: ${fecha}</p>
                    <div class="estadisticas-generales">
                        <h3>Resumen General</h3>
                        <p>Total Procesos: ${reporteProcesosFiltrado.length}</p>
                        <p>Total Quintales: ${reporteProcesosFiltrado.reduce((sum, r) => sum + r.totalQuintales, 0).toFixed(1)}</p>
                        <p>Porcentaje Aprobación: ${estadisticasGenerales.porcentajeAprobacionGeneral}%</p>
                        <p>Porcentaje Rechazo: ${estadisticasGenerales.porcentajeRechazoGeneral}%</p>
                    </div>
                </div>
                <div class="reporte-detalle">
                    <h3>Detalle por Proceso</h3>
                    ${reporteProcesosFiltrado.map(reporte => `
                        <div class="proceso-item">
                            <h4>Proceso: ${reporte.proceso.nombre}</h4>
                            <div class="proceso-info-section">
                                <p><strong>Responsable:</strong> ${reporte.responsable || 'Sin responsable'}</p>
                                <p><strong>Estado:</strong> ${reporte.estado}</p>
                                <p><strong>Duración:</strong> ${reporte.duracionDias} días</p>
                                <p><strong>Total Lotes:</strong> ${reporte.totalLotes}</p>
                                <p><strong>Total Propietarios:</strong> ${reporte.totalPropietarios}</p>
                                <p><strong>Total Quintales:</strong> ${reporte.totalQuintales} qq</p>
                            </div>
                            
                            <div class="estadisticas-muestras">
                                <h5>Estadísticas de Muestras:</h5>
                                <p>Total: ${reporte.estadisticasMuestras.total}</p>
                                <p>Aprobadas: ${reporte.estadisticasMuestras.aprobadas} (${reporte.estadisticasMuestras.porcentajeAprobacion}%)</p>
                                <p>Contaminadas: ${reporte.estadisticasMuestras.contaminadas} (${reporte.estadisticasMuestras.porcentajeRechazo}%)</p>
                                <p>Pendientes: ${reporte.estadisticasMuestras.pendientes}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (tipo === 'organizaciones') {
            // ...existing code para organizaciones...
        } else if (tipo === 'lotes') {
            // ...existing code para lotes...
        } else {
            // ...existing code para propietarios...
        }
        
        const ventanaImprimir = window.open('', '', 'height=600,width=800');
        ventanaImprimir.document.write(`
            <html>
                <head>
                    <title>Reporte ${tipo === 'organizaciones' ? 'por Organización' : tipo === 'lotes' ? 'por Lotes' : tipo === 'procesos' ? 'por Procesos' : 'por Propietario'}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .reporte-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                        .reporte-header h1 { margin: 0 0 10px 0; color: #333; }
                        .estadisticas-generales { background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
                        .estadisticas-generales h3 { margin: 0 0 10px 0; color: #2c5530; }
                        .reporte-detalle h3 { color: #2c5530; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                        .proceso-item { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
                        .proceso-item h4 { margin: 0 0 10px 0; color: #495057; }
                        .proceso-info-section { background-color: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 3px; }
                        .estadisticas-muestras { background-color: #f8f9fa; padding: 10px; margin-top: 10px; border-radius: 3px; }
                        .estadisticas-muestras h5 { margin: 0 0 8px 0; color: #4a7c59; }
                        .estadisticas-muestras p { margin: 3px 0; font-size: 14px; }
                        p { margin: 5px 0; }
                    </style>
                </head>
                <body>
                    ${contenidoHTML}
                </body>
            </html>
        `);
        
        ventanaImprimir.document.close();
        ventanaImprimir.print();
    };

    const { reporteOrgFiltrado, reportePropFiltrado } = filtrarReportes();

    return (
        <div className="app-container">
            <Sidebar userName="Usuario FAPECAFE" userRole="Cliente" />
            
            <div className="reportes-container">
                <BottomNavigator />
                
                <div className="reportes-content">
                    <div className="reportes-header">
                        <h1>Generador de Reportes</h1>
                        <p>Estadísticas de aprobación y rechazo por organización, propietario y proceso</p>
                    </div>

                    {/* Estadísticas generales */}
                    <div className="estadisticas-generales-card">
                        <h3>📊 Resumen General del Sistema</h3>
                        <div className="estadisticas-grid">
                            <div className="stat-item">
                                <span className="stat-number">{estadisticasGenerales.totalOrganizaciones}</span>
                                <span className="stat-label">Organizaciones</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">{estadisticasGenerales.totalPropietarios}</span>
                                <span className="stat-label">Propietarios</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">{estadisticasGenerales.totalLotes}</span>
                                <span className="stat-label">Lotes</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">{estadisticasGenerales.totalQuintales}</span>
                                <span className="stat-label">Quintales</span>
                            </div>
                            <div className="stat-item success">
                                <span className="stat-number">{estadisticasGenerales.porcentajeAprobacionGeneral}%</span>
                                <span className="stat-label">Aprobación</span>
                            </div>
                            <div className="stat-item danger">
                                <span className="stat-number">{estadisticasGenerales.porcentajeRechazoGeneral}%</span>
                                <span className="stat-label">Rechazo</span>
                            </div>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="filtros-section">
                        <h3>🔍 Filtros</h3>
                        <div className="filtros-container">
                            <div className="filtro-group">
                                <label>Organización:</label>
                                <select
                                    value={selectedOrganizacion}
                                    onChange={(e) => setSelectedOrganizacion(e.target.value)}
                                >
                                    <option value="">Todas las organizaciones</option>
                                    {organizaciones.map(org => (
                                        <option key={org.id} value={org.id}>
                                            {org.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="filtro-group">
                                <label>Propietario:</label>
                                <select
                                    value={selectedPropietario}
                                    onChange={(e) => setSelectedPropietario(e.target.value)}
                                >
                                    <option value="">Todos los propietarios</option>
                                    {propietarios
                                        .filter(p => !selectedOrganizacion || p.organizacion_id == selectedOrganizacion)
                                        .map(prop => (
                                            <option key={prop.cedula} value={prop.cedula}>
                                                {prop.nombre_completo} - {prop.cedula}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Navegación por pestañas */}
                    <div className="tabs-container">
                        <button 
                            className={`tab-button ${activeTab === 'organizaciones' ? 'active' : ''}`}
                            onClick={() => setActiveTab('organizaciones')}
                        >
                            Reporte por Organizaciones
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'lotes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('lotes')}
                        >
                            Reporte por Proceso
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'procesos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('procesos')}
                        >
                            Reporte por Procesos
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'propietarios' ? 'active' : ''}`}
                            onClick={() => setActiveTab('propietarios')}
                        >
                            Reporte por Propietarios
                        </button>
                    </div>

                    {/* Contenido de pestañas */}
                    <div className="tab-content">
                        {activeTab === 'organizaciones' && (
                            <div className="organizaciones-section">
                                <div className="section-header">
                                    <h2>Reporte por Organizaciones</h2>
                                    <div className="acciones-reporte">
                                        <button 
                                            className="btn-primary"
                                            onClick={() => exportarReporte('organizaciones')}
                                        >
                                            📄 Exportar
                                        </button>
                                        <button 
                                            className="btn-secondary"
                                            onClick={() => imprimirReporte('organizaciones')}
                                        >
                                            🖨️ Imprimir
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="reportes-grid">
                                    {reporteOrgFiltrado.map(reporte => (
                                        <div key={reporte.organizacion.id} className="reporte-card">
                                            <div className="reporte-header">
                                                <h3>{reporte.organizacion.nombre}</h3>
                                                <span className="contacto-badge">
                                                    {reporte.organizacion.contacto || 'Sin contacto'}
                                                </span>
                                            </div>
                                            
                                            <div className="reporte-stats">
                                                <div className="stat-row">
                                                    <span className="stat-label">Total Lotes:</span>
                                                    <span className="stat-value">{reporte.totalLotes}</span>
                                                </div>
                                                <div className="stat-row">
                                                    <span className="stat-label">Total Propietarios:</span>
                                                    <span className="stat-value">{reporte.totalPropietarios}</span>
                                                </div>
                                                <div className="stat-row">
                                                    <span className="stat-label">Total Quintales:</span>
                                                    <span className="stat-value">{reporte.totalQuintales.toFixed(1)}</span>
                                                </div>
                                            </div>

                                            <div className="muestras-stats">
                                                <h4>Estadísticas de Muestras</h4>
                                                <div className="muestras-grid">
                                                    <div className="muestra-stat">
                                                        <span className="number">{reporte.estadisticasMuestras.total}</span>
                                                        <span className="label">Total</span>
                                                    </div>
                                                    <div className="muestra-stat success">
                                                        <span className="number">{reporte.estadisticasMuestras.aprobadas}</span>
                                                        <span className="label">Aprobadas</span>
                                                        <span className="percentage">{reporte.estadisticasMuestras.porcentajeAprobacion}%</span>
                                                    </div>
                                                    <div className="muestra-stat danger">
                                                        <span className="number">{reporte.estadisticasMuestras.contaminadas}</span>
                                                        <span className="label">Contaminadas</span>
                                                        <span className="percentage">{reporte.estadisticasMuestras.porcentajeRechazo}%</span>
                                                    </div>
                                                    <div className="muestra-stat warning">
                                                        <span className="number">{reporte.estadisticasMuestras.pendientes}</span>
                                                        <span className="label">Pendientes</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="progreso-visual">
                                                <div className="progreso-bar">
                                                    <div 
                                                        className="progreso-fill success"
                                                        style={{ width: `${reporte.estadisticasMuestras.porcentajeAprobacion}%` }}
                                                    ></div>
                                                    <div 
                                                        className="progreso-fill danger"
                                                        style={{ width: `${reporte.estadisticasMuestras.porcentajeRechazo}%` }}
                                                    ></div>
                                                </div>
                                                <div className="progreso-labels">
                                                    <span className="success">Aprobación: {reporte.estadisticasMuestras.porcentajeAprobacion}%</span>
                                                    <span className="danger">Rechazo: {reporte.estadisticasMuestras.porcentajeRechazo}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {reporteOrgFiltrado.length === 0 && (
                                    <div className="no-results">
                                        <p>No se encontraron organizaciones que coincidan con los filtros aplicados</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'lotes' && (
                            <div className="lotes-section">
                                <div className="section-header">
                                    <h2>Reporte Detallado por Lotes</h2>
                                    <div className="acciones-reporte">
                                        <button 
                                            className="btn-primary"
                                            onClick={() => exportarReporte('lotes')}
                                        >
                                            📄 Exportar
                                        </button>
                                        <button 
                                            className="btn-secondary"
                                            onClick={() => imprimirReporte('lotes')}
                                        >
                                            🖨️ Imprimir
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="reportes-grid">
                                    {filtrarReportes().reporteLotesFiltrado.map(reporte => (
                                        <div key={reporte.lote.id} className="reporte-card lote-card">
                                            <div className="reporte-header">
                                                <h3>Lote: {reporte.lote.numero_lote}</h3>
                                                <div className="estado-badges">
                                                    <span className={`estado-badge ${reporte.lote.estado.toLowerCase()}`}>
                                                        {reporte.lote.estado}
                                                    </span>
                                                    <span className="organizacion-badge">
                                                        {reporte.organizacion?.nombre || 'Sin organización'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="lote-info">
                                                <div className="info-row">
                                                    <span className="info-label">📅 Fecha de Entrega:</span>
                                                    <span className="info-value">
                                                        {new Date(reporte.lote.fecha_entrega).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">📅 Fecha de Creación:</span>
                                                    <span className="info-value">
                                                        {new Date(reporte.lote.fecha_creacion).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">👥 Total Propietarios:</span>
                                                    <span className="info-value">{reporte.totalPropietarios}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">⚖️ Total Quintales:</span>
                                                    <span className="info-value">{reporte.totalQuintales} qq</span>
                                                </div>
                                                {reporte.procesoEstadisticas.pesoInicial > 0 && (
                                                    <>
                                                        <div className="info-row">
                                                            <span className="info-label">📏 Peso Inicial:</span>
                                                            <span className="info-value">{reporte.procesoEstadisticas.pesoInicial} kg</span>
                                                        </div>
                                                        {reporte.procesoEstadisticas.pesoFinal > 0 && (
                                                            <>
                                                                <div className="info-row">
                                                                    <span className="info-label">📏 Peso Final:</span>
                                                                    <span className="info-value">{reporte.procesoEstadisticas.pesoFinal} kg</span>
                                                                </div>
                                                                <div className="info-row">
                                                                    <span className="info-label">📉 Pérdida de Peso:</span>
                                                                    <span className="info-value danger">
                                                                        {reporte.procesoEstadisticas.perdidaPeso} kg ({reporte.procesoEstadisticas.porcentajePerdida}%)
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            <div className="propietarios-section">
                                                <h4>👥 Propietarios del Lote</h4>
                                                <div className="propietarios-list">
                                                    {reporte.propietarios.map((propietario, index) => (
                                                        <div key={index} className="propietario-item-small">
                                                            <span className="propietario-nombre">{propietario.nombre_completo}</span>
                                                            <span className="propietario-cedula">CC: {propietario.cedula}</span>
                                                            <span className="propietario-quintales">{propietario.quintales_entregados} qq</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="muestras-stats">
                                                <h4>🧪 Estadísticas de Muestras</h4>
                                                <div className="muestras-grid">
                                                    <div className="muestra-stat">
                                                        <span className="number">{reporte.estadisticasMuestras.total}</span>
                                                        <span className="label">Total</span>
                                                    </div>
                                                    <div className="muestra-stat success">
                                                        <span className="number">{reporte.estadisticasMuestras.aprobadas}</span>
                                                        <span className="label">Aprobadas</span>
                                                        <span className="percentage">{reporte.estadisticasMuestras.porcentajeAprobacion}%</span>
                                                    </div>
                                                    <div className="muestra-stat danger">
                                                        <span className="number">{reporte.estadisticasMuestras.contaminadas}</span>
                                                        <span className="label">Contaminadas</span>
                                                        <span className="percentage">{reporte.estadisticasMuestras.porcentajeRechazo}%</span>
                                                    </div>
                                                    <div className="muestra-stat warning">
                                                        <span className="number">{reporte.estadisticasMuestras.pendientes}</span>
                                                        <span className="label">Pendientes</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="progreso-visual">
                                                <div className="progreso-bar">
                                                    <div 
                                                        className="progreso-fill success"
                                                        style={{ width: `${reporte.estadisticasMuestras.porcentajeAprobacion}%` }}
                                                    ></div>
                                                    <div 
                                                        className="progreso-fill danger"
                                                        style={{ width: `${reporte.estadisticasMuestras.porcentajeRechazo}%` }}
                                                    ></div>
                                                </div>
                                                <div className="progreso-labels">
                                                    <span className="success">Aprobación: {reporte.estadisticasMuestras.porcentajeAprobacion}%</span>
                                                    <span className="danger">Rechazo: {reporte.estadisticasMuestras.porcentajeRechazo}%</span>
                                                </div>
                                            </div>

                                            {/* Observaciones ocultas - comentada la sección
                                            {reporte.lote.observaciones && (
                                                <div className="observaciones-section">
                                                    <h4>📝 Observaciones</h4>
                                                    <p className="observaciones-text">{reporte.lote.observaciones}</p>
                                                </div>
                                            )}
                                            */}
                                        </div>
                                    ))}
                                </div>
                                
                                {filtrarReportes().reporteLotesFiltrado.length === 0 && (
                                    <div className="no-results">
                                        <p>No se encontraron lotes que coincidan con los filtros aplicados</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'procesos' && (
                            <div className="procesos-section">
                                <div className="section-header">
                                    <h2>Reporte Detallado por Procesos</h2>
                                    <div className="acciones-reporte">
                                        <button 
                                            className="btn-primary"
                                            onClick={() => exportarReporte('procesos')}
                                        >
                                            📄 Exportar
                                        </button>
                                        <button 
                                            className="btn-secondary"
                                            onClick={() => imprimirReporte('procesos')}
                                        >
                                            🖨️ Imprimir
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="reportes-grid">
                                    {filtrarReportes().reporteProcesosFiltrado.map(reporte => (
                                        <div key={reporte.proceso.id} className="reporte-card proceso-card">
                                            <div className="reporte-header">
                                                <h3>Proceso: {reporte.proceso.nombre}</h3>
                                                <div className="estado-badges">
                                                    <span className={`estado-badge ${reporte.estado.toLowerCase()}`}>
                                                        {reporte.estado}
                                                    </span>
                                                    <span className="responsable-badge">
                                                        Responsable: {reporte.responsable || 'Sin responsable'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="proceso-info">
                                                <div className="info-row">
                                                    <span className="info-label">📅 Fecha de Inicio:</span>
                                                    <span className="info-value">
                                                        {new Date(reporte.proceso.fecha_inicio).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">📅 Fecha de Fin:</span>
                                                    <span className="info-value">
                                                        {reporte.proceso.fecha_fin_real ? new Date(reporte.proceso.fecha_fin_real).toLocaleDateString() : 'En curso'}
                                                    </span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">📅 Duración:</span>
                                                    <span className="info-value">{reporte.duracionDias} días</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">👥 Total Propietarios:</span>
                                                    <span className="info-value">{reporte.totalPropietarios}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">⚖️ Total Quintales:</span>
                                                    <span className="info-value">{reporte.totalQuintales} qq</span>
                                                </div>
                                            </div>

                                            <div className="muestras-stats">
                                                <h4>🧪 Estadísticas de Muestras</h4>
                                                <div className="muestras-grid">
                                                    <div className="muestra-stat">
                                                        <span className="number">{reporte.estadisticasMuestras.total}</span>
                                                        <span className="label">Total</span>
                                                    </div>
                                                    <div className="muestra-stat success">
                                                        <span className="number">{reporte.estadisticasMuestras.aprobadas}</span>
                                                        <span className="label">Aprobadas</span>
                                                        <span className="percentage">{reporte.estadisticasMuestras.porcentajeAprobacion}%</span>
                                                    </div>
                                                    <div className="muestra-stat danger">
                                                        <span className="number">{reporte.estadisticasMuestras.contaminadas}</span>
                                                        <span className="label">Contaminadas</span>
                                                        <span className="percentage">{reporte.estadisticasMuestras.porcentajeRechazo}%</span>
                                                    </div>
                                                    <div className="muestra-stat warning">
                                                        <span className="number">{reporte.estadisticasMuestras.pendientes}</span>
                                                        <span className="label">Pendientes</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="progreso-visual">
                                                <div className="progreso-bar">
                                                    <div 
                                                        className="progreso-fill success"
                                                        style={{ width: `${reporte.estadisticasMuestras.porcentajeAprobacion}%` }}
                                                    ></div>
                                                    <div 
                                                        className="progreso-fill danger"
                                                        style={{ width: `${reporte.estadisticasMuestras.porcentajeRechazo}%` }}
                                                    ></div>
                                                </div>
                                                <div className="progreso-labels">
                                                    <span className="success">Aprobación: {reporte.estadisticasMuestras.porcentajeAprobacion}%</span>
                                                    <span className="danger">Rechazo: {reporte.estadisticasMuestras.porcentajeRechazo}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {filtrarReportes().reporteProcesosFiltrado.length === 0 && (
                                    <div className="no-results">
                                        <p>No se encontraron procesos que coincidan con los filtros aplicados</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'propietarios' && (
                            <div className="propietarios-section">
                                <div className="section-header">
                                    <h2>Reporte por Propietarios</h2>
                                    <div className="acciones-reporte">
                                        <button 
                                            className="btn-primary"
                                            onClick={() => exportarReporte('propietarios')}
                                        >
                                            📄 Exportar
                                        </button>
                                        <button 
                                            className="btn-secondary"
                                            onClick={() => imprimirReporte('propietarios')}
                                        >
                                            🖨️ Imprimir
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="reportes-grid">
                                    {reportePropFiltrado.map(reporte => (
                                        <div key={reporte.propietario.cedula} className="reporte-card">
                                            <div className="reporte-header">
                                                <h3>{reporte.propietario.nombre_completo}</h3>
                                                <span className="cedula-badge">
                                                    CC: {reporte.propietario.cedula}
                                                </span>
                                            </div>
                                            
                                            <div className="propietario-info">
                                                <p><strong>Organización:</strong> {reporte.propietario.organizacion_nombre}</p>
                                                {reporte.propietario.telefono && (
                                                    <p><strong>Teléfono:</strong> {reporte.propietario.telefono}</p>
                                                )}
                                            </div>

                                            <div className="reporte-stats">
                                                <div className="stat-row">
                                                    <span className="stat-label">Total Lotes:</span>
                                                    <span className="stat-value">{reporte.totalLotes}</span>
                                                </div>
                                                <div className="stat-row">
                                                    <span className="stat-label">Total Quintales:</span>
                                                    <span className="stat-value">{reporte.totalQuintales.toFixed(1)}</span>
                                                </div>
                                            </div>

                                            <div className="muestras-stats">
                                                <h4>Estadísticas de Muestras</h4>
                                                <div className="muestras-grid">
                                                    <div className="muestra-stat">
                                                        <span className="number">{reporte.estadisticasMuestras.total}</span>
                                                        <span className="label">Total</span>
                                                    </div>
                                                    <div className="muestra-stat success">
                                                        <span className="number">{reporte.estadisticasMuestras.aprobadas}</span>
                                                        <span className="label">Aprobadas</span>
                                                        <span className="percentage">{reporte.estadisticasMuestras.porcentajeAprobacion}%</span>
                                                    </div>
                                                    <div className="muestra-stat danger">
                                                        <span className="number">{reporte.estadisticasMuestras.contaminadas}</span>
                                                        <span className="label">Contaminadas</span>
                                                        <span className="percentage">{reporte.estadisticasMuestras.porcentajeRechazo}%</span>
                                                    </div>
                                                    <div className="muestra-stat warning">
                                                        <span className="number">{reporte.estadisticasMuestras.pendientes}</span>
                                                        <span className="label">Pendientes</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="progreso-visual">
                                                <div className="progreso-bar">
                                                    <div 
                                                        className="progreso-fill success"
                                                        style={{ width: `${reporte.estadisticasMuestras.porcentajeAprobacion}%` }}
                                                    ></div>
                                                    <div 
                                                        className="progreso-fill danger"
                                                        style={{ width: `${reporte.estadisticasMuestras.porcentajeRechazo}%` }}
                                                    ></div>
                                                </div>
                                                <div className="progreso-labels">
                                                    <span className="success">Aprobación: {reporte.estadisticasMuestras.porcentajeAprobacion}%</span>
                                                    <span className="danger">Rechazo: {reporte.estadisticasMuestras.porcentajeRechazo}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {reportePropFiltrado.length === 0 && (
                                    <div className="no-results">
                                        <p>No se encontraron propietarios que coincidan con los filtros aplicados</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {loading && (
                        <div className="loading-overlay">
                            <div className="loading-spinner">Cargando reportes...</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reportes;