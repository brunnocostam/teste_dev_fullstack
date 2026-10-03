import type { ActiveAdmissionRow, DepartmentCapacityRow, ExamFunnelRow, HospitalRepository } from '../src/data/repository';

export function capacityRow(overrides: Partial<DepartmentCapacityRow> = {}): DepartmentCapacityRow {
  return { id: 1, name: 'UTI', totalBeds: 10, occupiedBeds: 0, doctors: 2, nurses: 2, ...overrides };
}

export function admissionRow(overrides: Partial<ActiveAdmissionRow> = {}): ActiveAdmissionRow {
  return {
    id: 100,
    departmentId: 1,
    patientName: 'Paciente A',
    bed: 1,
    admittedAt: new Date('2026-09-01T10:00:00Z'),
    heartRate: 80,
    oxygenSaturation: 98,
    temperature: 36.8,
    systolicPressure: 120,
    pendingExamHours: [],
    ...overrides,
  };
}

export const noExams: ExamFunnelRow = { requested: 0, inProgress: 0, completed: 0, late: 0 };

export function fakeRepository(overrides: Partial<HospitalRepository> = {}): HospitalRepository {
  return {
    departmentCapacity: jest.fn().mockResolvedValue([]),
    activeAdmissions: jest.fn().mockResolvedValue([]),
    examFunnel: jest.fn().mockResolvedValue(noExams),
    avgLengthOfStayDays: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}
