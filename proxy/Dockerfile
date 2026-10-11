FROM node:22-alpine AS webbuild
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY web/ ./
# The `@shared` alias resolves to web/'s parent, so the shared constants are
# copied to the same relative path inside this stage.
COPY src/shared/ /src/shared/
# The legal pages import docs/legal/ through a relative `?raw` import, so the
# Markdown is copied to the same relative path inside this stage.
COPY docs/legal/ /docs/legal/
RUN npm run build

FROM nginx:1.30.5-alpine AS ngbase
COPY proxy/nginx.conf /etc/nginx/nginx.conf
COPY proxy/snippets/api.conf /etc/nginx/snippets/api.conf
RUN rm -f /etc/nginx/conf.d/default.conf
ENV NGINX_ENVSUBST_FILTER=^PUBLIC_ORIGIN$

FROM ngbase AS runtime
COPY --from=webbuild /web/dist /usr/share/nginx/html
COPY proxy/templates/default.conf.template /etc/nginx/templates/default.conf.template
RUN apk add --no-cache openssl && openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 825 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" -keyout /etc/nginx/peerconnect.key -out /etc/nginx/peerconnect.crt

FROM ngbase AS dev
COPY proxy/templates-dev/default.conf.template /etc/nginx/templates/default.conf.template
