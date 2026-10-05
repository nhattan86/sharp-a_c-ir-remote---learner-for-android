import React from 'react';
import { AcState } from '../types/remote';
import { Language, translations } from '../utils/i18n';
import { Wind, Zap, Leaf, Moon } from 'lucide-react';

interface AcUnitProps {
  state: AcState;
  isTransmitting: boolean;
  lastButtonAction?: string;
  lang?: Language;
}

export const AirConditionerUnit: React.FC<AcUnitProps> = ({
  state,
  isTransmitting,
  lastButtonAction,
  lang = 'vi',
}) => {
  const t = translations[lang];

  const getFanSpeedLabel = (spd: number) => {
    switch (spd) {
      case 1:
        return t.fanQuiet;
      case 2:
        return t.fanSoft;
      case 3:
        return t.fanLow;
      case 4:
        return t.fanHigh;
      default:
        return t.fanAuto;
    }
  };

  const getLouvreStatus = () => {
    if (state.swing) return t.louvreAuto;
    if (state.gentleBreeze) return t.louvreCeiling;
    return t.louvreFixed;
  };

  return (
    <div className="w-full max-w-xl mx-auto mb-4 px-2">
      {/* Wall unit container */}
      <div className="relative bg-gradient-to-b from-slate-100 via-white to-slate-200 rounded-2xl shadow-xl border border-slate-300 p-4 overflow-hidden">
        {/* Top intake grille texture */}
        <div className="flex justify-between items-center px-4 mb-2 opacity-40">
          <div className="flex gap-1.5 w-full">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-1 bg-slate-400 rounded-full flex-1" />
            ))}
          </div>
        </div>

        {/* Front Panel Body */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Brand Logo & Model */}
          <div className="flex flex-col">
            <span className="font-extrabold tracking-widest text-slate-800 text-sm font-sans">
              {t.indoorBrand}
            </span>
            <span className="text-[10px] tracking-wider text-slate-500 font-medium">
              {t.indoorSubtitle}
            </span>
          </div>

          {/* IR Receiver Eye with transmission pulse glow */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300 ${
                isTransmitting
                  ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-300/60 scale-105'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  isTransmitting ? 'bg-amber-600 animate-ping' : 'bg-slate-400'
                }`}
              />
              <span className="tabular-nums font-mono">
                {isTransmitting ? t.irReceiving : t.irReady}
              </span>
            </div>
          </div>

          {/* LED Digital Display on AC surface */}
          <div className="flex items-center gap-3">
            {state.power ? (
              <div className="flex items-baseline bg-slate-900/90 text-emerald-400 px-3.5 py-1.5 rounded-xl border border-slate-700 shadow-inner font-mono">
                <span className="text-2xl font-bold tracking-tight tabular-nums">
                  {state.mode === 'dry' ? 'dh' : state.temp}
                </span>
                <span className="text-xs ml-0.5 font-sans font-semibold">
                  {state.mode === 'dry' ? '%' : '°C'}
                </span>
              </div>
            ) : (
              <div className="text-slate-400 text-xs font-mono font-medium px-3 py-1.5 bg-slate-200 rounded-lg">
                {t.acOff}
              </div>
            )}
          </div>
        </div>

        {/* Indicators Bar: Mode, Fan, Eco, Sleep, Orange Timer */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-200/80 pt-2 px-4 text-xs font-medium">
          {/* Status LEDs */}
          <div className="flex items-center gap-3">
            {/* Power LED */}
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  state.power ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-slate-300'
                }`}
              />
              <span className="text-[11px] text-slate-600">{t.powerLed}</span>
            </div>

            {/* Mode Tag */}
            {state.power && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                  state.mode === 'cool'
                    ? 'text-cyan-700 bg-cyan-50'
                    : state.mode === 'dry'
                    ? 'text-amber-700 bg-amber-50'
                    : 'text-emerald-700 bg-emerald-50'
                }`}
              >
                {state.mode === 'cool' ? t.modeCool : state.mode === 'dry' ? t.modeDry : t.modeAuto}
              </span>
            )}

            {/* Jet indicator */}
            {state.power && state.jet && (
              <span className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold animate-pulse">
                <Zap className="w-3 h-3 text-blue-600" />
                {t.jetCool}
              </span>
            )}

            {/* Eco Leaf indicator */}
            {state.power && state.eco > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                <Leaf className="w-3 h-3 text-emerald-600" />
                {state.eco === 1 ? t.eco1 : t.eco2}
              </span>
            )}

            {/* Sleep indicator */}
            {state.power && state.sleep && (
              <span className="flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold">
                <Moon className="w-3 h-3 text-purple-600" />
                {t.sleepMode}
              </span>
            )}
          </div>

          {/* Sharp Orange Timer LED */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                state.timerType !== 'none'
                  ? 'bg-amber-500 shadow-sm shadow-amber-400 animate-pulse'
                  : 'bg-slate-300'
              }`}
            />
            <span
              className={`text-[11px] ${
                state.timerType !== 'none' ? 'text-amber-800 font-semibold' : 'text-slate-400'
              }`}
            >
              {t.timerLed} {state.timerType !== 'none' ? `(${state.timerHours}h)` : t.timerOffState}
            </span>
          </div>
        </div>

        {/* Lower Airflow Vent & Swinging Louvre */}
        <div className="relative mt-3 pt-2">
          {/* Main Air Vent Slot */}
          <div className="relative h-6 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex items-center px-3">
            {/* Swinging Flap Graphic */}
            <div
              className={`absolute inset-x-2 h-2.5 bg-slate-300 rounded shadow transition-all duration-700 ${
                state.power
                  ? state.swing
                    ? 'animate-bounce transform translate-y-0.5'
                    : state.gentleBreeze
                    ? 'transform -translate-y-1.5' // Pointing up towards ceiling
                    : 'transform translate-y-1'
                  : 'transform translate-y-0 opacity-80'
              }`}
            />

            {/* Wind breeze waves animation when running */}
            {state.power && (
              <div className="absolute inset-0 flex items-center justify-around opacity-30 pointer-events-none">
                <Wind className="w-4 h-4 text-cyan-200 animate-pulse" />
                <Wind className="w-4 h-4 text-cyan-200 animate-pulse delay-75" />
                <Wind className="w-4 h-4 text-cyan-200 animate-pulse delay-150" />
              </div>
            )}
          </div>

          {/* Louvre and fan status summary */}
          <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-500">
            <span>
              {t.airLouvre}: {getLouvreStatus()}
            </span>
            <span>
              {t.fanLabel}: {getFanSpeedLabel(state.fanSpeed)}
            </span>
          </div>
        </div>

        {/* Live transmission toast */}
        {lastButtonAction && (
          <div className="mt-2 text-center text-xs text-slate-600 bg-slate-100 rounded-md py-1 border border-slate-200 font-mono">
            {lastButtonAction}
          </div>
        )}
      </div>
    </div>
  );
};
