// Modul-Register (ARCHITEKTUR 3.3).
//
// Ein Modul meldet sich beim Import selbst an. main.js importiert die
// Moduldateien und sagt mit setzeAktive(index.module), welche davon gelten.
// So braucht ein neues Modul keinen Eingriff in Router oder Navigation.

const register = new Map();

// null bedeutet: noch nichts eingeschränkt, alle registrierten Module gelten.
let aktiveIds = null;

/** Meldet ein Modul an. Pflicht: id, titel, routes. */
export function registerModule(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new Error('registerModule braucht eine Modul-Definition.');
  }
  const { id, titel } = definition;
  if (!id || typeof id !== 'string') {
    throw new Error('Modul ohne id.');
  }
  if (register.has(id)) {
    throw new Error('Modul-Id doppelt vergeben: ' + id);
  }
  if (!titel || typeof titel !== 'string') {
    throw new Error('Modul ohne titel: ' + id);
  }
  const routen = Array.isArray(definition.routes) ? definition.routes : [];
  for (const route of routen) {
    if (!route || typeof route.pattern !== 'string' || !route.pattern.startsWith('#/')) {
      throw new Error('Route ohne gültiges pattern in Modul ' + id);
    }
    if (typeof route.render !== 'function') {
      throw new Error('Route ohne render in Modul ' + id + ': ' + route.pattern);
    }
  }
  const nav = definition.nav || {};
  register.set(id, {
    id,
    titel,
    icon: definition.icon || null,
    nav: {
      position: Number.isFinite(Number(nav.position)) ? Number(nav.position) : 100,
      sichtbar: nav.sichtbar !== false,
      // mehr: true haengt den Eintrag nicht in die Leiste, sondern unter
      // #/mehr (DESIGN: hoechstens 6 Eintraege + Sammeleintrag "Mehr").
      mehr: nav.mehr === true
    },
    routes: routen,
    suche: typeof definition.suche === 'function' ? definition.suche : null
  });
  return register.get(id);
}

/**
 * Legt fest, welche Modul-Ids aktiv sind (aus content/index.json, Feld module).
 * Nicht in ARCHITEKTUR 3.3 aufgeführt, aber nötig, weil getModules laut 3.3
 * die "registrierten, aktiven" Module liefert und index.module darüber
 * entscheidet.
 */
export function setzeAktive(ids) {
  aktiveIds = Array.isArray(ids) ? ids.map(String) : null;
}

/** Registrierte, aktive Module, sortiert nach nav.position. */
export function getModules() {
  const liste = [];
  for (const modul of register.values()) {
    if (istAktiv(modul.id)) liste.push(modul);
  }
  liste.sort((a, b) => a.nav.position - b.nav.position || a.titel.localeCompare(b.titel, 'de'));
  return liste;
}

/** Sucht die Route zu einem Hash. => { modul, route, params } oder null. */
export function findRoute(hash) {
  const { pfad, query } = zerlegeHash(hash);
  if (!pfad) return null;
  for (const modul of getModules()) {
    for (const route of modul.routes) {
      const params = passtAufMuster(route.pattern, pfad);
      if (params) {
        return { modul, route, params: Object.assign(params, query) };
      }
    }
  }
  return null;
}

/**
 * Trennt einen Hash in Pfad und Query: '#/fach/de?ansicht=fach'
 * => { pfad: '#/fach/de', query: { ansicht: 'fach' } }
 */
export function zerlegeHash(hash) {
  const text = typeof hash === 'string' ? hash : '';
  const trenner = text.indexOf('?');
  const pfad = trenner === -1 ? text : text.slice(0, trenner);
  const query = {};
  if (trenner !== -1) {
    for (const [schluessel, wert] of new URLSearchParams(text.slice(trenner + 1))) {
      query[schluessel] = wert;
    }
  }
  return { pfad: ohneEndschraegstrich(pfad), query };
}

function istAktiv(id) {
  return aktiveIds === null || aktiveIds.includes(id);
}

function passtAufMuster(muster, pfad) {
  const teileMuster = muster.split('/');
  const teilePfad = pfad.split('/');
  if (teileMuster.length !== teilePfad.length) return null;
  const params = {};
  for (let i = 0; i < teileMuster.length; i++) {
    const teilMuster = teileMuster[i];
    const teilPfad = teilePfad[i];
    if (teilMuster.startsWith(':')) {
      if (!teilPfad) return null;
      params[teilMuster.slice(1)] = sicherDekodieren(teilPfad);
      continue;
    }
    if (teilMuster !== teilPfad) return null;
  }
  return params;
}

function sicherDekodieren(text) {
  try {
    return decodeURIComponent(text);
  } catch (fehler) {
    return text;
  }
}

// '#/woche/' und '#/woche' sind dieselbe Route.
function ohneEndschraegstrich(pfad) {
  return pfad.length > 2 && pfad.endsWith('/') ? pfad.slice(0, -1) : pfad;
}
