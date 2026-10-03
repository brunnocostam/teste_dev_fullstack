import { classifyHospital } from '../../src/farol';

describe('classifyHospital (pior caso)', () => {
  it('um departamento vermelho deixa o hospital vermelho', () => {
    expect(classifyHospital(['green', 'green', 'red', 'yellow', 'yellow'])).toEqual({
      color: 'red',
      reason: '1 departamento crítico · 2 em alerta',
    });
  });

  it('só alertas deixam o hospital amarelo', () => {
    expect(classifyHospital(['green', 'yellow'])).toEqual({ color: 'yellow', reason: '1 em alerta' });
  });

  it('tudo verde tem um resumo positivo', () => {
    expect(classifyHospital(['green', 'green'])).toEqual({
      color: 'green',
      reason: 'Todos os departamentos em ordem',
    });
  });
});
