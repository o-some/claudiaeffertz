# Übergabe: Claudia Effertz Website

Stand: 29. August 2026

## Projekt

- Repository: `o-some/claudiaeffertz`
- Branch: `main`
- Website: `https://www.claudia-effertz.de`
- Plattform: Shopify / Dawn-basiertes Theme
- Arbeitsweise: Chelonaki App Factory, schlanker Projektmodus
- Quelle für Änderungen und Veröffentlichungen: ausschließlich GitHub

## Marken- und Inhaltsbasis

Die Seite wurde aus den Dokumenten im Dropbox-Ordner `[Claudia Effertz]/[Website]` aufgebaut. Maßgeblich sind der Gesamtaufbau vom 24. August 2026 und das Claudia-Effertz-CI-Playbook. Kernaussage ist „Vom Verstehen zur Veränderung.“

Farben:

- Navy `#1E3A5F`, tiefes Navy `#162C49`
- Gold `#C69A4B`, helles Gold `#DFBD7C`
- Petrol `#1F5F6B`, tiefes Petrol `#144953`
- Creme `#F4EEE1`, Warmweiß `#FBF8F2`
- Text `#2B3A4A`

## Umgesetzt

- Eigenständige Claudia-Startseite in `sections/ce-home.liquid`
- Navigation: Claudia, Angebote, Speakerin, Buch & Edition, Ausbildungen, Podcast, Engagement, Kontakt
- Reale Claudia-Fotos und vorhandene Buch-/Netzwerkmotive als optimierte Theme-Assets
- Angebote, Erfahrungsdaten, Ausbildungen, Podcastplanung, Vier-Websites-Modell und gesellschaftliches Engagement
- Shopify-Kontaktformular mit Validierung und Statusanzeige
- Responsive Layout, mobiles Menü, Tastaturfokus und Reduced-Motion-Unterstützung
- SEO-Titel, Beschreibung und strukturierte Organisationsdaten in den Theme-Einstellungen
- Vorhandene Shop-, Such- und Warenkorbfunktionen bleiben erhalten
- Der zuvor fehlende Warenkorb-Hinweis ist ergänzt und der bekannte Theme-Check-Fehler damit behoben

## Bewusste Grenzen

- Der Preloader bleibt deaktiviert, weil die Quelldokumentation ihn ausdrücklich nur als Opt-in vorsieht.
- Unbestätigte Partnerangebote und Namen werden nicht als fest buchbare Leistungen veröffentlicht.
- Für den Podcast sind Plattformen genannt, aber keine erfundenen Profil-URLs gesetzt.
- Es wurde keine E-Mail-Adresse erfunden; der Kontakt läuft über das Shopify-Formular und die veröffentlichte Telefonnummer.
- Alte Food-Instructor-Dateien bleiben für Rückfall und Shop-Funktionen im Theme, sind aber nicht Teil der aktiven Startseite. Alte Seitentemplates dürfen nur nach inhaltlicher Prüfung zugewiesen werden.

## Vor Veröffentlichung prüfen

1. `shopify theme check`
2. Startseite in Desktop- und Mobilansicht prüfen
3. Kontaktformular mit echter Shop-Konfiguration testen
4. Navigation, Suche, Produktseite, Warenkorb und Widerrufslink prüfen
5. Produktionsdomain und Shopify-Theme-Verknüpfung im bestehenden GitHub-Workflow bestätigen

Keine Veröffentlichung über ChatGPT Sites. Nach dem GitHub-Handoff ist dieses Repository die alleinige Quelle.
