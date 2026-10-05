export type Language = 'vi' | 'en';

export interface Translations {
  // App header & brand
  appTitle: string;
  appSubtitle: string;
  tour: string;
  noIrHelp: string;
  userManual: string;
  keyLibrary: string;
  androidIntegration: string;
  learnIr: string;
  language: string;
  tabRemote: string;
  tabUnit: string;
  tabStudio: string;
  tabSettings: string;
  themeLight: string;
  themeDark: string;

  // Air conditioner unit
  indoorBrand: string;
  indoorSubtitle: string;
  irReady: string;
  irReceiving: string;
  acOff: string;
  powerLed: string;
  modeCool: string;
  modeDry: string;
  modeAuto: string;
  jetCool: string;
  eco1: string;
  eco2: string;
  sleepMode: string;
  timerLed: string;
  timerOffState: string;
  airLouvre: string;
  louvreAuto: string;
  louvreCeiling: string;
  louvreFixed: string;
  fanLabel: string;
  fanAuto: string;
  fanQuiet: string;
  fanSoft: string;
  fanLow: string;
  fanHigh: string;

  // Telemetry & Hardware status
  telemetryTitle: string;
  telemetryStatus: string;
  framePayloadTitle: string;
  exportAndroidCode: string;
  transmitAudioJack: string;
  noIrPrompt: string;
  systemReady: string;

  // Action messages
  actionPowerOn: string;
  actionPowerOff: string;
  actionJetOn: string;
  actionJetOff: string;
  actionTempUp: string;
  actionTempDown: string;
  actionDryTempUp: string;
  actionDryTempDown: string;
  actionModeChange: string;
  actionBreezeOn: string;
  actionBreezeOff: string;
  actionBabyOn: string;
  actionBabyOff: string;
  actionFanChange: string;
  actionSwingOn: string;
  actionSwingOff: string;
  actionTimerOn: string;
  actionTimerOff: string;
  actionEco1: string;
  actionEco2: string;
  actionEcoOff: string;
  actionSleepOn: string;
  actionSleepOff: string;
  actionTimerCancel: string;
  actionReset: string;
  actionTransmitJack: string;
  actionAudioSent: string;

  // Remote buttons tooltips & labels
  btnPower: string;
  btnJet: string;
  btnBaby: string;
  btnTempUp: string;
  btnTempDown: string;
  btnGentle: string;
  btnMode: string;
  btnFan: string;
  btnSwing: string;
  btnTimerOn: string;
  btnTimerOff: string;
  btnEco: string;
  btnSleep: string;
  btnCancel: string;
  btnReset: string;
  btnLearnIr: string;

  // PWA banner
  pwaInstalled: string;
  pwaInstallBtn: string;
  pwaHowToBtn: string;
  pwaModalTitle: string;
  pwaModalSubtitle: string;
  pwaStepHeader: string;
  pwaStep1: string;
  pwaStep2: string;
  pwaStep3: string;
  pwaStep4: string;
  pwaAdvantageHeader: string;
  pwaAdv1: string;
  pwaAdv2: string;
  pwaAdv3: string;
  pwaAdv4: string;
  pwaUnderstandBtn: string;

  // Footer
  footerCopyright: string;
}

export const translations: Record<Language, Translations> = {
  vi: {
    appTitle: 'Sharp IR Remote · Android',
    appSubtitle: 'Điều khiển & Học lệnh hồng ngoại máy lạnh Sharp cho Android',
    tour: 'Giao diện',
    noIrHelp: 'ĐT không có IR?',
    userManual: 'Hướng dẫn nút',
    keyLibrary: 'Thư viện 15 nút',
    androidIntegration: 'Dùng trên Android',
    learnIr: 'Học lệnh IR',
    language: 'Ngôn ngữ',
    tabRemote: 'Điều khiển',
    tabUnit: 'Dàn lạnh ảo',
    tabStudio: 'Học lệnh IR',
    tabSettings: 'Cài đặt & HD',
    themeLight: 'Chế độ Sáng',
    themeDark: 'Chế độ Tối',

    indoorBrand: 'SHARP',
    indoorSubtitle: 'PLASMACLUSTER · J-TECH INVERTER',
    irReady: 'IR Sẵn sàng',
    irReceiving: 'Nhận tín hiệu IR...',
    acOff: 'TẮT (OFF)',
    powerLed: 'Nguồn',
    modeCool: 'LÀM LẠNH',
    modeDry: 'HÚT ẨM',
    modeAuto: 'TỰ ĐỘNG',
    jetCool: 'JET COOL',
    eco1: 'ECO 1 Lá (-3%)',
    eco2: 'ECO 2 Lá (-6%)',
    sleepMode: 'SLEEP',
    timerLed: 'Đèn hẹn giờ (Cam)',
    timerOffState: '(Tắt)',
    airLouvre: 'Cánh đảo gió',
    louvreAuto: 'Tự động đảo (SWING)',
    louvreCeiling: 'Thổi trần nhà (Gió nhẹ)',
    louvreFixed: 'Cố định',
    fanLabel: 'Quạt',
    fanAuto: 'Tự động',
    fanQuiet: 'Êm ái',
    fanSoft: 'Nhẹ',
    fanLow: 'Thấp',
    fanHigh: 'Cao',

    telemetryTitle: 'Mắt phát IR trên Android:',
    telemetryStatus: '38,000 Hz · Sẵn sàng',
    framePayloadTitle: 'Khung truyền Sharp A/C (13 Bytes Payload):',
    exportAndroidCode: 'Xuất mã Android',
    transmitAudioJack: 'Phát qua Jack 3.5mm',
    noIrPrompt: 'Nếu điện thoại KHÔNG có mắt hồng ngoại IR?',
    systemReady: 'Hệ thống sẵn sàng.',

    actionPowerOn: 'BẬT MÁY LẠNH (POWER ON)',
    actionPowerOff: 'TẮT MÁY LẠNH (POWER OFF)',
    actionJetOn: 'KÍCH HOẠT JET COOL (LÀM LẠNH CỰC NHANH)',
    actionJetOff: 'HỦY CHẾ ĐỘ JET COOL',
    actionTempUp: 'TĂNG NHIỆT ĐỘ CÀI ĐẶT',
    actionTempDown: 'GIẢM NHIỆT ĐỘ CÀI ĐẶT',
    actionDryTempUp: 'TĂNG NHIỆT ĐỘ KHỬ ẨM (+1°C)',
    actionDryTempDown: 'GIẢM NHIỆT ĐỘ KHỬ ẨM (-1°C)',
    actionModeChange: 'CHUYỂN CHẾ ĐỘ',
    actionBreezeOn: 'BẬT GIÓ NHẸ THỔI TRẦN (GENTLE COOL AIR)',
    actionBreezeOff: 'TẮT CHẾ ĐỘ GIÓ NHẸ',
    actionBabyOn: 'BẬT VẬN HÀNH TRẺ NHỎ (BABY COOL)',
    actionBabyOff: 'TẮT CHẾ ĐỘ TRẺ NHỎ',
    actionFanChange: 'CHỈNH QUẠT',
    actionSwingOn: 'BẬT TỰ ĐỘNG ĐẢO GIÓ (SWING ON)',
    actionSwingOff: 'DỪNG CÁNH ĐẢO GIÓ (SWING OFF)',
    actionTimerOn: 'HẸN GIỜ BẬT',
    actionTimerOff: 'HẸN GIỜ TẮT',
    actionEco1: 'ECO NẤC 1 (1 LÁ: TIẾT KIỆM 2-4%)',
    actionEco2: 'ECO NẤC 2 (2 LÁ: TIẾT KIỆM 4-8%)',
    actionEcoOff: 'HỦY CHẾ ĐỘ TIẾT KIỆM ĐIỆN ECO',
    actionSleepOn: 'BẬT CHẾ ĐỘ NGỦ ĐÊM (SLEEP)',
    actionSleepOff: 'TẮT CHẾ ĐỘ NGỦ ĐÊM',
    actionTimerCancel: 'HỦY HẸN GIỜ (ĐÈN CAM ĐÃ TẮT)',
    actionReset: 'RESET KHÔI PHỤC CÀI ĐẶT GỐC NHÀ SẢN XUẤT',
    actionTransmitJack: 'Đã phát xung qua cổng tai nghe 3.5mm!',
    actionAudioSent: 'Đã phát xong tín hiệu IR (38 kHz, 104-bit).',

    btnPower: 'Bật/Tắt nguồn (ON/OFF)',
    btnJet: 'Chế độ làm lạnh cực nhanh (Super JET)',
    btnBaby: 'Chế độ vận hành trẻ nhỏ (Baby Cool)',
    btnTempUp: 'Tăng nhiệt độ',
    btnTempDown: 'Giảm nhiệt độ',
    btnGentle: 'Gió nhẹ thổi trần (Gentle)',
    btnMode: 'Chọn chế độ (MODE)',
    btnFan: 'Tốc độ quạt (FAN)',
    btnSwing: 'Đảo hướng gió (SWING)',
    btnTimerOn: 'Hẹn giờ bật (ON)',
    btnTimerOff: 'Hẹn giờ tắt (OFF)',
    btnEco: 'Tiết kiệm điện (ECO)',
    btnSleep: 'Ngủ đêm (SLEEP)',
    btnCancel: 'Hủy hẹn giờ (CANCEL)',
    btnReset: 'Khôi phục cài đặt gốc (RESET)',
    btnLearnIr: 'Học IR',

    pwaInstalled: 'Đã cài trên ĐT (Standalone)',
    pwaInstallBtn: 'Cài vào Android',
    pwaHowToBtn: 'Cách cài vào điện thoại',
    pwaModalTitle: 'Cách cài đặt ứng dụng vào điện thoại Android',
    pwaModalSubtitle: 'Chạy toàn màn hình độc lập như app cài từ CH Play',
    pwaStepHeader: 'Hướng dẫn cài trên trình duyệt Chrome:',
    pwaStep1: 'Mở trang web này trên trình duyệt Chrome điện thoại.',
    pwaStep2: 'Nhấn vào biểu tượng 3 dấu chấm (⋮) ở góc trên bên phải màn hình.',
    pwaStep3: 'Chọn "Cài đặt ứng dụng" (Install app) hoặc "Thêm vào Màn hình chính".',
    pwaStep4: 'Nhấn "Cài đặt" để xác nhận hoàn tất.',
    pwaAdvantageHeader: 'Lợi ích khi cài đặt:',
    pwaAdv1: 'Có biểu tượng riêng trên màn hình chính (Home screen).',
    pwaAdv2: 'Chạy toàn màn hình không thanh địa chỉ, mở tức thì ngay cả khi offline.',
    pwaAdv3: 'Tự động lưu trữ vĩnh viễn các mã IR đã học.',
    pwaAdv4: 'Phản hồi rung chân thực khi bấm phím.',
    pwaUnderstandBtn: 'Đã hiểu',

    footerCopyright: 'sharp-a_c-ir-remote-&-learner-for-android · Hỗ trợ toàn diện thiết bị Android có cổng hồng ngoại hoặc phụ kiện IR ngoài',
  },

  en: {
    appTitle: 'Sharp IR Remote · Android',
    appSubtitle: 'Sharp A/C Infrared Remote Controller & Learning Studio for Android',
    tour: 'Tour',
    noIrHelp: 'No IR Blaster?',
    userManual: 'User Manual',
    keyLibrary: '15-Key Library',
    androidIntegration: 'Android IR Guide',
    learnIr: 'Learn IR',
    language: 'Language',
    tabRemote: 'Remote',
    tabUnit: 'A/C Unit',
    tabStudio: 'IR Studio',
    tabSettings: 'Settings & Docs',
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',

    indoorBrand: 'SHARP',
    indoorSubtitle: 'PLASMACLUSTER · J-TECH INVERTER',
    irReady: 'IR Ready',
    irReceiving: 'Receiving IR...',
    acOff: 'OFF',
    powerLed: 'Power',
    modeCool: 'COOL',
    modeDry: 'DRY',
    modeAuto: 'AUTO',
    jetCool: 'JET COOL',
    eco1: 'ECO 1 Leaf (-3%)',
    eco2: 'ECO 2 Leaves (-6%)',
    sleepMode: 'SLEEP',
    timerLed: 'Timer LED (Orange)',
    timerOffState: '(Off)',
    airLouvre: 'Air Louvre',
    louvreAuto: 'Auto Swing (SWING)',
    louvreCeiling: 'Ceiling Flow (Gentle)',
    louvreFixed: 'Fixed Position',
    fanLabel: 'Fan',
    fanAuto: 'Auto',
    fanQuiet: 'Quiet',
    fanSoft: 'Soft',
    fanLow: 'Low',
    fanHigh: 'High',

    telemetryTitle: 'Android IR Emitter Status:',
    telemetryStatus: '38,000 Hz · Ready',
    framePayloadTitle: 'Sharp A/C Payload (13 Bytes Frame):',
    exportAndroidCode: 'Export Android Code',
    transmitAudioJack: 'Transmit 3.5mm Jack',
    noIrPrompt: 'If your Android phone has no built-in IR blaster?',
    systemReady: 'System ready.',

    actionPowerOn: 'POWER ON AIR CONDITIONER',
    actionPowerOff: 'POWER OFF AIR CONDITIONER',
    actionJetOn: 'ACTIVATE JET COOL (FAST MAXIMUM COOLING)',
    actionJetOff: 'CANCEL JET COOL',
    actionTempUp: 'INCREASE TARGET TEMPERATURE',
    actionTempDown: 'DECREASE TARGET TEMPERATURE',
    actionDryTempUp: 'INCREASE DEHUMIDIFY TEMP (+1°C)',
    actionDryTempDown: 'DECREASE DEHUMIDIFY TEMP (-1°C)',
    actionModeChange: 'CHANGE MODE',
    actionBreezeOn: 'ENABLE GENTLE COOL AIR (CEILING DEFLECTION)',
    actionBreezeOff: 'DISABLE GENTLE COOL AIR',
    actionBabyOn: 'ENABLE BABY COOL MODE',
    actionBabyOff: 'DISABLE BABY COOL MODE',
    actionFanChange: 'ADJUST FAN SPEED',
    actionSwingOn: 'ENABLE AUTO AIR SWING (SWING ON)',
    actionSwingOff: 'STOP AIR SWING (SWING OFF)',
    actionTimerOn: 'SET ON TIMER',
    actionTimerOff: 'SET OFF TIMER',
    actionEco1: 'ECO LEVEL 1 (1 LEAF: SAVE 2-4%)',
    actionEco2: 'ECO LEVEL 2 (2 LEAVES: SAVE 4-8%)',
    actionEcoOff: 'CANCEL ECO MODE',
    actionSleepOn: 'ENABLE NIGHT SLEEP MODE',
    actionSleepOff: 'DISABLE NIGHT SLEEP MODE',
    actionTimerCancel: 'CANCEL TIMER (ORANGE LED OFF)',
    actionReset: 'FACTORY RESET TO DEFAULTS',
    actionTransmitJack: 'IR signal transmitted via 3.5mm audio jack!',
    actionAudioSent: 'Transmitted IR signal (38 kHz, 104-bit).',

    btnPower: 'Power On/Off (ON/OFF)',
    btnJet: 'Super Jet Cool Mode',
    btnBaby: 'Baby Cool Comfort Mode',
    btnTempUp: 'Temperature Up',
    btnTempDown: 'Temperature Down',
    btnGentle: 'Gentle Ceiling Air',
    btnMode: 'Mode Select (COOL/DRY/AUTO)',
    btnFan: 'Fan Speed (FAN)',
    btnSwing: 'Airflow Direction (SWING)',
    btnTimerOn: 'Timer On (ON)',
    btnTimerOff: 'Timer Off (OFF)',
    btnEco: 'Energy Saver (ECO)',
    btnSleep: 'Night Comfort (SLEEP)',
    btnCancel: 'Cancel Timer (CANCEL)',
    btnReset: 'Factory Reset (RESET)',
    btnLearnIr: 'Learn IR',

    pwaInstalled: 'Installed (Standalone)',
    pwaInstallBtn: 'Install on Android',
    pwaHowToBtn: 'How to install on phone',
    pwaModalTitle: 'How to Install App on Android',
    pwaModalSubtitle: 'Run as a standalone fullscreen app without browser URL bar',
    pwaStepHeader: 'Chrome browser installation steps:',
    pwaStep1: 'Open this web app in Google Chrome on your Android device.',
    pwaStep2: 'Tap the 3-dots menu (⋮) in the top-right corner.',
    pwaStep3: 'Select "Install app" or "Add to Home screen".',
    pwaStep4: 'Tap "Install" to confirm.',
    pwaAdvantageHeader: 'Installation benefits:',
    pwaAdv1: 'Dedicated app icon on your Android home screen.',
    pwaAdv2: 'Clean fullscreen experience, instant load with offline cache.',
    pwaAdv3: 'Learned IR button configurations are permanently stored on device.',
    pwaAdv4: 'Realistic haptic vibration on button taps.',
    pwaUnderstandBtn: 'Got it',

    footerCopyright: 'sharp-a_c-ir-remote-&-learner-for-android · Universal support for Android devices with IR emitter or external adapters',
  },
};
