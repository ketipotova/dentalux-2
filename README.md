# Dentalux Instagram DM Chatbot

AI-powered Instagram DM assistant for **Dentalux** dental clinic (Batumi, Georgia).  
Uses Claude API to answer patient questions about services, pricing, appointments, and insurance — in Georgian, English, and Russian.

## Architecture

- **Runtime**: Node.js
- **LLM**: Claude (Anthropic API)
- **Platform**: Instagram Messaging API (via Meta Graph API)
- **Hosting**: Railway
- **Webhook**: Receives Instagram DM events, responds via Claude with clinic knowledge base

## Setup

1. Copy `.env.example` to `.env` and fill in credentials
2. `npm install`
3. `npm run dev`

## Deployment

Deployed on [Railway](https://railway.app). Push to `main` triggers auto-deploy.
