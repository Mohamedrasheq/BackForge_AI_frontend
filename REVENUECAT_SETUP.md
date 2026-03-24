# RevenueCat Subscription Setup Guide

This document outlines the setup required to enable the **BackForge AI Pro** subscription in the application.

## 1. Dashboard Configuration

### A. Environment & App Configuration
1. Log in to the [RevenueCat Dashboard](https://app.revenuecat.com/).
2. Create a new Project named **"BackForge AI"**.
3. **From the "Get Started" screen (as seen in your screenshot):**
   - Click the **"New app configuration"** card (the one with the Apple, Android, and Amazon icons).
   - **For iOS**: Select **App Store**, enter your app name and Bundle ID (`com.devmr.backforge.ai`), and save.
   - **For Android**: Select **Google Play**, enter your app name and Package Name (`com.devmr.backforge.ai`), and save.
4. After saving, RevenueCat will display your **Public SDK Key** for that app.
   - **iOS Key** starts with `appl_`
   - **Android Key** starts with `goog_`
5. Copy these keys into `services/revenuecat.ts`.

### B. Entitlements
1. Go to **Entitlements**.
2. Create a new Entitlement with the ID: **`Loop Pro`**.
   - *Note: This ID is referenced directly in `services/revenuecat.ts`.*

### C. Products (Setting up without Product IDs)
If you haven't created products in the App Store or Play Store yet, don't worry. You can still proceed:
1. **Get your Keys**: Create the iOS and Android configurations in RevenueCat anyway. It will give you the `appl_` and `goog_` keys immediately.
2. **Use Simulation Mode**: I have built a "Sandbox Fallback" into the app. When the app detects that no real products are available from the store, it will show a **"Subscribe (Demo)"** button. 
   - Clicking this will simulate a successful purchase and grant the "BackForge AI Pro" entitlement locally.
   - This allows you to test the entire experience (daily limits, paywall UI, and Pro status) while you wait for your developer accounts or product IDs to be ready.

### D. Offerings (Once products are ready)
1. Once you create real products in the stores, add them to RevenueCat under **Products**.
2. Create an Offering named **`default`** and set it as the "Current" offering.
3. Add your real products as packages inside this offering. The app will automatically switch from Simulation Mode to your Real Store Products.

---

## 2. Integrated Features

The app is pre-configured with the following logic:

- **Automatic Paywall**: Appears when a free user reaches the daily limit of 5 messages in Chat.
- **Profile Integration**: Displays a premium golden infinity badge for active Pro subscribers.
- **Safety Guards**: Includes a "Demo Mode" fallback so you can test the UI transitions even without a native build or configured dashboard.

---

## 3. Testing Guide

### Testing in Expo Go (Demo Mode)
- Open the Paywall.
- Click **"Subscribe (Demo)"**.
- The app will simulate a success state, allowing you to see the Pro UI (badges and unlimited chat) immediately.

### Testing Real Native Purchases
1. Create a **Development Build**: `npx eas build --profile development`
2. Ensure you are using a **Sandbox Tester** account on your device.
3. The app will fetch real products and prices directly from your RevenueCat dashboard.

---

## 4. Key References
- **Entitlement ID**: `BackForge AI Pro`
- **Main Service**: `services/revenuecat.ts`
- **UI Screen**: `app/paywall.tsx`
