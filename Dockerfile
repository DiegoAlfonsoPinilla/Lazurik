FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html manifest.json sw.js /srv/
COPY src /srv/src
COPY assets /srv/assets
