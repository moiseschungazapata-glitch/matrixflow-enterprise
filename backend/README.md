# MatrixFlow Enterprise - Backend

Backend de MatrixFlow Enterprise construido con FastAPI, Pydantic y SQLAlchemy.

## Requisitos

- Python 3.12 o superior.
- PowerShell, CMD o una terminal compatible.

## Instalación en Windows

Desde la carpeta `backend`:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Si el comando `py` no está disponible, utiliza la ruta de tu instalación de Python 3.12 para crear el entorno virtual.

## Ejecución

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Servicios disponibles:

- API: `http://127.0.0.1:8000`
- Documentación Swagger: `http://127.0.0.1:8000/docs`
- Estado de salud: `http://127.0.0.1:8000/health`

En desarrollo, el arranque crea las tablas faltantes en `backend/matrixflow.db`.
No crea usuarios ni datos empresariales. En producción, utiliza migraciones y configura
`ENVIRONMENT=production`.

La opción `--reload` es sólo para desarrollo. En producción debe ejecutarse sin recarga automática.

## Pruebas

```powershell
python -m pytest -q
```

## Variables de entorno

Copia `.env.example` como `.env` y ajusta los valores. El archivo `.env` real está excluido de Git. Nunca se debe publicar `JWT_SECRET_KEY` de producción.

## Base de datos y migraciones

El desarrollo local conserva SQLite para que Swagger funcione sin instalar un
servidor adicional. Alembic mantiene las tablas del modelo tanto en SQLite como
en PostgreSQL.

Para preparar una base nueva desde la carpeta `backend`:

```powershell
alembic upgrade head
alembic current
```

La aplicación no inserta cuentas ni registros ficticios. Para crear el primer
administrador de una base nueva, define `MATRIXFLOW_ADMIN_NAME`,
`MATRIXFLOW_ADMIN_EMAIL` y `MATRIXFLOW_ADMIN_PASSWORD` en el entorno del
proceso y ejecuta `python -m app.bootstrap_admin`. Este comando solo funciona
si `users` está vacía; después, gestiona usuarios desde el dashboard.

Para PostgreSQL o Supabase configura la conexión en `.env` y desactiva la
creación automática de tablas:

```dotenv
ENVIRONMENT="production"
DATABASE_URL="postgresql+psycopg://usuario:clave@host:5432/matrixflow?sslmode=require"
AUTO_CREATE_TABLES=false
```

Después ejecuta `alembic upgrade head` antes de iniciar Uvicorn. Antes de aplicar
migraciones a una instancia de Supabase que ya tiene tablas y datos, compara su
esquema con `alembic history` y toma un respaldo. No ejecutes `stamp head` sin
comprobar que la estructura coincide. Las URLs que
comienzan con `postgres://` o `postgresql://` también se normalizan al
controlador `psycopg` instalado por el proyecto.

Puedes revisar la estructura configurada sin escribir en la base:

```powershell
python -m app.schema_audit
```

El informe separa tablas y columnas ausentes de las adicionales. Una tabla
adicional no se debe borrar por aparecer en este informe: primero hay que
revisar sus datos, referencias y uso fuera de MatrixFlow.

Si `matrixflow.db` ya fue creado por una versión anterior mediante
`create_all`, sus tablas corresponden al mismo modelo. No vuelvas a crearlas:
respalda el archivo y registra la revisión con `alembic stamp head`. Para una
instalación evaluable desde cero, se recomienda una base vacía y
`alembic upgrade head`.

Comandos útiles:

```powershell
alembic history
alembic current
alembic check
alembic downgrade base  # sólo para una base de prueba desechable
```

## Autenticación

El inicio de sesión valida usuarios almacenados en la base de datos y devuelve un JWT:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "correo-del-administrador@tu-dominio.com",
  "password": "contraseña-segura"
}
```

La pantalla de identificación por DNI consulta el perfil activo sin devolver el
correo, el identificador interno ni el DNI completo:

```http
POST /api/v1/auth/identify
Content-Type: application/json

{
  "dni": "12345678"
}
```

```json
{
  "name": "Usuario de ejemplo",
  "maskedDni": "••••5678",
  "nationality": "Peruana",
  "role": "Administrador"
}
```

Este endpoint sólo identifica la cuenta; no emite un JWT ni reemplaza una
verificación biométrica real. Antes de desplegar esta versión sobre una base
existente, ejecuta `alembic upgrade head` para agregar `dni` y `nationality` a
`users`. Ambos campos se pueden completar desde el módulo **Usuarios** o mediante
`PATCH /api/v1/users/{user_id}` en Swagger.

Si no se dispone de Alembic en el entorno de despliegue, la misma actualización
puede aplicarse una sola vez desde **Supabase > SQL Editor**:

```sql
alter table public.users
  add column if not exists dni varchar(8),
  add column if not exists nationality varchar(80);

create unique index if not exists ix_users_dni
  on public.users (dni);
```

Aplica esta actualización antes de desplegar el backend que consulta los nuevos
campos. Los datos personales de cada cuenta deben registrarse en Supabase o desde
la pantalla **Usuarios**; no deben escribirse en el código fuente.

Los recursos protegidos reciben el token en la cabecera `Authorization`:

```http
Authorization: Bearer <accessToken>
```

`GET /api/v1/auth/me` devuelve el usuario de la sesión. En cada solicitud se comprueba que el usuario continúe registrado y activo. La función `require_roles` permite limitar endpoints a uno o más roles.

### Verificación facial con AWS

El acceso por DNI puede completar una verificación real con Amazon Rekognition Face
Liveness y una colección facial exclusiva de MatrixFlow. La integración permanece
desactivada por defecto para no consumir AWS accidentalmente. Incluye registro facial
desde **Usuarios**, sesiones de un solo uso, límites de intentos, prueba de vida,
coincidencia de identidad y emisión del JWT únicamente después de validar ambos pasos.

La configuración completa de IAM, Cognito, Rekognition, Supabase y Vercel está en
[`AWS_FACE_LIVENESS_SETUP.md`](AWS_FACE_LIVENESS_SETUP.md).

### Probar vectores desde Swagger

1. Ejecuta `POST /api/v1/auth/login` con una cuenta de analista real.
2. Copia `accessToken`, pulsa **Authorize** y pega únicamente el token.
3. Crea dos operandos mediante `POST /api/v1/vectors`.
4. Ejecuta el cálculo mediante `POST /api/v1/operations`, usando los `id`
   devueltos por los vectores.
5. Comprueba el resultado guardado mediante `GET /api/v1/operations` o
   `GET /api/v1/operations/{operation_id}`.

`POST /api/v1/vectors` guarda los valores de entrada del vector. El campo
`result` pertenece a la operación matemática y se persiste en el historial de
`/operations`.

## API REST

Los módulos empresariales están disponibles bajo `/api/v1`:

- `/users`, `/companies`, `/branches` y `/products`: consulta y CRUD administrativo.
- `/sales`: registro y consulta de ventas.
- `/targets`: consulta y CRUD administrativo de metas por sucursal.
- `/inventory` y `/inventory/movements`: existencias, ajustes y trazabilidad.
- `/vectors` y `/matrices`: CRUD de estructuras matemáticas.
- `/operations`: ejecución NumPy e historial de operaciones.
- `/reports`: indicadores agregados.

Las respuestas usan campos `camelCase`, los listados aceptan paginación y los errores esperados devuelven códigos HTTP `400`, `404`, `409`, `401` o `403`.

## Motor matemático NumPy

`POST /api/v1/operations` obtiene los vectores o matrices almacenados, valida sus dimensiones, ejecuta el cálculo con NumPy y guarda el resultado en el historial. Están disponibles:

- Vectores: suma, resta, multiplicación por escalar, producto escalar y combinación lineal.
- Matrices: suma, resta, multiplicación, transposición y multiplicación por escalar.
- Validación de operandos vacíos, valores no finitos y dimensiones incompatibles.

Los algoritmos son funciones puras e independientes de FastAPI, Pydantic y SQLAlchemy. Sus resultados se convierten a tipos nativos de Python antes de almacenarse como JSON.

## Arquitectura

```text
app/
├── api/
│   ├── dependencies.py   # Dependencias compartidas de FastAPI
│   ├── router.py         # Router central y prefijo /api/v1
│   └── routes/           # Entrada y salida HTTP
├── algorithms/           # Contratos y algoritmos matemáticos puros
├── core/                 # Configuración, base de datos y errores comunes
├── models/               # Entidades SQLAlchemy
├── repositories/         # Consultas y persistencia
├── schemas/              # Contratos Pydantic
└── services/             # Casos de uso y control de transacciones
```

Reglas de dependencia:

- Los routers sólo traducen HTTP y llaman servicios.
- Los servicios aplican reglas de negocio y controlan `commit` o `rollback`.
- Los repositorios contienen las consultas SQLAlchemy y nunca confirman transacciones.
- Los algoritmos no dependen de FastAPI, SQLAlchemy ni Pydantic.
- Los modelos no importan routers, servicios ni repositorios.

## Contratos Pydantic

- El código Python usa nombres `snake_case` y la API expone alias `camelCase` compatibles con React.
- Los modelos de creación, actualización y respuesta están separados.
- Los modelos de respuesta admiten entidades SQLAlchemy mediante `from_attributes`.
- Los cuerpos desconocidos se rechazan para evitar datos ignorados accidentalmente.
- Los modelos de actualización exigen al menos un campo.
- RUC, correo, teléfono, precios, cantidades, stock, vectores, matrices y operaciones incluyen validaciones específicas.
