/**
 * i18n.js - Multilingual Dictionary Loader
 * Supports ZH-TW, EN, JA, DE, ES with reactive DOM updating.
 */

export const TRANSLATIONS = {
  'zh-TW': {
    appTitle: '每日益智大挑戰',
    tabJigsaw: '每日拼圖',
    tabSudoku: '每日數獨',
    tabMemory: '每日記憶',
    streak: '連勝天數',
    days: '天',
    today: '今日挑戰',
    time: '時間',
    moves: '步數',
    mistakes: '失誤',
    difficulty: '難度',
    diffEasy: '簡單',
    diffMedium: '中等',
    diffHard: '困難',
    diffExpert: '大師',
    hintBtn: '提示 (看廣告)',
    hintAvailable: '提示',
    previewBtn: '預覽原圖',
    resetBtn: '重置',
    undoBtn: '撤銷',
    eraseBtn: '擦除',
    notesBtn: '筆記',
    soundOn: '音效：開啟',
    soundOff: '音效：關閉',
    piecesLeft: '剩餘拼圖：{count}',
    pairsLeft: '剩餘配對：{count}',
    congratsTitle: '恭喜通關！',
    congratsDesc: '太厲害了！你順利完成了今天的益智挑戰。',
    streakUpdated: '每日連勝紀錄：{count} 天 🔥',
    shareBtn: '分享成績',
    copiedToClipboard: '已複製到剪貼簿！',
    adLoading: '贊助內容加載中...',
    adRewardGranted: '💡 提示已解鎖！',
    adFailed: '廣告加載超時，為您贈送免費提示！',
    settingsTitle: '遊戲說明與設置',
    rulesJigsaw: '將拼圖片段拖曳到正確位置。靠近目標時會自動磁吸就位。',
    rulesSudoku: '在 9x9 方格內填入 1 至 9 的數字，確保每行、每列及每個九宮格內數字不重複。',
    rulesMemory: '翻開卡牌尋找兩兩成對的符號，運用大腦記憶力以最少步數配對全部卡牌。',
    close: '關閉',
    dailyBadge: '每日特選',
    energy: '能量',
    energyModalTitle: '⚡ 能量已耗盡',
    energyModalDesc: '進行每局遊戲需要消耗 1 點能量。您可以觀看贊助商影片立即恢復 3 點能量！',
    rechargeTimer: '下一點能量恢復倒數：{time}',
    watchAdForEnergy: '觀看廣告獲取 +3 能量 ⚡',
    energyGranted: '⚡ 已成功獲取 3 點能量！'
  },
  'en': {
    appTitle: 'Daily Puzzles H5',
    tabJigsaw: 'Daily Jigsaw',
    tabSudoku: 'Daily Sudoku',
    tabMemory: 'Daily Memory',
    streak: 'Streak',
    days: 'days',
    today: 'Today',
    time: 'Time',
    moves: 'Moves',
    mistakes: 'Mistakes',
    difficulty: 'Difficulty',
    diffEasy: 'Easy',
    diffMedium: 'Medium',
    diffHard: 'Hard',
    diffExpert: 'Expert',
    hintBtn: 'Hint (Ad)',
    hintAvailable: 'Hint',
    previewBtn: 'Preview',
    resetBtn: 'Reset',
    undoBtn: 'Undo',
    eraseBtn: 'Erase',
    notesBtn: 'Notes',
    soundOn: 'Sound: ON',
    soundOff: 'Sound: OFF',
    piecesLeft: 'Pieces left: {count}',
    pairsLeft: 'Pairs left: {count}',
    congratsTitle: 'Puzzle Solved!',
    congratsDesc: 'Outstanding! You completed today\'s challenge.',
    streakUpdated: 'Daily Streak: {count} Days 🔥',
    shareBtn: 'Share Result',
    copiedToClipboard: 'Copied to clipboard!',
    adLoading: 'Loading sponsor message...',
    adRewardGranted: '💡 Hint granted!',
    adFailed: 'Ad could not be loaded. Free hint provided!',
    settingsTitle: 'Settings & Rules',
    rulesJigsaw: 'Drag puzzle pieces onto the board. Pieces snap automatically when placed close to their target.',
    rulesSudoku: 'Fill the 9x9 grid so every row, column, and 3x3 box contains digits 1 to 9 without repeats.',
    rulesMemory: 'Flip cards to match identical symbols in minimal moves and time.',
    close: 'Close',
    dailyBadge: 'Daily Special',
    energy: 'Energy',
    energyModalTitle: '⚡ Out of Energy',
    energyModalDesc: 'Starting a new game costs 1 Energy. Watch a short video to restore 3 Energy instantly!',
    rechargeTimer: 'Next energy point in: {time}',
    watchAdForEnergy: 'Watch Ad for +3 Energy ⚡',
    energyGranted: '⚡ +3 Energy restored!'
  },
  'ja': {
    appTitle: 'デイリーパズル H5',
    tabJigsaw: '今日のジグソー',
    tabSudoku: '今日の数独',
    tabMemory: '記憶力トレ',
    streak: '連続日数',
    days: '日',
    today: '今日',
    time: 'タイム',
    moves: '手数',
    mistakes: 'ミス',
    difficulty: '難易度',
    diffEasy: '初級',
    diffMedium: '中級',
    diffHard: '上級',
    diffExpert: 'エキスパート',
    hintBtn: 'ヒント (広告)',
    hintAvailable: 'ヒント',
    previewBtn: '見本',
    resetBtn: 'やり直し',
    undoBtn: '元に戻す',
    eraseBtn: '消去',
    notesBtn: 'メモ',
    soundOn: '効果音: オン',
    soundOff: '効果音: オフ',
    piecesLeft: '残りピース: {count}',
    pairsLeft: '残りペア: {count}',
    congratsTitle: 'クリアおめでとう！',
    congratsDesc: '素晴らしい！本日のパズルをクリアしました。',
    streakUpdated: '連続記録: {count} 日 🔥',
    shareBtn: '結果をシェア',
    copiedToClipboard: 'クリップボードにコピーしました！',
    adLoading: '広告を読み込み中...',
    adRewardGranted: '💡 ヒントを獲得しました！',
    adFailed: '広告を表示できませんでした。無料ヒントを進呈します！',
    settingsTitle: '設定と遊び方',
    rulesJigsaw: 'ピースをドラッグして盤面に配置します。正しい位置に近づくと自動的に吸着します。',
    rulesSudoku: '9×9のマスに1から9の数字を重複なく埋めてください。',
    rulesMemory: 'カードをめくって同じ絵柄のペアを揃えましょう。',
    close: '閉じる',
    dailyBadge: 'デイリー限定',
    energy: 'エネルギー',
    energyModalTitle: '⚡ エネルギー不足',
    energyModalDesc: 'ゲームを開始するには1エネルギーが必要です。動画広告を見ると3エネルギー回復します！',
    rechargeTimer: '次の回復まで: {time}',
    watchAdForEnergy: '広告を見て+3エネルギー回復 ⚡',
    energyGranted: '⚡ 3エネルギー回復しました！'
  },
  'de': {
    appTitle: 'Tägliche Rätsel H5',
    tabJigsaw: 'Tages-Puzzle',
    tabSudoku: 'Tages-Sudoku',
    tabMemory: 'Gedächtnis',
    streak: 'Serie',
    days: 'Tage',
    today: 'Heute',
    time: 'Zeit',
    moves: 'Züge',
    mistakes: 'Fehler',
    difficulty: 'Schwierigkeit',
    diffEasy: 'Leicht',
    diffMedium: 'Mittel',
    diffHard: 'Schwer',
    diffExpert: 'Experte',
    hintBtn: 'Tipp (Werbung)',
    hintAvailable: 'Tipp',
    previewBtn: 'Vorschau',
    resetBtn: 'Neu starten',
    undoBtn: 'Rückgängig',
    eraseBtn: 'Löschen',
    notesBtn: 'Notizen',
    soundOn: 'Ton: AN',
    soundOff: 'Ton: AUS',
    piecesLeft: 'Verbleibend: {count}',
    pairsLeft: 'Paare übrig: {count}',
    congratsTitle: 'Rätsel Gelöst!',
    congratsDesc: 'Hervorragend! Du hast die heutige Aufgabe gemeistert.',
    streakUpdated: 'Tages-Serie: {count} Tage 🔥',
    shareBtn: 'Ergebnis Teilen',
    copiedToClipboard: 'In die Zwischenablage kopiert!',
    adLoading: 'Werbung wird geladen...',
    adRewardGranted: '💡 Tipp freigeschaltet!',
    adFailed: 'Werbung konnte nicht geladen werden. Kostenloser Tipp vergeben!',
    settingsTitle: 'Einstellungen & Regeln',
    rulesJigsaw: 'Ziehe die Puzzleteile an die richtige Position. Sie rasten automatisch ein.',
    rulesSudoku: 'Fülle das 9x9-Gitter so aus, dass jede Zeile, Spalte und 3x3-Box die Ziffern 1 bis 9 enthält.',
    rulesMemory: 'Decke Karten auf, um gleiche Symbole zu finden.',
    close: 'Schließen',
    dailyBadge: 'Tages-Spezial',
    energy: 'Energie',
    energyModalTitle: '⚡ Keine Energie mehr',
    energyModalDesc: 'Jedes Spiel benötigt 1 Energie. Schaue ein kurzes Video für +3 Energie!',
    rechargeTimer: 'Nächste Energie in: {time}',
    watchAdForEnergy: 'Video ansehen für +3 Energie ⚡',
    energyGranted: '⚡ +3 Energie erhalten!'
  },
  'es': {
    appTitle: 'Puzzles Diarios H5',
    tabJigsaw: 'Puzzle Diario',
    tabSudoku: 'Sudoku Diario',
    tabMemory: 'Memoria Diaria',
    streak: 'Racha',
    days: 'días',
    today: 'Hoy',
    time: 'Tiempo',
    moves: 'Movimientos',
    mistakes: 'Errores',
    difficulty: 'Dificultad',
    diffEasy: 'Fácil',
    diffMedium: 'Medio',
    diffHard: 'Difícil',
    diffExpert: 'Experto',
    hintBtn: 'Pista (Anuncio)',
    hintAvailable: 'Pista',
    previewBtn: 'Vista previa',
    resetBtn: 'Reiniciar',
    undoBtn: 'Deshacer',
    eraseBtn: 'Borrar',
    notesBtn: 'Notas',
    soundOn: 'Sonido: SÍ',
    soundOff: 'Sonido: NO',
    piecesLeft: 'Piezas restantes: {count}',
    pairsLeft: 'Parejas restantes: {count}',
    congratsTitle: '¡Puzzle Completado!',
    congratsDesc: '¡Excelente! Has resuelto el desafío de hoy.',
    streakUpdated: 'Racha Diaria: {count} Días 🔥',
    shareBtn: 'Compartir Resultado',
    copiedToClipboard: '¡Copiado al portapapeles!',
    adLoading: 'Cargando anuncio...',
    adRewardGranted: '💡 ¡Pista desbloqueada!',
    adFailed: 'No se pudo cargar el anuncio. ¡Pista gratis otorgada!',
    settingsTitle: 'Ajustes y Reglas',
    rulesJigsaw: 'Arrastra las piezas del puzzle a su posición. Encajarán automáticamente.',
    rulesSudoku: 'Rellena la cuadrícula de 9x9 para que cada fila, columna y recuadro 3x3 contenga los dígitos del 1 al 9.',
    rulesMemory: 'Voltea las cartas para encontrar parejas iguales.',
    close: 'Cerrar',
    dailyBadge: 'Desafío del Día',
    energy: 'Energía',
    energyModalTitle: '⚡ Sin Energía',
    energyModalDesc: 'Cada partida cuesta 1 Energía. ¡Mira un video para recargar 3 de Energía al instante!',
    rechargeTimer: 'Siguiente energía en: {time}',
    watchAdForEnergy: 'Ver anuncio (+3 Energía) ⚡',
    energyGranted: '⚡ ¡+3 Energía recuperada!'
  }
};

export class I18nManager {
  constructor(initialLang = 'zh-TW') {
    this.currentLang = TRANSLATIONS[initialLang] ? initialLang : 'zh-TW';
  }

  setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
      this.currentLang = lang;
      this.updateDOM();
    }
  }

  getLanguage() {
    return this.currentLang;
  }

  t(key, params = {}) {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS['zh-TW'];
    let text = dict[key] || TRANSLATIONS['zh-TW'][key] || TRANSLATIONS['en'][key] || key;
    for (const [paramKey, val] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), val);
    }
    return text;
  }

  updateDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    const titles = document.querySelectorAll('[data-i18n-title]');
    titles.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', this.t(key));
      }
    });
  }
}
