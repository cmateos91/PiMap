import json, os
from decimal import Decimal
from backend.routes.payments import send_pi_to_user

"""
Ejecutar semanalmente (p.ej. cron job) para leer leaderboard.json,
calcular pool de premios y enviar Pi a los ganadores.
"""

def distribute_prizes():
    base_path = os.path.dirname(os.path.realpath(__file__))
    lb_path = os.path.join(base_path, 'routes', 'leaderboard.json')

    # 1. Cargar leaderboard
    if not os.path.exists(lb_path):
        print("No hay leaderboard para procesar.")
        return

    with open(lb_path, 'r') as f:
        leaderboard = json.load(f)

    # Si no hay participantes, terminar
    if not leaderboard:
        print("Sin participantes esta semana.")
        return

    # 2. Calcular pool basado en número de partidas (simplificación)
    #    pool = 0.009 Pi * número de entradas
    num_entries = len(leaderboard)
    pool = Decimal('0.009') * num_entries

    # 3. Ordenar por puntaje descendente
    sorted_lb = sorted(leaderboard, key=lambda x: x['score'], reverse=True)

    # 4. Calcular top 10% (al menos 1 ganador)
    top_count = max(1, int(len(sorted_lb) * 0.10))
    winners = sorted_lb[:top_count]

    # 5. Definir estructura de premios
    prizes = []
    if top_count >= 1:
        prizes.append(pool * Decimal('0.40'))  # 1.er
    if top_count >= 2:
        prizes.append(pool * Decimal('0.20'))  # 2.º
    if top_count >= 3:
        prizes.append(pool * Decimal('0.10'))  # 3.º

    remaining_pool = pool - sum(prizes)
    if top_count > 3:
        share = remaining_pool / (top_count - 3)
        for _ in range(top_count - 3):
            prizes.append(share)
    if top_count < 3:
        prizes = [pool / top_count] * top_count

    # 6. Enviar Pi a cada ganador
    for idx, winner in enumerate(winners):
        address = winner['address']
        amount = float(prizes[idx])
        success = send_pi_to_user(address, amount)
        print(f"Enviando {amount} Pi a {address}: {'Éxito' if success else 'Fallo'}")

    # 7. Reiniciar leaderboard.json
    with open(lb_path, 'w') as f:
        json.dump([], f, indent=2)

    print("Distribución semanal completada.")

if __name__ == '__main__':
    distribute_prizes()