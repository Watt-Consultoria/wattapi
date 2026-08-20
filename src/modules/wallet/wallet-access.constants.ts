import type { AccessPolicy } from '../../common/decorators/route-policy.decorator';

// Writes (create/edit) are Presidente Executivo only (rank > 3).
export const PRESIDENTE_ACCESS: AccessPolicy = {
  mode: 'authenticated',
  rba: [['role', ['presidente']]],
};

// Reads (list/fetch) are open to Diretor and above (rank >= 2).
export const DIRECTOR_UP_ACCESS: AccessPolicy = {
  mode: 'authenticated',
  rba: [['role', ['diretor', 'assessor', 'presidente']]],
};
