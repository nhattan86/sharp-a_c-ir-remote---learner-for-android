import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language, translations } from '../utils/i18n';
import { Download, Smartphone, CheckCircle, X, ShieldCheck } from 'lucide-react';

interface PWAInstallBannerProps {
  lang?: Language;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ lang = 'vi' }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showHowToModal, setShowHowToModal] = useState(false);
  const t = translations[lang];

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-semibold">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span>{t.pwaInstalled}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {isInstallable ? (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-sm shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.pwaInstallBtn}</span>
          </button>
        ) : (
          <button
            onClick={() => setShowHowToModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.pwaHowToBtn}</span>
          </button>
        )}
      </div>

      {/* Modal hướng dẫn tải và cài app vào điện thoại Android */}
      {showHowToModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 text-slate-100 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t.pwaModalTitle}</h3>
                  <p className="text-[11px] text-slate-400">{t.pwaModalSubtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setShowHowToModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{t.pwaStepHeader}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px] leading-relaxed">
                  <li>{t.pwaStep1}</li>
                  <li>{t.pwaStep2}</li>
                  <li>{t.pwaStep3}</li>
                  <li>{t.pwaStep4}</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.pwaAdvantageHeader}</span>
                </div>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  <li>• {t.pwaAdv1}</li>
                  <li>• {t.pwaAdv2}</li>
                  <li>• {t.pwaAdv3}</li>
                  <li>• {t.pwaAdv4}</li>
                </ul>
              </div>

              <button
                onClick={() => setShowHowToModal(false)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors cursor-pointer"
              >
                {t.pwaUnderstandBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
