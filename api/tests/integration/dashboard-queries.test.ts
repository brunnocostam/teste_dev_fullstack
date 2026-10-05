import { createHospitalRepository } from '../../src/data/repository';
import {
  insertAdmission,
  insertDepartment,
  insertExam,
  insertPatient,
  insertStaff,
  useTestDatabase,
} from './support/database';

const t = useTestDatabase();
const repo = () => createHospitalRepository(t.db);

describe('departmentCapacity', () => {
  it('conta leitos ocupados só de internações ativas', async () => {
    const uti = await insertDepartment(t.db, { name: 'UTI', totalBeds: 10 });
    const patient = await insertPatient(t.db);
    await insertAdmission(t.db, { patientId: patient, departmentId: uti, bed: 1 });
    await insertAdmission(t.db, { patientId: patient, departmentId: uti, bed: 2 });
    await insertAdmission(t.db, { patientId: patient, departmentId: uti, bed: 3, status: 'alta' });
    await insertAdmission(t.db, { patientId: patient, departmentId: uti, bed: 4, status: 'obito' });

    const [row] = await repo().departmentCapacity();

    expect(row).toMatchObject({ name: 'UTI', totalBeds: 10, occupiedBeds: 2 });
  });

  it('não multiplica equipe por internações no JOIN', async () => {
    const uti = await insertDepartment(t.db);
    await insertStaff(t.db, uti, 'médico');
    await insertStaff(t.db, uti, 'enfermeiro');
    await insertStaff(t.db, uti, 'enfermeiro');
    const patient = await insertPatient(t.db);
    for (const bed of [1, 2, 3]) await insertAdmission(t.db, { patientId: patient, departmentId: uti, bed });

    const [row] = await repo().departmentCapacity();

    expect(row).toMatchObject({ occupiedBeds: 3, doctors: 1, nurses: 2 });
  });

  it('devolve zeros para departamento sem internações nem equipe', async () => {
    await insertDepartment(t.db, { name: 'Pediatria', totalBeds: 20 });

    expect(await repo().departmentCapacity()).toEqual([
      { id: 1, name: 'Pediatria', totalBeds: 20, occupiedBeds: 0, doctors: 0, nurses: 0 },
    ]);
  });

  it('filtra por departamento e devolve vazio para id inexistente', async () => {
    await insertDepartment(t.db, { name: 'UTI' });
    const ps = await insertDepartment(t.db, { name: 'Pronto Socorro' });

    expect((await repo().departmentCapacity(ps)).map((d) => d.name)).toEqual(['Pronto Socorro']);
    expect(await repo().departmentCapacity(999)).toEqual([]);
  });
});

describe('examFunnel', () => {
  async function scenario() {
    const uti = await insertDepartment(t.db, { name: 'UTI' });
    const ps = await insertDepartment(t.db, { name: 'Pronto Socorro' });
    const patient = await insertPatient(t.db);
    const active = await insertAdmission(t.db, { patientId: patient, departmentId: uti, bed: 1 });
    const otherDept = await insertAdmission(t.db, { patientId: patient, departmentId: ps, bed: 1 });
    const closed = await insertAdmission(t.db, { patientId: patient, departmentId: uti, bed: 2, status: 'alta' });

    await insertExam(t.db, active, { status: 'solicitado', requestedAt: { hoursAgo: 2 } });
    await insertExam(t.db, active, { status: 'solicitado', requestedAt: { hoursAgo: 30 } });
    await insertExam(t.db, active, { status: 'em_andamento', requestedAt: { hoursAgo: 25 } });
    await insertExam(t.db, active, { status: 'concluido', requestedAt: { hoursAgo: 40 } });
    await insertExam(t.db, otherDept, { status: 'em_andamento', requestedAt: { hoursAgo: 1 } });
    // Internação encerrada: fora do funil mesmo com exame "pendente".
    await insertExam(t.db, closed, { status: 'solicitado', requestedAt: { hoursAgo: 100 } });
    return { uti };
  }

  it('conta exames das internações ativas por etapa, com atrasados acima do limite', async () => {
    await scenario();

    expect(await repo().examFunnel(24)).toEqual({ requested: 2, inProgress: 2, completed: 1, late: 2 });
  });

  it('filtra por departamento', async () => {
    const { uti } = await scenario();

    expect(await repo().examFunnel(24, uti)).toEqual({ requested: 2, inProgress: 1, completed: 1, late: 2 });
  });

  it('devolve zeros sem exames', async () => {
    expect(await repo().examFunnel(24)).toEqual({ requested: 0, inProgress: 0, completed: 0, late: 0 });
  });
});

describe('avgLengthOfStayDays', () => {
  it('faz a média só das encerradas, com uma casa decimal', async () => {
    const uti = await insertDepartment(t.db);
    const patient = await insertPatient(t.db);
    await insertAdmission(t.db, { patientId: patient, departmentId: uti, status: 'alta', admittedAt: '2026-09-01 08:00', dischargedAt: '2026-09-03 08:00' });
    await insertAdmission(t.db, { patientId: patient, departmentId: uti, status: 'obito', admittedAt: '2026-09-01 08:00', dischargedAt: '2026-09-06 20:00' });
    // Ativa há 100 dias: não entra na média.
    await insertAdmission(t.db, { patientId: patient, departmentId: uti, admittedAt: { hoursAgo: 2400 } });

    // (2 + 5,5) / 2 = 3,75 → 3,8
    expect(await repo().avgLengthOfStayDays()).toBe(3.8);
  });

  it('é null quando não há internação encerrada', async () => {
    expect(await repo().avgLengthOfStayDays()).toBeNull();
  });
});
