// Demo-Modul. Prüft in AP-01, ob Register, Router und Navigation laufen.
// AP-10 löscht diese Datei und nimmt 'demo' aus content/index.json.

import { registerModule } from '../module.js';
import { formatDatum, toISODate } from '../dates.js';
import { el } from '../ui/components.js';

registerModule({
  id: 'demo',
  titel: 'Test',
  icon: 'zahnrad',
  nav: { position: 10, sichtbar: true },
  routes: [
    { pattern: '#/demo', render: renderDemo }
  ]
});

function renderDemo(container, params, ctx) {
  container.append(el('h1', { text: 'Test' }));
  container.append(el('p', {
    text: 'Dieses Modul prüft nur, ob die App läuft. Es verschwindet später.'
  }));

  const heute = ctx && ctx.heute ? ctx.heute : null;
  container.append(el('dl', { class: 'demo-liste' }, [
    el('dt', { text: 'Heute' }),
    el('dd', { text: heute ? formatDatum(heute, 'lang') : 'unbekannt' }),
    el('dt', { text: 'Datum technisch' }),
    el('dd', { text: heute ? toISODate(heute) : 'unbekannt' }),
    el('dt', { text: 'Jahrgang' }),
    el('dd', { text: ctx && ctx.state && ctx.state.jgst ? String(ctx.state.jgst) : 'keiner' }),
    el('dt', { text: 'Schuljahr' }),
    el('dd', { text: ctx && ctx.index && ctx.index.schuljahr ? ctx.index.schuljahr : 'unbekannt' }),
    el('dt', { text: 'Datenquelle' }),
    el('dd', { text: ctx && ctx.vorschau ? 'mit Vorschau' : 'normal' })
  ]));
}
