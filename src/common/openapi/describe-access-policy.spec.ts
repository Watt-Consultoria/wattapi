import { describeAccessPolicy } from './describe-access-policy';

describe('describeAccessPolicy', () => {
  test('mode: unauthenticated', () => {
    const text = describeAccessPolicy({ mode: 'unauthenticated' });
    expect(text).toBe('Não requer autenticação.');
  });

  test('mode: unexistent', () => {
    const text = describeAccessPolicy({ mode: 'unexistent' });
    expect(text).toContain('não cadastrado');
  });

  test('mode: authenticated without rba', () => {
    const text = describeAccessPolicy({ mode: 'authenticated' });
    expect(text).toBe('Requer autenticação.');
  });

  test('mode: authenticated with rba by role', () => {
    const text = describeAccessPolicy({
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    });
    expect(text).toContain('Requer autenticação.');
    expect(text).toContain('role: assessor, presidente');
  });

  test('mode: authenticated with rba by sector', () => {
    const text = describeAccessPolicy({
      mode: 'authenticated',
      rba: [['sector', ['comercial']]],
    });
    expect(text).toContain('setor: comercial');
  });

  test('mode: authenticated with rba by role AND sector', () => {
    const text = describeAccessPolicy({
      mode: 'authenticated',
      rba: [
        [
          'role AND sector',
          { roles: ['gerente'], sectors: ['projetos', 'comercial'] },
        ],
      ],
    });
    expect(text).toContain('role: gerente E setor: projetos, comercial');
  });

  test('mode: authenticated with multiple rba conditions joined by OU', () => {
    const text = describeAccessPolicy({
      mode: 'authenticated',
      rba: [
        ['role', ['presidente']],
        ['sector', ['institucional']],
      ],
    });
    expect(text).toContain('role: presidente');
    expect(text).toContain('OU');
    expect(text).toContain('setor: institucional');
  });
});
