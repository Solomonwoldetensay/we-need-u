FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/ /docker-entrypoint.d/
COPY index.html app.html core.js feed.js profile.js post.js comments.js auth.js pwa.js sw.js env.js styles.css manifest.json icon.png /usr/share/nginx/html/
