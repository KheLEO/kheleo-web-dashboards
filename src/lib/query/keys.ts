export const keys = {
  passport: (userId: string) => ["passport", userId] as const,
  sports: (userId: string) => ["sports", userId] as const,
  tournament: (id: string) => ["tournament", id] as const,
  brackets: (id: string) => ["brackets", id] as const,
  pool: (userId: string, tournamentId: string, bracketId: string) =>
    ["pool", userId, tournamentId, bracketId] as const,
};
