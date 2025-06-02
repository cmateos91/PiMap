from flask import Flask, request, jsonify, send_from_directory
import os
from dotenv import load_dotenv
import requests
import logging
from pathlib import Path

# -----------------------------
# Configurar logging
# -----------------------------
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# -----------------------------
# Cargar variables de entorno
# -----------------------------
load_dotenv()

PI_API_KEY = os.getenv('PI_API_KEY')
if not PI_API_KEY:
    logger.warning(
        'PI_API_KEY no encontrada en variables de entorno, '
        'algunas funciones de Pi Network no estarán disponibles.'
    )

# -----------------------------
# Inicializar Flask
# -----------------------------
# `app.py` está en la raíz de "pi-starter", así que
# BASE_DIR = directorio donde vive este archivo ("pi-starter/").
BASE_DIR = Path(__file__).parent

# Ahora FRONTEND_FOLDER = "pi-starter/frontend"
FRONTEND_FOLDER = BASE_DIR / 'frontend'

# Configuramos Flask para que use FRONTEND_FOLDER como carpeta estática
app = Flask(
    __name__,
    static_folder=str(FRONTEND_FOLDER),
    static_url_path=""
)

# -----------------------------
# Middleware: habilitar CORS y quitar X-Frame-Options
# -----------------------------
@app.after_request
def after_request(response):
    # Permitir cualquier origen
    response.headers.add('Access-Control-Allow-Origin', '*')
    # Permitir estos headers en las peticiones
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    # Permitir estos métodos
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    # Eliminar X-Frame-Options para permitir embed en Pi Browser
    response.headers.pop('X-Frame-Options', None)
    return response

# -----------------------------
# Ruta raíz: servir index.html
# -----------------------------
@app.route('/')
def index():
    """
    Sirve el archivo index.html al visitar la raíz (/).
    """
    return send_from_directory(FRONTEND_FOLDER, 'index.html')

# -----------------------------
# Ruta /validation-key: servir validation-key.txt
# -----------------------------
@app.route('/validation-key')
def serve_validation_key_txt():
    """
    Sirve el archivo validation-key.txt (texto plano) que vive en frontend/.
    Responde a GET /validation-key.
    """
    return send_from_directory(
        directory=str(FRONTEND_FOLDER),
        path='validation-key.txt',
        mimetype='text/plain'
    )

# -----------------------------
# Fallback para cualquier otro archivo estático
# -----------------------------
@app.route('/<path:path>')
def serve_frontend(path):
    """
    Intenta servir cualquier recurso estático que exista en frontend/,
    o en subcarpetas js/, css/, img/ o assets/. Si no existe, devuelve 404.
    Por ejemplo:
      - /js/auth.js        → frontend/js/auth.js
      - /css/style.css     → frontend/css/style.css
      - /favicon.ico       → frontend/favicon.ico
    """
    # 1) Intentar directamente en la carpeta frontend/
    requested = FRONTEND_FOLDER / path
    if requested.exists() and requested.is_file():
        return send_from_directory(str(FRONTEND_FOLDER), path)

    # 2) Intentar en subcarpetas comunes: js/, css/, img/, assets/
    for sub in ['js', 'css', 'img', 'assets']:
        candidate = FRONTEND_FOLDER / sub / path
        if candidate.exists() and candidate.is_file():
            return send_from_directory(str(FRONTEND_FOLDER / sub), path)

    # 3) Si no se encontró, devolver 404
    return "Archivo no encontrado", 404

# -----------------------------
# Importar y registrar blueprints de rutas del backend
# -----------------------------
# Asegúrate de que tus módulos "routes/auth.py" y "routes/payments.py"
# existan en la carpeta pi-starter/backend/routes/.
from backend.routes.auth import auth_routes
from backend.routes.payments import payment_routes

app.register_blueprint(auth_routes)
app.register_blueprint(payment_routes)

# -----------------------------
# Punto de entrada cuando se ejecuta directamente
# -----------------------------
if __name__ == "__main__":
    # Render (u otro PaaS) inyecta la variable PORT; si no existe, usar 8000
    port = int(os.getenv("PORT", 8000))
    # FLASK_DEBUG = "true" o "1" habilita modo debug
    debug = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1")
    app.run(host="0.0.0.0", port=port, debug=debug)
