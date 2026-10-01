# MatrixFlow Enterprise - Frontend

Frontend React y TypeScript conectado a la API FastAPI. Las pantallas empresariales leen y guardan datos mediante la API; solo las preferencias visuales permanecen en `localStorage`.

## Configuración

Define `VITE_API_URL` con la URL pública del backend (incluido `/api/v1` si así está configurado). El navegador nunca debe recibir la cadena de conexión, contraseña o llave de servicio de Supabase.

Ejemplo local en `.env.local`:

```dotenv
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

```bash
npm ci
npm run dev
npm run lint
npm run build
```

En el backend, `DATABASE_URL` debe apuntar a PostgreSQL de Supabase y las migraciones deben estar aplicadas antes de abrir la aplicación. No se crean registros de demostración. El primer administrador se crea con `python -m app.bootstrap_admin` y valores reales proporcionados mediante variables de entorno.

## Módulos

El dashboard y reportes muestran agregados de la API. Empresas, sucursales, productos, ventas, inventario, vectores, matrices, operaciones, historial y metas utilizan los endpoints correspondientes. La gestión de usuarios ya usa la API. Los cálculos se ejecutan en el backend con NumPy y se guardan en `operations`.
