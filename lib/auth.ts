import { API_BASE } from '@/services/api';

export async function syncUserToBackend(user: { id: string; emailAddresses: { emailAddress: string }[]; firstName?: string | null; imageUrl?: string }) {
    try {
        const primaryEmail = user.emailAddresses[0]?.emailAddress;

        const response = await fetch(`${API_BASE}/users/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user.id,
                email: primaryEmail,
                fullName: user.firstName,
                avatarUrl: user.imageUrl,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to sync user');
        }

        return await response.json();
    } catch (error) {
        console.error('[Auth] Sync failed:', error);
        // We generally don't want to block the user if sync fail, 
        // but backend might depend on it. For now, just log.
    }
}
