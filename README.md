# Lazurik
Plataforma web de dibujo y animación 2D por capas que corre 100 % en el navegador. Basada en el SRS v2.0.

## Probar sin instalar nada
Abre `index.html` en Chrome, Edge o Firefox.

## Probar con Docker (local)
```bash
docker compose up --build -d
# abre http://localhost
```

## Publicar con HTTPS (producción)
Requiere un servidor con Docker, un dominio apuntando a su IP y los puertos 80 y 443 abiertos.
```bash
DOMAIN=lazurik.tudominio.com docker compose up --build -d
```

## Atajos
`B` pincel · `E` borrador · `Espacio` reproducir · `←/→` cuadros · `Ctrl+Z` deshacer

## Versionado
Ver `CHANGELOG.md` y `GIT_GUIDE.md`.
