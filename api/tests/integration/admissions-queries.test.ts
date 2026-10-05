import { createHospitalRepository } from '../../src/data/repository';
import {
  insertAdmission,
  insertDepartment,
  insertExam,
  insertPatient,
  insertStaff,
  insertVitals,
  useTestDatabase,
} from './support/database';

const t = useTestDatabase();
const repo = () => createHospitalRepository(t.db);

describe('activeAdmissions', () => {
  it('traz só internações ativas, com departamento e paciente', async () => {
    const uti = await insertDepartment(t.db, { name: 'UTI' });
    const ana = await insertPatient(t.db, { name: 'Ana Souza' });
    const active = await insertAdmission(t.db, { patientId: ana, departmentId: uti, bed: 3 });
    await insertAdmission(t.db, { patientId: ana, departmentId: uti, status: 'alta' });

    const rows = await repo().activeAdmissions();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: active, departmentId: uti, departmentName: 'UTI', patientName: 'Ana Souza', bed: 3 });
  });

  it('usa a medição mais recente por horário, não pela ordem de inserção', async () => {
    const uti = await insertDepartment(t.db);
    const patient = await insertPatient(t.db);
    const id = await insertAdmission(t.db, { patientId: patient, departmentId: uti });
    await insertVitals(t.db, id, { measuredAt: { hoursAgo: 1 }, heartRate: 130, oxygenSaturation: 88, temperature: 38.6 });
    // Inserida depois, mas medida antes: não é a "última".
    await insertVitals(t.db, id, { measuredAt: { hoursAgo: 5 }, heartRate: 70 });

    const [row] = await repo().activeAdmissions();

    expect(row).toMatchObject({ heartRate: 130, oxygenSaturation: 88, temperature: 38.6, systolicPressure: 120 });
  });

  it('informa as horas de cada exame pendente e ignora os concluídos', async () => {
    const uti = await insertDepartment(t.db);
    const patient = await insertPatient(t.db);
    const id = await insertAdmission(t.db, { patientId: patient, departmentId: uti });
    await insertExam(t.db, id, { status: 'solicitado', requestedAt: { hoursAgo: 30 } });
    await insertExam(t.db, id, { status: 'em_andamento', requestedAt: { hoursAgo: 3 } });
    await insertExam(t.db, id, { status: 'concluido', requestedAt: { hoursAgo: 50 } });

    const [row] = await repo().activeAdmissions();

    const hours = [...row.pendingExamHours].sort((a, b) => a - b);
    expect(hours).toHaveLength(2);
    expect(hours[0]).toBeCloseTo(3, 1);
    expect(hours[1]).toBeCloseTo(30, 1);
  });

  it('aceita internação sem medição nem exame', async () => {
    const uti = await insertDepartment(t.db);
    const patient = await insertPatient(t.db);
    await insertAdmission(t.db, { patientId: patient, departmentId: uti });

    const [row] = await repo().activeAdmissions();

    expect(row).toMatchObject({ heartRate: null, oxygenSaturation: null, temperature: null, systolicPressure: null, pendingExamHours: [] });
  });

  it('não duplica a internação quando há várias medições e exames', async () => {
    const uti = await insertDepartment(t.db);
    const patient = await insertPatient(t.db);
    const id = await insertAdmission(t.db, { patientId: patient, departmentId: uti });
    for (const h of [1, 2, 3]) await insertVitals(t.db, id, { measuredAt: { hoursAgo: h } });
    for (const h of [1, 2]) await insertExam(t.db, id, { status: 'solicitado', requestedAt: { hoursAgo: h } });

    expect(await repo().activeAdmissions()).toHaveLength(1);
  });
});

describe('filtros da listagem', () => {
  // O banco guarda UTC; o período é escolhido em dias de Brasília (UTC-3).
  // Cada horário abaixo está em UTC, com o equivalente em Brasília ao lado.
  async function scenario() {
    const uti = await insertDepartment(t.db, { name: 'UTI' });
    const ps = await insertDepartment(t.db, { name: 'Pronto Socorro' });
    const ids = {
      ana: await insertAdmission(t.db, {
        patientId: await insertPatient(t.db, { name: 'Ana Souza' }),
        departmentId: uti,
        admittedAt: '2026-10-01 03:00', // 01/10 00:00 em Brasília
      }),
      bruno: await insertAdmission(t.db, {
        patientId: await insertPatient(t.db, { name: 'Bruno Lima' }),
        departmentId: ps,
        admittedAt: '2026-10-04 02:59', // 03/10 23:59 em Brasília
      }),
      carla: await insertAdmission(t.db, {
        patientId: await insertPatient(t.db, { name: 'Carla 100% Silva' }),
        departmentId: ps,
        admittedAt: '2026-10-04 03:00', // 04/10 00:00 em Brasília
      }),
      antiga: await insertAdmission(t.db, {
        patientId: await insertPatient(t.db, { name: 'Ana Paula' }),
        departmentId: uti,
        admittedAt: '2026-10-01 02:59', // 30/09 23:59 em Brasília
      }),
    };
    return { uti, ps, ids };
  }

  const ids = (rows: { id: number }[]) => rows.map((r) => r.id).sort((a, b) => a - b);

  it('filtra por departamento', async () => {
    const s = await scenario();

    expect(ids(await repo().activeAdmissions({ departmentId: s.ps }))).toEqual([s.ids.bruno, s.ids.carla]);
  });

  it('busca por parte do nome, sem diferenciar maiúsculas', async () => {
    const s = await scenario();

    expect(ids(await repo().activeAdmissions({ search: 'ana' }))).toEqual([s.ids.ana, s.ids.antiga]);
  });

  it('trata % e _ da busca como texto, não como curinga', async () => {
    const s = await scenario();

    expect(ids(await repo().activeAdmissions({ search: '100%' }))).toEqual([s.ids.carla]);
    expect(await repo().activeAdmissions({ search: '%' })).toHaveLength(1);
    expect(await repo().activeAdmissions({ search: '_' })).toHaveLength(0);
  });

  it('filtra pela data de entrada em dias de Brasília, incluindo o dia final inteiro', async () => {
    const s = await scenario();

    expect(ids(await repo().activeAdmissions({ from: '2026-10-01', to: '2026-10-03' }))).toEqual([s.ids.ana, s.ids.bruno]);
  });

  it('conta a entrada às 22h de Brasília no mesmo dia, mesmo já sendo o dia seguinte em UTC', async () => {
    const uti = await insertDepartment(t.db);
    const night = await insertAdmission(t.db, {
      patientId: await insertPatient(t.db),
      departmentId: uti,
      admittedAt: '2026-10-02 01:00', // 01/10 22:00 em Brasília
    });

    expect(ids(await repo().activeAdmissions({ from: '2026-10-01', to: '2026-10-01' }))).toEqual([night]);
    expect(await repo().activeAdmissions({ from: '2026-10-02', to: '2026-10-02' })).toEqual([]);
  });

  it('combina os filtros', async () => {
    const s = await scenario();

    expect(ids(await repo().activeAdmissions({ departmentId: s.uti, search: 'ana', from: '2026-10-01' }))).toEqual([s.ids.ana]);
  });

  it('aplica os mesmos filtros às encerradas', async () => {
    const uti = await insertDepartment(t.db);
    const patient = await insertPatient(t.db, { name: 'Davi Rocha' });
    const inside = await insertAdmission(t.db, { patientId: patient, departmentId: uti, status: 'alta', admittedAt: '2026-10-02 10:00', dischargedAt: '2026-10-05 10:00' });
    await insertAdmission(t.db, { patientId: patient, departmentId: uti, status: 'alta', admittedAt: '2026-09-20 10:00', dischargedAt: '2026-10-02 10:00' });

    const result = await repo().closedAdmissions({ search: 'davi', from: '2026-10-01', to: '2026-10-03' }, 20, 0);

    expect(result.total).toBe(1);
    expect(result.rows.map((r) => r.id)).toEqual([inside]);
  });
});

describe('closedAdmissions', () => {
  async function scenario() {
    const uti = await insertDepartment(t.db);
    const patient = await insertPatient(t.db);
    const closed = (status: 'alta' | 'obito', day: number) =>
      insertAdmission(t.db, {
        patientId: patient,
        departmentId: uti,
        status,
        admittedAt: '2026-08-01 08:00',
        dischargedAt: `2026-09-${String(day).padStart(2, '0')} 08:00`,
      });
    await insertAdmission(t.db, { patientId: patient, departmentId: uti });
    return {
      alta1: await closed('alta', 1),
      obito5: await closed('obito', 5),
      alta9: await closed('alta', 9),
    };
  }

  it('traz só encerradas, da alta mais recente para a mais antiga', async () => {
    const s = await scenario();

    const result = await repo().closedAdmissions({}, 20, 0);

    expect(result.total).toBe(3);
    expect(result.rows.map((r) => r.id)).toEqual([s.alta9, s.obito5, s.alta1]);
    expect(result.rows[0]).toMatchObject({ status: 'alta', daysAdmitted: 39 });
  });

  it('filtra pela situação', async () => {
    const s = await scenario();

    const result = await repo().closedAdmissions({ status: 'obito' }, 20, 0);

    expect(result).toMatchObject({ total: 1, rows: [{ id: s.obito5, status: 'obito' }] });
  });

  it('pagina com limit e offset, mantendo o total', async () => {
    const s = await scenario();

    const result = await repo().closedAdmissions({}, 1, 1);

    expect(result.total).toBe(3);
    expect(result.rows.map((r) => r.id)).toEqual([s.obito5]);
  });

  it('devolve página vazia além do fim, ainda com o total', async () => {
    await scenario();

    expect(await repo().closedAdmissions({}, 20, 10)).toEqual({ rows: [], total: 3 });
  });
});

describe('detalhe da internação', () => {
  async function scenario() {
    const uti = await insertDepartment(t.db, { name: 'UTI' });
    const doctor = await insertStaff(t.db, uti, 'médico', 'Dra. Helena Costa');
    const patient = await insertPatient(t.db, { name: 'Ana Souza', birthDate: '1980-01-01', gender: 'F' });
    const id = await insertAdmission(t.db, { patientId: patient, departmentId: uti, staffId: doctor, bed: 7, diagnosis: 'Pneumonia' });
    return { uti, doctor, patient, id };
  }

  it('monta o cabeçalho com paciente, departamento e profissional', async () => {
    const s = await scenario();

    const header = await repo().admissionHeader(s.id);

    expect(header).toMatchObject({
      id: s.id,
      status: 'internado',
      bed: 7,
      diagnosis: 'Pneumonia',
      dischargedAt: null,
      daysAdmitted: 2,
      patientId: s.patient,
      patientName: 'Ana Souza',
      patientGender: 'F',
      departmentName: 'UTI',
      staffId: s.doctor,
      staffName: 'Dra. Helena Costa',
      staffRole: 'médico',
    });
    // Nascida em 1º de janeiro: o aniversário do ano corrente já passou.
    expect(header?.patientAge).toBe(new Date().getFullYear() - 1980);
  });

  it('aceita internação sem profissional responsável', async () => {
    const uti = await insertDepartment(t.db);
    const id = await insertAdmission(t.db, { patientId: await insertPatient(t.db), departmentId: uti });

    expect(await repo().admissionHeader(id)).toMatchObject({ staffId: null, staffName: null, staffRole: null });
  });

  it('devolve null para internação inexistente', async () => {
    expect(await repo().admissionHeader(999)).toBeNull();
  });

  it('lista as medições em ordem cronológica, só da internação pedida', async () => {
    const s = await scenario();
    const other = await insertAdmission(t.db, { patientId: s.patient, departmentId: s.uti, bed: 8 });
    await insertVitals(t.db, s.id, { measuredAt: '2026-10-02 12:00', heartRate: 90 });
    await insertVitals(t.db, s.id, { measuredAt: '2026-10-01 12:00', heartRate: 80, temperature: null });
    await insertVitals(t.db, other, { measuredAt: '2026-10-01 13:00', heartRate: 60 });

    const vitals = await repo().admissionVitals(s.id);

    expect(vitals.map((v) => [v.heartRate, v.temperature])).toEqual([
      [80, null],
      [90, 36.5],
    ]);
  });

  it('lista os exames com horas pendentes só para os não concluídos', async () => {
    const s = await scenario();
    await insertExam(t.db, s.id, { status: 'concluido', requestedAt: { hoursAgo: 40 }, name: 'Glicemia' });
    await insertExam(t.db, s.id, { status: 'solicitado', requestedAt: { hoursAgo: 26 }, name: 'Tomografia' });

    const exams = await repo().admissionExams(s.id);

    expect(exams.map((e) => [e.name, e.status, e.result])).toEqual([
      ['Glicemia', 'concluido', 'Normal'],
      ['Tomografia', 'solicitado', null],
    ]);
    expect(exams[0].hoursPending).toBeNull();
    expect(exams[1].hoursPending).toBeCloseTo(26, 1);
  });
});
