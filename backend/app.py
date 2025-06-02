from flask import Flask, request, jsonify, send_from_directory
import os
from dotenv import load_dotenv
import requests
import logging
from pathlib import Path

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

# Obtener configuración desde variables de entorno
PI_API_KEY = os.getenv('PI_API_KEY')
if not PI_API_KEY:
    logger.warning('PI_API_KEY no encontrada en variables de entorno, algunas funciones no estarán disponibles')

# Configuración de la aplicación Flask
app = Flask(__name__, static_folder="frontend", static_url_path="")  # No usar carpeta estática predeterminada

# Carpeta del frontend
FRONTEND_FOLDER = Path(__file__).parent.parent / 'frontend'

# Configurar cabeceras para permitir CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    # Eliminar X-Frame-Options para permitir que se muestre en iframes (necesario para Pi Browser)
    if 'X-Frame-Options' in response.headers:
        del response.headers['X-Frame-Options']
    return response

# Rutas para servir archivos estáticos del frontend
@app.route('/')
def index():
    return send_from_directory(FRONTEND_FOLDER, 'index.html')

# --- Nueva ruta para /validation-key ---
@app.route("/validation-key")
def serve_validation_key_txt():
    """
    Cuando alguien haga GET a /validation-key,
    Flask devolverá el archivo validation-key.txt desde frontend/.
    """
    # send_from_directory(envía el archivo a partir de la carpeta estática)
    return send_from_directory(
        directory=app.static_folder,      # "frontend"
        filename="validation-key.txt",    # el nombre exacto dentro de frontend/
        mimetype="text/plain"             # opcional pero recomendable para .txt
    )

@app.route('/<path:path>')
def serve_frontend(path):
    if Path(FRONTEND_FOLDER / path).exists():
        return send_from_directory(FRONTEND_FOLDER, path)
    else:
        # Si no encuentra el archivo, intenta buscar en subcarpetas comunes
        for folder in ['js', 'css', 'img', 'assets']:
            full_path = Path(FRONTEND_FOLDER / folder / path)
            if full_path.exists():
                return send_from_directory(Path(FRONTEND_FOLDER / folder), path)
    
    # Si el archivo no existe, devolver 404
    return "Archivo no encontrado", 404

# Importar rutas desde módulos separados
from routes.auth import auth_routes
from routes.payments import payment_routes

# Registrar las rutas
app.register_blueprint(auth_routes)
app.register_blueprint(payment_routes)

# Punto de entrada para ejecución directa
if __name__ == "__main__":
    # Render u otros PaaS inyectan PORT automáticamente, así que no lo fuerces a 8000
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() in ["true", "1"]
    app.run(host="0.0.0.0", port=port, debug=debug)
