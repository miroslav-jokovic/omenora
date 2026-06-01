# OMENORA

AI-powered astrology and destiny reading platform.

## 🚀 Quick Deploy to Railway

### Step 1: Create GitHub Repository

Run these commands in your terminal:

```bash
# Navigate to project root
cd /Volumes/ESSD/Projects/Augur-V1

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Production ready"

# Create GitHub repository using gh CLI (install from https://cli.github.com)
gh repo create omenora --public --source=. --push
```

Or manually:
1. Go to https://github.com/new
2. Name: `omenora`
3. Create repository
4. Run: `git remote add origin https://github.com/miroslav-jokovic/omenora.git`
5. Run: `git push -u origin main`

### Step 2: Deploy to Railway

**Option A: Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy
railway up
```

**Option B: Railway Dashboard**
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select `miroslav-jokovic/omenora`
4. Add environment variables (see below)
5. Deploy

### Step 3: Environment Variables

Add these in Railway Dashboard (Variables tab):

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `STRIPE_SECRET_KEY` | sk_live_... |
| `STRIPE_PUBLISHABLE_KEY` | pk_live_... |
| `NUXT_PUBLIC_STRIPE_KEY` | pk_live_... |
| `STRIPE_DAILY_PRICE_ID` | price_... |
| `SUPABASE_URL` | https://...supabase.co |
| `SUPABASE_ANON_KEY` | eyJhbG... |
| `SUPABASE_SERVICE_KEY` | eyJhbG... |
| `RESEND_API_KEY` | re_... |
| `NUXT_PUBLIC_SITE_URL` | https://your-domain.com |
| `NODE_ENV` | production |

Optional:
| `SENTRY_DSN` | Error tracking URL |

## 📁 Project Structure

```
Augur-V1/
├── augur/              # Nuxt 3 application
│   ├── app/            # Pages, components, composables
│   ├── server/         # API routes, middleware
│   ├── public/         # Static assets
│   └── ...
├── railway.json        # Railway deployment config
└── README.md
```

## 🧪 Testing

```bash
cd augur

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Lint
npm run lint

# Type check
npm run typecheck
```

## 📦 Build

```bash
cd augur
npm install
npm run build
```

## 🔒 Security

- Never commit `.env` file
- Use `.env.example` as template
- All API keys stored in Railway environment variables
- Health check endpoint: `/api/health`

## 🌐 Domains

After deployment, add your custom domain in Railway:
1. Go to Settings → Domains
2. Add domain: `omenora.com`
3. Update DNS as instructed

## 📄 License

Private - All rights reserved.
