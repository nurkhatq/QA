// Caching utilities for analyst data

export interface Company {
    id: string;
    name: string;
    description?: string;
    auditCount?: number;
}

export interface Manager {
    id: string;
    name: string;
    isActive: boolean;
    lastAuditDate?: string;
}

export interface Questionnaire {
    questionnaireId: string;
    questionnaireName: string;
    questionnaireType: string;
    currentVersionId: string;
    questionCount?: number;
    estimatedMinutes?: number;
}

interface CachedData {
    companies: Company[];
    managers: Record<string, Manager[]>; // by companyId
    questionnaires: Record<string, Questionnaire[]>; // by companyId
    timestamp: number;
}

const CACHE_KEY = 'analyst_data_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Get cached data or null if expired/missing
function getCache(): CachedData | null {
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (!stored) return null;

        const cache: CachedData = JSON.parse(stored);

        // Check if expired
        if (Date.now() - cache.timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return cache;
    } catch (error) {
        console.error('Failed to get cache:', error);
        return null;
    }
}

// Save data to cache
function setCache(data: Partial<CachedData>): void {
    try {
        const existing = getCache() || {
            companies: [],
            managers: {},
            questionnaires: {},
            timestamp: Date.now(),
        };

        const updated: CachedData = {
            ...existing,
            ...data,
            timestamp: Date.now(),
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Failed to set cache:', error);
    }
}

// Companies
export async function getCachedCompanies(): Promise<Company[]> {
    const cache = getCache();

    if (cache && cache.companies.length > 0) {
        return cache.companies;
    }

    // Fetch from server
    const response = await fetch('/api/analyst/companies');
    if (!response.ok) throw new Error('Failed to fetch companies');

    const companies: Company[] = await response.json();
    setCache({ companies });

    return companies;
}

// Managers for a company
export async function getCachedManagers(companyId: string): Promise<Manager[]> {
    const cache = getCache();

    if (cache && cache.managers[companyId]) {
        return cache.managers[companyId];
    }

    // Fetch from server
    const response = await fetch(`/api/analyst/companies/${companyId}/managers`);
    if (!response.ok) throw new Error('Failed to fetch managers');

    const managers: Manager[] = await response.json();

    // Update cache
    const existingCache = getCache() || {
        companies: [],
        managers: {},
        questionnaires: {},
        timestamp: Date.now(),
    };

    setCache({
        ...existingCache,
        managers: {
            ...existingCache.managers,
            [companyId]: managers,
        },
    });

    return managers;
}

// Questionnaires for a company
export async function getCachedQuestionnaires(companyId: string): Promise<Questionnaire[]> {
    const cache = getCache();

    if (cache && cache.questionnaires[companyId]) {
        return cache.questionnaires[companyId];
    }

    // Fetch from server
    const response = await fetch(`/api/analyst/companies/${companyId}/questionnaires`);
    if (!response.ok) throw new Error('Failed to fetch questionnaires');

    const questionnaires: Questionnaire[] = await response.json();

    // Update cache
    const existingCache = getCache() || {
        companies: [],
        managers: {},
        questionnaires: {},
        timestamp: Date.now(),
    };

    setCache({
        ...existingCache,
        questionnaires: {
            ...existingCache.questionnaires,
            [companyId]: questionnaires,
        },
    });

    return questionnaires;
}

// Invalidate cache (force refresh)
export function invalidateCache(): void {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch (error) {
        console.error('Failed to invalidate cache:', error);
    }
}

// Get cache age in minutes
export function getCacheAge(): number | null {
    const cache = getCache();
    if (!cache) return null;

    return Math.floor((Date.now() - cache.timestamp) / 60000);
}
