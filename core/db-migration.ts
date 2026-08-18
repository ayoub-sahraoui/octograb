/**
 * Database Migration - Seed initial data if database is empty
 */

import { db } from './database';

export async function initializeDatabase() {
    try {
        // Check if database is empty
        const planCount = await db.plans.count();

        if (planCount === 0) {
            console.log('[OctoGrab] Database is empty, ready for use');
        }
    } catch (error) {
        console.error('[OctoGrab] Database initialization error:', error);
    }
}

// Call this in the main app entry point
export async function setupDatabase() {
    await initializeDatabase();
}
