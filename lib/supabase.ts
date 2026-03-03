/**
 * Supabase Client for Realtime subscriptions
 * 
 * SETUP: Replace with your Supabase credentials from:
 * Supabase Dashboard → Settings → API
 */

import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase credentials
const SUPABASE_URL = "https://abixxxmpbqkigvppbyuk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpeHh4bXBibXFraWd2cHBieXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzQ0NzksImV4cCI6MjA3MjA1MDQ3OX0.7g57F3610516z-5K_k78c85_x-qB_p9_o-t476-l8o0";

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
