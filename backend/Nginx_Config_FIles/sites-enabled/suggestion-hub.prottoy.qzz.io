server {
    server_name suggestion-hub.prottoy.qzz.io www.suggestion-hub.prottoy.qzz.io;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/suggestion-hub.prottoy.qzz.io/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/suggestion-hub.prottoy.qzz.io/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = suggestion-hub.prottoy.qzz.io) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name suggestion-hub.prottoy.qzz.io www.suggestion-hub.prottoy.qzz.io;
    return 404; # managed by Certbot


}