// Draft management utilities for analyst audit creation

export interface AuditDraft {
    companyId: string;
    companyName: string;
    managerId: string;
    managerName: string;
    questionnaireId: string;
    questionnaireName: string;
    metadata: Record<string, any>;
    timestamp: number;
    draftId: string;
}

export interface RecentSelection {
    companyId: string;
    companyName: string;
    managerId?: string;
    managerName?: string;
    timestamp: number;
}

export interface AnswersDraft {
    auditId: string;
    answers: Record<string, any>;
    lastSaved: number;
}

const DRAFT_KEY = 'analyst_audit_draft';
const RECENT_KEY = 'analyst_recent_selections';
const ANSWERS_KEY_PREFIX = 'audit_answers_';
const DRAFT_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_RECENT = 5;

// Audit Draft Management
export function saveDraft(draft: Omit<AuditDraft, 'timestamp' | 'draftId'>): void {
    const fullDraft: AuditDraft = {
        ...draft,
        timestamp: Date.now(),
        draftId: crypto.randomUUID(),
    };

    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(fullDraft));
    } catch (error) {
        console.error('Failed to save draft:', error);
    }
}

export function loadDraft(): AuditDraft | null {
    try {
        const stored = localStorage.getItem(DRAFT_KEY);
        if (!stored) return null;

        const draft: AuditDraft = JSON.parse(stored);

        // Check if draft is expired
        if (Date.now() - draft.timestamp > DRAFT_EXPIRY) {
            clearDraft();
            return null;
        }

        return draft;
    } catch (error) {
        console.error('Failed to load draft:', error);
        return null;
    }
}

export function clearDraft(): void {
    try {
        localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
        console.error('Failed to clear draft:', error);
    }
}

// Recent Selections Management
export function saveRecentSelection(selection: Omit<RecentSelection, 'timestamp'>): void {
    try {
        const stored = localStorage.getItem(RECENT_KEY);
        let recent: RecentSelection[] = stored ? JSON.parse(stored) : [];

        // Remove duplicate if exists
        recent = recent.filter(r =>
            !(r.companyId === selection.companyId && r.managerId === selection.managerId)
        );

        // Add new selection at the beginning
        recent.unshift({
            ...selection,
            timestamp: Date.now(),
        });

        // Keep only MAX_RECENT items
        recent = recent.slice(0, MAX_RECENT);

        localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch (error) {
        console.error('Failed to save recent selection:', error);
    }
}

export function loadRecentSelections(): RecentSelection[] {
    try {
        const stored = localStorage.getItem(RECENT_KEY);
        if (!stored) return [];

        const recent: RecentSelection[] = JSON.parse(stored);

        // Filter out expired entries (older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        return recent.filter(r => r.timestamp > thirtyDaysAgo);
    } catch (error) {
        console.error('Failed to load recent selections:', error);
        return [];
    }
}

export function getRecentCompanyIds(): string[] {
    const recent = loadRecentSelections();
    return Array.from(new Set(recent.map(r => r.companyId)));
}

export function getRecentManagerIds(companyId: string): string[] {
    const recent = loadRecentSelections();
    return recent
        .filter(r => r.companyId === companyId && r.managerId)
        .map(r => r.managerId!)
        .filter((id, index, self) => self.indexOf(id) === index); // unique
}

// Answers Draft Management (for audit evaluation)
export function saveAnswersDraft(auditId: string, answers: Record<string, any>): void {
    const draft: AnswersDraft = {
        auditId,
        answers,
        lastSaved: Date.now(),
    };

    try {
        localStorage.setItem(`${ANSWERS_KEY_PREFIX}${auditId}`, JSON.stringify(draft));
    } catch (error) {
        console.error('Failed to save answers draft:', error);
    }
}

export function loadAnswersDraft(auditId: string): AnswersDraft | null {
    try {
        const stored = localStorage.getItem(`${ANSWERS_KEY_PREFIX}${auditId}`);
        if (!stored) return null;

        const draft: AnswersDraft = JSON.parse(stored);

        // Check if draft is expired (7 days)
        if (Date.now() - draft.lastSaved > DRAFT_EXPIRY) {
            clearAnswersDraft(auditId);
            return null;
        }

        return draft;
    } catch (error) {
        console.error('Failed to load answers draft:', error);
        return null;
    }
}

export function clearAnswersDraft(auditId: string): void {
    try {
        localStorage.removeItem(`${ANSWERS_KEY_PREFIX}${auditId}`);
    } catch (error) {
        console.error('Failed to clear answers draft:', error);
    }
}

// Cleanup old drafts
export function cleanupOldDrafts(): void {
    try {
        const keys = Object.keys(localStorage);
        const now = Date.now();

        keys.forEach(key => {
            if (key.startsWith(ANSWERS_KEY_PREFIX)) {
                try {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const draft: AnswersDraft = JSON.parse(stored);
                        if (now - draft.lastSaved > DRAFT_EXPIRY) {
                            localStorage.removeItem(key);
                        }
                    }
                } catch (e) {
                    // Invalid draft, remove it
                    localStorage.removeItem(key);
                }
            }
        });
    } catch (error) {
        console.error('Failed to cleanup old drafts:', error);
    }
}
