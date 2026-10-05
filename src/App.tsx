import React, { useState, useEffect } from 'react';
import { AcState, IrButtonConfig, FanSpeed, EcoLevel } from './types/remote';
import {
  getDefaultSharpButtons,
  buildSharpAcBytes,
  bytesToSharpTimings,
  analyzeTimings,
} from './utils/sharpProtocol';
import { sounds } from './utils/soundEffects';
import { transmitIrViaAudioJack } from './utils/audioIr';
import {
  hasNativeAndroidIrBridge,
  transmitViaNativeAndroidBridge,
} from './utils/exportFormats';
import { Language, translations } from './utils/i18n';
import { SharpRemote } from './components/SharpRemote';
import { AirConditionerUnit } from './components/AirConditionerUnit';
import { LearningStudio } from './components/LearningStudio';
import { RedmiIntegrationModal } from './components/RedmiIntegrationModal';
import { UserManualModal } from './components/UserManualModal';
import { CodeLibraryModal } from './components/CodeLibraryModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { InterfaceTourModal } from './components/InterfaceTourModal';
import { NoIrGuideModal } from './components/NoIrGuideModal';
import {
  Radio,
  Smartphone,
  BookOpen,
  Layers,
  Terminal,
  Volume2,
  VolumeX,
  Cpu,
  Eye,
  HelpCircle,
  Globe,
  Sun,
  Moon,
  Sparkles,
  Settings,
  RotateCcw,
  CheckCircle,
  Activity,
  Zap,
} from 'lucide-react';

const STORAGE_KEY = 'sharp_ac_buttons_v1';
const LANG_STORAGE_KEY = 'sharp_ac_lang';
const THEME_STORAGE_KEY = 'sharp_ac_theme';

type ActiveTab = 'remote' | 'unit' | 'studio' | 'tools';

export default function App() {
  // Theme state: dark or light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const isDark = theme === 'dark';

  // Language state (Vietnamese or English)
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'vi') return saved;
    } catch {
      // Fallback
    }
    return 'vi';
  });

  const t = translations[lang];

  // Active view tab (Prevents 1-page clutter)
  const [activeTab, setActiveTab] = useState<ActiveTab>('remote');

  // Sound effects toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Show learn badges on remote
  const [showRemoteLearnBadges, setShowRemoteLearnBadges] = useState(false);

  // AC Unit current state
  const [acState, setAcState] = useState<AcState>({
    power: true,
    mode: 'cool',
    temp: 24,
    fanSpeed: 5, // 5 = Auto
    swing: false,
    jet: false,
    babyMode: false,
    gentleBreeze: false,
    eco: 0, // 0 = off
    sleep: false,
    timerType: 'none',
    timerHours: 1,
  });

  // Buttons IR configs
  const [buttons, setButtons] = useState<IrButtonConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return getDefaultSharpButtons();
  });

  // Transmission and UI states
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [activeButtonId, setActiveButtonId] = useState<string | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string>(t.systemReady);
  const [lastTransmittedBytes, setLastTransmittedBytes] = useState<string>(
    'AA 5A CF 10 13 05 00 00 00 00 00 00 06'
  );

  // Learning Studio & Modals
  const [studioSelectedButtonId, setStudioSelectedButtonId] = useState<string>('power');
  const [learningModalButtonId, setLearningModalButtonId] = useState<string | null>(null);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [showNoIrModal, setShowNoIrModal] = useState(false);

  // Sync theme to document element
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    } catch {
      // ignore
    }
  }, [theme]);

  // Save buttons to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buttons));
    } catch {
      // Storage unavailable
    }
  }, [buttons]);

  // Save language preference
  const toggleLanguage = () => {
    const nextLang: Language = lang === 'vi' ? 'en' : 'vi';
    setLang(nextLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // Storage error
    }
  };

  // Toggle Theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Handle remote button tap
  const handleButtonPress = async (buttonId: string) => {
    if (soundEnabled) sounds.playKeyClick();
    setActiveButtonId(buttonId);
    setTimeout(() => setActiveButtonId(null), 300);

    let nextState = { ...acState };
    let actionDesc = '';

    switch (buttonId) {
      case 'power':
        nextState.power = !nextState.power;
        actionDesc = nextState.power ? t.actionPowerOn : t.actionPowerOff;
        if (soundEnabled) {
          if (nextState.power) sounds.playAcDoubleBeep();
          else sounds.playCancelBeep();
        }
        break;

      case 'powerful_jet':
        nextState.jet = !nextState.jet;
        if (nextState.jet) {
          nextState.power = true;
          nextState.mode = 'cool';
          nextState.temp = 16;
          nextState.fanSpeed = 4;
          actionDesc = t.actionJetOn;
          if (soundEnabled) sounds.playAcDoubleBeep();
        } else {
          actionDesc = t.actionJetOff;
          if (soundEnabled) sounds.playAcBeep();
        }
        break;

      case 'baby_mode':
        nextState.babyMode = !nextState.babyMode;
        actionDesc = nextState.babyMode ? t.actionBabyOn : t.actionBabyOff;
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'temp_up':
        if (nextState.mode === 'dry') {
          nextState.temp = Math.min(2, nextState.temp + 1);
          actionDesc = `${t.actionDryTempUp} (${nextState.temp > 0 ? '+' : ''}${nextState.temp}°C)`;
        } else {
          nextState.temp = Math.min(30, nextState.temp + 1);
          actionDesc = `${t.actionTempUp} ${nextState.temp}°C`;
        }
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'temp_down':
        if (nextState.mode === 'dry') {
          nextState.temp = Math.max(-2, nextState.temp - 1);
          actionDesc = `${t.actionDryTempDown} (${nextState.temp > 0 ? '+' : ''}${nextState.temp}°C)`;
        } else {
          nextState.temp = Math.max(16, nextState.temp - 1);
          actionDesc = `${t.actionTempDown} ${nextState.temp}°C`;
        }
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'mode':
        if (nextState.mode === 'cool') nextState.mode = 'dry';
        else if (nextState.mode === 'dry') nextState.mode = 'auto';
        else nextState.mode = 'cool';

        if (nextState.mode === 'dry') nextState.temp = 0;
        else if (nextState.temp < 16) nextState.temp = 24;

        actionDesc = `${t.actionModeChange} ${nextState.mode.toUpperCase()}`;
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'fan_speed':
        nextState.fanSpeed = (((nextState.fanSpeed % 5) + 1) as FanSpeed);
        actionDesc = `${t.actionFanChange} ${
          nextState.fanSpeed === 5 ? 'AUTO' : `Mức ${nextState.fanSpeed}`
        }`;
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'breeze_gentle':
        nextState.gentleBreeze = !nextState.gentleBreeze;
        actionDesc = nextState.gentleBreeze ? t.actionBreezeOn : t.actionBreezeOff;
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'swing':
        nextState.swing = !nextState.swing;
        actionDesc = nextState.swing ? t.actionSwingOn : t.actionSwingOff;
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'timer_on':
        nextState.timerType = 'on';
        nextState.timerHours = (nextState.timerHours % 12) + 1;
        actionDesc = `${t.actionTimerOn} ${nextState.timerHours}h`;
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'timer_off':
        nextState.timerType = 'off';
        nextState.timerHours = (nextState.timerHours % 12) + 1;
        actionDesc = `${t.actionTimerOff} ${nextState.timerHours}h`;
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'eco':
        nextState.eco = (((nextState.eco + 1) % 3) as EcoLevel);
        actionDesc =
          nextState.eco === 1 ? t.actionEco1 : nextState.eco === 2 ? t.actionEco2 : t.actionEcoOff;
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'sleep':
        nextState.sleep = !nextState.sleep;
        actionDesc = nextState.sleep ? t.actionSleepOn : t.actionSleepOff;
        if (soundEnabled) sounds.playAcBeep();
        break;

      case 'timer_cancel':
        nextState.timerType = 'none';
        actionDesc = t.actionTimerCancel;
        if (soundEnabled) sounds.playCancelBeep();
        break;

      case 'reset':
        nextState = {
          power: true,
          mode: 'cool',
          temp: 24,
          fanSpeed: 5,
          swing: false,
          jet: false,
          babyMode: false,
          gentleBreeze: false,
          eco: 0,
          sleep: false,
          timerType: 'none',
          timerHours: 1,
        };
        actionDesc = t.actionReset;
        if (soundEnabled) sounds.playAcDoubleBeep();
        break;

      default:
        actionDesc = `TRIGGER: ${buttonId}`;
        if (soundEnabled) sounds.playAcBeep();
    }

    setAcState(nextState);
    setLastActionMessage(actionDesc);

    // Compute fresh Sharp IR frame
    const bytes = buildSharpAcBytes(nextState, buttonId);
    setLastTransmittedBytes(
      bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ').toUpperCase()
    );

    // Trigger visual IR pulse animation
    setIsTransmitting(true);
    setTimeout(() => setIsTransmitting(false), 500);

    // If running inside Android WebView native wrapper, transmit to hardware IR directly!
    if (hasNativeAndroidIrBridge()) {
      const timings = bytesToSharpTimings(bytes);
      transmitViaNativeAndroidBridge(timings, 38000);
    }
  };

  // Open learning studio for specific button
  const handleOpenLearning = (buttonId: string) => {
    setStudioSelectedButtonId(buttonId);
    setLearningModalButtonId(buttonId);
  };

  // Save newly learned timings for a button
  const handleSaveCode = (
    buttonId: string,
    timings: number[],
    method: IrButtonConfig['learnedMethod']
  ) => {
    const analysis = analyzeTimings(timings);
    setButtons((prev) =>
      prev.map((btn) => {
        if (btn.id === buttonId) {
          return {
            ...btn,
            rawTimings: timings,
            carrierFreq: analysis.frequency,
            isLearned: true,
            learnedAt: new Date().toLocaleTimeString(),
            learnedMethod: method,
          };
        }
        return btn;
      })
    );
  };

  // Reset all buttons to factory Sharp AC defaults
  const handleResetAllToDefault = () => {
    const defs = getDefaultSharpButtons();
    setButtons(defs);
    localStorage.removeItem(STORAGE_KEY);
    if (soundEnabled) sounds.playAcDoubleBeep();
    alert(
      lang === 'en'
        ? 'Restored 15 standard Sharp 104-bit codes!'
        : 'Đã nạp lại toàn bộ 15 mã chuẩn Sharp 104-bit!'
    );
  };

  // Reset a single button to its factory Sharp AC default
  const handleResetButtonToDefault = (buttonId: string) => {
    const defs = getDefaultSharpButtons();
    const defaultBtn = defs.find((b) => b.id === buttonId);
    if (!defaultBtn) return;
    setButtons((prev) =>
      prev.map((btn) => (btn.id === buttonId ? { ...defaultBtn } : btn))
    );
    if (soundEnabled) sounds.playAcBeep();
  };

  // Save a custom label for a button
  const handleSaveCustomLabel = (buttonId: string, label: string) => {
    setButtons((prev) =>
      prev.map((btn) =>
        btn.id === buttonId ? { ...btn, customLabel: label || undefined } : btn
      )
    );
  };

  // Selected button for learning studio
  const currentLearningButton =
    buttons.find((b) => b.id === learningModalButtonId) || buttons[0];

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 select-none pb-20 lg:pb-6 ${
        isDark ? 'bg-[#090d16] text-slate-100' : 'bg-[#f4f6fb] text-slate-900'
      }`}
    >
      {/* ======================================================== */}
      {/* COMPACT BALANCED HEADER */}
      {/* ======================================================== */}
      <header
        className={`sticky top-0 z-30 px-3 sm:px-6 py-2.5 backdrop-blur-md border-b flex items-center justify-between transition-colors ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-md shadow-black/20'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        {/* Brand & Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-sm">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight leading-none flex items-center gap-1.5">
              <span>{t.appTitle}</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Desktop Navigation Segmented Tabs */}
        <nav
          className={`hidden md:flex items-center p-1 rounded-xl border text-xs font-semibold ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => setActiveTab('remote')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'remote'
                ? isDark
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white text-blue-700 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{t.tabRemote}</span>
          </button>

          <button
            onClick={() => setActiveTab('unit')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'unit'
                ? isDark
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white text-blue-700 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t.tabUnit}</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'studio'
                ? isDark
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white text-blue-700 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t.tabStudio}</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tools'
                ? isDark
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white text-blue-700 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t.tabSettings}</span>
          </button>
        </nav>

        {/* Right Action Icons: Sound, Theme, Language */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Sáng / Tối (Light / Dark Theme Toggle) */}
          <button
            onClick={toggleTheme}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? 'bg-slate-800/90 border-slate-700 text-amber-300 hover:bg-slate-700 hover:text-amber-200'
                : 'bg-slate-100 border-slate-200 text-indigo-700 hover:bg-slate-200'
            }`}
            title={isDark ? t.themeLight : t.themeDark}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span className="hidden sm:inline text-[11px]">{t.themeLight}</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/20" />
                <span className="hidden sm:inline text-[11px]">{t.themeDark}</span>
              </>
            )}
          </button>

          {/* Tiếng Việt / Tiếng Anh Toggle */}
          <button
            onClick={toggleLanguage}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? 'bg-slate-800/90 border-slate-700 text-cyan-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-blue-700 hover:bg-slate-200'
            }`}
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
          </button>

          {/* PWA Banner if ready */}
          <div className="hidden sm:block">
            <PWAInstallBanner lang={lang} />
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN VIEW AREA: ORGANIZED BY TABS (No crowding!) */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col items-center">
        {/* TAB 1: REMOTE CONTROL (DEDICATED, COMPACT & BALANCED) */}
        {activeTab === 'remote' && (
          <div className="w-full flex flex-col items-center gap-3 animate-fadeIn">
            {/* Mini A/C Status Banner at top of Remote */}
            <div
              className={`w-full max-w-[340px] p-3 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-slate-900/90 border-slate-800 shadow-lg shadow-black/40'
                  : 'bg-white border-slate-200 shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      acState.power
                        ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {acState.power
                      ? acState.mode.toUpperCase() + (acState.jet ? ' · JET' : '')
                      : t.acOff}
                  </span>
                  {acState.eco > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-bold">
                      ECO {acState.eco}
                    </span>
                  )}
                  {acState.babyMode && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-500 font-bold">
                      BABY
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className="text-lg font-black text-cyan-400">
                    {acState.power ? `${acState.temp}°C` : '--'}
                  </span>
                  {isTransmitting && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-ping">
                      TX
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 border-t border-slate-800/40 pt-1.5">
                <span>
                  Quạt:{' '}
                  <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                    {acState.fanSpeed === 5 ? 'AUTO' : `Cấp ${acState.fanSpeed}`}
                  </strong>{' '}
                  · Gió:{' '}
                  <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                    {acState.swing
                      ? 'SWING'
                      : acState.gentleBreeze
                      ? 'Trần'
                      : 'Chuẩn'}
                  </strong>
                </span>
                <span className="truncate max-w-[130px] font-medium text-emerald-500 text-right">
                  {lastActionMessage}
                </span>
              </div>
            </div>

            {/* Quick Toggle for Learn Mode Badges */}
            <div className="w-full max-w-[340px] flex items-center justify-between px-2 text-[11px]">
              <span className="text-slate-400">
                {showRemoteLearnBadges
                  ? lang === 'vi'
                    ? '🎯 Bấm "Học IR" để gán mã'
                    : '🎯 Tap "Learn IR" to reassign'
                  : lang === 'vi'
                    ? '🎮 Điều khiển trực tiếp máy lạnh'
                    : '🎮 Direct Air Conditioner Control'}
              </span>
              <button
                onClick={() => setShowRemoteLearnBadges((v) => !v)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                  showRemoteLearnBadges
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                {showRemoteLearnBadges
                  ? lang === 'vi'
                    ? 'Tắt chế độ gán'
                    : 'Hide Learn'
                  : lang === 'vi'
                  ? 'Gán mã IR'
                  : 'Edit Codes'}
              </button>
            </div>

            {/* Authentic Physical Remote Simulator */}
            <SharpRemote
              state={acState}
              buttons={buttons}
              onButtonPress={handleButtonPress}
              onOpenLearning={handleOpenLearning}
              isTransmitting={isTransmitting}
              activeButtonId={activeButtonId}
              lang={lang}
              showLearnBadges={showRemoteLearnBadges}
            />
          </div>
        )}

        {/* TAB 2: VIRTUAL A/C INDOOR WALL UNIT & LIVE TELEMETRY */}
        {activeTab === 'unit' && (
          <div className="w-full max-w-2xl flex flex-col gap-4 animate-fadeIn">
            {/* The Wall Unit */}
            <AirConditionerUnit
              state={acState}
              isTransmitting={isTransmitting}
              lastButtonAction={lastActionMessage}
              lang={lang}
            />

            {/* Live IR Blaster Telemetry Card */}
            <div
              className={`p-4 rounded-2xl border text-xs space-y-3 transition-colors ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl'
                  : 'bg-white border-slate-200 text-slate-800 shadow-lg'
              }`}
            >
              <div
                className={`flex justify-between items-center border-b pb-2 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <span className="font-bold flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  <span>{t.telemetryTitle}</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-500 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {t.telemetryStatus}
                </span>
              </div>

              {/* 13 Bytes Hex payload */}
              <div className="space-y-1">
                <div className="text-[11px] text-slate-500 font-medium">
                  {t.framePayloadTitle} (104-bit / 212 Timings / 38kHz)
                </div>
                <div
                  className={`p-2.5 rounded-xl border font-mono text-cyan-400 text-xs tracking-wider break-all ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  {lastTransmittedBytes}
                </div>
              </div>

              {/* Quick Actions: Audio Jack transmit + Android export */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    const b = buttons.find((x) => x.id === activeButtonId) || buttons[0];
                    transmitIrViaAudioJack(b.rawTimings, b.carrierFreq);
                    if (soundEnabled) sounds.playAcBeep();
                    setLastActionMessage(t.actionTransmitJack);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{t.transmitAudioJack}</span>
                </button>

                <button
                  onClick={() => setShowAndroidModal(true)}
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400'
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t.exportAndroidCode}</span>
                </button>
              </div>

              {/* No IR Help Link */}
              <button
                onClick={() => setShowNoIrModal(true)}
                className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-[11px] font-semibold text-amber-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{t.noIrPrompt}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: IR LEARNING STUDIO (EMBEDDED IN-PAGE STUDIO) */}
        {activeTab === 'studio' && (
          <div className="w-full max-w-2xl flex flex-col gap-4 animate-fadeIn">
            <LearningStudio
              isEmbedded={true}
              button={buttons.find((b) => b.id === studioSelectedButtonId) || buttons[0]}
              allButtons={buttons}
              onSelectButton={(id) => setStudioSelectedButtonId(id)}
              onSaveCode={handleSaveCode}
              onResetButtonToDefault={handleResetButtonToDefault}
              onSaveCustomLabel={handleSaveCustomLabel}
              lang={lang}
              onClose={() => setActiveTab('remote')}
            />
          </div>
        )}

        {/* TAB 4: SETTINGS, INTEGRATION & GUIDES */}
        {activeTab === 'tools' && (
          <div className="w-full max-w-2xl flex flex-col gap-3 animate-fadeIn">
            {/* Guide cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Android IR Guide */}
              <button
                onClick={() => setShowAndroidModal(true)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 hover:border-emerald-600/60 hover:bg-slate-800/50'
                    : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-500">
                      {t.androidIntegration}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'vi'
                        ? 'Xuất cấu hình IR Plus, Termux, Android Kotlin'
                        : 'Export to IR Plus, Termux, Kotlin'}
                    </p>
                  </div>
                </div>
              </button>

              {/* No IR Phone Guide */}
              <button
                onClick={() => setShowNoIrModal(true)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 hover:border-amber-600/60 hover:bg-slate-800/50'
                    : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-500">
                      {t.noIrHelp}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'vi'
                        ? 'Giải pháp Jack 3.5mm, USB-C Dongle, WiFi Hub'
                        : 'Audio jack, USB-C IR dongle, WiFi bridge'}
                    </p>
                  </div>
                </div>
              </button>

              {/* User Manual */}
              <button
                onClick={() => setShowManualModal(true)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 hover:border-indigo-600/60 hover:bg-slate-800/50'
                    : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-indigo-500">
                      {t.userManual}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'vi'
                        ? 'Sách hướng dẫn sử dụng 15 phím Sharp Inverter'
                        : 'Complete manual for all 15 Sharp remote functions'}
                    </p>
                  </div>
                </div>
              </button>

              {/* 15-Key Code Library */}
              <button
                onClick={() => setShowLibraryModal(true)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 hover:border-cyan-600/60 hover:bg-slate-800/50'
                    : 'bg-white border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-cyan-500">
                      {t.keyLibrary}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'vi'
                        ? 'Xem và sao chép Pronto Hex / Microsecond pulses'
                        : 'Inspect & copy Pronto Hex and raw pulse arrays'}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Reset to Factory Defaults Card */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <h4 className="text-xs font-bold">
                  {lang === 'vi' ? 'Khôi phục 15 mã chuẩn Sharp' : 'Reset All 15 Codes'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {lang === 'vi'
                    ? 'Xóa tất cả các mã đã chỉnh sửa và khôi phục giao thức chuẩn Sharp Inverter'
                    : 'Restore factory-certified Sharp 104-bit protocol timings'}
                </p>
              </div>
              <button
                onClick={handleResetAllToDefault}
                className="px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Khôi phục' : 'Reset'}</span>
              </button>
            </div>

            {/* Tour & Interface Info */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <span className="font-bold">{t.tour}</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'vi'
                    ? 'Tìm hiểu cách sử dụng và cấu trúc điều khiển'
                    : 'Quick interface overview and walkthrough'}
                </p>
              </div>
              <button
                onClick={() => setShowTourModal(true)}
                className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-xl font-bold cursor-pointer"
              >
                {lang === 'vi' ? 'Xem lại Tour' : 'View Tour'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* THUMB-FRIENDLY BOTTOM NAVIGATION BAR (FOR MOBILE SCREENS) */}
      {/* ======================================================== */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg border-t px-2 py-1.5 flex items-center justify-around transition-colors ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 text-slate-400 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]'
            : 'bg-white/95 border-slate-200 text-slate-500 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
        }`}
      >
        <button
          onClick={() => setActiveTab('remote')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'remote'
              ? isDark
                ? 'text-cyan-400 font-bold'
                : 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Smartphone className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{t.tabRemote}</span>
        </button>

        <button
          onClick={() => setActiveTab('unit')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'unit'
              ? isDark
                ? 'text-cyan-400 font-bold'
                : 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{t.tabUnit}</span>
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'studio'
              ? isDark
                ? 'text-cyan-400 font-bold'
                : 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Cpu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{t.tabStudio}</span>
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'tools'
              ? isDark
                ? 'text-cyan-400 font-bold'
                : 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{t.tabSettings}</span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* IR Learning Studio Modal */}
      {learningModalButtonId && (
        <LearningStudio
          button={currentLearningButton}
          allButtons={buttons}
          onSelectButton={(id) => setLearningModalButtonId(id)}
          onSaveCode={handleSaveCode}
          onResetButtonToDefault={handleResetButtonToDefault}
          onSaveCustomLabel={handleSaveCustomLabel}
          lang={lang}
          onClose={() => setLearningModalButtonId(null)}
        />
      )}

      {/* Universal Android Integration Modal */}
      {showAndroidModal && (
        <RedmiIntegrationModal
          buttons={buttons}
          lang={lang}
          onClose={() => setShowAndroidModal(false)}
        />
      )}

      {/* User Manual Modal */}
      {showManualModal && (
        <UserManualModal lang={lang} onClose={() => setShowManualModal(false)} />
      )}

      {/* 15-Key Code Library Modal */}
      {showLibraryModal && (
        <CodeLibraryModal
          buttons={buttons}
          lang={lang}
          onSelectButtonToLearn={(id) => setLearningModalButtonId(id)}
          onTestFire={(btn) => {
            transmitIrViaAudioJack(btn.rawTimings, btn.carrierFreq);
            if (soundEnabled) sounds.playAcBeep();
          }}
          onResetAllToDefault={handleResetAllToDefault}
          onResetButtonToDefault={handleResetButtonToDefault}
          onSaveCustomLabel={handleSaveCustomLabel}
          onImportButtons={(imported) => setButtons(imported)}
          onClose={() => setShowLibraryModal(false)}
        />
      )}

      {/* Tour Modal */}
      {showTourModal && (
        <InterfaceTourModal lang={lang} onClose={() => setShowTourModal(false)} />
      )}

      {/* No IR Hardware Guide Modal */}
      {showNoIrModal && (
        <NoIrGuideModal
          currentTimings={buttons[0]?.rawTimings || []}
          currentCarrierFreq={buttons[0]?.carrierFreq || 38000}
          lang={lang}
          onClose={() => setShowNoIrModal(false)}
        />
      )}
    </div>
  );
}
