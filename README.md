# Propeller AI

AI-powered export operations platform for US manufacturers. Four specialized agents handle market research, trade compliance, buyer outreach, and export finance.

## Quick Start

```bash
cp .env.example .env.local
# Add your API keys to .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | AI agent processing |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Auth + persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Auth + persistence |
| `COMTRADE_API_KEY` | No | Real-time trade flow data |

See `.env.example` for the full list including OAuth credentials.

## Architecture

- **Pipeline**: Deterministic 8-step workflow (classify → trade flows → screening → controls → synthesis → outreach → finance → reports)
- **Data Sources**: UN Comtrade API, Consolidated Screening List, USITC HTS database
- **Auth**: Supabase with localStorage fallback
- **Stack**: Next.js 16, TypeScript, Tailwind CSS, Zustand

## Database Setup (Optional)

If using Supabase for persistence:

```bash
# Run the schema in your Supabase SQL editor
cat supabase/schema.sql
```
