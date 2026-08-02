import type {
  AccessPolicy,
  RbaAccessCondition,
} from '../decorators/route-policy.decorator';

function describeRbaCondition(condition: RbaAccessCondition): string {
  const [type, value] = condition;

  if (type === 'role') {
    return `role: ${value.join(', ')}`;
  }

  if (type === 'sector') {
    return `setor: ${value.join(', ')}`;
  }

  const { roles, sectors } = value;
  return `role: ${roles.join(', ')} E setor: ${sectors.join(', ')}`;
}

// Generates the same authorization rule text a developer would otherwise
// have to write by hand for every route (and forget to update, like API.md).
export function describeAccessPolicy(policy: AccessPolicy): string {
  if (policy.mode === 'unauthenticated') {
    return 'Não requer autenticação.';
  }

  if (policy.mode === 'unexistent') {
    return 'Requer um token válido de um usuário ainda não cadastrado (fluxo de cadastro incompleto).';
  }

  const base = 'Requer autenticação.';
  const rba = policy.rba;

  if (!rba || rba.length === 0) {
    return base;
  }

  const clauses = rba.map(describeRbaCondition);
  return `${base} Restrito a: ${clauses.join(' OU ')}.`;
}
