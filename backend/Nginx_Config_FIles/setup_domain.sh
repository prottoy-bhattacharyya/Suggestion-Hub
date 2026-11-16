#!/bin/bash

# Ensure the script exits if any command fails
set -e

echo "=========================================="
echo "   Automated Nginx & SSL Proxy Setup"
echo "=========================================="

# 1. Ask for the domain and the port
read -p "Enter your primary domain (e.g., chat-cyan.jo3.org): " DOMAIN
read -p "Enter the internal target port (e.g., 5000): " PORT

# Define the Nginx paths
AVAILABLE="/etc/nginx/sites-available/$DOMAIN"
ENABLED="/etc/nginx/sites-enabled/$DOMAIN"

echo -e "\n[+] Creating Nginx configuration for $DOMAIN proxying to port $PORT..."

# 2. Write the Nginx configuration block
# Using sudo tee to write to the protected /etc directory safely
sudo tee $AVAILABLE > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "[+] Enabling the configuration..."
# 3. Create the symlink (the -f flag forces an overwrite if it already exists)
sudo ln -sf $AVAILABLE $ENABLED

echo "[+] Testing Nginx syntax..."
# 4. Test Nginx. If this fails, the script will stop because of "set -e"
sudo nginx -t

echo "[+] Restarting Nginx to apply changes..."
# 5. Restart the server
sudo systemctl restart nginx

echo -e "\n[+] Nginx setup complete. Launching Certbot for SSL..."
# 6. Run Certbot to grab certificates for both the root and www subdomains
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

echo -e "\n=========================================="
echo " Setup Finished Successfully!"
echo " Remember to turn the Cloudflare Proxy (Orange Cloud) back ON"
echo " and ensure SSL/TLS is set to Full (Strict)."
echo "=========================================="
