import type {
  ActiveAdmissionRow,
  AdmissionHeaderRow,
  ClosedAdmissionRow,
  DepartmentCapacityRow,
  ExamFunnelRow,
  ExamRow,
  HospitalRepository,
  VitalSignsRow,
} from '../src/data/repository';

export function capacityRow(overrides: Partial<DepartmentCapacityRow> = {}): DepartmentCapacityRow {
  return { id: 1, name: 'UTI', totalBeds: 10, occupiedBeds: 0, doctors: 2, nurses: 2, ...overrides };
}

export function admissionRow(overrides: Partial<ActiveAdmissionRow> = {}): ActiveAdmissionRow {
  return {
    id: 100,
    departmentId: 1,
    departmentName: 'UTI',
    patientName: 'Paciente A',
    bed: 1,
    admittedAt: new Date('2026-09-01T10:00:00Z'),
    daysAdmitted: 3,
    heartRate: 80,
    oxygenSaturation: 98,
    temperature: 36.8,
    systolicPressure: 120,
    pendingExamHours: [],
    ...overrides,
  };
}

export function closedRow(overrides: Partial<ClosedAdmissionRow> = {}): ClosedAdmissionRow {
  return {
    id: 200,
    departmentId: 1,
    departmentName: 'UTI',
    patientName: 'Paciente B',
    bed: 2,
    status: 'alta',
    admittedAt: new Date('2026-08-01T10:00:00Z'),
    dischargedAt: new Date('2026-08-05T10:00:00Z'),
    daysAdmitted: 4,
    ...overrides,
  };
}

export function headerRow(overrides: Partial<AdmissionHeaderRow> = {}): AdmissionHeaderRow {
  return {
    id: 100,
    status: 'internado',
    bed: 3,
    diagnosis: 'Pneumonia',
    admittedAt: new Date('2026-09-01T10:00:00Z'),
    dischargedAt: null,
    daysAdmitted: 3,
    patientId: 7,
    patientName: 'Paciente A',
    patientAge: 64,
    patientGender: 'F',
    departmentId: 1,
    departmentName: 'UTI',
    staffId: 4,
    staffName: 'Dra. Fulana',
    staffRole: 'médico',
    ...overrides,
  };
}

export function vitalsRow(overrides: Partial<VitalSignsRow> = {}): VitalSignsRow {
  return {
    recordedAt: new Date('2026-09-02T10:00:00Z'),
    heartRate: 80,
    systolicPressure: 120,
    diastolicPressure: 80,
    temperature: 36.8,
    oxygenSaturation: 98,
    ...overrides,
  };
}

export function examRow(overrides: Partial<ExamRow> = {}): ExamRow {
  return {
    id: 900,
    name: 'Hemograma completo',
    status: 'concluido',
    requestedAt: new Date('2026-09-01T12:00:00Z'),
    resultAt: new Date('2026-09-01T18:00:00Z'),
    result: 'Normal',
    hoursPending: null,
    ...overrides,
  };
}

export const noExams: ExamFunnelRow = { requested: 0, inProgress: 0, completed: 0, late: 0 };

export function fakeRepository(overrides: Partial<HospitalRepository> = {}): jest.Mocked<HospitalRepository> {
  return {
    departmentCapacity: jest.fn().mockResolvedValue([]),
    activeAdmissions: jest.fn().mockResolvedValue([]),
    closedAdmissions: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    examFunnel: jest.fn().mockResolvedValue(noExams),
    avgLengthOfStayDays: jest.fn().mockResolvedValue(null),
    admissionHeader: jest.fn().mockResolvedValue(null),
    admissionVitals: jest.fn().mockResolvedValue([]),
    admissionExams: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as jest.Mocked<HospitalRepository>;
}
