import {
  classifyAdmission,
  classifyPendingExam,
  classifyPendingExams,
  classifyVital,
  classifyVitals,
  type VitalSign,
} from '../../src/farol';

describe('classifyVital (faixas NEWS2, limites inclusivos)', () => {
  it.each<[VitalSign, number, string]>([
    ['heartRate', 40, 'red'],
    ['heartRate', 41, 'yellow'],
    ['heartRate', 50, 'yellow'],
    ['heartRate', 51, 'green'],
    ['heartRate', 100, 'green'],
    ['heartRate', 101, 'yellow'],
    ['heartRate', 130, 'yellow'],
    ['heartRate', 131, 'red'],
    ['oxygenSaturation', 91, 'red'],
    ['oxygenSaturation', 92, 'yellow'],
    ['oxygenSaturation', 95, 'yellow'],
    ['oxygenSaturation', 96, 'green'],
    ['oxygenSaturation', 100, 'green'],
    ['temperature', 35.0, 'red'],
    ['temperature', 35.1, 'yellow'],
    ['temperature', 36.0, 'yellow'],
    ['temperature', 36.1, 'green'],
    ['temperature', 38.0, 'green'],
    ['temperature', 38.1, 'yellow'],
    ['temperature', 39.0, 'yellow'],
    ['temperature', 39.1, 'red'],
    ['systolicPressure', 90, 'red'],
    ['systolicPressure', 91, 'yellow'],
    ['systolicPressure', 110, 'yellow'],
    ['systolicPressure', 111, 'green'],
    ['systolicPressure', 219, 'green'],
    ['systolicPressure', 220, 'red'],
  ])('%s = %d → %s', (sign, value, expected) => {
    expect(classifyVital(sign, value).color).toBe(expected);
  });

  it('descreve o valor fora da faixa com unidade', () => {
    expect(classifyVital('oxygenSaturation', 88).reason).toBe('Saturação 88%');
    expect(classifyVital('heartRate', 118).reason).toBe('FC 118 bpm');
    expect(classifyVital('temperature', 38.6).reason).toBe('Temperatura 38,6 °C');
  });

  it('não dá motivo quando está na faixa normal', () => {
    expect(classifyVital('heartRate', 80).reason).toBeNull();
  });
});

describe('classifyVitals', () => {
  it('é verde quando não há medição', () => {
    expect(classifyVitals(null)).toEqual({ color: 'green', reason: null });
  });

  it('ignora sinais não medidos', () => {
    expect(classifyVitals({ heartRate: 80, temperature: null })).toEqual({ color: 'green', reason: null });
  });

  it('usa o pior sinal e junta os motivos de mesma gravidade', () => {
    const result = classifyVitals({ heartRate: 135, oxygenSaturation: 88, temperature: 38.5 });

    expect(result.color).toBe('red');
    expect(result.reason).toBe('FC 135 bpm · Saturação 88%');
  });
});

describe('classifyPendingExam', () => {
  it.each([
    [11.9, 'green'],
    [12, 'yellow'],
    [24, 'yellow'],
    [24.1, 'red'],
  ])('pendente há %dh → %s', (hours, expected) => {
    expect(classifyPendingExam(hours)).toBe(expected);
  });
});

describe('classifyPendingExams', () => {
  it('conta exames atrasados', () => {
    expect(classifyPendingExams([30, 48, 2])).toEqual({ color: 'red', reason: '2 exames atrasados' });
  });

  it('avisa sobre pendentes há mais de 12h', () => {
    expect(classifyPendingExams([13])).toEqual({ color: 'yellow', reason: '1 exame pendente há mais de 12h' });
  });

  it('é verde sem pendências', () => {
    expect(classifyPendingExams([])).toEqual({ color: 'green', reason: null });
  });
});

describe('classifyAdmission', () => {
  it.each(['alta', 'obito'] as const)('internação com %s é neutra, mesmo com sinais ruins', (situation) => {
    const result = classifyAdmission({
      situation,
      latestVitals: { oxygenSaturation: 80 },
      pendingExamHours: [100],
    });

    expect(result).toEqual({ color: 'neutral', reason: null });
  });

  it('combina sinais vitais e exames de mesma gravidade', () => {
    const result = classifyAdmission({
      situation: 'internado',
      latestVitals: { oxygenSaturation: 88 },
      pendingExamHours: [26],
    });

    expect(result).toEqual({ color: 'red', reason: 'Saturação 88% · 1 exame atrasado' });
  });

  it('mostra só o motivo do indicador mais grave', () => {
    const result = classifyAdmission({
      situation: 'internado',
      latestVitals: { heartRate: 105 },
      pendingExamHours: [30],
    });

    expect(result).toEqual({ color: 'red', reason: '1 exame atrasado' });
  });

  it('é verde quando tudo está normal', () => {
    const result = classifyAdmission({
      situation: 'internado',
      latestVitals: { heartRate: 80, oxygenSaturation: 98, temperature: 36.8, systolicPressure: 120 },
      pendingExamHours: [1],
    });

    expect(result).toEqual({ color: 'green', reason: null });
  });
});
