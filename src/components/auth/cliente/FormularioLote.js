import React, { useState, useEffect } from 'react';
import { buscarPropietarioPorCedula, obtenerPropietariosMaestros } from '../../../services/api';

const FormularioLote = ({ organizaciones, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        organizacion: '',
        codigo: '',
        fecha_cosecha: '',
        cantidad_quintales: '',
        peso_total_inicial: '',
        observaciones_peso: '',
        observaciones: ''
    });
    const [propietarios, setPropietarios] = useState([
        { 
            nombre_completo: '', 
            cedula: '', 
            quintales_entregados: '', 
            telefono: '', 
            departamento: '',
            municipio: '',
            comunidad: '',
            calle: '',
            numero_casa: '',
            referencias: '',
            propietario_maestro_id: null,
            es_propietario_existente: false,
            buscando: false
        }
    ]);
    const [mostrarListaPropietarios, setMostrarListaPropietarios] = useState(false);
    const [propietariosMaestros, setPropietariosMaestros] = useState([]);
    const [cargandoPropietarios, setCargandoPropietarios] = useState(false);

    // Constante para conversión de quintales a kilogramos
    const KG_POR_QUINTAL = 46;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // useEffect para calcular automáticamente el peso total inicial cuando cambian los quintales
    useEffect(() => {
        if (formData.cantidad_quintales && !isNaN(formData.cantidad_quintales)) {
            const quintales = parseFloat(formData.cantidad_quintales);
            const pesoCalculado = (quintales * KG_POR_QUINTAL).toFixed(2);
            setFormData(prev => ({
                ...prev,
                peso_total_inicial: pesoCalculado
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                peso_total_inicial: ''
            }));
        }
    }, [formData.cantidad_quintales]);

    const handlePropietarioChange = (index, field, value) => {
        const newPropietarios = [...propietarios];
        newPropietarios[index][field] = value;
        
        if (field === 'cedula' && value.length >= 8) {
            buscarPropietarioExistente(index, value);
        }
        
        setPropietarios(newPropietarios);
    };

    const buscarPropietarioExistente = async (index, cedula) => {
        const newPropietarios = [...propietarios];
        newPropietarios[index].buscando = true;
        setPropietarios(newPropietarios);

        try {
            const response = await buscarPropietarioPorCedula(cedula);
            
            if (response.encontrado) {
                const propietario = response.propietario;
                newPropietarios[index] = {
                    ...newPropietarios[index],
                    propietario_maestro_id: propietario.id,
                    nombre_completo: propietario.nombre_completo,
                    telefono: propietario.telefono,
                    departamento: propietario.departamento,
                    municipio: propietario.municipio,
                    comunidad: propietario.comunidad,
                    calle: propietario.calle,
                    numero_casa: propietario.numero_casa,
                    referencias: propietario.referencias,
                    es_propietario_existente: true,
                    buscando: false
                };
            } else {
                newPropietarios[index] = {
                    ...newPropietarios[index],
                    propietario_maestro_id: null,
                    es_propietario_existente: false,
                    buscando: false
                };
            }
        } catch (error) {
            // Solo mostrar error si no es un 404 (propietario no encontrado es normal)
            if (error.response?.status !== 404) {
                console.error('Error al buscar propietario:', error);
            }
            newPropietarios[index] = {
                ...newPropietarios[index],
                propietario_maestro_id: null,
                es_propietario_existente: false,
                buscando: false
            };
        }
        
        setPropietarios(newPropietarios);
    };

    const cargarPropietariosMaestros = async () => {
        setCargandoPropietarios(true);
        try {
            const response = await obtenerPropietariosMaestros();
            setPropietariosMaestros(response.results || response);
        } catch (error) {
            console.error('Error al cargar propietarios maestros:', error);
        }
        setCargandoPropietarios(false);
    };

    const seleccionarPropietarioExistente = (index, propietarioMaestro) => {
        const newPropietarios = [...propietarios];
        newPropietarios[index] = {
            ...newPropietarios[index],
            propietario_maestro_id: propietarioMaestro.id,
            nombre_completo: propietarioMaestro.nombre_completo,
            cedula: propietarioMaestro.cedula,
            telefono: propietarioMaestro.telefono,
            departamento: propietarioMaestro.departamento,
            municipio: propietarioMaestro.municipio,
            comunidad: propietarioMaestro.comunidad,
            calle: propietarioMaestro.calle,
            numero_casa: propietarioMaestro.numero_casa,
            referencias: propietarioMaestro.referencias,
            es_propietario_existente: true
        };
        setPropietarios(newPropietarios);
        setMostrarListaPropietarios(false);
    };

    const limpiarPropietario = (index) => {
        const newPropietarios = [...propietarios];
        newPropietarios[index] = {
            nombre_completo: '', 
            cedula: '', 
            quintales_entregados: newPropietarios[index].quintales_entregados,
            telefono: '', 
            departamento: '',
            municipio: '',
            comunidad: '',
            calle: '',
            numero_casa: '',
            referencias: '',
            propietario_maestro_id: null,
            es_propietario_existente: false,
            buscando: false
        };
        setPropietarios(newPropietarios);
    };

    const agregarPropietario = () => {
        setPropietarios([...propietarios, 
            { 
                nombre_completo: '', 
                cedula: '', 
                quintales_entregados: '', 
                telefono: '', 
                departamento: '',
                municipio: '',
                comunidad: '',
                calle: '',
                numero_casa: '',
                referencias: '',
                propietario_maestro_id: null,
                es_propietario_existente: false,
                buscando: false
            }
        ]);
    };

    const eliminarPropietario = (index) => {
        if (propietarios.length > 1) {
            const newPropietarios = propietarios.filter((_, i) => i !== index);
            setPropietarios(newPropietarios);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const propietariosValidos = propietarios.filter(p => 
            p.nombre_completo.trim() && p.cedula.trim() && p.quintales_entregados
        );
        
        if (propietariosValidos.length === 0) {
            alert('Debe agregar al menos un propietario válido');
            return;
        }

        const loteData = {
            numero_lote: formData.codigo,
            organizacion: formData.organizacion,
            total_quintales: parseFloat(formData.cantidad_quintales),
            fecha_entrega: new Date(formData.fecha_cosecha + 'T00:00:00').toISOString(),
            peso_total_inicial: parseFloat(formData.peso_total_inicial),
            observaciones_peso: formData.observaciones_peso,
            observaciones: formData.observaciones,
            propietarios: propietariosValidos.map(p => {
                const propietarioData = {
                    quintales_entregados: parseFloat(p.quintales_entregados)
                };
                
                if (p.es_propietario_existente && p.propietario_maestro_id) {
                    propietarioData.propietario_maestro_id = p.propietario_maestro_id;
                } else {
                    propietarioData.nombre_completo = p.nombre_completo;
                    propietarioData.cedula = p.cedula;
                    propietarioData.telefono = p.telefono;
                    propietarioData.departamento = p.departamento;
                    propietarioData.municipio = p.municipio;
                    propietarioData.comunidad = p.comunidad;
                    propietarioData.calle = p.calle;
                    propietarioData.numero_casa = p.numero_casa;
                    propietarioData.referencias = p.referencias;
                }
                
                return propietarioData;
            })
        };

        console.log('Datos del lote a enviar:', loteData);
        onSubmit(loteData);
    };

    return (
        <form onSubmit={handleSubmit} className="formulario-lote">
            <div className="form-section">
                <h4>Información del Lote</h4>
                
                <div className="form-row">
                    <div className="form-group">
                        <label>Organización *</label>
                        <select
                            name="organizacion"
                            value={formData.organizacion}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Seleccionar organización</option>
                            {organizaciones && organizaciones.map(org => (
                                <option key={org.id} value={org.id}>
                                    {org.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="form-group">
                        <label>Código del Lote *</label>
                        <input
                            type="text"
                            name="codigo"
                            value={formData.codigo}
                            onChange={handleInputChange}
                            placeholder="Ej: LT-2025-001"
                            required
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Fecha de Cosecha *</label>
                        <input
                            type="date"
                            name="fecha_cosecha"
                            value={formData.fecha_cosecha}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Total Quintales *</label>
                        <input
                            type="number"
                            name="cantidad_quintales"
                            value={formData.cantidad_quintales}
                            onChange={handleInputChange}
                            placeholder="Ej: 100"
                            step="0.01"
                            min="0"
                            required
                        />
                        <small style={{ color: '#666', fontSize: '0.8rem' }}>
                            💡 El peso en kg se calculará automáticamente (1 quintal = {KG_POR_QUINTAL} kg)
                        </small>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Peso Total Inicial (kg)</label>
                        <input
                            type="number"
                            name="peso_total_inicial"
                            value={formData.peso_total_inicial}
                            onChange={handleInputChange}
                            placeholder="Se calcula automáticamente"
                            step="0.01"
                            min="0"
                            readOnly
                            style={{ 
                                backgroundColor: '#f5f5f5', 
                                border: '1px solid #ddd',
                                color: '#666'
                            }}
                        />
                        <small style={{ color: '#666', fontSize: '0.8rem' }}>
                            🧮 Calculado automáticamente: {formData.cantidad_quintales ? `${formData.cantidad_quintales} quintales × ${KG_POR_QUINTAL} kg/quintal` : 'Ingrese quintales para calcular'}
                        </small>
                    </div>
                    
                    <div className="form-group">
                        <label>Observaciones Peso</label>
                        <input
                            type="text"
                            name="observaciones_peso"
                            value={formData.observaciones_peso}
                            onChange={handleInputChange}
                            placeholder="Ej: Pesado en báscula digital, condiciones húmedas"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Observaciones</label>
                    <textarea
                        name="observaciones"
                        value={formData.observaciones}
                        onChange={handleInputChange}
                        placeholder="Observaciones adicionales..."
                        rows="3"
                    />
                </div>
            </div>

            <div className="form-section">
                <div className="section-header-form">
                    <h4>Propietarios del Café</h4>
                    <div className="propietarios-actions">
                        <button 
                            type="button" 
                            onClick={() => {
                                setMostrarListaPropietarios(true);
                                cargarPropietariosMaestros();
                            }}
                            className="btn-secondary"
                        >
                            📋 Ver Propietarios Registrados
                        </button>
                        <button 
                            type="button" 
                            onClick={agregarPropietario}
                            className="btn-add-propietario"
                        >
                            + Agregar Propietario
                        </button>
                    </div>
                </div>

                {mostrarListaPropietarios && (
                    <div className="modal-overlay">
                        <div className="modal-content propietarios-modal">
                            <div className="modal-header">
                                <h3>Propietarios Registrados</h3>
                                <button 
                                    type="button"
                                    onClick={() => setMostrarListaPropietarios(false)}
                                    className="close-btn"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="modal-body">
                                {cargandoPropietarios ? (
                                    <div className="loading-text">Cargando propietarios...</div>
                                ) : (
                                    <div className="propietarios-list">
                                        {propietariosMaestros.map(propietario => (
                                            <div key={propietario.id} className="propietario-item">
                                                <div className="propietario-info">
                                                    <h5>{propietario.nombre_completo}</h5>
                                                    <p><strong>Cédula:</strong> {propietario.cedula}</p>
                                                    <p><strong>Teléfono:</strong> {propietario.telefono || 'No registrado'}</p>
                                                    <p><strong>Ubicación:</strong> {propietario.direccion_completa}</p>
                                                    <p><strong>Entregas anteriores:</strong> {propietario.total_entregas}</p>
                                                </div>
                                                <div className="propietario-actions">
                                                    {propietarios.map((_, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => seleccionarPropietarioExistente(index, propietario)}
                                                            className="btn-small"
                                                        >
                                                            Asignar a Propietario {index + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {propietariosMaestros.length === 0 && (
                                            <p className="no-data">No hay propietarios registrados aún.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {propietarios.map((propietario, index) => (
                    <div key={index} className={`propietario-form ${propietario.es_propietario_existente ? 'propietario-existente' : ''}`}>
                        <div className="propietario-header">
                            <h5>
                                Propietario {index + 1} 
                                {propietario.es_propietario_existente && (
                                    <span className="badge-existente">👤 Registrado</span>
                                )}
                                {propietario.buscando && (
                                    <span className="badge-buscando">🔍 Buscando...</span>
                                )}
                            </h5>
                            <div className="propietario-actions-header">
                                {propietario.es_propietario_existente && (
                                    <button
                                        type="button"
                                        onClick={() => limpiarPropietario(index)}
                                        className="btn-clean"
                                        title="Crear nuevo propietario"
                                    >
                                        🆕 Nuevo
                                    </button>
                                )}
                                {propietarios.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => eliminarPropietario(index)}
                                        className="btn-remove"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Cédula * 
                                    <small style={{ color: '#666', fontSize: '0.8rem', fontWeight: 'normal' }}>
                                        {propietario.es_propietario_existente ? 
                                            ' (Se encontraron datos registrados)' : 
                                            ' (Ingrese 8+ dígitos para buscar)'
                                        }
                                    </small>
                                </label>
                                <input
                                    type="text"
                                    value={propietario.cedula}
                                    onChange={(e) => handlePropietarioChange(index, 'cedula', e.target.value)}
                                    placeholder="Número de cédula"
                                    required
                                    className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                    readOnly={propietario.es_propietario_existente}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Nombre Completo *</label>
                                <input
                                    type="text"
                                    value={propietario.nombre_completo}
                                    onChange={(e) => handlePropietarioChange(index, 'nombre_completo', e.target.value)}
                                    placeholder="Nombre completo del propietario"
                                    required
                                    className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                    readOnly={propietario.es_propietario_existente}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Quintales Entregados *</label>
                                <input
                                    type="number"
                                    value={propietario.quintales_entregados}
                                    onChange={(e) => handlePropietarioChange(index, 'quintales_entregados', e.target.value)}
                                    placeholder="Cantidad en quintales"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input
                                    type="tel"
                                    value={propietario.telefono}
                                    onChange={(e) => handlePropietarioChange(index, 'telefono', e.target.value)}
                                    placeholder="Número de teléfono"
                                    className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                    readOnly={propietario.es_propietario_existente}
                                />
                            </div>
                        </div>

                        <div className="direccion-section">
                            <h6>Dirección Detallada</h6>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Provincia</label>
                                    <input
                                        type="text"
                                        value={propietario.departamento}
                                        onChange={(e) => handlePropietarioChange(index, 'departamento', e.target.value)}
                                        placeholder="Ej: Loja"
                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                        readOnly={propietario.es_propietario_existente}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Ciudad</label>
                                    <input
                                        type="text"
                                        value={propietario.municipio}
                                        onChange={(e) => handlePropietarioChange(index, 'municipio', e.target.value)}
                                        placeholder="Ej: Catamayo"
                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                        readOnly={propietario.es_propietario_existente}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Barrio</label>
                                    <input
                                        type="text"
                                        value={propietario.comunidad}
                                        onChange={(e) => handlePropietarioChange(index, 'comunidad', e.target.value)}
                                        placeholder="Ej: San José"
                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                        readOnly={propietario.es_propietario_existente}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Calle/Finca</label>
                                    <input
                                        type="text"
                                        value={propietario.calle}
                                        onChange={(e) => handlePropietarioChange(index, 'calle', e.target.value)}
                                        placeholder="Ej: Finca El Cafetal"
                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                        readOnly={propietario.es_propietario_existente}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Número de Casa</label>
                                    <input
                                        type="text"
                                        value={propietario.numero_casa}
                                        onChange={(e) => handlePropietarioChange(index, 'numero_casa', e.target.value)}
                                        placeholder="Ej: Casa S/N o Km 12"
                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                        readOnly={propietario.es_propietario_existente}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Referencias</label>
                                    <input
                                        type="text"
                                        value={propietario.referencias}
                                        onChange={(e) => handlePropietarioChange(index, 'referencias', e.target.value)}
                                        placeholder="Ej: 500 metros después de la capilla"
                                        className={propietario.es_propietario_existente ? 'input-readonly' : ''}
                                        readOnly={propietario.es_propietario_existente}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="form-actions">
                <button type="button" onClick={onCancel}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Lote</button>
            </div>
        </form>
    );
};

export default FormularioLote;