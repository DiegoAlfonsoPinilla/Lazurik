# Guía de Git para Lazurik (principiantes)

## Ideas clave
- **Commit** = una foto del proyecto con un mensaje. **Branch** = una línea de trabajo paralela. **Tag** = una etiqueta de versión (v0.1.0).
- La versión NO va en el nombre del repositorio: va en los **tags**. Renombra el repo a `Lazurik` (GitHub → Settings → Repository name; los enlaces viejos redirigen).
- `main` siempre debe funcionar. Nunca trabajes directo en `main`.

## Preparación (una sola vez)
```bash
git config --global user.name  "Tu Nombre"
git config --global user.email "tu@correo.com"
git clone https://github.com/TU_USUARIO/Lazurik.git
cd Lazurik
```
Copia aquí los archivos nuevos de esta entrega (Dockerfile, sw.js actualizado, etc.).

## Primer commit con lo nuevo
```bash
git checkout -b chore/docker-y-versionado
git add .
git commit -m "chore: añade Docker, CHANGELOG y SW red-primero"
git push -u origin chore/docker-y-versionado
```
En GitHub aparecerá "Compare & pull request" → crea el Pull Request → revisa los cambios → **Merge**.

## Flujo para cada función nueva
```bash
git checkout main && git pull            # 1. actualiza
git checkout -b feat/exportar-gif        # 2. rama nueva (un tema por rama)
# ...editas, pruebas en el navegador...
git add .
git commit -m "feat: exportar animación a GIF"
git push -u origin feat/exportar-gif     # 3. sube y abre Pull Request en GitHub
```
Tras el merge: `git checkout main && git pull`.

## Nombres de rama y mensajes
- Ramas: `feat/...` función nueva, `fix/...` arreglo, `chore/...` mantenimiento, `docs/...` documentación.
- Mensajes: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...` (en presente, una idea por commit).

## Publicar una versión
1. Mueve lo de "Sin publicar" del CHANGELOG a una versión nueva y cambia `VERSION` en `sw.js`.
2. Commit y merge a `main`, luego:
```bash
git checkout main && git pull
git tag -a v0.2.0 -m "Lazurik 0.2.0"
git push origin v0.2.0
```
3. GitHub → Releases → "Draft a new release" → elige el tag.

Numeración: `MAYOR.MENOR.PARCHE` → arreglo = 0.1.**2**, función nueva = 0.**2**.0, cambio que rompe proyectos guardados = **1**.0.0.

## Deshacer errores
- Cambios sin commit en un archivo: `git restore archivo`
- Ver historial: `git log --oneline`
- Volver a una versión: `git checkout v0.1.0` (y `git checkout main` para regresar)

## Nunca subas
Contraseñas, archivos `.laz` con proyectos personales ni archivos `.env` (ya están en `.gitignore`).
