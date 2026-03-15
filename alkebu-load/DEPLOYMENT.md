# Alkebu-Load Deployment Guide (Coolify)

## Prerequisites

- Coolify instance running
- PostgreSQL database available
- Domain name configured
- Required API keys (Square, Stripe, etc.)

## Coolify Setup

### 1. Create New Resource

1. Go to Coolify dashboard
2. Click "New Resource" → "Docker Image"
3. Select your Git repository
4. Choose `alkebu-load` directory as build context

### 2. Configure Build Settings

**Build Pack:** Docker
**Dockerfile:** `./Dockerfile`
**Build Context:** `.`

### 3. Environment Variables

Set these in Coolify's Environment Variables section:

```bash
# Database (REQUIRED - use Coolify's PostgreSQL service)
DATABASE_URI=postgresql://user:password@postgres:5432/alkebulanimages

# Payload CMS (REQUIRED)
PAYLOAD_SECRET=<generate-secure-32-char-string>
PAYLOAD_PUBLIC_SERVER_URL=https://your-domain.com

# Square POS (REQUIRED for inventory sync)
SQUARE_ACCESS_TOKEN=<your-square-token>
SQUARE_APPLICATION_ID=<your-square-app-id>
SQUARE_WEBHOOK_SIGNATURE_KEY=<your-square-webhook-key>

# Stripe (REQUIRED for payments)
STRIPE_SECRET_KEY=<your-stripe-secret>
STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>

# Shippo (OPTIONAL but recommended for live carrier quotes; app falls back to static rates if unavailable)
SHIPPO_API_TOKEN=<your-shippo-token>
SHIPPO_SHIP_FROM_NAME=Alkebu-Lan Images
SHIPPO_SHIP_FROM_STREET1=2721 Jefferson St.
SHIPPO_SHIP_FROM_CITY=Nashville
SHIPPO_SHIP_FROM_STATE=TN
SHIPPO_SHIP_FROM_ZIP=37208
SHIPPO_SHIP_FROM_COUNTRY=US
SHIPPO_SHIP_FROM_EMAIL=info@alkebulanimages.com
SHIPPO_SHIP_FROM_PHONE=6153214111

# Email (REQUIRED for transactional emails)
FROM_EMAIL=orders@alkebulanimages.com
FROM_NAME=Alkebu-Lan Images
SES_SMTP_USER=<your-ses-smtp-user>
SES_SMTP_PASSWORD=<your-ses-smtp-password>
SMTP_HOST=email-smtp.us-east-2.amazonaws.com
SMTP_PORT=587

# External APIs (OPTIONAL but recommended)
ISBNDB_API_KEY=<your-isbndb-key>
GOOGLE_BOOKS_API_KEY=<your-google-books-key>

# Application (REQUIRED)
NODE_ENV=production
PORT=3000
```

### 4. Configure Persistent Storage

**Add Volume for Media Files:**
- Source: `/var/lib/docker/volumes/alkebu-media`
- Destination: `/app/media`
- This ensures uploaded images persist across deployments

### 5. Health Check Configuration

- **Path:** `/api/health`
- **Port:** 3000
- **Interval:** 30s
- **Timeout:** 10s
- **Retries:** 3

### 6. Domain & SSL

1. Add your domain in Coolify
2. Enable automatic SSL (Let's Encrypt)
3. Set `PAYLOAD_PUBLIC_SERVER_URL` to your domain

## Database Setup

### Option 1: Use Coolify's PostgreSQL (Recommended)

1. Create PostgreSQL service in Coolify
2. Note the connection details
3. Set `DATABASE_URI` environment variable
4. Database will be auto-created on first deployment

### Option 2: External PostgreSQL

```bash
DATABASE_URI=postgresql://user:password@host:5432/dbname
```

## Deployment Steps

### First-Time Deployment

1. **Push Code to Repository**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Trigger Build in Coolify**
   - Build will take 5-10 minutes
   - Watch logs for errors

3. **Create First Admin User**
   - Navigate to `https://your-domain.com/admin`
   - Complete setup wizard
   - Create admin account

4. **Verify Health Check**
   ```bash
   curl https://your-domain.com/api/health
   ```

### Subsequent Deployments

Coolify will auto-deploy on git push (if configured) or:
1. Click "Redeploy" in Coolify dashboard
2. Monitor build logs
3. Verify health check passes

## Post-Deployment Checklist

- [ ] Health check returns 200 OK
- [ ] Admin login works (`/admin`)
- [ ] Database connection successful
- [ ] Media uploads work and persist
- [ ] Stripe webhooks configured
- [ ] Square webhooks configured
- [ ] Email sending works
- [ ] External book APIs respond

## Troubleshooting

### Build Fails

**Check:**
- All environment variables set
- `next.config.mjs` has `output: 'standalone'`
- Dependencies install correctly

**Logs:**
```bash
docker logs <container-id>
```

### Health Check Fails

**Check:**
- `DATABASE_URI` is correct
- PostgreSQL is running and accessible
- Payload can connect to database

**Debug:**
```bash
curl https://your-domain.com/api/health
```

### Media Files Not Persisting

**Check:**
- Volume is mounted at `/app/media`
- Permissions are correct (user `nextjs` needs write access)

**Fix:**
```bash
docker exec <container-id> chown -R nextjs:nodejs /app/media
```

### Database Migrations

Payload handles migrations automatically, but you can run manually:

```bash
docker exec <container-id> pnpm payload migrate
```

## Security Considerations

1. **Never commit `.env` files**
2. **Rotate secrets regularly**
3. **Use strong `PAYLOAD_SECRET` (32+ chars)**
4. **Enable HTTPS only**
5. **Configure rate limiting in Coolify**
6. **Backup database regularly**

## Backup Strategy

### Database Backups

**Automated (Coolify):**
- Enable automatic backups in PostgreSQL service
- Retention: 7 days minimum

**Manual:**
```bash
docker exec coolify-postgres pg_dump -U user dbname > backup.sql
```

### Media Backups

**Sync to S3/R2:**
```bash
rclone sync /var/lib/docker/volumes/alkebu-media s3:bucket/media
```

## Monitoring

### Recommended Tools

- **Uptime:** UptimeRobot monitoring `/api/health`
- **Errors:** Sentry integration (optional)
- **Logs:** Coolify built-in log viewer
- **Metrics:** Coolify dashboard

### Key Metrics to Watch

- Response time (`/api/health`)
- Error rate in logs
- Database connection pool usage
- Disk space (`/app/media` volume)

## Rollback Procedure

If deployment fails:

1. **In Coolify:**
   - Click "Rollback to Previous Version"

2. **Manual:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Database Rollback:**
   - Restore from backup if needed
   - Run down migrations if necessary

## Performance Optimization

### After Deployment

1. **Enable Next.js Caching**
   - Already configured in `next.config.mjs`

2. **Configure CDN**
   - Cloudflare for static assets
   - Point to `/api/media/*`

3. **Database Indexing**
   - Payload creates indexes automatically
   - Monitor slow queries

4. **Image Optimization**
   - WebP format configured
   - Responsive sizes pre-generated

## Support

- **Payload CMS Docs:** https://payloadcms.com/docs
- **Coolify Docs:** https://coolify.io/docs
- **Health Check:** `https://your-domain.com/api/health`
