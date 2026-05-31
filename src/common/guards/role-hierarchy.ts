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

// The VEMKTU director holds the diretor role for both comercial and marketing.
// Any diretor in either sector sees subordinates across both sectors.
const VEMKTU_SECTORS = ['comercial', 'marketing'] as const;

export function getVisibleSectors(sector: string, role: string): string[] {
  if (
    role === 'diretor' &&
    (VEMKTU_SECTORS as readonly string[]).includes(sector)
  ) {
    return [...VEMKTU_SECTORS];
  }
  return [sector];
}
