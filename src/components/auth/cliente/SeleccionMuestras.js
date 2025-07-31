import React, { useState } from 'react';

const SeleccionMuestras = ({ lote, onSubmit, onCancel }) => {
    const [propietariosSeleccionados, setPropietariosSeleccionados] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSeleccionPropietario = (propietarioId) => {
        setPropietariosSeleccionados(prev => {
            if (prev.includes(propietarioId)) {
                return prev.filter(id => id !== propietarioId);
            } else if (prev.length < 5) {
                return [...prev, propietarioId];
            } else {
                alert('Solo puede seleccionar máximo 5 propietarios para las muestras');
                return prev;
            }
        });
    };

    const handleSubmit = async () => {
        if (propietariosSeleccionados.length === 0) {
            alert('Debe seleccionar al menos un propietario para las muestras');
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                lote_id: lote.id,
                propietarios_seleccionados: propietariosSeleccionados
            });
        } catch (error) {
            console.error('Error al seleccionar muestras:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPropietarioSeleccionado = (propietarioId) => {
        return propietariosSeleccionados.includes(propietarioId);
    };

    const getNumeroMuestra = (propietarioId) => {
        const index = propietariosSeleccionados.indexOf(propietarioId);
        return index !== -1 ? index + 1 : null;
    };

    return (
        <div className="seleccion-muestras">
            <div className="lote-info-header">
                <h4>Selección de Muestras - Lote {lote.numero_lote}</h4>
                <div className="lote-details">
                    <p><strong>Organización:</strong> {lote.organizacion_nombre}</p>
                    <p><strong>Total Quintales:</strong> {lote.total_quintales}</p>
                    <p><strong>Total Propietarios:</strong> {lote.propietarios?.length || 0}</p>
                </div>
            </div>

            <div className="instrucciones">
                <div className="instruccion-card">
                    <h5>📋 Instrucciones</h5>
                    <ul>
                        <li>Seleccione al menos <strong>1 propietario</strong> de la lista</li>
                        <li>Los propietarios seleccionados serán los que tendrán sus quintales <strong>muestreados</strong></li>
                        <li>Las muestras se enviarán para <strong>análisis de contaminación</strong></li>
                        <li>Si alguna muestra sale contaminada, se podrá identificar al propietario específico</li>
                    </ul>
                </div>
            </div>

            <div className="contador-seleccion">
                <span className={`contador ${propietariosSeleccionados.length === 5 ? 'completo' : ''}`}>
                    {propietariosSeleccionados.length} / 5 propietarios seleccionados
                </span>
            </div>

            <div className="propietarios-lista">
                {lote.propietarios?.map(propietario => (
                    <div 
                        key={propietario.id} 
                        className={`propietario-item ${getPropietarioSeleccionado(propietario.id) ? 'seleccionado' : ''}`}
                        onClick={() => handleSeleccionPropietario(propietario.id)}
                    >
                        <div className="propietario-checkbox">
                            <input
                                type="checkbox"
                                checked={getPropietarioSeleccionado(propietario.id)}
                                onChange={() => {}} // Manejado por onClick del div
                                disabled={!getPropietarioSeleccionado(propietario.id) && propietariosSeleccionados.length >= 5}
                            />
                            {getPropietarioSeleccionado(propietario.id) && (
                                <span className="numero-muestra">
                                    M{getNumeroMuestra(propietario.id)}
                                </span>
                            )}
                        </div>
                        
                        <div className="propietario-info">
                            <h6>{propietario.nombre_completo}</h6>
                            <div className="propietario-detalles">
                                <span><strong>Cédula:</strong> {propietario.cedula}</span>
                                <span><strong>Quintales:</strong> {propietario.quintales_entregados}</span>
                                {propietario.telefono && (
                                    <span><strong>Teléfono:</strong> {propietario.telefono}</span>
                                )}
                            </div>
                            {propietario.direccion && (
                                <p className="direccion"><strong>Dirección:</strong> {propietario.direccion}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {propietariosSeleccionados.length > 0 && (
                <div className="resumen-seleccion">
                    <h5>📝 Resumen de Muestras Seleccionadas</h5>
                    <div className="muestras-resumen">
                        {propietariosSeleccionados.map((propietarioId, index) => {
                            const propietario = lote.propietarios.find(p => p.id === propietarioId);
                            return (
                                <div key={propietarioId} className="muestra-resumen-item">
                                    <span className="muestra-numero">M{index + 1}</span>
                                    <span className="muestra-propietario">{propietario.nombre_completo}</span>
                                    <span className="muestra-quintales">{propietario.quintales_entregados} quintales</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="form-actions">
                <button type="button" onClick={onCancel} disabled={loading}>
                    Cancelar
                </button>
                <button 
                    type="button" 
                    onClick={handleSubmit}
                    className="btn-primary"
                    disabled={propietariosSeleccionados.length === 0 || loading}
                >
                    {loading ? 'Procesando...' : 'Confirmar Selección de Muestras'}
                </button>
            </div>
        </div>
    );
};

export default SeleccionMuestras;