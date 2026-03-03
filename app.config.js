import 'dotenv/config';

export default ({ config }) => {
    const isAndroid = process.env.EXPO_PLATFORM === 'android' || process.argv.includes('--platform=android') || process.argv.includes('android');

    // Base plugins from app.json
    const plugins = [...(config.plugins || [])];

    // Add expo-notifications ONLY for Android
    if (isAndroid) {
        plugins.push([
            "expo-notifications",
            {
                "icon": "./assets/images/notification-icon.png",
                "color": "#4F46E5"
            }
        ]);
    }

    return {
        ...config,
        plugins,
    };
};

