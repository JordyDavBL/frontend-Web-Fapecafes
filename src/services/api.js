import axios from 'axios';

// Configuración base de la API
const API_URL = 'http://localhost:8000/api';

// Instancia de axios configurada
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para incluir el token de autenticación
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar respuestas y renovar tokens
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}/login/refresh/`, {
                        refresh: refreshToken
                    });
                    
                    const { access } = response.data;
                    localStorage.setItem('access_token', access);
                    
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }
        
        return Promise.reject(error);
    }
);

// ==================== FUNCIONES DE AUTENTICACIÓN ====================
export const login = async (credentials) => {
    try {
        const response = await api.post('/users/login/', credentials);
        return response.data;
    } catch (error) {
        console.error('Error en login:', error);
        throw error;
    }
};

export const register = async (userData) => {
    try {
        const response = await api.post('/users/register/', userData);
        return response.data;
    } catch (error) {
        console.error('Error en registro:', error);
        throw error;
    }
};

export const getUserInfo = async () => {
    try {
        const response = await api.get('/users/me/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener información del usuario:', error);
        throw error;
    }
};

// ==================== FUNCIONES DE ORGANIZACIONES ====================
export const obtenerOrganizaciones = async () => {
    try {
        const response = await api.get('/users/organizaciones/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener organizaciones:', error);
        throw error;
    }
};

export const crearOrganizacion = async (organizacionData) => {
    try {
        const response = await api.post('/users/organizaciones/', organizacionData);
        return response.data;
    } catch (error) {
        console.error('Error al crear organización:', error);
        throw error;
    }
};

// ==================== FUNCIONES DE LOTES ====================
export const obtenerLotes = async () => {
    try {
        const response = await api.get('/users/lotes/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener lotes:', error);
        throw error;
    }
};

export const crearLoteConPropietarios = async (loteData) => {
    try {
        const response = await api.post('/users/lotes/crear-con-propietarios/', loteData);
        return response.data;
    } catch (error) {
        console.error('Error al crear lote con propietarios:', error);
        throw error;
    }
};

export const obtenerLoteDetalle = async (loteId) => {
    try {
        const response = await api.get(`/users/lotes/${loteId}/`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener detalle del lote:', error);
        throw error;
    }
};

// ==================== FUNCIONES DE MUESTRAS ====================
export const seleccionarMuestras = async (data) => {
    try {
        const response = await api.post('/users/muestras/seleccionar/', data);
        return response.data;
    } catch (error) {
        console.error('Error al seleccionar muestras:', error);
        throw error;
    }
};

export const registrarResultadoMuestra = async (muestraId, resultado) => {
    try {
        const response = await api.post(`/users/muestras/${muestraId}/resultado/`, resultado);
        return response.data;
    } catch (error) {
        console.error('Error al registrar resultado de muestra:', error);
        throw error;
    }
};

export const crearSegundoMuestreo = async (data) => {
    try {
        const response = await api.post('/users/muestras/segundo-muestreo/', data);
        return response.data;
    } catch (error) {
        console.error('Error al crear segundo muestreo:', error);
        throw error;
    }
};

// ==================== FUNCIONES DE PROPIETARIOS MAESTROS ====================
export const buscarPropietarioPorCedula = async (cedula) => {
    try {
        const response = await api.get(`/users/buscar-propietario/${cedula}/`);
        return response.data;
    } catch (error) {
        console.error('Error al buscar propietario por cédula:', error);
        throw error;
    }
};

export const obtenerPropietariosMaestros = async (params = {}) => {
    try {
        const response = await api.get('/users/propietarios-maestros/', { params });
        return response.data;
    } catch (error) {
        console.error('Error al obtener propietarios maestros:', error);
        throw error;
    }
};

export const crearPropietarioMaestro = async (propietarioData) => {
    try {
        const response = await api.post('/users/propietarios-maestros/', propietarioData);
        return response.data;
    } catch (error) {
        console.error('Error al crear propietario maestro:', error);
        throw error;
    }
};

export const obtenerHistorialPropietario = async (propietarioId) => {
    try {
        const response = await api.get(`/users/propietarios-maestros/${propietarioId}/historial/`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener historial del propietario:', error);
        throw error;
    }
};

// ==================== FUNCIONES DE ESTADÍSTICAS ====================
export const obtenerEstadisticas = async () => {
    try {
        const response = await api.get('/users/estadisticas/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        throw error;
    }
};

// ==================== FUNCIONES DE BITÁCORA ====================
export const obtenerBitacora = async (params = {}) => {
    try {
        const response = await api.get('/users/bitacora/', { params });
        return response.data;
    } catch (error) {
        console.error('Error al obtener bitácora:', error);
        throw error;
    }
};

// ==================== FUNCIONES DE PROCESOS ====================
export const procesarLimpieza = async (data) => {
    try {
        const response = await api.post('/users/lotes/procesar-limpieza/', data);
        return response.data;
    } catch (error) {
        console.error('Error al procesar limpieza:', error);
        throw error;
    }
};

export const procesarSeparacionColores = async (data) => {
    try {
        const response = await api.post('/users/lotes/procesar-separacion-colores/', data);
        return response.data;
    } catch (error) {
        console.error('Error al procesar separación por colores:', error);
        throw error;
    }
};

export const enviarRecepcionFinal = async (data) => {
    try {
        const response = await api.post('/users/lotes/enviar-recepcion-final/', data);
        return response.data;
    } catch (error) {
        console.error('Error al enviar a recepción final:', error);
        throw error;
    }
};

// ==================== FUNCIONES DE EMPLEADOS ====================
export const obtenerDescargas = async (params = {}) => {
    try {
        const response = await api.get('/users/descargas/', { params });
        return response.data;
    } catch (error) {
        console.error('Error al obtener descargas:', error);
        throw error;
    }
};

export const registrarDescarga = async (descargaData) => {
    try {
        const response = await api.post('/users/descargas/', descargaData);
        return response.data;
    } catch (error) {
        console.error('Error al registrar descarga:', error);
        throw error;
    }
};

export const obtenerMaquinaria = async () => {
    try {
        const response = await api.get('/users/maquinaria/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener maquinaria:', error);
        throw error;
    }
};

export const registrarUsoMaquinaria = async (usoData) => {
    try {
        const response = await api.post('/users/uso-maquinaria/', usoData);
        return response.data;
    } catch (error) {
        console.error('Error al registrar uso de maquinaria:', error);
        throw error;
    }
};

export default api;