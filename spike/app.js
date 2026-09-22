// Testlogik fuer den Technik-Test (AP-00). Kein Framework, keine externen Anfragen.

const ZAEHLER_SCHLUESSEL = 'spike_zaehler';
const LOG_SCHLUESSEL = 'spike_log';
const LOG_MAX = 20;

function jetzt() {
  // Nur fuer die Anzeige von Uhrzeiten im Ereignisprotokoll, keine Kalenderdaten,
  // daher hier ohne app/dates.js (das ist nicht Teil des Spikes).
  return new Date().toLocaleString('de-DE');
}

function log(text) {
  let eintraege = [];
  try {
    eintraege = JSON.parse(localStorage.getItem(LOG_SCHLUESSEL)) || [];
  } catch (fehler) {
    eintraege = [];
  }
  eintraege.push(jetzt() + ': ' + text);
  while (eintraege.length > LOG_MAX) eintraege.shift();
  localStorage.setItem(LOG_SCHLUESSEL, JSON.stringify(eintraege));
  zeigeLog();
}

function zeigeLog() {
  let eintraege = [];
  try {
    eintraege = JSON.parse(localStorage.getItem(LOG_SCHLUESSEL)) || [];
  } catch (fehler) {
    eintraege = [];
  }
  const liste = document.getElementById('log-liste');
  while (liste.firstChild) liste.removeChild(liste.firstChild);
  for (const eintrag of eintraege.slice().reverse()) {
    const li = document.createElement('li');
    li.textContent = eintrag;
    liste.appendChild(li);
  }
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function anfrageAnWorker(worker) {
  return new Promise((resolve) => {
    if (!worker) { resolve('kein Worker'); return; }
    const kanal = new MessageChannel();
    const timeout = setTimeout(() => resolve('keine Antwort'), 1000);
    kanal.port1.onmessage = (ereignis) => {
      clearTimeout(timeout);
      resolve(ereignis.data);
    };
    worker.postMessage({ typ: 'GET_VERSION' }, [kanal.port2]);
  });
}

async function zeigeStatus() {
  setText('status-standalone', String(window.matchMedia('(display-mode: standalone)').matches));
  setText('status-navigator-standalone', String(navigator.standalone));
  setText('status-suche', location.search || '(leer)');
  setText('status-online', String(navigator.onLine));
  setText('status-zaehler', localStorage.getItem(ZAEHLER_SCHLUESSEL) || '0');

  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const aktiv = await anfrageAnWorker(reg.active);
      const wartend = await anfrageAnWorker(reg.waiting);
      setText('status-sw-aktiv', aktiv);
      setText('status-sw-wartend', reg.waiting ? wartend : '(keine)');
    } else {
      setText('status-sw-aktiv', '(nicht registriert)');
      setText('status-sw-wartend', '(nicht registriert)');
    }
  } else {
    setText('status-sw-aktiv', '(nicht unterstuetzt)');
    setText('status-sw-wartend', '(nicht unterstuetzt)');
  }
}

async function registriereWorker() {
  if (!('serviceWorker' in navigator)) {
    log('Service Worker wird nicht unterstuetzt.');
    return;
  }
  try {
    await navigator.serviceWorker.register('./sw.js');
    log('Service Worker registriert.');
  } catch (fehler) {
    log('Service-Worker-Registrierung fehlgeschlagen: ' + fehler.name + ' ' + fehler.message);
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    log('controllerchange: Seite wird neu geladen.');
    location.reload();
  });
}

async function knopfPdfTeilen() {
  const ausgabe = document.getElementById('ausgabe-teilen');
  ausgabe.textContent = '';
  try {
    const antwort = await fetch('test.pdf');
    const blob = await antwort.blob();
    const datei = new File([blob], 'Testantrag.pdf', { type: 'application/pdf' });
    const kannTeilen = navigator.canShare ? navigator.canShare({ files: [datei] }) : false;
    ausgabe.textContent = 'canShare(files): ' + kannTeilen + '. ';
    if (!kannTeilen) {
      ausgabe.textContent += 'Teilen mit Datei wird nicht angeboten.';
      log('PDF teilen: canShare(files) = false');
      return;
    }
    await navigator.share({ files: [datei], title: 'Testantrag' });
    ausgabe.textContent += 'share() abgeschlossen (kein Fehler).';
    log('PDF teilen: share() ohne Fehler zurueckgekehrt');
  } catch (fehler) {
    ausgabe.textContent += 'Fehler: ' + fehler.name + ' ' + fehler.message;
    log('PDF teilen: Fehler ' + fehler.name + ' ' + fehler.message);
  }
}

async function knopfPdfNeuesFenster() {
  const ausgabe = document.getElementById('ausgabe-fenster');
  ausgabe.textContent = '';
  try {
    const antwort = await fetch('test.pdf');
    const blob = await antwort.blob();
    const url = URL.createObjectURL(blob);
    const fenster = window.open(url, '_blank');
    ausgabe.textContent = fenster ? 'window.open() lieferte ein Fensterobjekt.' : 'window.open() lieferte null (Popup blockiert?).';
    log('PDF neues Fenster: ' + ausgabe.textContent);
  } catch (fehler) {
    ausgabe.textContent = 'Fehler: ' + fehler.name + ' ' + fehler.message;
    log('PDF neues Fenster: Fehler ' + fehler.name + ' ' + fehler.message);
  }
}

function knopfZaehlerErhoehen() {
  const aktuell = Number(localStorage.getItem(ZAEHLER_SCHLUESSEL) || '0') + 1;
  localStorage.setItem(ZAEHLER_SCHLUESSEL, String(aktuell));
  setText('status-zaehler', String(aktuell));
  log('Zaehler erhoeht auf ' + aktuell);
}

async function knopfPersist() {
  const ausgabe = document.getElementById('ausgabe-persist');
  ausgabe.textContent = '';
  if (!navigator.storage || !navigator.storage.persist) {
    ausgabe.textContent = 'navigator.storage.persist() wird nicht unterstuetzt.';
    log('persist(): nicht unterstuetzt');
    return;
  }
  try {
    const gewaehrt = await navigator.storage.persist();
    const bereitsGewaehrt = await navigator.storage.persisted();
    const schaetzung = await navigator.storage.estimate();
    ausgabe.textContent = 'persist(): ' + gewaehrt
      + '. persisted(): ' + bereitsGewaehrt
      + '. estimate(): usage=' + schaetzung.usage + ' quota=' + schaetzung.quota;
    log('persist(): ' + gewaehrt + ', persisted(): ' + bereitsGewaehrt);
  } catch (fehler) {
    ausgabe.textContent = 'Fehler: ' + fehler.name + ' ' + fehler.message;
    log('persist(): Fehler ' + fehler.name + ' ' + fehler.message);
  }
}

async function knopfUpdatePruefen() {
  const ausgabe = document.getElementById('ausgabe-update');
  ausgabe.textContent = '';
  if (!('serviceWorker' in navigator)) {
    ausgabe.textContent = 'Service Worker wird nicht unterstuetzt.';
    return;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      ausgabe.textContent = 'Kein registrierter Service Worker.';
      return;
    }
    await reg.update();
    ausgabe.textContent = 'reg.update() aufgerufen. reg.waiting vorhanden: ' + Boolean(reg.waiting);
    log('Update pruefen: reg.waiting = ' + Boolean(reg.waiting));
    zeigeStatus();
  } catch (fehler) {
    ausgabe.textContent = 'Fehler: ' + fehler.name + ' ' + fehler.message;
    log('Update pruefen: Fehler ' + fehler.name + ' ' + fehler.message);
  }
}

async function knopfUpdateAktivieren() {
  const ausgabe = document.getElementById('ausgabe-update');
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg && reg.waiting) {
    reg.waiting.postMessage('SKIP_WAITING');
    ausgabe.textContent = 'SKIP_WAITING gesendet.';
    log('Update aktivieren: SKIP_WAITING gesendet');
  } else {
    ausgabe.textContent = 'Kein wartender Service Worker.';
    log('Update aktivieren: kein wartender Worker');
  }
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;
  log('visibilitychange: sichtbar');
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.update();
      log('visibilitychange: reg.update() aufgerufen, reg.waiting = ' + Boolean(reg.waiting));
    }
  }
  zeigeStatus();
});

window.addEventListener('online', () => { log('online-Ereignis'); zeigeStatus(); });
window.addEventListener('offline', () => { log('offline-Ereignis'); zeigeStatus(); });

document.getElementById('knopf-teilen').addEventListener('click', knopfPdfTeilen);
document.getElementById('knopf-fenster').addEventListener('click', knopfPdfNeuesFenster);
document.getElementById('knopf-zaehler').addEventListener('click', knopfZaehlerErhoehen);
document.getElementById('knopf-persist').addEventListener('click', knopfPersist);
document.getElementById('knopf-update-pruefen').addEventListener('click', knopfUpdatePruefen);
document.getElementById('knopf-update-aktivieren').addEventListener('click', knopfUpdateAktivieren);

registriereWorker().then(zeigeStatus);
zeigeLog();
log('Seite geladen.');
