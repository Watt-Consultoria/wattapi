export const ROLE_RANK: Record<string, number> = {
  consultor: 0,
  gerente: 1,
  diretor: 2,
  assessor: 3,
  presidente: 4,
};

export function getRank(role: string): number {
  return ROLE_RANK[role] ?? -1;
}

export function isSuperuser(role: string): boolean {
  return getRank(role) >= 3;
}
