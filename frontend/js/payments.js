/**
 * Módulo de Pagos para Pi Network
 * 
 * Este módulo gestiona todas las interacciones con el sistema de pagos de Pi Network,
 * incluyendo creación de pagos, manejo de pagos incompletos y verificación de estados.
 */

const PiPayments = {
    // Configuración principal
    config: {
        donateButton: null,
        paymentStatus: null,
        txidDisplay: null,
        paymentResult: null,
        baseUrl: '', // URL base para las llamadas API
        debug: false
    },
    
    // Estado interno
    state: {
        accessToken: null,
        pendingPayment: null
    },
    
    /**
     * Inicializa el módulo de pagos
     * @param {Object} config - Configuración del módulo
     */
    init: function(config = {}) {
        // Fusionar configuración proporcionada con la configuración por defecto
        this.config = { ...this.config, ...config };
        
        // Habilitar depuración por defecto para diagnosticar problemas
        this.config.debug = true;
        
        this.log('Inicializando módulo de pagos');
        
        // Verificar si el SDK está disponible
        if (typeof Pi === 'undefined') {
            this.error('SDK de Pi Network no está disponible. Asegúrate de que el script pi-sdk.js está cargado correctamente.');
        } else {
            this.log('SDK de Pi Network detectado');
            // Inicializar el SDK ahora para asegurar que está listo
            try {
                Pi.init({ version: "2.0", sandbox: false });
                this.log('SDK de Pi Network inicializado correctamente');
            } catch (e) {
                this.error('Error al inicializar el SDK de Pi:', e);
            }
        }
        
        // Obtener token de acceso del almacenamiento local
        const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
        if (userData && userData.accessToken) {
            this.state.accessToken = userData.accessToken;
            this.log('Token de acceso obtenido del almacenamiento local');
        } else {
            this.warn('No se encontró token de acceso en el almacenamiento local');
        }
        
        // Configurar eventos
        if (this.config.donateButton) {
            this.log('Configurando botón de donación');
            this.config.donateButton.addEventListener('click', () => {
                this.log('Botón de donación clickeado');
                this.createPayment();
            });
        } else {
            this.warn('Botón de donación no configurado');
        }
        
        // Verificar si hay pagos pendientes
        this.checkPendingPayments();
        
        return this;
    },
    
    /**
     * Crea un nuevo pago
     * @param {Object} options - Opciones para el pago
     */
    createPayment: async function(options = {}) {
        try {
            const amount = options.amount || 1;
            const memo = options.memo || "Donación";
            const metadata = options.metadata || {};
            
            this.log('Creando pago por', amount, 'Pi');
            
            // Verificar que el SDK de Pi esté disponible
            if (typeof Pi === 'undefined') {
                throw new Error('El SDK de Pi Network no está disponible');
            }
            
            // Inicializar el SDK antes de usarlo para asegurar que está listo
            Pi.init({ version: "2.0", sandbox: false });
            
            // Deshabilitar botón durante el proceso
            if (this.config.donateButton) {
                this.config.donateButton.disabled = true;
                this.config.donateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            }
            
            // Mostrar área de resultado si está configurada
            if (this.config.paymentResult) {
                this.config.paymentResult.style.display = 'block';
            }
            
            // Actualizar estado si está configurado
            if (this.config.paymentStatus) {
                this.config.paymentStatus.textContent = 'Iniciando pago...';
            }
            
            // Generar ID único para el pago
            const paymentId = 'payment_' + Date.now();
            
            // Configurar datos del pago
            const paymentData = {
                amount: amount,
                memo: memo,
                metadata: { 
                    paymentId: paymentId,
                    ...metadata
                }
            };
            
            // Configurar callbacks para el proceso de pago
            const callbacks = {
                onReadyForServerApproval: (paymentId) => this.handleServerApproval(paymentId),
                onReadyForServerCompletion: (paymentId, txid) => this.handleServerCompletion(paymentId, txid),
                onCancel: (paymentId) => this.handlePaymentCancel(paymentId),
                onError: (error, paymentId) => this.handlePaymentError(error, paymentId)
            };
            
            this.log('Iniciando creación de pago...');
            
            // Iniciar el pago con Pi SDK
            Pi.createPayment(paymentData, callbacks);
            
            this.log('Solicitud de pago enviada');
            
        } catch (error) {
            this.error('Error al crear pago:', error);
            
            // Restaurar estado del botón
            if (this.config.donateButton) {
                this.config.donateButton.disabled = false;
                this.config.donateButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
            }
            
            // Actualizar estado
            if (this.config.paymentStatus) {
                this.config.paymentStatus.textContent = 'Error: ' + error.message;
            }
            
            // Mostrar alerta
            alert('Error al crear pago: ' + error.message);
        }
    },
    
    /**
     * Maneja la fase de aprobación del servidor
     * @param {string} paymentId - Identificador del pago
     */
    handleServerApproval: function(paymentId) {
        this.log('Manejando aprobación del servidor para pago:', paymentId);

        // Verificar si ya hay un pago pendiente
        if (this.state.pendingPayment && this.state.pendingPayment !== paymentId) {
            this.log('Cancelando pago anterior pendiente');
            this.cancelPendingPayment(this.state.pendingPayment);
            
            // Mostrar mensaje de error
            if (this.config.paymentStatus) {
                this.config.paymentStatus.textContent = 'Error: Ya hay un pago pendiente';
            }
            
            // Restaurar botón
            if (this.config.donateButton) {
                this.config.donateButton.disabled = false;
                this.config.donateButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
            }
            
            return; // No continuar con la aprobación actual
        }

        // Actualizar estado
        this.state.pendingPayment = paymentId;
        
        // Actualizar UI
        if (this.config.paymentStatus) {
            this.config.paymentStatus.textContent = 'Esperando aprobación del servidor...';
        }
        
        // Llamar al servidor para aprobar el pago
        fetch(this.config.baseUrl + '/api/payments/approve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                paymentId: paymentId,
                accessToken: this.state.accessToken
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            this.log('Pago aprobado por el servidor');
            if (this.config.paymentStatus) {
                this.config.paymentStatus.textContent = 'Pago aprobado, esperando confirmación...';
            }
        })
        .catch(error => {
            this.error('Error al aprobar pago:', error);
            this.handlePaymentError(error, paymentId);
        });
    },
    
    /**
     * Maneja la fase de completado del servidor
     * @param {string} paymentId - Identificador del pago
     * @param {string} txid - ID de la transacción blockchain
     */
    handleServerCompletion: async function(paymentId, txid) {
        this.log('Manejando completado del servidor para pago:', paymentId, txid);

        // Verificar si este es el pago pendiente
        if (this.state.pendingPayment !== paymentId) {
            this.log('Este no es el pago pendiente actual');
            return;
        }

        // Actualizar estado
        if (this.config.paymentStatus) {
            this.config.paymentStatus.textContent = 'Completando pago...';
        }

        // Llamar al servidor para completar el pago
        try {
            const response = await fetch(this.config.baseUrl + '/api/payments/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    paymentId: paymentId,
                    txid: txid
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.log('Pago completado exitosamente');
            this.state.pendingPayment = null;
            
            // Actualizar UI
            if (this.config.paymentStatus) {
                this.config.paymentStatus.textContent = 'Pago completado - ¡Gracias por tu donación!';
            }
            
            // Restaurar botón
            if (this.config.donateButton) {
                this.config.donateButton.disabled = false;
                this.config.donateButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
            }
            
            // Ocultar resultado después de un tiempo
            setTimeout(() => {
                if (this.config.paymentResult) {
                    this.config.paymentResult.style.display = 'none';
                }
            }, 3000);
            
        } catch (error) {
            this.error('Error al completar pago:', error);
            this.handlePaymentError(error, paymentId);
        }
    },
    
    /**
     * Maneja la cancelación de un pago
     * @param {string} paymentId - Identificador del pago
     */
    handlePaymentCancel: function(paymentId) {
        this.log('Cancelando pago:', paymentId);

        // Verificar si este es el pago pendiente
        if (this.state.pendingPayment !== paymentId) {
            this.log('Este no es el pago pendiente actual');
            return;
        }

        // Actualizar estado
        if (this.config.paymentStatus) {
            this.config.paymentStatus.textContent = 'Cancelando pago...';
        }

        // Hacer la llamada al servidor para cancelar el pago
        fetch(`${this.config.baseUrl}/api/payments/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentId })
        })
        .then(response => response.json())
        .then(data => {
            this.log('Respuesta del servidor:', data);
            
            if (data.error) {
                this.handlePaymentError(new Error(data.error), paymentId);
            } else {
                this.log('Pago cancelado correctamente');
                this.state.pendingPayment = null;
                
                // Actualizar estado
                if (this.config.paymentStatus) {
                    this.config.paymentStatus.textContent = 'Cancelado por el usuario';
                }
                
                // Restaurar botón
                if (this.config.donateButton) {
                    this.config.donateButton.disabled = false;
                    this.config.donateButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
                }
                
                // Ocultar resultado después de un tiempo
                setTimeout(() => {
                    if (this.config.paymentResult) {
                        this.config.paymentResult.style.display = 'none';
                    }
                }, 3000);
            }
        })
        .catch(error => {
            this.handlePaymentError(error, paymentId);
        });
    },
    
    /**
     * Maneja errores en el pago
     * @param {Error} error - Error ocurrido
     * @param {string} paymentId - Identificador del pago
     */
    handlePaymentError: function(error, paymentId) {
        this.error('Error en el pago:', error, paymentId);
        
        // Mensajes más claros para errores comunes
        let errorMessage = error.message || 'Error desconocido';
        
        // Verificar si el error está relacionado con la inicialización del SDK
        if (errorMessage.includes('not initialized')) {
            errorMessage = 'SDK no inicializado. Recargando la página...';
            
            // Intentar reinicializar el SDK
            if (typeof Pi !== 'undefined') {
                try {
                    this.log('Intentando reinicializar el SDK...');
                    Pi.init({ version: "2.0", sandbox: false });
                    
                    // Recargar la página después de un breve retraso
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                    
                } catch (initError) {
                    this.error('Error al reinicializar el SDK:', initError);
                }
            }
        } else if (errorMessage.includes('pending payment')) {
            errorMessage = 'Hay un pago pendiente que debe resolverse antes de crear uno nuevo';
        }
        
        // Actualizar estado
        if (this.config.paymentStatus) {
            this.config.paymentStatus.textContent = 'Error: ' + errorMessage;
        }
        
        // Mostrar alerta para errores críticos
        if (errorMessage.includes('SDK no inicializado')) {
            alert('El SDK de Pi Network no está inicializado correctamente. La página se recargará para intentar resolver el problema.');
        }
        
        // Restaurar botón
        if (this.config.donateButton) {
            this.config.donateButton.disabled = false;
            this.config.donateButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
        }
        
        // En una aplicación real, notificaríamos al backend sobre el error
    },
    
    /**
     * Maneja pagos incompletos encontrados
     * @param {Object} payment - Información del pago incompleto
     */
    handleIncompletePayment: function(payment) {
        this.log('Manejando pago incompleto:', payment);
        
        // Verificar si ya hay un pago pendiente
        if (this.state.pendingPayment && this.state.pendingPayment !== payment.paymentId) {
            this.log('Cancelando pago anterior pendiente');
            this.cancelPendingPayment(this.state.pendingPayment);
        }
        
        // Guardar referencia al pago pendiente
        this.state.pendingPayment = payment.paymentId;
        
        // Si el pago ya está completado, no hacer nada
        if (payment.status === 'completed') {
            this.log('El pago ya está completado, no se requiere acción');
            this.state.pendingPayment = null;
            return;
        }
        
        // Mostrar información sobre el pago incompleto
        if (this.config.paymentStatus) {
            this.config.paymentStatus.textContent = 'Pago pendiente encontrado';
        }
        
        if (this.config.txidDisplay) {
            this.config.txidDisplay.textContent = payment.transaction ? payment.transaction.txid : 'No disponible';
        }
        
        if (this.config.paymentResult) {
            this.config.paymentResult.style.display = 'block';
            
            // Crear un elemento para mostrar opciones para el pago pendiente
            const pendingPaymentActions = document.createElement('div');
            pendingPaymentActions.className = 'alert alert-warning mt-3';
            pendingPaymentActions.innerHTML = `
                <p><strong>Se encontró un pago pendiente</strong></p>
                <p>Tienes un pago pendiente que necesita ser completado o cancelado.</p>
                <div class="d-grid gap-2">
                    <button class="btn btn-sm btn-danger" id="cancel-payment-btn">
                        <i class="fas fa-times-circle"></i> Cancelar Pago
                    </button>
                    ${payment.transaction && payment.transaction.txid ? `
                    <button class="btn btn-sm btn-success" id="complete-payment-btn">
                        <i class="fas fa-check-circle"></i> Completar Pago
                    </button>
                    ` : ''}
                </div>
            `;
            
            // Eliminar cualquier elemento anterior similar
            const existingActions = this.config.paymentResult.querySelector('.pending-payment-actions');
            if (existingActions) {
                existingActions.remove();
            }
            
            // Añadir clase para identificación
            pendingPaymentActions.classList.add('pending-payment-actions');
            
            // Añadir al DOM
            this.config.paymentResult.appendChild(pendingPaymentActions);
            
            // Configurar eventos para los botones
            const cancelBtn = pendingPaymentActions.querySelector('#cancel-payment-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.cancelPendingPayment(payment.paymentId);
                });
            }
            
            const completeBtn = pendingPaymentActions.querySelector('#complete-payment-btn');
            if (completeBtn) {
                completeBtn.addEventListener('click', () => {
                    this.completePendingPayment(payment.paymentId, payment.transaction.txid);
                });
            }
            
            // Ocultar resultado después de un tiempo
            setTimeout(() => {
                if (this.config.paymentResult) {
                    this.config.paymentResult.style.display = 'none';
                }
            }, 30000); // 30 segundos para pagos pendientes
        }
    },
    
    /**
     * Cancela un pago pendiente
     * @param {string} paymentId - Identificador del pago
     */
    cancelPendingPayment: async function(paymentId) {
        try {
            this.log('Cancelando pago pendiente:', paymentId);
            
            // Actualizar estado
            if (this.config.paymentStatus) {
                this.config.paymentStatus.textContent = 'Cancelando pago pendiente...';
            }
            
            // Hacer la llamada al servidor para cancelar el pago
            fetch(`${this.config.baseUrl}/api/payments/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ paymentId })
            })
            .then(response => response.json())
            .then(data => {
                this.log('Respuesta del servidor:', data);
                
                if (data.error) {
                    this.handlePaymentError(new Error(data.error), paymentId);
                } else {
                    this.log('Pago pendiente cancelado correctamente');
                    this.state.pendingPayment = null;
                    
                    // Actualizar estado
                    if (this.config.paymentStatus) {
                        this.config.paymentStatus.textContent = 'Pago pendiente cancelado';
                    }
                    
                    // Eliminar elementos de UI para pago pendiente
                    const pendingActions = document.querySelector('.pending-payment-actions');
                    if (pendingActions) {
                        pendingActions.remove();
                    }
                    
                    // Ocultar resultado después de un tiempo
                    setTimeout(() => {
                        if (this.config.paymentResult) {
                            this.config.paymentResult.style.display = 'none';
                        }
                    }, 3000);
                }
            })
            .catch(error => {
                this.handlePaymentError(error, paymentId);
            });
            
        } catch (error) {
            this.error('Error al cancelar pago pendiente:', error);
            
            // Actualizar estado
            if (this.config.paymentStatus) {
                this.config.paymentStatus.textContent = 'Error al cancelar: ' + error.message;
            }
        }
    },
    
    /**
     * Completa un pago pendiente
     * @param {string} paymentId - Identificador del pago
     * @param {string} txid - ID de la transacción blockchain
     */
    completePendingPayment: async function(paymentId, txid) {
        try {
            this.log('Completando pago pendiente:', paymentId, txid);
            
            // Actualizar estado
            if (this.config.paymentStatus) {
                this.config.paymentStatus.textContent = 'Completando pago pendiente...';
            }
            
            // Esta es una simulación - en una app real, llamaríamos al backend
            // Ejemplo:
            /*
            const response = await fetch('/api/payments/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    paymentId: paymentId,
                    txid: txid,
                    accessToken: this.state.accessToken
                })
            });
            
            if (!response.ok) {
                throw new Error('Error al completar el pago');
            }
            
            const data = await response.json();
            */
            
            // Simulación de respuesta exitosa para fines de demostración
            this.log('Pago pendiente completado correctamente');
            
            // Actualizar estado
            if (this.config.paymentStatus) {
                this.config.paymentStatus.textContent = 'Pago pendiente completado';
            }
            
            // Eliminar elementos de UI para pago pendiente
            const pendingActions = document.querySelector('.pending-payment-actions');
            if (pendingActions) {
                pendingActions.remove();
            }
            
            // Ocultar resultado después de un tiempo
            setTimeout(() => {
                if (this.config.paymentResult) {
                    this.config.paymentResult.style.display = 'none';
                }
                
                // Limpiar referencia al pago pendiente
                this.state.pendingPayment = null;
                
                // Recargar la página para reiniciar estado
                window.location.reload();
            }, 3000);
            
        } catch (error) {
            this.error('Error al completar pago pendiente:', error);
            
            // Actualizar estado
            if (this.config.paymentStatus) {
                this.config.paymentStatus.textContent = 'Error al completar: ' + error.message;
            }
        }
    },
    
    /**
     * Verifica si hay pagos pendientes
     */
    checkPendingPayments: async function() {
        try {
            // En una aplicación real, verificaríamos con el backend
            // Podríamos usar Pi.authenticate con un callback para pagos incompletos
            
            this.log('Verificando pagos pendientes...');
            
            // Esta verificación ya la hará PiAuth, así que no hacemos nada más aquí
            
        } catch (error) {
            this.error('Error al verificar pagos pendientes:', error);
        }
    },
    
    /**
     * Funciones de utilidad para logging
     */
    log: function(...args) {
        if (this.config.debug) {
            console.log('[PiPayments]', ...args);
        }
    },
    
    warn: function(...args) {
        console.warn('[PiPayments]', ...args);
    },
    
    error: function(...args) {
        console.error('[PiPayments]', ...args);
    }
};

// Exportar módulo globalmente
window.PiPayments = PiPayments;
