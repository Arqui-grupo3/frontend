# EnergyShark · Frontend

SPA React de la ciudad REE. Las vistas RF01, RF02, RF04 y RF05 aún muestran datos de ejemplo; el inicio de sesión usa Auth0 real.

## Ejecutar localmente

```sh
npm install
cp .env.example .env.local
npm run dev
```

Abrir `http://localhost:5173`. En Auth0, la aplicación SPA **EnergyShark** debe permitir esa URL como callback, logout y web origin. Las variables `VITE_AUTH0_*` son identificadores públicos, no secretos. No incluyas un `client secret` en Vite.

El botón **Iniciar sesión con Auth0** redirige al login del tenant. Tras autenticarse, Auth0 vuelve a la SPA. Para cerrar la sesión, usar **Cerrar sesión** en la cabecera.

## API local

Vite envía `/api/*` a `http://localhost:3000`. El backend tiene `GET /api/health` (público) y `GET /api/me` (requiere access token). El frontend todavía no consulta estas rutas para las vistas de datos.

## Despliegue a producción

El workflow `.github/workflows/deploy-frontend.yml` construye y publica la SPA al hacer push a `main`; también se puede ejecutar manualmente desde **Actions → Deploy frontend a producción → Run workflow**. Antes de activarlo, el repositorio `Arqui-grupo3/frontend` debe tener estas variables de Actions:

| Variable | Uso |
| --- | --- |
| `AWS_REGION` | Región AWS del bucket y CloudFront (por defecto, `us-east-2`). |
| `S3_BUCKET` | Bucket que contiene `app.fasantamaria.me`. |
| `CLOUDFRONT_DISTRIBUTION_ID` | ID de la distribución para `app.fasantamaria.me`. |
| `VITE_AUTH0_DOMAIN` | Dominio del tenant Auth0 usado por la SPA. |
| `VITE_AUTH0_CLIENT_ID` | Client ID de la aplicación SPA en Auth0. |
| `VITE_AUTH0_AUDIENCE` | Audience de la API en Auth0. |

Además, Actions necesita los secretos `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`, con permisos limitados para sincronizar el bucket e invalidar esa distribución. Si el equipo ya los configuró como secretos de organización accesibles al repositorio, se pueden reutilizar; de lo contrario, quien administre AWS/GitHub debe agregarlos en **Settings → Secrets and variables → Actions**. No se deben pegar aquí ni guardar en el código.

El workflow corre lint y build antes de publicar. Sube primero los assets con hash, después `index.html` sin caché y finalmente invalida `/` e `/index.html` en CloudFront. Auth0 también debe permitir `https://app.fasantamaria.me` como callback, logout URL y web origin.

## Trabajo pendiente

La API de historial de E0 (`/history`) no cumple RF01 de E1. Faltan contratos y endpoints de ciclos, conectividad, negociaciones y auditoría. El despliegue automático de la SPA requiere configurar las variables y secretos de Actions indicados arriba.
