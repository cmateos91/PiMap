# Pi-Starter: Base para Aplicaciones Pi Network

Un proyecto base para desarrollar aplicaciones en el ecosistema Pi Network, que incluye sistemas preconfigurados de autenticación y pagos.

## Características

- **Sistema de Autenticación**: Integración completa con Pi Network OAuth
- **Sistema de Pagos**: Implementación del flujo completo de pagos de Pi Network
  - Manejo inteligente de autenticación con múltiples formatos de API key
  - Sistema robusto de manejo de errores y logging
  - Gestión de pagos pendientes y cancelaciones
- **Arquitectura Modular**: Frontend y Backend claramente separados
- **Gestión de Sesiones**: Sistema de manejo de sesiones para usuarios
- **Manejo de Pagos Pendientes**: Gestión de pagos incompletos y reintentos

## Estructura del Proyecto

```
pi-starter/
├── frontend/            # Interfaz de usuario
│   ├── js/
│   │   ├── auth.js      # Módulo de autenticación
│   │   └── payments.js  # Módulo de pagos
│   ├── css/
│   │   └── style.css    # Estilos de la aplicación
│   ├── index.html       # Página de inicio/login
│   └── dashboard.html   # Panel principal post-login
└── backend/             # Servidor API
    ├── routes/
    │   ├── auth.py      # Rutas de autenticación
    │   └── payments.py  # Rutas de pagos
    ├── app.py           # Aplicación principal
    ├── .env             # Variables de entorno
    └── requirements.txt # Dependencias
```

## Requisitos Previos

- Python 3.8 o superior
- Node.js (opcional, para desarrollo frontend)
- Entorno de desarrollo web (recomendado: VS Code o similar)
- Cuenta en Pi Network con API key configurada
- Acceso a la Developer Portal de Pi Network para obtener la API key

- Python 3.7+
- Cuenta en [Pi Developer Portal](https://developers.minepi.com/)
- API Key de Pi Network

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/pi-starter.git
```

2. Crear y activar un entorno virtual:
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
- Copiar `.env.example` a `.env`
- Configurar la API key de Pi Network en el archivo `.env`
- Asegurarse de que la API key tenga los permisos necesarios en la Developer Portal de Pi Network

5. Iniciar el servidor:
```bash
python app.py
```

6. Abrir el navegador y navegar a `http://localhost:8000`

## Configuración de la API Key

1. Accede a la Developer Portal de Pi Network
2. Crea una nueva API key con los siguientes permisos:
   - Permiso para aprobar pagos
   - Permiso para completar pagos
   - Permiso para consultar estado de pagos
3. Copia la API key generada
4. Configura la API key en el archivo `.env`:
```
PI_API_KEY=tu_api_key_aqui
```

## Configuración

1. **Crea tu aplicación en Pi Developer Portal**:
   - Regístrate en el Portal de Desarrolladores
   - Crea una nueva aplicación
   - Configura la URL de redirección a tu dominio o localhost durante desarrollo
   - Copia tu API Key

2. **Configura las variables de entorno**:
   - Edita el archivo `.env` en la carpeta `backend`
   - Agrega tu API Key de Pi Network

3. **Instala las dependencias**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

## Ejecución

1. **Inicia el servidor backend**:
   ```bash
   cd backend
   python app.py
   ```

2. **Accede a la aplicación**:
   - Abre tu navegador y visita: `http://localhost:8000`
   - Para pruebas en Pi Browser, usa el entorno Sandbox

## Flujo de Autenticación

1. Usuario hace clic en "Conectar con Pi Network"
2. El SDK de Pi maneja la autenticación OAuth
3. El backend verifica credenciales con la API de Pi
4. Se crea una sesión para el usuario

## Flujo de Pagos

1. Usuario inicia un pago (ej. donación)
2. El SDK de Pi crea la solicitud de pago
3. El backend aprueba el pago
4. Usuario confirma en su wallet
5. El backend completa el pago

## Personalización

Este proyecto está diseñado como punto de partida. Recomendaciones para personalizarlo:

1. **Agrega tu lógica de negocio** en nuevos módulos del backend
2. **Personaliza la interfaz** según las necesidades de tu aplicación
3. **Implementa una base de datos** para persistencia de datos
4. **Añade sistemas de seguridad adicionales** para producción

## Mejores Prácticas

- Nunca pongas tu API Key de Pi Network en el código del frontend
- Implementa validación adecuada en todas las rutas del backend
- Utiliza HTTPS en producción
- Siempre verifica la autenticidad de las transacciones en el backend

## Recursos Adicionales

- [Documentación oficial de Pi Network](https://developers.minepi.com/doc/getting-started)
- [Guía completa de desarrollo Pi](https://pi-apps.github.io/community-developer-guide/)
