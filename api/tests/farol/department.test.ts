import {
  classifyAdmissionsMix,
  classifyDepartment,
  classifyOccupancy,
  classifyStaffLoad,
} from '../../src/farol';

describe('classifyOccupancy', () => {
  it.each([
    [79, 'green'],
    [80, 'yellow'],
    [90, 'yellow'],
    [91, 'red'],
  ])('%d de 100 leitos → %s', (occupied, expected) => {
    expect(classifyOccupancy(occupied, 100).color).toBe(expected);
  });

  it('compara a proporção real, não o arredondado (14/15 = 93,3%)', () => {
    expect(classifyOccupancy(14, 15)).toEqual({ color: 'red', reason: 'Ocupação 93%' });
  });

  it('departamento sem leitos é verde', () => {
    expect(classifyOccupancy(0, 0).color).toBe('green');
  });
});

describe('classifyStaffLoad', () => {
  it.each([
    [4, 1, 'green'],
    [5, 1, 'yellow'],
    [6, 1, 'yellow'],
    [7, 1, 'red'],
    [9, 2, 'yellow'],
  ])('%d internações / %d enfermeiro(s) → %s', (admissions, nurses, expected) => {
    expect(classifyStaffLoad(admissions, nurses).color).toBe(expected);
  });

  it('descreve a carga com decimal', () => {
    expect(classifyStaffLoad(9, 2).reason).toBe('4,5 pacientes por enfermeiro');
  });

  it('é vermelho com pacientes e nenhum enfermeiro', () => {
    expect(classifyStaffLoad(1, 0)).toEqual({ color: 'red', reason: 'Sem enfermeiro no quadro' });
  });

  it('é verde sem pacientes, mesmo sem enfermeiro', () => {
    expect(classifyStaffLoad(0, 0).color).toBe('green');
  });
});

describe('classifyAdmissionsMix', () => {
  it('conta pacientes críticos', () => {
    expect(classifyAdmissionsMix(['red', 'red', 'yellow', 'green'])).toEqual({
      color: 'red',
      reason: '2 pacientes críticos',
    });
  });

  it('conta pacientes em atenção', () => {
    expect(classifyAdmissionsMix(['yellow', 'green'])).toEqual({ color: 'yellow', reason: '1 paciente em atenção' });
  });
});

describe('classifyDepartment', () => {
  it('é o pior entre ocupação, carga e internações', () => {
    const result = classifyDepartment({
      totalBeds: 25,
      occupiedBeds: 24,
      nurses: 8,
      admissionColors: ['red', 'red', 'green'],
    });

    expect(result).toEqual({ color: 'red', reason: '2 pacientes críticos · Ocupação 96%' });
  });

  it('fica amarelo só pela carga da equipe', () => {
    const result = classifyDepartment({
      totalBeds: 30,
      occupiedBeds: 5,
      nurses: 1,
      admissionColors: ['green', 'green', 'green', 'green', 'green'],
    });

    expect(result).toEqual({ color: 'yellow', reason: '5 pacientes por enfermeiro' });
  });

  it('departamento vazio é verde', () => {
    expect(classifyDepartment({ totalBeds: 20, occupiedBeds: 0, nurses: 1, admissionColors: [] })).toEqual({
      color: 'green',
      reason: null,
    });
  });
});
