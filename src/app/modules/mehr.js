// Modul "Mehr" (#/mehr): Sammelseite fuer Eintraege, die nicht mehr in die
// Navigationsleiste passen (Leo, 24.09.2026: hoechstens 6 Eintraege in der
// Leiste, der Rest steht hier).
//
// Regeln aus AP_ALLGEMEIN: kein Modul importiert ein anderes Modul. Die
// Liste kommt aus getModules() (module.js), nicht aus einem Import der
// Zielmodule selbst.

import { getModules, registerModule } from '../module.js';
import { el, knopf, leerZustand } from '../ui/components.js';

registerModule({
  id: 'mehr',
  titel: 'Mehr',
  icon: 'mehr',
  nav: { position: 65, sichtbar: true },
  routes: [
    { pattern: '#/mehr', render: renderMehr }
  ]
});

function renderMehr(container, params, ctx) {
  const { navigate } = ctx;
  const eintraege = getModules().filter((modul) => modul.nav.mehr && modul.routes.length > 0);

  const kinder = [el('h1', { text: 'Mehr', tabindex: '-1' })];

  if (eintraege.length === 0) {
    kinder.push(leerZustand({ text: 'Hier gibt es gerade nichts.', motiv: 'zahnrad' }));
  } else {
    kinder.push(...eintraege.map((modul) => el('p', {}, [
      knopf({
        text: modul.titel,
        icon: modul.icon,
        art: 'neben',
        onTap: () => navigate(modul.routes[0].pattern)
      })
    ])));
  }

  anfuegen(container, kinder);
}

function anfuegen(container, kinder) {
  container.append(...kinder.filter(Boolean));
}
