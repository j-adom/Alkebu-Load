# 🚀 Local Development - Quick Setup Guide

## Why wasn't the alkebu-web app working?

The main issues were:

1. **❌ Production URLs**: The `.env` file was configured with production URLs (`https://api.alkebulanimages.com`)
2. **❌ Missing `.env.local`**: No local development environment configuration
3. **❌ Backend dependency**: Frontend needs the backend running first on `localhost:3000`
4. **❌ Admin user**: Payload requires an admin user to be created before API access works

## ✅ Fixed Setup

We've now created:
- **`.env.example`** - Template for local development
- **`.env.local`** - Pre-configured for local development  
- **`dev-setup-test.sh`** - Automated verification script
- **Comprehensive troubleshooting guide** in `docs/development-guide.md`

## 🏃‍♂️ Quick Start (5 minutes)

```bash
# 1. Test your setup
./dev-setup-test.sh

# 2. Start backend (Terminal 1)
cd alkebu-load
pnpm dev

# 3. Create admin user (one-time)
# Visit: http://localhost:3000/admin

# 4. Start frontend (Terminal 2) 
cd alkebu-web
npm run dev

# ✅ Visit: http://localhost:5173
```

## 🔧 Environment Files Configured

### Backend (`alkebu-load/.env`)
```bash
DATABASE_URI=file:./alkebulanimages.db
PAYLOAD_SECRET=your-32-character-secret-key
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
```

### Frontend (`alkebu-web/.env.local`)
```bash
PAYLOAD_API_URL=http://localhost:3000
PUBLIC_SITE_URL=http://localhost:5173
AUTH_SECRET=local-dev-auth-secret-32-chars
```

## 🆘 If Something Goes Wrong

1. **Run the test script**: `./dev-setup-test.sh`
2. **Check the troubleshooting guide**: `docs/development-guide.md`
3. **Common fixes**:
   ```bash
   # Clear caches
   rm -rf alkebu-web/.svelte-kit
   rm -rf alkebu-load/.next
   
   # Reinstall dependencies
   cd alkebu-load && pnpm install
   cd alkebu-web && npm install
   ```

## 📚 Full Documentation

See `docs/development-guide.md` for:
- Complete setup instructions
- Environment configuration
- API documentation  
- Deployment guides
- Contributing guidelines

---

**The local development environment is now fully configured and tested!** 🎉