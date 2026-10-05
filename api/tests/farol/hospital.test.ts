import { classifyHospital } from '../../src/farol';

describe('classifyHospital (pior caso)', () => {
  it('um departamento vermelho deixa o hospital vermelho', () => {
    expect(classifyHospital(['green', 'green', 'red', 'yellow', 'yellow'])).toEqual({
      color: 'red',
      reason: '1 departamento crítico e 2 em alerta',
    });
  });

  it('só alertas deixam o hospital amarelo, dizendo que são departamentos', () => {
    expect(classifyHospital(['green', 'yellow'])).toEqual({ color: 'yellow', reason: '1 departamento em alerta' });
    expect(classifyHospital(['yellow', 'yellow'])).toEqual({ color: 'yellow', reason: '2 departamentos em alerta' });
  });

  it('com críticos, não repete "departamentos" no alerta', () => {
    expect(classifyHospital(['red', 'red', 'yellow']).reason).toBe('2 departamentos críticos e 1 em alerta');
  });

  it('tudo verde tem um resumo positivo', () => {
    expect(classifyHospital(['green', 'green'])).toEqual({
      color: 'green',
      reason: 'Todos os departamentos em ordem',
    });
  });
});
