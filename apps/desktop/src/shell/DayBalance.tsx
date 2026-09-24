import { useEffect, useMemo, useState } from 'react';
import type { AioSizingOutputV1, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from '../app/models/projectView';
import { useCalculationState } from '../app/CalculationProvider';
import { fmt } from '../domain/format';
import { fill, useT } from '../i18n';

const W = 320;
const H = 132;
const PAD_L = 34;
const PAD_R = 38;
const PAD_T = 10;
const PAD_B = 20;

function niceScale(maximum: number, ticks = 3): { top: number; steps: number[] } {
  if (!(maximum > 0)) return { top: 1, steps: [0, 1] };
  const rough = maximum / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(maximum / step) * step;
  const steps: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) steps.push(value);
  return { top, steps };
}

function tickDecimals(step: number): number {
  return step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)));
}

export function DayBalance({ project, defaultOpen = false, pinned = false }: {
  readonly project: ProjectViewModel;
  readonly defaultOpen?: boolean;
  readonly pinned?: boolean;
}) {
  const t = useT();
  const sizingState = useCalculationState<AioSizingOutputV1>(project.id, 'sizing', project.updatedAt);
  const solarState = useCalculationState<SolarResourceAnalysisOutputV1>(project.id, 'solar-resource', project.updatedAt);
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  useEffect(() => setCollapsed(!defaultOpen), [defaultOpen]);
  const open = pinned || !collapsed;

  const model = useMemo(() => {
    const output = solarState.status === 'ready' ? solarState.envelope.output : null;
    const loadW = output?.loadHourlyEnergyWh ?? Array.from({ length: 24 }, () => 0);
    const peakW = output?.loadHourlyPeakPowerW ?? loadW;
    const irradiance = output?.meanHourlyPoaWm2 ?? Array.from({ length: 24 }, () => 0);
    const load = loadW.map((value) => value / 1000);
    const peak = peakW.map((value) => value / 1000);
    return {
      load,
      peak,
      irradiance,
      hasLoad: load.some((value) => value > 0),
      hasWeather: irradiance.some((value) => value > 0),
      kw: niceScale(Math.max(...peak, ...load, 0)),
      wm2: niceScale(Math.max(...irradiance, 0)),
      dailyEnergyKWh: load.reduce((sum, value) => sum + value, 0),
      peakLoadKw: Math.max(...load, 0),
      peakStartupKw: Math.max(...peak, 0),
      peakHour: peak.indexOf(Math.max(...peak, 0)),
      gamma: output?.annualGamma?.status === 'available' ? output.annualGamma.annualGammaRatio : output?.gamma?.status === 'available' ? output.gamma.value : null,
    };
  }, [solarState]);

  if (!model.hasLoad && !model.hasWeather) {
    return <div className="dayb is-empty">
      <div className="dayb-head"><span className="h-sec">{t('dayBalance.profilDeChargeAmp')}</span></div>
      <p className="dayb-none">{t('dayBalance.ajoutezDesAppareilsA')}</p>
    </div>;
  }

  const plotWidth = W - PAD_L - PAD_R;
  const plotHeight = H - PAD_T - PAD_B;
  const base = H - PAD_B;
  const slot = plotWidth / 24;
  const barWidth = slot * 0.62;
  const xBar = (hour: number) => PAD_L + hour * slot + (slot - barWidth) / 2;
  const xLine = (hour: number) => PAD_L + hour * slot + slot / 2;
  const yKw = (value: number) => base - value / model.kw.top * plotHeight;
  const yIrradiance = (value: number) => base - value / model.wm2.top * plotHeight;
  const irradiancePath = model.irradiance.map((value, hour) => `${xLine(hour)},${yIrradiance(value)}`).join(' ');
  const sizingReady = sizingState.status === 'ready';

  return <div className={`dayb ${open ? '' : 'is-shut'}`}>
    <div className="dayb-head">
      <span className="h-sec">{t('dayBalance.chargeAmpIrradiance')}</span><span className="sep" />
      {!pinned && <button className="toggle" onClick={() => setCollapsed((value) => !value)} aria-expanded={open} title={open ? t('dayBalance.replierLeGraphe') : t('dayBalance.afficherLeGraphe')}>{open ? '▾' : '▸'}</button>}
    </div>
    {open && <>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="dayb-plot" role="img" aria-label={fill(t('dayBalance.chartLabel'), { kw: fmt(model.kw.top, 1), wm2: fmt(model.wm2.top, 0) })}>
        {model.kw.steps.map((value) => <line key={`grid-${value}`} x1={PAD_L} y1={yKw(value)} x2={W - PAD_R} y2={yKw(value)} className="dayb-grid" />)}
        {model.kw.steps.map((value) => <text key={`kw-${value}`} x={PAD_L - 4} y={yKw(value) + 3} className="dayb-tick t-left">{fmt(value, tickDecimals(model.kw.steps[1] ?? model.kw.top))}</text>)}
        {model.hasWeather && model.wm2.steps.map((value) => <text key={`irr-${value}`} x={W - PAD_R + 4} y={yIrradiance(value) + 3} className="dayb-tick t-right">{fmt(value, 0)}</text>)}
        {model.peak.map((value, hour) => <rect key={`peak-${hour}`} x={xBar(hour)} y={yKw(value)} width={barWidth} height={Math.max(base - yKw(value), 0)} className="dayb-bar-peak" />)}
        {model.load.map((value, hour) => <rect key={`load-${hour}`} x={xBar(hour)} y={yKw(value)} width={barWidth} height={Math.max(base - yKw(value), 0)} className={`dayb-bar-load ${hour === model.peakHour ? 'is-peak' : ''}`} />)}
        {model.hasWeather && <polyline className="dayb-irr" points={irradiancePath} />}
        <line x1={PAD_L} y1={base} x2={W - PAD_R} y2={base} className="dayb-axis" />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={base} className="dayb-axis" />
        {model.hasWeather && <line x1={W - PAD_R} y1={PAD_T} x2={W - PAD_R} y2={base} className="dayb-axis is-irr" />}
        {[0, 6, 12, 18, 23].map((hour) => <text key={`hour-${hour}`} x={xLine(hour)} y={H - 6} className="dayb-tick t-hour">{hour}</text>)}
      </svg>
      <div className="dayb-units"><span className="u-left">kW</span><span className="dayb-key"><i className="k-load" /> {t('dayBalance.charge')}</span><span className="dayb-key"><i className="k-peak" /> {t('dayBalance.demarrage')}</span>{model.hasWeather && <span className="dayb-key"><i className="k-irr" /> {t('dayBalance.irradiance')}</span>}{model.hasWeather && <span className="u-right">W/m²</span>}</div>
    </>}
    <div className="dayb-stats" aria-label={t('dayBalance.bilanEnergetiqueDeLa')}>
      <span><b>{model.hasLoad ? fmt(model.dailyEnergyKWh, 2) : '—'}</b><i>kWh/j</i></span>
      <span><b>{model.hasLoad ? fmt(model.peakLoadKw, 2) : '—'}</b><i>{t('loads.calledKw')}</i></span>
      <span><b>{model.hasLoad ? fmt(model.peakStartupKw, 2) : '—'}</b><i>{t('loads.peakKw')}</i></span>
      <span><b>{model.gamma === null ? '—' : fmt(model.gamma, 2)}</b><i>γ</i></span>
    </div>
    {!sizingReady && model.hasLoad && <p className="dayb-none">{t('dayBalance.leProfilEstCalcule')}</p>}
  </div>;
}
