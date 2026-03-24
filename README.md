# BackForge AI 🧠
**Your Personal AI Second Brain**

BackForge AI is a premium personal productivity assistant built with React Native and Expo. It serves as a digital extension of your mind—organizing information, providing daily briefs, and offering a context-aware chat interface to interact with your knowledge.

![BackForge AI Banner](file:///Users/apple/.gemini/antigravity/brain/960b728d-4361-46a2-9664-d08dde7a2a1e/feature_graphic_backforge_ai_1772532272339.png)

## ✨ Key Features

- **🧠 Neural Core:** A centralized status hub that tracks your daily information processing and productivity.
- **💬 Intelligent Chat:** Forge new ideas and recall memories through a context-aware AI chat interface.
- **📋 Daily Brief:** Receive a prioritized overview of your key actions and insights for the day.
- **☁️ Tool Integration:** Seamlessly connect Google Drive, Slack, Notion, and GitHub into your knowledge ecosystem.
- **💎 Pro Subscription:** Unlock unlimited chatting and advanced AI models with local demo mode support for testing.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env.local` file and add your Supabase and Clerk configuration:
```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### 3. Run Locally
```bash
npx expo start
```

## 🛠️ Technology Stack
- **Framework:** [Expo](https://expo.dev) (SDK 54) / React Native
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based)
- **Auth:** [Clerk](https://clerk.com)
- **Database:** [Supabase](https://supabase.com)
- **Subscriptions:** [RevenueCat](https://www.revenuecat.com)
- **Animations:** [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)

## 📖 documentation
- [RevenueCat Setup Guide](./REVENUECAT_SETUP.md) - How to configure and test subscriptions.
- [App Store Listing Drafts](./.gemini/antigravity/brain/960b728d-4361-46a2-9664-d08dde7a2a1e/store_listing.md) - Graphical assets and store descriptions.

---

## 🏗️ Architecture
This project uses the **Expo Managed Workflow** with Continuous Native Generation (CNG).
- Native folders (`/android`, `/ios`) are generated dynamically based on `app.json`.
- Internal identifiers have been fully migrated to `com.devmr.backforge.ai`.

## 🤝 Community & Support
- **Project Owner:** Mohamed Rasheq
- **Design:** Modern, minimalist glassmorphism aesthetic.

---
Managed with ❤️ by BackForge AI Core.
