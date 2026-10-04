import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AdmissionDetail, FarolColor, VitalSign } from '../api/types';
import { FAROL_LABEL } from '../farol/labels';
import { formatDateTime } from '../format';
import { VITAL_META, VITAL_ORDER, formatVital } from '../vitals';
import styles from './VitalsChart.module.css';

interface Point {
  t: number;
  value: number | null;
  diastolic: number | null;
}

interface VitalsChartProps {
  vitals: AdmissionDetail['vitals'];
  ranges: AdmissionDetail['referenceRanges'];
  latestFarol: Partial<Record<VitalSign, FarolColor>>;
}

/** Passo dos valores do eixo Y por sinal, para ticks redondos. */
const Y_STEP: Record<VitalSign, number> = { heartRate: 10, systolicPressure: 10, temperature: 0.5, oxygenSaturation: 2 };

/** Domínio do eixo Y cobrindo dados e faixa normal, com folga e arredondado ao passo do sinal. */
function yAxis(values: number[], range: { min: number; max: number }, sign: VitalSign) {
  const step = Y_STEP[sign];
  const lo = Math.floor((Math.min(range.min, ...values) - step / 2) / step) * step;
  let hi = Math.ceil((Math.max(range.max, ...values) + step / 2) / step) * step;
  if (sign === 'oxygenSaturation') hi = Math.min(hi, 100);

  // No máximo ~6 ticks: dobra o intervalo enquanto houver ticks demais.
  let interval = step;
  while ((hi - lo) / interval > 6) interval *= 2;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += interval) ticks.push(Math.round(t * 10) / 10);
  return { domain: [lo, hi] as [number, number], ticks };
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: Point }[];
  sign: VitalSign;
}

function VitalsTooltip({ active, payload, sign }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTime}>{formatDateTime(p.t)}</p>
      {p.value !== null && (
        <p>
          {sign === 'systolicPressure' ? `Sistólica ${p.value} · Diastólica ${p.diastolic ?? '—'} mmHg` : formatVital(sign, p.value)}
        </p>
      )}
    </div>
  );
}

/** Série temporal por sinal vital, com a faixa normal sombreada e o último ponto na cor do farol. */
export function VitalsChart({ vitals, ranges, latestFarol }: VitalsChartProps) {
  const [sign, setSign] = useState<VitalSign>('heartRate');
  const meta = VITAL_META[sign];
  const range = ranges[sign];

  const points: Point[] = vitals.map((v) => ({
    t: Date.parse(v.recordedAt),
    value: v[sign],
    diastolic: v.diastolicPressure,
  }));
  const values = points.flatMap((p) => [p.value, sign === 'systolicPressure' ? p.diastolic : null]).filter((v) => v !== null);
  const lastIndex = points.findLastIndex((p) => p.value !== null);
  const last = lastIndex >= 0 ? points[lastIndex] : null;
  const lastFarol = latestFarol[sign] ?? 'neutral';
  const axis = yAxis(values.length > 0 ? values : [range.min], range, sign);
  const rangeText = `${formatVital(sign, range.min)} a ${formatVital(sign, range.max)}`;

  return (
    <div>
      <div className={styles.tabs} role="tablist" aria-label="Sinal vital">
        {VITAL_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            id={`vital-tab-${s}`}
            aria-selected={s === sign}
            aria-controls="vital-panel"
            className={styles.tab}
            onClick={() => setSign(s)}
          >
            {VITAL_META[s].short}
          </button>
        ))}
      </div>

      <div id="vital-panel" role="tabpanel" aria-labelledby={`vital-tab-${sign}`}>
        {last ? (
          <p className={styles.summary}>
            <span>
              Último: <strong>{formatVital(sign, last.value as number)}</strong>
              {lastFarol !== 'green' && lastFarol !== 'neutral' && ` (${FAROL_LABEL[lastFarol]})`}
            </span>
            <span className={styles.range}>
              <span className={styles.rangeSwatch} aria-hidden="true" />
              Faixa normal {sign === 'systolicPressure' ? 'da sistólica ' : ''}
              {rangeText}
            </span>
          </p>
        ) : (
          <p className={styles.summary}>Sem medições de {meta.label.toLowerCase()}.</p>
        )}

        {values.length > 0 && (
          <div
            className={styles.chart}
            role="img"
            aria-label={`${meta.label} ao longo da internação: ${values.length} medições, faixa normal ${rangeText}.`}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={points} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <ReferenceArea y1={range.min} y2={range.max} ifOverflow="extendDomain" />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(t: number) => formatDateTime(t)}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                  padding={{ left: 12, right: 12 }}
                />
                <YAxis
                  domain={axis.domain}
                  ticks={axis.ticks}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v: number) => v.toLocaleString('pt-BR')}
                />
                <Tooltip content={<VitalsTooltip sign={sign} />} cursor={{ className: styles.cursor }} />
                {sign === 'systolicPressure' && (
                  <Line
                    dataKey="diastolic"
                    className={styles.secondaryLine}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                )}
                <Line
                  dataKey="value"
                  className={styles.line}
                  strokeWidth={2}
                  isAnimationActive={false}
                  connectNulls
                  dot={(props: { cx?: number; cy?: number; index?: number }) => {
                    const isLast = props.index === lastIndex;
                    return (
                      <circle
                        key={props.index}
                        cx={props.cx}
                        cy={props.cy}
                        r={isLast ? 6 : 3}
                        className={isLast ? `${styles.lastDot} ${styles[lastFarol]}` : styles.dot}
                      />
                    );
                  }}
                  activeDot={{ r: 5, className: styles.activeDot }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {sign === 'systolicPressure' && values.length > 0 && (
          <ul className={styles.legend} aria-label="Legenda">
            <li>
              <span className={styles.legendLine} aria-hidden="true" />
              Sistólica
            </li>
            <li>
              <span className={`${styles.legendLine} ${styles.legendDashed}`} aria-hidden="true" />
              Diastólica
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
