server {
    listen 80;
    listen [::]:80;
    server_name admin.prottoy.qzz.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name admin.prottoy.qzz.io;

    ssl_certificate     /etc/letsencrypt/live/admin.prottoy.qzz.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.prottoy.qzz.io/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location = / { return 302 /admin/; }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
