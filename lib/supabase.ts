/**
 * Supabase Client for Realtime subscriptions
 * 
 * SETUP: Replace with your Supabase credentials from:
 * Supabase Dashboard → Settings → API
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});

/**
 * Subscribe to memory_items table changes
 * Returns unsubscribe function
 */
export function subscribeToMemoryChanges(
    userId: string,
    onUpdate: () => void
): () => void {
    const channel = supabase
        .channel('memory_changes')
        .on(
            'postgres_changes',
            {
                event: '*', // Listen to INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'memory_items',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                console.log('[Supabase Realtime] Change received:', payload.eventType);
                onUpdate();
            }
        )
        .subscribe();

    // Return cleanup function
    return () => {
        supabase.removeChannel(channel);
    };
}
