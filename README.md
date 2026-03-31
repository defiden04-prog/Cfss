# Claim Free Solana (CFS)

An immersive, high-performance Solana account reclamation tool designed for identifying and closing empty token accounts to reclaim rent-exempt SOL deposits.

## 🚀 Features

- **Matrix-Themed Scanner**: Advanced real-time digital rain interface for deep wallet inspection.
- **Pay-to-Scan Model**: Secure 0.299 SOL handshake transaction for service access, verified on-chain via Memos.
- **Support for Token-2022**: Comprehensive detection of modern Solana token standards.
- **Priority-First Transactions**: All extraction and handshake transactions utilize priority fees for maximum landing reliability on Mainnet-Beta.
- **Referral Ecosystem**: Built-in 30% commission split for referrers, settled instantly on-chain.
- **Pro Automation**: Automated sweeper (0.5 SOL unlock) with custom thresholds and activity logging.

## 🛠 Setup

1. **Environment**: Create a `.env` file with your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Install**: `npm install`
3. **Develop**: `npm run dev`

## 🔒 Security & Verification

This DApp is optimized for **Phantom** and other major Solana wallets. It includes:
- **DApp Metadata**: Verified name, icon, and URL integration.
- **On-Chain Documentation**: Transaction Memos (`CFS_AUTH_SCAN`, `CFS_PRO_UNLOCK`) provide transparency for account activity.
- **Priority-Optimized**: High-priority compute budget instructions (250,000 microLamports) ensure lightning-fast landing even during high network congestion.
- **Pre-Flight Simulation**: All transactions are simulated on-chain before wallet sign prompts to prevent failed transactions and unnecessary fee loss.

## 📦 Deployment

Optimized for Vercel. Push to the `main` branch to trigger automatic production builds.

---
© 2026 Claim Free Solana Project. Verified for Solana Mainnet-Beta.
