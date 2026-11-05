# 🚀 Facturio Deployment Guide

## Quick Deployment (Recommended)

### Prerequisites
- Ubuntu/Debian server with root access
- Domain name (facturio.ch) 
- Node.js 20+ installed

### Step 1: DNS Configuration
**⚠️ IMPORTANT: Configure DNS first!**

In your DNS provider, add these A records pointing to your server IP:
```
A    @      YOUR_SERVER_IP
A    www    YOUR_SERVER_IP  
A    app    YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with your actual server IP address.

Verify DNS is working:
```bash
nslookup app.facturio.ch
# Should return your server IP
```

### Step 2: Deploy the Application
```bash
# 1. Clone and setup
git clone https://github.com/nussbi/facturio.git
cd facturio/code

# 2. Configure environment
cp .env.production.example .env.production
nano .env.production  # Edit with your settings

# 3. Deploy the application
./deploy-simple.sh
```

### Step 3: Setup Nginx and SSL
```bash
# Setup Nginx reverse proxy
sudo ./setup-nginx.sh

# Get SSL certificates (replace email with yours)
sudo certbot --nginx -d facturio.ch -d www.facturio.ch -d app.facturio.ch --email admin@facturio.ch --agree-tos --no-eff-email
```

### Step 4: Test Your Deployment
1. Visit https://app.facturio.ch
2. Create an account
3. Start using Facturio!

## Environment Configuration

### Required Settings
```bash
# .env.production
NODE_ENV=production
DATABASE_URL=file:./prisma/prod.db
SECRET_KEY=your-generated-secret-key
```

### Optional Settings
```bash
# Email notifications (optional)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@facturio.ch
```

## PM2 Management Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs facturio-app

# Restart application
pm2 restart facturio-app

# Monitor performance
pm2 monit

# Server monitoring dashboard
pm2 monitor
```

## Troubleshooting

### DNS Not Resolving
- Check DNS propagation: https://dnschecker.org
- Wait up to 24 hours for full propagation
- Verify A records point to correct IP

### Application Not Starting
```bash
# Check PM2 logs
pm2 logs facturio-app

# Check if port 3000 is in use
sudo netstat -tlnp | grep :3000

# Restart PM2
pm2 restart facturio-app
```

### SSL Certificate Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew
```

### Database Issues
```bash
# Run migrations manually
cd /path/to/facturio/code
npx prisma migrate deploy

# Reset database (⚠️ destroys data)
npx prisma migrate reset
```

## Security Checklist

- ✅ Strong SECRET_KEY generated
- ✅ Firewall configured (ports 80, 443, 22 only)
- ✅ Regular backups of database
- ✅ SSL certificates auto-renewal
- ✅ PM2 monitoring enabled

## Backup Strategy

```bash
# Backup database
cp prisma/prod.db backups/prod.db.$(date +%Y%m%d)

# Backup documents
tar -czf backups/documents.$(date +%Y%m%d).tar.gz documents/

# Automated backup (add to crontab)
0 2 * * * cd /path/to/facturio && cp prisma/prod.db backups/prod.db.$(date +\%Y\%m\%d)
```

## Performance Optimization

### PM2 Cluster Mode
Edit `ecosystem.config.json`:
```json
{
  "apps": [{
    "name": "facturio-app",
    "script": "server.js",
    "instances": "max",
    "exec_mode": "cluster"
  }]
}
```

### Nginx Caching
Add to Nginx config:
```nginx
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Support

- **Documentation**: See README.md
- **Issues**: Create GitHub issue
- **PM2 Monitoring**: https://app.pm2.io

---

## Alternative: Docker Deployment

If you prefer Docker, see the Docker files in this directory:
- `Dockerfile`
- `docker-compose.yml`
- `deploy.sh`

Note: Docker deployment may have build issues with ARM64 architecture.