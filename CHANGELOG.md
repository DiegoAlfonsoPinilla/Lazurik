# Changelog
Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) · Versionado: [SemVer](https://semver.org/lang/es/)

## [Sin publicar]

## [0.2.0] - 2026-10-10
### Añadido
- Nueva interfaz: pantalla de inicio, menús, temas claro/oscuro/personalizado, paneles de capas y colores, asistente, viñetas de cómic y exportación a GIF.
- Guardar/abrir proyectos .laz cifrados (AES-256-GCM) y recuperar el último guardado (IndexedDB).
- Virtualización de cuadros lejanos a WebP con indicador de memoria en la barra superior.
### Cambiado
- Iconos de color reemplazados por iconos de trazo simple.
- Estructura de carpetas: `src/css`, `src/js`, `assets`.

## [0.1.1] - 2026-10-08
### Añadido
- Dockerfile, docker-compose y Caddyfile para desplegar con HTTPS automático.
### Cambiado
- Service Worker: ahora "red primero" para que los usuarios reciban siempre la última versión.

## [0.1.0] - 2026-10-08
### Añadido
- Dibujo multicapa (pincel, borrador, opacidad, modos de fusión).
- Línea de tiempo, reproducción y cebollado.
- Virtualización de cuadros a WebP (RF-002 / RN-01).
- Guardado cifrado AES-256-GCM en IndexedDB y exportación .laz.
- Exportar cuadro a PNG. Manifest PWA.
