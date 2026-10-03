import { buildSnapshots, toDepartmentDetail, toDepartmentList, toOverview } from '../../src/services/dashboard';
import { admissionRow, capacityRow, noExams } from '../fixtures';

describe('buildSnapshots', () => {
  it('classifica as internações e propaga a cor para o departamento', () => {
    const [uti] = buildSnapshots(
      [capacityRow({ id: 1, occupiedBeds: 2 })],
      [
        admissionRow({ id: 1, bed: 1, oxygenSaturation: 88 }),
        admissionRow({ id: 2, bed: 2 }),
      ],
    );

    expect(uti.admissions.map((a) => [a.id, a.farol])).toEqual([
      [1, 'red'],
      [2, 'green'],
    ]);
    expect(uti.farol).toBe('red');
    expect(uti.farolReason).toBe('1 paciente crítico');
  });

  it('só considera internações do próprio departamento', () => {
    const [uti, ps] = buildSnapshots(
      [capacityRow({ id: 1 }), capacityRow({ id: 2, name: 'PS' })],
      [admissionRow({ departmentId: 2, oxygenSaturation: 85 })],
    );

    expect(uti.admissions).toHaveLength(0);
    expect(ps.admissions).toHaveLength(1);
  });

  it('ordena internações pela gravidade e, no empate, pela mais antiga', () => {
    const [uti] = buildSnapshots(
      [capacityRow()],
      [
        admissionRow({ id: 1, admittedAt: new Date('2026-09-10'), temperature: 38.5 }),
        admissionRow({ id: 2, admittedAt: new Date('2026-09-05'), temperature: 38.5 }),
        admissionRow({ id: 3, oxygenSaturation: 85 }),
      ],
    );

    expect(uti.admissions.map((a) => a.id)).toEqual([3, 2, 1]);
  });
});

describe('toOverview', () => {
  const snapshots = buildSnapshots(
    [
      capacityRow({ id: 1, name: 'UTI', totalBeds: 10, occupiedBeds: 1 }),
      capacityRow({ id: 2, name: 'Pediatria', totalBeds: 30, occupiedBeds: 1 }),
      capacityRow({ id: 3, name: 'Cirurgia', totalBeds: 10, occupiedBeds: 0 }),
    ],
    [
      admissionRow({ id: 1, departmentId: 1, temperature: 38.5 }),
      admissionRow({ id: 2, departmentId: 2, oxygenSaturation: 85 }),
    ],
  );

  it('calcula os KPIs do hospital', () => {
    const overview = toOverview(snapshots, { requested: 2, inProgress: 1, completed: 5, late: 1 }, 5.5);

    expect(overview.kpis).toEqual({
      occupancyPct: 4,
      occupiedBeds: 2,
      totalBeds: 50,
      activeAdmissions: 2,
      avgLengthOfStayDays: 5.5,
      pendingExams: 3,
      lateExams: 1,
    });
  });

  it('assume o pior caso para o hospital', () => {
    const overview = toOverview(snapshots, noExams, null);

    expect(overview.farol).toBe('red');
    expect(overview.farolReason).toBe('1 departamento crítico · 1 em alerta');
  });

  it('ordena departamentos do mais grave para o menos grave', () => {
    const overview = toOverview(snapshots, noExams, null);

    expect(overview.departments.map((d) => d.name)).toEqual(['Pediatria', 'UTI', 'Cirurgia']);
  });
});

describe('toDepartmentList', () => {
  it('devolve só id, nome e cor', () => {
    const list = toDepartmentList(buildSnapshots([capacityRow()], []));

    expect(list).toEqual([{ id: 1, name: 'UTI', farol: 'green' }]);
  });
});

describe('toDepartmentDetail', () => {
  const [snapshot] = buildSnapshots(
    [capacityRow({ totalBeds: 4, occupiedBeds: 2, nurses: 2, doctors: 1 })],
    [
      admissionRow({ id: 10, bed: 2, oxygenSaturation: 85 }),
      admissionRow({ id: 11, bed: 4 }),
    ],
  );
  const detail = toDepartmentDetail(snapshot, { requested: 1, inProgress: 0, completed: 3, late: 1 });

  it('monta o mapa com um item por leito, livres sem internação', () => {
    expect(detail.beds).toEqual({
      total: 4,
      occupied: 2,
      free: 2,
      map: [
        { bed: 1, admissionId: null, farol: null },
        { bed: 2, admissionId: 10, farol: 'red' },
        { bed: 3, admissionId: null, farol: null },
        { bed: 4, admissionId: 11, farol: 'green' },
      ],
    });
  });

  it('calcula a carga da equipe', () => {
    expect(detail.staff).toEqual({ doctors: 1, nurses: 2, patientsPerNurse: 1 });
  });

  it('lista só os pacientes que não estão verdes', () => {
    expect(detail.priorityAdmissions).toEqual([
      { id: 10, patientName: 'Paciente A', bed: 2, farol: 'red', farolReason: 'Saturação 85%' },
    ]);
  });

  it('não calcula carga sem enfermeiros', () => {
    const [noNurses] = buildSnapshots([capacityRow({ nurses: 0 })], []);

    expect(toDepartmentDetail(noNurses, noExams).staff.patientsPerNurse).toBeNull();
  });
});
