# Production Deployment Guide

## 1. Environment Setup

### Development
- Copy `.env.local.example` to `.env.local`
- Fill in your development Clerk keys
- Set up local PostgreSQL database

### Production (Vercel)
1. Create production Clerk instance at https://clerk.com
2. Add your domain to Clerk's allowed origins
3. Set up production environment variables in Vercel:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_live_...)
   - `CLERK_SECRET_KEY` (sk_live_...)
   - `NEXT_PUBLIC_APP_URL`

## 2. Database Setup

### Development
