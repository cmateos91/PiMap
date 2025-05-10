from flask import Blueprint, request, jsonify
import os
import requests
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# Crear Blueprint para rutas de pagos
payment_routes = Blueprint('payments', __name__, url_prefix='/api/payments')

# Obtener configuración desde variables de entorno
PI_API_KEY = os.getenv('PI_API_KEY')

# Verificar que la API key está configurada
if not PI_API_KEY:
    logger.error('PI_API_KEY no encontrada en variables de entorno')
    raise ValueError('PI_API_KEY no encontrada en variables de entorno. Por favor, configura la API key en el archivo .env')

# Configurar headers para la petición a la API de Pi Network
server_headers = {
    'Authorization': f'Bearer {PI_API_KEY}',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Pi-SDK-Version': '2.0',
    'User-Agent': 'Pi-Starter/1.0'
}

# Base URL de la API de Pi Network
PI_API_BASE_URL = 'https://api.minepi.com/v2'

# Función auxiliar para hacer peticiones a la API
def make_api_request(url, method='POST', data=None):
    """
    Hace una petición a la API de Pi Network con manejo de errores mejorado
    """
    try:
        # Intentar la petición con Bearer
        headers = {**server_headers, 'Authorization': f'Bearer {PI_API_KEY}'}
        response = requests.request(method, url, json=data, headers=headers, timeout=10)
        
        # Verificar si es un error de autenticación
        if response.status_code == 401:
            logger.warning(f'Primer intento falló con Bearer: {response.text}')
            
            # Intentar con Key
            headers['Authorization'] = f'Key {PI_API_KEY}'
            response = requests.request(method, url, json=data, headers=headers, timeout=10)
            
            if response.status_code == 401:
                logger.error(f'Segundo intento falló con Key: {response.text}')
                raise ValueError('Error de autenticación. Ambos formatos de API key fallaron.')
                
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f'Error en la petición HTTP: {str(e)}')
        raise
        
    except ValueError as e:
        logger.error(f'Error de autenticación: {str(e)}')
        raise

@payment_routes.route('/approve', methods=['POST'])
def approve_payment():
    """
    Aprueba un pago utilizando la API de Pi Network
    """
    try:
        # Obtener datos de la petición
        data = request.get_json()
        if not data or 'paymentId' not in data:
            return jsonify({'error': 'ID de pago no proporcionado'}), 400

        payment_id = data['paymentId']
        logger.debug(f'Aprobando pago: {payment_id}')

        # Hacer la petición a la API
        approve_url = f"{PI_API_BASE_URL}/payments/{payment_id}/approve"
        result = make_api_request(approve_url, method='POST', data={})
        
        return jsonify({
            'status': 'approved',
            'paymentId': payment_id,
            'message': 'Pago aprobado correctamente'
        })
        
    except ValueError as e:
        logger.error(f'Error de autenticación: {str(e)}')
        return jsonify({
            'error': str(e),
            'status': 'failed',
            'paymentId': payment_id
        }), 401
        
    except Exception as e:
        logger.error(f'Error al aprobar pago: {str(e)}')
        return jsonify({
            'error': f'Error interno del servidor: {str(e)}',
            'status': 'failed',
            'paymentId': payment_id
        }), 500

        # Verificar respuesta
        if response.status_code != 200:
            logger.error(f'Error al aprobar pago: {response.text}')
            return jsonify({
                'error': f'Error al aprobar pago: {response.text}',
                'status': 'failed',
                'paymentId': payment_id
            }), response.status_code

        # Procesar respuesta
        approval_result = response.json()
        logger.debug(f'Pago aprobado correctamente: {approval_result}')

        return jsonify({
            'status': 'approved',
            'paymentId': payment_id,
            'message': 'Pago aprobado correctamente'
        })

    except Exception as e:
        logger.exception('Error al aprobar pago')
        return jsonify({
            'error': f'Error interno del servidor: {str(e)}',
            'status': 'failed',
            'paymentId': payment_id if 'payment_id' in locals() else None
        }), 500

@payment_routes.route('/complete', methods=['POST'])
def complete_payment():
    """
    Completa un pago utilizando la API de Pi Network
    """
    try:
        # Obtener datos de la petición
        data = request.get_json()
        if not data or 'paymentId' not in data:
            return jsonify({'error': 'ID de pago no proporcionado'}), 400

        payment_id = data['paymentId']
        txid = data.get('txid')
        debug = data.get('debug')
        
        logger.debug(f'Completando pago: {payment_id}, txid: {txid}, debug: {debug}')

        # Si es una cancelación o un error simulado para propósitos de depuración
        if debug == 'cancel':
            logger.info(f'Pago {payment_id} fue cancelado (modo depuración)')
            return jsonify({
                'status': 'cancelled',
                'paymentId': payment_id,
                'message': 'Pago cancelado correctamente'
            })
        elif debug == 'error':
            logger.info(f'Pago {payment_id} tuvo un error (modo depuración)')
            return jsonify({
                'status': 'error',
                'paymentId': payment_id,
                'message': 'Error simulado en modo depuración'
            })

        # Para completar un pago real, necesitamos el txid
        if not txid:
            logger.warning(f'No se proporcionó txid para el pago {payment_id}')
            return jsonify({
                'status': 'incomplete',
                'paymentId': payment_id,
                'message': 'ID de transacción no proporcionado'
            }), 400

        # Verificar que tenemos la API Key
        if not PI_API_KEY:
            logger.error('No se encontró la API Key de Pi Network en las variables de entorno')
            return jsonify({
                'error': 'Configuración de servidor incompleta (API Key faltante)',
                'status': 'failed',
                'paymentId': payment_id
            }), 500

        # Configurar headers para la petición a la API de Pi Network
        server_headers = {
            'Authorization': f'Key {PI_API_KEY}',
            'Content-Type': 'application/json'
        }

        # Datos para la petición
        complete_data = {
            'txid': txid
        }

        # Hacer la petición a la API de Pi Network
        complete_url = f"{PI_API_BASE_URL}/payments/{payment_id}/complete"
        
        try:
            response = requests.post(complete_url, json=complete_data, headers=server_headers, timeout=10)
            
            # Verificar si es un error de autenticación específico
            if response.status_code == 401:
                logger.error(f'Error de autenticación: {response.text}')
                raise ValueError('Error de autenticación. Por favor, verifica que la API key es correcta y tiene los permisos necesarios.')
                
            response.raise_for_status()  # Lanzar excepción para códigos de error HTTP
            
        except requests.exceptions.RequestException as e:
            logger.error(f'Error en la petición HTTP: {str(e)}')
            raise

        # Verificar respuesta
        if response.status_code != 200:
            logger.error(f'Error al completar pago: {response.text}')
            return jsonify({
                'error': f'Error al completar pago: {response.text}',
                'status': 'failed',
                'paymentId': payment_id
            }), response.status_code

        # Procesar respuesta
        completion_result = response.json()
        logger.debug(f'Pago completado correctamente: {completion_result}')
        
        # Aquí podrías añadir lógica adicional como actualizar una base de datos,
        # enviar notificaciones, etc.

        return jsonify({
            'status': 'completed',
            'paymentId': payment_id,
            'txid': txid,
            'message': 'Pago completado correctamente'
        })

    except Exception as e:
        logger.exception('Error al completar pago')
        return jsonify({
            'error': f'Error interno del servidor: {str(e)}',
            'status': 'failed',
            'paymentId': payment_id if 'payment_id' in locals() else None
        }), 500

@payment_routes.route('/cancel', methods=['POST'])
def cancel_payment():
    """
    Cancela un pago utilizando la API de Pi Network
    """
    try:
        # Obtener datos de la petición
        data = request.get_json()
        if not data or 'paymentId' not in data:
            return jsonify({'error': 'ID de pago no proporcionado'}), 400

        payment_id = data['paymentId']
        logger.debug(f'Cancelando pago: {payment_id}')

        # Verificar que tenemos la API Key
        if not PI_API_KEY:
            logger.error('No se encontró la API Key de Pi Network en las variables de entorno')
            return jsonify({'error': 'Configuración de servidor incompleta (API Key faltante)'}), 500

        # Configurar headers para la petición a la API de Pi Network
        server_headers = {
            'Authorization': f'Key {PI_API_KEY}'
        }

        # Hacer la petición a la API de Pi Network
        cancel_url = f"https://api.minepi.com/v2/payments/{payment_id}/cancel"
        response = requests.post(cancel_url, json={}, headers=server_headers)

        # Verificar respuesta
        if response.status_code != 200:
            logger.error(f'Error al cancelar pago: {response.text}')
            return jsonify({'error': f'Error al cancelar pago: {response.text}'}), response.status_code

        # Procesar respuesta
        cancellation_result = response.json()
        logger.debug(f'Pago cancelado correctamente: {cancellation_result}')

        return jsonify(cancellation_result)

    except Exception as e:
        logger.exception('Error al cancelar pago')
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@payment_routes.route('/incomplete', methods=['POST'])
def get_incomplete_payments():
    """
    Obtiene la lista de pagos incompletos para un usuario
    """
    try:
        # Obtener el token de acceso desde el frontend
        data = request.get_json()
        if not data or 'accessToken' not in data:
            return jsonify({'error': 'Token de acceso no proporcionado'}), 400

        access_token = data['accessToken']
        logger.debug(f'Buscando pagos incompletos con token: {access_token[:10]}...')

        # Configurar headers para la petición a la API de Pi Network
        user_headers = {
            'Authorization': f'Bearer {access_token}'
        }

        # Hacer la petición a la API de Pi Network
        # Nota: Este endpoint exacto puede no existir, esto es un ejemplo
        payments_url = "https://api.minepi.com/v2/payments/incomplete"
        
        try:
            response = requests.get(payments_url, headers=user_headers)
            
            # Si el endpoint existe y responde correctamente
            if response.status_code == 200:
                payments_data = response.json()
                logger.debug(f'Pagos incompletos encontrados: {payments_data}')
                return jsonify({'pendingPayments': payments_data})
            else:
                # Si la API no tiene el endpoint, devolvemos una lista vacía
                logger.warning(f'No se pudo obtener pagos pendientes de la API: {response.text}')
                return jsonify({'pendingPayments': [], 'warning': 'Endpoint no disponible'})
                
        except Exception as api_error:
            logger.error(f'Error al verificar pagos pendientes con la API: {str(api_error)}')
            return jsonify({'pendingPayments': [], 'error': str(api_error)})

    except Exception as e:
        logger.exception('Error al buscar pagos incompletos')
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500
