// Utilidades para manejo de autenticación
export const getAuthToken = () => {
    return localStorage.getItem('access_token') || localStorage.getItem('token');
};

export const getRefreshToken = () => {
    return localStorage.getItem('refresh_token');
};

export const setTokens = (accessToken, refreshToken = null) => {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
    }
};

export const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
};

export const getAxiosConfig = () => {
    const token = getAuthToken();
    console.log('Configurando axios con token:', token ? 'Presente' : 'Ausente');
    if (token) {
        console.log('Token (primeros 20 chars):', token.substring(0, 20) + '...');
    }
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

export const refreshAccessToken = async () => {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            console.log('No hay refresh token disponible');
            return false;
        }

        console.log('Intentando renovar token...');
        const response = await fetch('http://127.0.0.1:8000/api/users/login/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh: refreshToken
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.access) {
                setTokens(data.access);
                console.log('Token renovado exitosamente');
                return true;
            }
        } else {
            console.error('Error al renovar token:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Error al renovar token:', error);
        return false;
    }
    return false;
};

export const handleAuthError = async (error, navigate) => {
    console.error('Error de autenticación:', error.response?.status, error.response?.data);
    
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log('Token expirado, intentando renovar...');
        
        // Intentar renovar el token automáticamente
        const tokenRenovado = await refreshAccessToken();
        
        if (!tokenRenovado) {
            // Si no se pudo renovar, limpiar localStorage y redirigir
            clearTokens();
            alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
            if (navigate) {
                navigate('/login');
            } else {
                window.location.href = '/login';
            }
            return true;
        } else {
            // Token renovado exitosamente
            console.log('Token renovado, puede reintentar la operación');
            return false;
        }
    }
    return false;
};

// Función para obtener información del usuario actual
export const getCurrentUser = async () => {
    try {
        const axiosConfig = getAxiosConfig();
        const response = await fetch('http://127.0.0.1:8000/api/users/me/', {
            headers: axiosConfig.headers
        });
        
        if (response.ok) {
            const userData = await response.json();
            console.log('Datos del usuario obtenidos:', userData);
            
            // Asegurar que el usuario tenga un rol válido
            if (!userData.rol || !['ADMINISTRADOR', 'EMPLEADO', 'SECRETARIA'].includes(userData.rol)) {
                console.warn('Usuario sin rol válido, asignando EMPLEADO por defecto');
                userData.rol = 'EMPLEADO';
            }
            
            return userData;
        } else if (response.status === 401) {
            console.log('Token expirado, intentando renovar...');
            const tokenRenovado = await refreshAccessToken();
            if (tokenRenovado) {
                // Reintentar con el nuevo token
                const retryResponse = await fetch('http://127.0.0.1:8000/api/users/me/', {
                    headers: getAxiosConfig().headers
                });
                if (retryResponse.ok) {
                    const userData = await retryResponse.json();
                    console.log('Datos del usuario obtenidos después de renovar token:', userData);
                    
                    // Asegurar que el usuario tenga un rol válido
                    if (!userData.rol || !['ADMINISTRADOR', 'EMPLEADO', 'SECRETARIA'].includes(userData.rol)) {
                        console.warn('Usuario sin rol válido, asignando EMPLEADO por defecto');
                        userData.rol = 'EMPLEADO';
                    }
                    
                    return userData;
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Error al obtener información del usuario:', error);
        return null;
    }
};

// Función para verificar si el usuario es administrador
export const isAdmin = async () => {
    try {
        const userData = await getCurrentUser();
        return userData && userData.rol === 'ADMINISTRADOR';
    } catch (error) {
        console.error('Error al verificar rol de administrador:', error);
        return false;
    }
};

// Función para verificar si el usuario es secretaria
export const isSecretaria = async () => {
    try {
        const userData = await getCurrentUser();
        return userData && userData.rol === 'SECRETARIA';
    } catch (error) {
        console.error('Error al verificar rol de secretaria:', error);
        return false;
    }
};

// Función para verificar autenticación y roles que pueden acceder a limpieza, separación e insumos
export const checkLimpiezaAuth = async (navigate) => {
    const token = getAuthToken();
    if (!token) {
        if (navigate) {
            navigate('/login');
        }
        return false;
    }

    try {
        const userData = await getCurrentUser();
        
        // Verificar si el usuario tiene datos válidos
        if (!userData) {
            console.error('No se pudo obtener información del usuario');
            clearTokens();
            alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
            if (navigate) {
                navigate('/login');
            } else {
                window.location.href = '/login';
            }
            return false;
        }

        console.log('Verificando acceso a limpieza para usuario:', userData.username, 'con rol:', userData.rol);
        
        const rolesPermitidos = ['ADMINISTRADOR', 'SECRETARIA'];
        
        if (rolesPermitidos.includes(userData.rol)) {
            console.log('Acceso permitido para rol:', userData.rol);
            return true;
        } else {
            console.log('Acceso denegado para rol:', userData.rol);
            // NO cerrar sesión automáticamente, solo denegar acceso
            if (userData.rol === 'EMPLEADO') {
                alert('Acceso denegado. Esta sección no está disponible para empleados.');
                // Redirigir al dashboard del empleado
                if (navigate) {
                    navigate('/empleado');
                } else {
                    window.location.href = '/empleado';
                }
            } else {
                alert('Acceso denegado. Esta sección requiere permisos especiales.');
                // Redirigir al dashboard apropiado según el rol
                if (navigate) {
                    navigate('/dashboard');
                } else {
                    window.location.href = '/dashboard';
                }
            }
            return false;
        }
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        clearTokens();
        alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
        if (navigate) {
            navigate('/login');
        } else {
            window.location.href = '/login';
        }
        return false;
    }
};

// Función para verificar autenticación y rol de administrador
export const checkAdminAuth = async (navigate) => {
    const token = getAuthToken();
    if (!token) {
        if (navigate) {
            navigate('/login');
        }
        return false;
    }

    const adminAccess = await isAdmin();
    if (!adminAccess) {
        // Cerrar sesión automáticamente si no es administrador
        clearTokens();
        alert('Acceso denegado. Esta sección es solo para administradores. Su sesión ha sido cerrada.');
        if (navigate) {
            navigate('/login');
        } else {
            window.location.href = '/login';
        }
        return false;
    }

    return true;
};

// Función para verificar autenticación y acceso a reportes (administradores y secretarias)
export const checkReportesAuth = async (navigate) => {
    const token = getAuthToken();
    if (!token) {
        if (navigate) {
            navigate('/login');
        }
        return false;
    }

    try {
        const userData = await getCurrentUser();
        
        // Verificar si el usuario tiene datos válidos
        if (!userData) {
            console.error('No se pudo obtener información del usuario');
            clearTokens();
            alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
            if (navigate) {
                navigate('/login');
            } else {
                window.location.href = '/login';
            }
            return false;
        }

        console.log('Verificando acceso a reportes para usuario:', userData.username, 'con rol:', userData.rol);
        
        const rolesPermitidos = ['ADMINISTRADOR', 'SECRETARIA'];
        
        if (rolesPermitidos.includes(userData.rol)) {
            console.log('Acceso permitido para rol:', userData.rol);
            return true;
        } else {
            console.log('Acceso denegado para rol:', userData.rol);
            // NO cerrar sesión automáticamente, solo denegar acceso
            if (userData.rol === 'EMPLEADO') {
                alert('Acceso denegado. Los reportes no están disponibles para empleados.');
                // Redirigir al dashboard del empleado
                if (navigate) {
                    navigate('/empleado');
                } else {
                    window.location.href = '/empleado';
                }
            } else {
                alert('Acceso denegado. Esta sección requiere permisos especiales.');
                // Redirigir al dashboard apropiado según el rol
                if (navigate) {
                    navigate('/dashboard');
                } else {
                    window.location.href = '/dashboard';
                }
            }
            return false;
        }
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        clearTokens();
        alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
        if (navigate) {
            navigate('/login');
        } else {
            window.location.href = '/login';
        }
        return false;
    }
};

// Función para verificar autenticación y acceso a gestión de propietarios (administradores y secretarias)
export const checkPropietariosAuth = async (navigate) => {
    const token = getAuthToken();
    if (!token) {
        if (navigate) {
            navigate('/login');
        }
        return false;
    }

    try {
        const userData = await getCurrentUser();
        
        // Verificar si el usuario tiene datos válidos
        if (!userData) {
            console.error('No se pudo obtener información del usuario');
            clearTokens();
            alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
            if (navigate) {
                navigate('/login');
            } else {
                window.location.href = '/login';
            }
            return false;
        }

        console.log('Verificando acceso a propietarios para usuario:', userData.username, 'con rol:', userData.rol);
        
        const rolesPermitidos = ['ADMINISTRADOR', 'SECRETARIA'];
        
        if (rolesPermitidos.includes(userData.rol)) {
            console.log('Acceso permitido para rol:', userData.rol);
            return true;
        } else {
            console.log('Acceso denegado para rol:', userData.rol);
            // NO cerrar sesión automáticamente, solo denegar acceso
            if (userData.rol === 'EMPLEADO') {
                alert('Acceso denegado. La gestión de propietarios no está disponible para empleados.');
                // Redirigir al dashboard del empleado
                if (navigate) {
                    navigate('/empleado');
                } else {
                    window.location.href = '/empleado';
                }
            } else {
                alert('Acceso denegado. Esta sección requiere permisos especiales.');
                // Redirigir al dashboard apropiado según el rol
                if (navigate) {
                    navigate('/dashboard');
                } else {
                    window.location.href = '/dashboard';
                }
            }
            return false;
        }
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        clearTokens();
        alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
        if (navigate) {
            navigate('/login');
        } else {
            window.location.href = '/login';
        }
        return false;
    }
};