/**
 * Módulo de Autenticación para Pi Network
 * 
 * Este módulo gestiona la autenticación de usuarios con Pi Network,
 * incluyendo inicio de sesión, verificación de sesiones y cierre de sesión.
 */

const PiAuth = {
    // Configuración principal
    config: {
        connectBtn: null,
        loadingIndicator: null,
        redirectUrl: 'dashboard.html',
        onSuccess: null,
        onError: null,
        debug: false
    },
    
    /**
     * Inicializa el módulo de autenticación
     * @param {Object} config - Configuración del módulo
     */
    init: function(config = {}) {
        // Fusionar configuración proporcionada con la configuración por defecto
        this.config = { ...this.config, ...config };
        this.log('Inicializando módulo de autenticación');
        
        // Inicializar el SDK de Pi
        if (typeof Pi === 'undefined') {
            this.error('Pi SDK no está disponible. Asegúrate de incluir el script pi-sdk.js');
            return;
        }
        
        // Inicializar el SDK
        Pi.init({ version: "2.0", sandbox: false });
        
        // Verificar si ya existe una sesión
        this.checkExistingSession();
        
        // Configurar eventos
        if (this.config.connectBtn) {
            this.config.connectBtn.addEventListener('click', () => this.authenticate());
        }
        
        return this;
    },
    
    /**
     * Verifica si ya existe una sesión
     */
    checkExistingSession: function() {
        const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
        
        if (userData && userData.accessToken) {
            this.log('Sesión existente encontrada');
            // Si hay una redirección configurada, redirigir automáticamente
            if (window.location.pathname.endsWith('index.html') && this.config.redirectUrl) {
                window.location.href = this.config.redirectUrl;
            }
        } else {
            this.log('No hay sesión existente');
        }
    },
    
    /**
     * Inicia el proceso de autenticación con Pi Network
     */
    authenticate: async function() {
        try {
            this.log('Iniciando autenticación');
            
            // Mostrar indicador de carga si está configurado
            if (this.config.loadingIndicator) {
                this.config.loadingIndicator.style.display = 'block';
            }
            
            // Ocultar botón si está configurado
            if (this.config.connectBtn) {
                this.config.connectBtn.style.display = 'none';
            }
            
            // Realizar autenticación con Pi Network
            const scopes = ['username', 'payments', 'wallet_address'];
            
            const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
            
            this.log('Autenticación exitosa', auth);
            
            // Obtener datos adicionales del usuario si es necesario
            // Nota: En una aplicación real, verificaríamos estos datos en el backend
            let userData = {
                username: auth.user.username,
                accessToken: auth.accessToken,
                uid: auth.user.uid,
                balance: '0' // Por defecto, se actualizará después
            };
            
            // Aquí podrías hacer una llamada al backend para verificar la autenticación
            // y obtener datos adicionales del usuario
            
            // Guardar datos en localStorage
            localStorage.setItem('piUserData', JSON.stringify(userData));
            
            // Ejecutar callback de éxito si está configurado
            if (typeof this.config.onSuccess === 'function') {
                this.config.onSuccess(userData);
            }
            
            // Redirigir si está configurado
            if (this.config.redirectUrl) {
                window.location.href = this.config.redirectUrl;
            }
            
        } catch (error) {
            this.error('Error durante la autenticación:', error);
            
            // Mostrar botón nuevamente
            if (this.config.connectBtn) {
                this.config.connectBtn.style.display = 'block';
            }
            
            // Ocultar indicador de carga
            if (this.config.loadingIndicator) {
                this.config.loadingIndicator.style.display = 'none';
            }
            
            // Ejecutar callback de error si está configurado
            if (typeof this.config.onError === 'function') {
                this.config.onError(error);
            }
        }
    },
    
    /**
     * Verifica si la sesión actual es válida
     * @returns {Object|null} Datos del usuario o null si no hay sesión válida
     */
    checkSession: async function() {
        try {
            const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
            
            if (!userData || !userData.accessToken) {
                this.log('No hay datos de sesión');
                return null;
            }
            
            this.log('Verificando sesión existente');
            
            // En una aplicación real, aquí verificaríamos la validez del token en el backend
            
            // Re-autenticar para mantener la sesión activa
            try {
                // Asegurarse de que el SDK está inicializado antes de usarlo
                if (typeof Pi !== 'undefined') {
                    // Reinicializar el SDK para asegurar que esté correctamente configurado
                    Pi.init({ version: "2.0", sandbox: false });
                    
                    // Función para manejar pagos incompletos
                    const handleIncompletePayment = (payment) => {
                        this.log('Pago incompleto encontrado durante re-autenticación:', payment);
                        // Aquí podrías manejar pagos incompletos
                        // o enviar la información a otro módulo que los gestione
                        if (window.PiPayments && typeof window.PiPayments.handleIncompletePayment === 'function') {
                            window.PiPayments.handleIncompletePayment(payment);
                        }
                    };
                    
                    const auth = await Pi.authenticate(['username', 'payments'], handleIncompletePayment);
                    
                    // Actualizar token si ha cambiado
                    if (auth.accessToken !== userData.accessToken) {
                        userData.accessToken = auth.accessToken;
                        
                        // Actualizar datos de usuario
                        if (auth.user && auth.user.username) {
                            userData.username = auth.user.username;
                        }
                        
                        // Guardar datos actualizados
                        localStorage.setItem('piUserData', JSON.stringify(userData));
                    }
                    
                    // Actualizar UI si elementos están disponibles
                    if (window.usernameDisplay && userData.username) {
                        window.usernameDisplay.textContent = userData.username;
                    }
                    
                    if (window.balanceDisplay) {
                        if (userData.balance) {
                            window.balanceDisplay.textContent = userData.balance;
                        } else {
                            window.balanceDisplay.textContent = '0';
                        }
                    }
                } else {
                    this.error('SDK de Pi no disponible');
                }
                
            } catch (authError) {
                this.warn('Error en re-autenticación:', authError);
                // Continuar con el token existente
            }
            
            return userData;
            
        } catch (error) {
            this.error('Error al verificar sesión:', error);
            return null;
        }
    },
    
    /**
     * Cierra la sesión actual
     */
    logout: function() {
        localStorage.removeItem('piUserData');
        this.log('Sesión cerrada');
    },
    
    /**
     * Funciones de utilidad para logging
     */
    log: function(...args) {
        if (this.config.debug) {
            console.log('[PiAuth]', ...args);
        }
    },
    
    warn: function(...args) {
        console.warn('[PiAuth]', ...args);
    },
    
    error: function(...args) {
        console.error('[PiAuth]', ...args);
    }
};

// Función para manejar pagos incompletos
function onIncompletePaymentFound(payment) {
    console.log('[PiAuth] Pago incompleto encontrado:', payment);
    
    // Si el módulo de pagos está disponible, delegar el manejo
    if (window.PiPayments && typeof window.PiPayments.handleIncompletePayment === 'function') {
        window.PiPayments.handleIncompletePayment(payment);
    }
}

// Exportar módulo globalmente
window.PiAuth = PiAuth;
