# Sistema de Check-in / Check-out Hotelero

Aplicación web para gestionar el ingreso y salida de asistentes a eventos hoteleros. Incluye dashboard de métricas, listado maestro con CRUD, escáner QR, ficha médica y generación masiva de códigos QR.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Estilos:** Tailwind CSS
- **Animaciones:** Framer Motion
- **Base de datos:** Supabase (PostgreSQL + Realtime)
- **Gráficas:** Recharts
- **Escáner QR:** html5-qrcode
- **Despliegue:** Vercel

## Pantallas

1. **Dashboard:** KPIs en tiempo real y gráfica de ocupación por estaca/distrito/misión.
2. **Asistentes:** Búsqueda global, filtros avanzados, tabla (desktop) / tarjetas (móvil), edición manual, ficha médica y reenvío de QR.
3. **Escáner QR:** Modo check-in/check-out, cámara con guía láser, búsqueda manual por cédula y feedback visual inmediato.

## Requisitos previos

- Node.js 18+ (recomendado 20+)
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Vercel](https://vercel.com) (opcional, para despliegue)

## Instalación local

```bash
npm install
```

## Configuración de Supabase

1. Crea un nuevo proyecto en Supabase.
2. Ve a **Project Settings → API** y copia:
   - `URL`
   - `anon public` key
   - `service_role` key (solo para scripts)
3. Completa el archivo `.env.local` con esos valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publico
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-secreto
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Importante:** nunca expongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend.

4. En el **SQL Editor** de Supabase, ejecuta el contenido de `supabase/schema.sql` para crear la tabla `asistentes`, índices, políticas RLS y realtime.

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Importar asistentes desde Excel

Prepara un archivo Excel con las columnas indicadas en `scripts/importar-excel.ts` y ejecuta:

```bash
npm run import-excel -- ./ruta/al/archivo.xlsx
```

## Generar tokens e imágenes QR

Después de importar los asistentes, genera sus códigos QR:

```bash
npm run generate-qr
```

Esto actualizará `qr_token` en Supabase y guardará las imágenes en `public/qr-codes/`.

## Estructura de carpetas

```
├── src/app/                # Páginas de Next.js
├── src/components/         # Componentes React
├── src/hooks/              # Hooks personalizados
├── src/lib/                # Utilidades, tipos y clientes
├── scripts/                # Scripts de Node.js (QR e importación)
├── supabase/schema.sql     # Esquema de la base de datos
└── .env.example            # Plantilla de variables de entorno
```

## Despliegue en Vercel

1. Sube el código a un repositorio de GitHub.
2. En Vercel, importa el repositorio.
3. Configura las variables de entorno en **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (tu dominio de Vercel)
4. Despliega.

Para usar los scripts con Vercel, ejecútalos localmente con la `SUPABASE_SERVICE_ROLE_KEY` de producción.

## Notas de seguridad

- Las políticas RLS actuales permiten acceso anónimo completo para facilitar la implementación inicial. En producción con datos sensibles, habilita autenticación y ajusta las políticas.
- La ficha médica debe ser visible solo para usuarios autorizados.

## Comandos útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run lint         # Linter
npm run generate-qr  # Generar tokens e imágenes QR
npm run import-excel # Importar asistentes desde Excel
```
