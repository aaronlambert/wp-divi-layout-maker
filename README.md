# OpenDraft: AI Mockup-to-Divi Layout Generator

This project is an MVP web app that accepts a homepage mockup image and generates:

- Intermediate structured page spec JSON
- Divi homepage body JSON draft
- Divi global header JSON draft
- Divi global footer JSON draft
- Companion child-theme CSS
- Plain-English summary + warning notes

## Stack

- Next.js (App Router)
- Node.js API routes (server-side OpenAI calls only)
- OpenAI Responses API with image input
- Zod validation for normalized schema

## Setup

```bash
npm install
cp .env.example .env.local
# add OPENAI_API_KEY in .env.local
npm run dev
```

## Environment

```bash
OPENAI_API_KEY=your_secret_key
```

## Pipeline

- `analyzeMockupImage()`
- `normalizePageSpec()`
- `validatePageSpec()`
- `generateDiviHeaderJson()`
- `generateDiviBodyJson()`
- `generateDiviFooterJson()`
- `generateCompanionCss()`
- `buildExportBundle()`

The intermediate page spec is the source of truth and remains editable before export.
