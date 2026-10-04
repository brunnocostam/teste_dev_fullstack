import { listAdmissions, toAdmissionDetail } from '../../src/services/admissions';
import { admissionRow, closedRow, examRow, fakeRepository, headerRow, vitalsRow } from '../fixtures';

describe('listAdmissions', () => {
  const actives = [
    admissionRow({ id: 1, daysAdmitted: 2 }),
    admissionRow({ id: 2, daysAdmitted: 9, temperature: 38.5 }),
    admissionRow({ id: 3, daysAdmitted: 1, oxygenSaturation: 85 }),
  ];

  it('ordena ativas por gravidade e, no empate, por mais dias internado', async () => {
    const repo = fakeRepository({ activeAdmissions: jest.fn().mockResolvedValue(actives) });

    const result = await listAdmissions(repo, { page: 1, pageSize: 20 });

    expect(result.items.map((i) => [i.id, i.farol])).toEqual([
      [3, 'red'],
      [2, 'yellow'],
      [1, 'green'],
    ]);
  });

  it('completa a página com encerradas, descontando as ativas do offset', async () => {
    const repo = fakeRepository({
      activeAdmissions: jest.fn().mockResolvedValue(actives),
      closedAdmissions: jest.fn().mockResolvedValue({ rows: [closedRow({ id: 50 })], total: 10 }),
    });

    // Página 2 de tamanho 2: 1 ativa (a 3ª) + 1 encerrada a partir do início das encerradas.
    const result = await listAdmissions(repo, { page: 2, pageSize: 2 });

    expect(result.items.map((i) => i.id)).toEqual([1, 50]);
    expect(repo.closedAdmissions).toHaveBeenCalledWith({ status: undefined }, 1, 0);
    expect(result.total).toBe(13);
  });

  it('pagina só encerradas quando as ativas já acabaram', async () => {
    const repo = fakeRepository({ activeAdmissions: jest.fn().mockResolvedValue(actives) });

    await listAdmissions(repo, { page: 3, pageSize: 2 });

    // offset 4 - 3 ativas = 1 encerrada já exibida na página anterior.
    expect(repo.closedAdmissions).toHaveBeenCalledWith({ status: undefined }, 2, 1);
  });

  it('não consulta encerradas quando o filtro é "internado"', async () => {
    const repo = fakeRepository({ activeAdmissions: jest.fn().mockResolvedValue(actives) });

    const result = await listAdmissions(repo, { status: 'internado', page: 1, pageSize: 20 });

    expect(repo.closedAdmissions).not.toHaveBeenCalled();
    expect(result.total).toBe(3);
  });

  it('não consulta ativas quando o filtro é de encerradas', async () => {
    const repo = fakeRepository({
      closedAdmissions: jest.fn().mockResolvedValue({ rows: [closedRow({ status: 'obito' })], total: 1 }),
    });

    const result = await listAdmissions(repo, { status: 'obito', page: 1, pageSize: 20 });

    expect(repo.activeAdmissions).not.toHaveBeenCalled();
    expect(repo.closedAdmissions).toHaveBeenCalledWith({ status: 'obito' }, 20, 0);
    expect(result.items[0]).toMatchObject({ status: 'obito', farol: 'neutral', farolReason: null });
  });

  it('repassa os filtros para as duas consultas', async () => {
    const repo = fakeRepository();
    const filters = { departmentId: 5, search: 'silva', from: '2026-09-01', to: '2026-09-30' };

    await listAdmissions(repo, { ...filters, page: 1, pageSize: 20 });

    expect(repo.activeAdmissions).toHaveBeenCalledWith(filters);
    expect(repo.closedAdmissions).toHaveBeenCalledWith({ ...filters, status: undefined }, 20, 0);
  });
});

describe('toAdmissionDetail', () => {
  const vitals = [
    vitalsRow({ recordedAt: new Date('2026-09-02T10:00:00Z'), oxygenSaturation: 89 }),
    vitalsRow({ recordedAt: new Date('2026-09-03T10:00:00Z'), heartRate: 105 }),
  ];
  const exams = [
    examRow({ id: 1, status: 'concluido' }),
    examRow({ id: 2, status: 'solicitado', resultAt: null, result: null, hoursPending: 30.7, requestedAt: new Date('2026-09-02T00:00:00Z') }),
    examRow({ id: 3, status: 'em_andamento', resultAt: null, result: null, hoursPending: 3 }),
  ];
  const detail = toAdmissionDetail(headerRow(), vitals, exams);

  it('classifica pela última medição e pelos exames pendentes', () => {
    expect(detail.farol).toBe('red');
    expect(detail.farolReason).toBe('1 exame atrasado');
  });

  it('marca a cor de cada sinal da última medição', () => {
    expect(detail.latestVitals?.farol).toEqual({
      heartRate: 'yellow',
      oxygenSaturation: 'green',
      temperature: 'green',
      systolicPressure: 'green',
    });
  });

  it('expõe as faixas normais do thresholds.ts', () => {
    expect(detail.referenceRanges.oxygenSaturation).toEqual({ min: 96, max: 100 });
  });

  it('traduz o status dos exames e coloca atrasados primeiro', () => {
    expect(detail.exams.map((e) => [e.id, e.status, e.hoursPending])).toEqual([
      [2, 'late', 30],
      [3, 'in_progress', 3],
      [1, 'completed', null],
    ]);
  });

  it('monta a timeline em ordem cronológica com alertas de sinais vitais', () => {
    expect(detail.timeline.map((e) => [e.type, e.label])).toEqual([
      ['admission', 'Entrada em UTI'],
      ['exam', 'Exame solicitado: Hemograma completo'], // 01/09 12h (exame 1)
      ['exam', 'Exame solicitado: Hemograma completo'], // 01/09 12h (exame 3)
      ['exam', 'Resultado de Hemograma completo: Normal'], // 01/09 18h (resultado do exame 1)
      ['exam', 'Exame solicitado: Hemograma completo'], // 02/09 00h (exame 2)
      ['alert', 'Saturação 89%'],
      ['alert', 'FC 105 bpm'],
    ]);
  });

  it('é neutra e termina com o óbito quando a internação foi encerrada assim', () => {
    const closed = toAdmissionDetail(
      headerRow({ status: 'obito', dischargedAt: new Date('2026-09-10T00:00:00Z') }),
      vitals,
      [],
    );

    expect(closed.farol).toBe('neutral');
    expect(closed.timeline.at(-1)).toMatchObject({ type: 'death', label: 'Óbito' });
  });

  it('aceita internação sem sinais vitais nem profissional responsável', () => {
    const empty = toAdmissionDetail(headerRow({ staffId: null, staffName: null, staffRole: null }), [], []);

    expect(empty.latestVitals).toBeNull();
    expect(empty.attendingStaff).toBeNull();
    expect(empty.farol).toBe('green');
  });
});
