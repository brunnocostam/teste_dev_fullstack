import { describe, expect, it } from 'vitest';
import { formatDate, formatNumber, plural } from './format';
import { formatVital } from './vitals';

describe('formatNumber', () => {
  it('usa vírgula decimal e no máximo uma casa', () => {
    expect(formatNumber(3.75)).toBe('3,8');
    expect(formatNumber(1200)).toBe('1.200');
  });
});

describe('plural', () => {
  it('escolhe singular só para 1', () => {
    expect(plural(1, 'dia', 'dias')).toBe('1 dia');
    expect(plural(0, 'dia', 'dias')).toBe('0 dias');
    expect(plural(2.5, 'dia', 'dias')).toBe('2,5 dias');
  });
});

describe('formatDate', () => {
  it('formata no padrão brasileiro', () => {
    // Meio-dia UTC: mesmo dia em qualquer fuso do Brasil.
    expect(formatDate('2026-10-01T12:00:00Z')).toBe('01/10/2026');
  });
});

describe('formatVital', () => {
  it('aplica unidade e casas decimais de cada sinal', () => {
    expect(formatVital('heartRate', 88)).toBe('88 bpm');
    expect(formatVital('temperature', 38)).toBe('38,0 °C');
    expect(formatVital('oxygenSaturation', 94)).toBe('94%');
  });
});
