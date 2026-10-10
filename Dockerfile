FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html style.css app.js manifest.json sw.js /srv/
