from flask import Blueprint, request, jsonify, current_app
import json, os
from datetime import datetime
from backend.routes.payments import verify_pi_transaction, send_pi_to_user

# Blueprint para las rutas de juego
game_bp = Blueprint('game', __name__, url_prefix='/api/game')

@game_bp.route('/dribble/init', methods=['GET'])
def dribble_init():
    """
    Comprueba que el endpoint esté activo.
    """
    return jsonify({'message': 'Pi Dribble Challenge está listo'}), 200

@game_bp.route('/dribble/play', methods=['POST'])
def dribble_play():
    """
    Recibe JSON con { txid, score, user_address }.
    Verifica la transacción de 0.01 Pi, guarda el mejor puntaje
    en leaderboard.json y responde estado.
    """
    data = request.get_json()
    txid = data.get('txid')
    score = data.get('score')
    user_addr = data.get('user_address')

    # 1. Verificar transacción de 0.01 Pi
    valid = verify_pi_transaction(txid, required_amount=0.01)
    if not valid:
        return jsonify({'error': 'Transacción inválida o monto incorrecto.'}), 400

    # 2. Leer o crear leaderboard.json
    lb_path = os.path.join(current_app.root_path, 'backend', 'leaderboard.json')
    if not os.path.exists(lb_path):
        with open(lb_path, 'w') as f:
            json.dump([], f)

    with open(lb_path, 'r') as f:
        leaderboard = json.load(f)

    # 3. Actualizar mejor puntaje del usuario
    updated = False
    for entry in leaderboard:
        if entry['address'] == user_addr:
            if score > entry['score']:
                entry['score'] = score
                entry['timestamp'] = datetime.utcnow().isoformat()
            updated = True
            break
    if not updated:
        leaderboard.append({
            'address': user_addr,
            'score': score,
            'timestamp': datetime.utcnow().isoformat()
        })

    with open(lb_path, 'w') as f:
        json.dump(leaderboard, f, indent=2)

    return jsonify({'status': 'ok', 'message': 'Puntaje registrado.'}), 200