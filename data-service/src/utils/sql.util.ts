export const isReadOnlyQuery = (query: string): boolean => {
    const normalized = query.trim().toLowerCase();

    // must start with SELECT or WITH 
    if (!normalized.startsWith("select") && !normalized.startsWith("with")) {
        return false;
    }

    // bloack dangerous keywords
    const forbidden = ["insert", "update", "delete", "drop", "alter", "create", "truncate"];

    return !forbidden.some(keyword => normalized.includes(keyword));
}