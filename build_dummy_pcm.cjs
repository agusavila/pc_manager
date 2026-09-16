const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function buildDummyModule() {
  const zip = new JSZip();

  const manifest = {
    id: "system-clock",
    name: "Reloj, Cronómetro y Temporizador",
    version: "1.1.0",
    description: "Módulo operativo de tiempo con reloj multinorma, cronómetro de precisión con registro de vueltas y temporizador con barra de progreso y alarma acústica.",
    author: "Modular Engine",
    group: "General",
    icon: `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    entrypoint: "module.js",
    permissions: [],
    dependencies: [],
    requires_services: [],
    provides_services: ["system.clock", "system.stopwatch", "system.timer"],
    meta_options: [
      {
        id: "time_format",
        name: "Formato de Hora",
        desc: "Alternar entre formato militar de 24 horas y estándar de 12 horas (AM/PM).",
        type: "select",
        options: [
          { value: "24", label: "24 Horas (Ej: 14:30:00)" },
          { value: "12", label: "12 Horas AM/PM (Ej: 02:30:00 PM)" }
        ],
        default: "24"
      },
      {
        id: "show_seconds",
        name: "Mostrar Segundos en Reloj",
        desc: "Visualizar el conteo de segundos en la tarjeta del Dashboard y panel operativo.",
        type: "switch",
        default: true
      },
      {
        id: "sound_alert",
        name: "Alerta Sonora de Temporizador",
        desc: "Emitir aviso acústico sintetizado (Web Audio) al concluir la cuenta regresiva.",
        type: "switch",
        default: true
      }
    ],
    widgets: [
      {
        id: "card-system-clock",
        name: "Reloj del Sistema",
        size: "2x1",
        icon: `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        html: `
          <header class="card-header">
            <div class="card-title-box">
              <div class="card-icon-wrap">
                <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h4>Reloj del Sistema</h4>
            </div>
            <span class="card-badge" id="clock-format-badge">24H</span>
          </header>
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">
              <div class="metric-big" id="clock-time-display" style="font-size:19px;white-space:nowrap;font-variant-numeric:tabular-nums;">--:--:--</div>
              <span class="card-badge" style="color:var(--accent-success);border-color:rgba(16,185,129,0.3);flex-shrink:0;">EN VIVO</span>
            </div>
            <div class="metric-label" id="clock-date-display" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:0;">Sincronizado con tiempo local</div>
          </div>
        `
      },
      {
        id: "card-system-stopwatch",
        name: "Cronómetro del Sistema",
        size: "2x2",
        icon: `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2"></path><path d="M5 3L2 6"></path><path d="M22 6l-3-3"></path><path d="M12 2v3"></path></svg>`,
        html: `
          <header class="card-header">
            <div class="card-title-box">
              <div class="card-icon-wrap">
                <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2"></path><path d="M5 3L2 6"></path><path d="M22 6l-3-3"></path><path d="M12 2v3"></path></svg>
              </div>
              <h4>Cronómetro</h4>
            </div>
            <span class="card-badge" id="sw-status-badge">LISTO</span>
          </header>
          <div class="card-body" style="justify-content:flex-start;">
            <div class="metric-big" id="stopwatch-display" style="font-size:26px;text-align:center;letter-spacing:1px;margin-bottom:6px;">00:00.00</div>
            
            <div style="display:flex;gap:6px;margin-bottom:8px;">
              <button class="btn btn-primary" id="btn-sw-toggle" onclick="window.__SYSTEM_CLOCK_MODULE__.toggleStopwatch()" style="flex:1;padding:6px 8px;font-size:11.5px;justify-content:center;">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span id="btn-sw-toggle-text">Iniciar</span>
              </button>
              <button class="btn btn-secondary" id="btn-sw-lap" onclick="window.__SYSTEM_CLOCK_MODULE__.lapStopwatch()" style="padding:6px 10px;font-size:11.5px;justify-content:center;" title="Registrar vuelta">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                <span>Vuelta</span>
              </button>
              <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.resetStopwatch()" style="padding:6px 10px;font-size:11.5px;justify-content:center;" title="Reiniciar a cero">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              </button>
            </div>

            <div id="stopwatch-laps" style="flex:1;max-height:56px;overflow-y:auto;background:var(--bg-elevated);border-radius:var(--radius-sm);padding:4px 8px;font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text-secondary);border:1px solid var(--border-subtle);">
              <div style="text-align:center;color:var(--text-muted);font-size:10.5px;padding-top:4px;">Sin vueltas registradas</div>
            </div>
          </div>
        `
      },
      {
        id: "card-system-timer",
        name: "Temporizador",
        size: "2x2",
        icon: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg>`,
        html: `
          <header class="card-header">
            <div class="card-title-box">
              <div class="card-icon-wrap">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg>
              </div>
              <h4>Temporizador</h4>
            </div>
            <span class="card-badge" id="timer-status-badge">PAUSADO</span>
          </header>
          <div class="card-body" style="justify-content:flex-start;">
            <div class="metric-big" id="timer-display" style="font-size:26px;text-align:center;letter-spacing:1px;margin-bottom:4px;">05:00</div>
            
            <div class="metric-progress-bg" style="margin-top:2px;margin-bottom:8px;">
              <div class="metric-progress-bar" id="timer-progress-bar" style="width:100%;"></div>
            </div>

            <div style="display:flex;gap:4px;margin-bottom:8px;">
              <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.setTimerDuration(60)" style="padding:4px 6px;font-size:10px;flex:1;justify-content:center;">1m</button>
              <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.setTimerDuration(300)" style="padding:4px 6px;font-size:10px;flex:1;justify-content:center;">5m</button>
              <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.setTimerDuration(600)" style="padding:4px 6px;font-size:10px;flex:1;justify-content:center;">10m</button>
              <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.setTimerDuration(1500)" style="padding:4px 6px;font-size:10px;flex:1;justify-content:center;">25m</button>
            </div>

            <div style="display:flex;gap:6px;">
              <button class="btn btn-primary" id="btn-timer-toggle" onclick="window.__SYSTEM_CLOCK_MODULE__.toggleTimer()" style="flex:1;padding:6px 8px;font-size:11.5px;justify-content:center;">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span id="btn-timer-toggle-text">Iniciar</span>
              </button>
              <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.addTimerMinute()" style="padding:6px 8px;font-size:11px;justify-content:center;" title="Añadir 1 minuto">
                <span>+1m</span>
              </button>
              <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.resetTimer()" style="padding:6px 8px;font-size:11.5px;justify-content:center;" title="Reiniciar">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              </button>
            </div>
          </div>
        `
      }
    ],
    views: [
      {
        id: "view-module-clock",
        name: "Control de Tiempo",
        icon: `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        html: `
          <div style="display:flex;flex-direction:column;gap:16px;">
            <div class="settings-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div class="settings-header" style="margin-bottom:0;">
                  <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <h4>Panel Maestro de Tiempo del Sistema</h4>
                  <span class="card-badge" style="color:var(--accent-primary);">v1.1.0</span>
                </div>
                <button class="btn btn-secondary" onclick="switchView('settings'); switchSettingsTab('mod-system-clock');" title="Configurar parámetros de este módulo" style="padding:6px 12px;font-size:12px;">
                  <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  <span>Configuración</span>
                </button>
              </div>
              <p style="font-size:13px;color:var(--text-secondary);">
                Herramienta integral de sincronización, medición y alertas temporales para la estación de trabajo.
              </p>
              
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-top:14px;">
                <!-- Panel Reloj -->
                <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;">
                  <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Hora Local del Sistema</div>
                  <div id="full-clock-time" style="font-size:32px;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent-primary);margin-top:6px;">--:--:--</div>
                  <div id="full-clock-date" style="font-size:13px;color:var(--text-secondary);margin-top:4px;">--</div>
                  <div style="margin-top:12px;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-subtle);padding-top:8px;" id="full-clock-utc">UTC: --:--:--</div>
                </div>

                <!-- Panel Cronómetro -->
                <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;">
                  <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Cronómetro de Precisión</div>
                  <div id="full-sw-display" style="font-size:32px;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent-success);margin-top:6px;">00:00.00</div>
                  <div style="display:flex;gap:6px;margin-top:12px;">
                    <button class="btn btn-primary" onclick="window.__SYSTEM_CLOCK_MODULE__.toggleStopwatch()" style="flex:1;padding:6px 10px;font-size:12px;justify-content:center;">Iniciar / Pausa</button>
                    <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.lapStopwatch()" style="padding:6px 10px;font-size:12px;justify-content:center;">Vuelta</button>
                    <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.resetStopwatch()" style="padding:6px 10px;font-size:12px;justify-content:center;">Reiniciar</button>
                  </div>
                </div>

                <!-- Panel Temporizador -->
                <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;">
                  <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Temporizador con Alarma</div>
                  <div id="full-timer-display" style="font-size:32px;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent-warning);margin-top:6px;">05:00</div>
                  <div style="display:flex;gap:6px;margin-top:12px;">
                    <button class="btn btn-primary" onclick="window.__SYSTEM_CLOCK_MODULE__.toggleTimer()" style="flex:1;padding:6px 10px;font-size:12px;justify-content:center;">Iniciar / Pausa</button>
                    <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.addTimerMinute()" style="padding:6px 10px;font-size:12px;justify-content:center;">+1m</button>
                    <button class="btn btn-secondary" onclick="window.__SYSTEM_CLOCK_MODULE__.resetTimer()" style="padding:6px 10px;font-size:12px;justify-content:center;">Reiniciar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `
      }
    ]
  };

  const moduleJs = `
(function() {
  // Estado local del módulo
  let timeFormat = "24";
  let showSeconds = true;
  let soundAlert = true;

  // 1. RELOJ EN TIEMPO REAL
  function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    let ampm = '';

    if (timeFormat === '12') {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
    }
    const hoursStr = String(hours).padStart(2, '0');
    
    let timeStr = '';
    if (showSeconds) {
      timeStr = hoursStr + ':' + minutes + ':' + seconds + ampm;
    } else {
      timeStr = hoursStr + ':' + minutes + ampm;
    }

    const dateStr = now.toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const utcStr = 'UTC: ' + now.toUTCString().split(' ')[4];

    const cardTime = document.getElementById('clock-time-display');
    const cardDate = document.getElementById('clock-date-display');
    const cardBadge = document.getElementById('clock-format-badge');
    const fullTime = document.getElementById('full-clock-time');
    const fullDate = document.getElementById('full-clock-date');
    const fullUtc = document.getElementById('full-clock-utc');

    if (cardTime) cardTime.textContent = timeStr;
    if (cardDate) cardDate.textContent = dateStr;
    if (cardBadge) cardBadge.textContent = timeFormat === '24' ? '24H' : '12H';
    if (fullTime) fullTime.textContent = timeStr;
    if (fullDate) fullDate.textContent = dateStr;
    if (fullUtc) fullUtc.textContent = utcStr;
  }

  const clockInterval = setInterval(updateClock, 1000);
  updateClock();

  // 2. CRONÓMETRO DE ALTA PRECISIÓN
  let swRunning = false;
  let swStartTime = 0;
  let swElapsedTime = 0;
  let swInterval = null;
  let swLaps = [];

  function formatStopwatch(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0') + '.' + String(hundredths).padStart(2, '0');
  }

  function updateStopwatchDisplay() {
    const currentMs = swRunning ? (swElapsedTime + (performance.now() - swStartTime)) : swElapsedTime;
    const str = formatStopwatch(currentMs);

    const cardDisplay = document.getElementById('stopwatch-display');
    const fullDisplay = document.getElementById('full-sw-display');
    if (cardDisplay) cardDisplay.textContent = str;
    if (fullDisplay) fullDisplay.textContent = str;
  }

  function toggleStopwatch() {
    if (swRunning) {
      // Pausar
      swElapsedTime += performance.now() - swStartTime;
      swRunning = false;
      clearInterval(swInterval);
      swInterval = null;
      updateStopwatchUI(false);
    } else {
      // Iniciar
      swStartTime = performance.now();
      swRunning = true;
      swInterval = setInterval(updateStopwatchDisplay, 33);
      updateStopwatchUI(true);
    }
  }

  function updateStopwatchUI(running) {
    const toggleBtnText = document.getElementById('btn-sw-toggle-text');
    const statusBadge = document.getElementById('sw-status-badge');
    if (toggleBtnText) toggleBtnText.textContent = running ? 'Pausar' : 'Continuar';
    if (statusBadge) {
      statusBadge.textContent = running ? 'CORRIENDO' : (swElapsedTime > 0 ? 'PAUSADO' : 'LISTO');
      statusBadge.style.color = running ? 'var(--accent-success)' : 'var(--text-muted)';
    }
  }

  function lapStopwatch() {
    const currentMs = swRunning ? (swElapsedTime + (performance.now() - swStartTime)) : swElapsedTime;
    if (currentMs === 0) return;

    swLaps.unshift({ index: swLaps.length + 1, time: formatStopwatch(currentMs) });
    renderLaps();
  }

  function resetStopwatch() {
    swRunning = false;
    if (swInterval) clearInterval(swInterval);
    swInterval = null;
    swStartTime = 0;
    swElapsedTime = 0;
    swLaps = [];
    updateStopwatchDisplay();
    updateStopwatchUI(false);
    renderLaps();
  }

  function renderLaps() {
    const lapsEl = document.getElementById('stopwatch-laps');
    if (!lapsEl) return;
    if (swLaps.length === 0) {
      lapsEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:10.5px;padding-top:4px;">Sin vueltas registradas</div>';
      return;
    }
    lapsEl.innerHTML = swLaps.map(l => 
      '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
      '<span>V' + l.index + '</span>' +
      '<span style="font-weight:600;color:var(--text-primary);">' + l.time + '</span>' +
      '</div>'
    ).join('');
  }

  // 3. TEMPORIZADOR CON ALARMA
  let timerInitialSeconds = 300; // 5 min
  let timerRemainingSeconds = 300;
  let timerRunning = false;
  let timerInterval = null;

  function formatTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  function updateTimerDisplay() {
    const str = formatTimer(timerRemainingSeconds);
    const percent = timerInitialSeconds > 0 ? (timerRemainingSeconds / timerInitialSeconds) * 100 : 0;

    const cardDisp = document.getElementById('timer-display');
    const fullDisp = document.getElementById('full-timer-display');
    const bar = document.getElementById('timer-progress-bar');

    if (cardDisp) cardDisp.textContent = str;
    if (fullDisp) fullDisp.textContent = str;
    if (bar) bar.style.width = Math.max(0, Math.min(100, percent)) + '%';
  }

  function toggleTimer() {
    if (timerRunning) {
      // Pausa
      timerRunning = false;
      clearInterval(timerInterval);
      timerInterval = null;
      updateTimerUI(false);
    } else {
      if (timerRemainingSeconds <= 0) timerRemainingSeconds = timerInitialSeconds;
      timerRunning = true;
      timerInterval = setInterval(() => {
        if (timerRemainingSeconds > 0) {
          timerRemainingSeconds--;
          updateTimerDisplay();
        } else {
          // Conclusión del temporizador
          clearInterval(timerInterval);
          timerInterval = null;
          timerRunning = false;
          updateTimerUI(false);
          triggerTimerAlarm();
        }
      }, 1000);
      updateTimerUI(true);
    }
  }

  function updateTimerUI(running) {
    const btnText = document.getElementById('btn-timer-toggle-text');
    const badge = document.getElementById('timer-status-badge');
    if (btnText) btnText.textContent = running ? 'Pausar' : 'Iniciar';
    if (badge) {
      badge.textContent = running ? 'ACTIVO' : 'PAUSADO';
      badge.style.color = running ? 'var(--accent-warning)' : 'var(--text-muted)';
    }
  }

  function setTimerDuration(seconds) {
    if (timerRunning) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning = false;
    }
    timerInitialSeconds = seconds;
    timerRemainingSeconds = seconds;
    updateTimerDisplay();
    updateTimerUI(false);
  }

  function addTimerMinute() {
    timerInitialSeconds += 60;
    timerRemainingSeconds += 60;
    updateTimerDisplay();
  }

  function resetTimer() {
    if (timerRunning) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning = false;
    }
    timerRemainingSeconds = timerInitialSeconds;
    updateTimerDisplay();
    updateTimerUI(false);
  }

  function triggerTimerAlarm() {
    if (soundAlert) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
          gain.gain.setValueAtTime(0.35, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.45);
        }
      } catch(e) {
        console.warn('Audio alert error:', e);
      }
    }

    if (typeof addSystemNotification === 'function') {
      addSystemNotification('Temporizador Concluido', 'La cuenta regresiva ha llegado a cero.', 'warning', 'system-clock');
    }
  }

  // 4. API GLOBAL EXPUESTA PARA INTERACCIÓN DESDE CONTROLES UI
  window.__SYSTEM_CLOCK_MODULE__ = {
    toggleStopwatch,
    lapStopwatch,
    resetStopwatch,
    toggleTimer,
    setTimerDuration,
    addTimerMinute,
    resetTimer
  };

  // 5. MANEJADOR DE CAMBIO DE META-OPCIONES
  window.__SETTING_CHANGE_system_clock__ = function(optId, val) {
    if (optId === 'time_format') {
      timeFormat = String(val);
      updateClock();
    } else if (optId === 'show_seconds') {
      showSeconds = Boolean(val);
      updateClock();
    } else if (optId === 'sound_alert') {
      soundAlert = Boolean(val);
    }
  };

  // 6. MANEJADOR DE LIMPIEZA TOTAL EN ACTUALIZACIÓN O DESINSTALACIÓN
  window.__CLEANUP_system_clock__ = function() {
    if (clockInterval) clearInterval(clockInterval);
    if (swInterval) clearInterval(swInterval);
    if (timerInterval) clearInterval(timerInterval);
    delete window.__SYSTEM_CLOCK_MODULE__;
    delete window.__SETTING_CHANGE_system_clock__;
    delete window.__CLEANUP_system_clock__;
  };
})();
`;

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

  const readme = `# Módulo Reloj, Cronómetro y Temporizador (v1.1.0)
Paquete .pcm de actualización con reloj en tiempo real, cronómetro con registro de vueltas y temporizador con alarma sonora.
`;

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('module.js', moduleJs);
  zip.file('icon.svg', iconSvg);
  zip.file('README.md', readme);

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const outputPath = path.join(__dirname, 'system-clock.pcm');
  fs.writeFileSync(outputPath, content);
  console.log(`Paquete v1.1.0 generado exitosamente: ${outputPath} (${content.length} bytes)`);
}

buildDummyModule().catch(err => {
  console.error('Error generando paquete:', err);
  process.exit(1);
});
