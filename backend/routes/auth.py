from flask import Blueprint, request, jsonify
import os
import requests
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# Crear Blueprint para rutas de autenticación
auth_routes = Blueprint('auth', __name__, url_prefix='/api')

# Obtener configuración desde variables de entorno
PI_API_KEY = os.getenv('PI_API_KEY')

@auth_routes.route('/me', methods=['POST'])
def get_user_info():
    """
    Obtiene información del usuario utilizando su token de acceso
    """
    try:
        # Obtener el token de acceso desde el frontend
        data = request.get_json()
        if not data or 'accessToken' not in data:
            return jsonify({'error': 'Token de acceso no proporcionado'}), 400

        access_token = data['accessToken']
        logger.debug(f'Obteniendo información de usuario con token: {access_token[:10]}...')

        # Configurar headers para la petición a la API de Pi Network
        user_headers = {
            'Authorization': f'Bearer {access_token}'
        }

        # Hacer la petición a la API de Pi Network
        user_url = "https://api.minepi.com/v2/me"
        response = requests.get(user_url, headers=user_headers)

        # Verificar respuesta
        if response.status_code != 200:
            logger.error(f'Error al obtener información del usuario: {response.text}')
            return jsonify({'error': f'Error al obtener información del usuario: {response.text}'}), response.status_code

        # Procesar respuesta
        user_data = response.json()
        logger.debug(f'Información de usuario obtenida correctamente: {user_data}')

        return jsonify(user_data)

    except Exception as e:
        logger.exception('Error en la petición de información de usuario')
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@auth_routes.route('/wallet', methods=['POST'])
def get_wallet_info():
    """
    Obtiene información de la wallet del usuario utilizando su token de acceso
    """
    try:
        # Obtener el token de acceso desde el frontend
        data = request.get_json()
        if not data or 'accessToken' not in data:
            return jsonify({'error': 'Token de acceso no proporcionado'}), 400

        access_token = data['accessToken']
        logger.debug(f'Obteniendo información de wallet con token: {access_token[:10]}...')

        # Configurar headers para la petición a la API de Pi Network
        user_headers = {
            'Authorization': f'Bearer {access_token}'
        }

        # Hacer la petición a la API de Pi Network
        wallet_url = "https://api.minepi.com/v2/wallet"
        response = requests.get(wallet_url, headers=user_headers)

        # Verificar respuesta
        if response.status_code != 200:
            logger.error(f'Error al obtener información de la wallet: {response.text}')
            return jsonify({'error': f'Error al obtener información de la wallet: {response.text}'}), response.status_code

        # Procesar respuesta
        wallet_data = response.json()
        logger.debug(f'Información de wallet obtenida correctamente: {wallet_data}')
        
        # Si no hay balance, establecer un valor predeterminado
        if 'balance' not in wallet_data:
            wallet_data['balance'] = '0'
            logger.warning('Balance no encontrado en datos de wallet, usando valor predeterminado')

        return jsonify(wallet_data)

    except Exception as e:
        logger.exception('Error en la petición de información de wallet')
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@auth_routes.route('/verify', methods=['POST'])
def verify_auth():
    """
    Verifica que el token de acceso sea válido
    """
    try:
        # Obtener el token de acceso desde el frontend
        data = request.get_json()
        if not data or 'accessToken' not in data:
            return jsonify({'error': 'Token de acceso no proporcionado'}), 400

        access_token = data['accessToken']
        logger.debug(f'Verificando token de acceso: {access_token[:10]}...')

        # Configurar headers para la petición a la API de Pi Network
        user_headers = {
            'Authorization': f'Bearer {access_token}'
        }

        # Hacer una petición simple a la API para verificar el token
        user_url = "https://api.minepi.com/v2/me"
        response = requests.get(user_url, headers=user_headers)

        # Verificar respuesta
        if response.status_code != 200:
            logger.error(f'Token de acceso inválido: {response.text}')
            return jsonify({'valid': False, 'error': 'Token de acceso inválido'}), 200

        # El token es válido
        user_data = response.json()
        logger.debug(f'Token de acceso válido para usuario: {user_data.get("username")}')

        return jsonify({'valid': True, 'user': user_data})

    except Exception as e:
        logger.exception('Error al verificar token de acceso')
        return jsonify({'valid': False, 'error': f'Error interno del servidor: {str(e)}'}), 200  # Devolvemos 200 para que el frontend pueda manejar esto
