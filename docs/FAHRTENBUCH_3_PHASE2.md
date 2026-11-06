# Fahrtenbuch 3.0 – Phase 2: MacBook-Server

Status: Entwicklungszweig, noch kein Produktivbetrieb. Die bestehende Webapp und der XLSX-Wochenbericht bleiben unverändert.

## Beschlossene Architektur
- **Nur online:** Eine Fahrt gilt erst nach bestätigter Speicherung durch den Server als gespeichert. Bei Serverausfall kein irreführender Erfolgshinweis.
- **MacBook:** Node.js-API mit SQLite als erste Testumgebung; Datenbank ausschließlich serverseitig.
- **Originalschutz:** Append-only-Ereignisse für Erstellung, Korrektur und Stornierung; Originale niemals überschreiben.
- **Fahrer:** Dürfen eigene Fahrten korrigieren; Korrekturen benötigen eine Begründung. Identität serverseitig prüfen.
- **Berichte:** Bisheriger XLSX-Wochenbericht bleibt unverändert. Eigenständiger Prüfbericht plus maschinenlesbarer Export.
- **Altdaten:** Kein stilles Überschreiben von Browserdaten; historische Einträge beim späteren Import ausdrücklich als Altdaten kennzeichnen.

## Ereignismodell (Entwurf)
- event_id: UUID, idempotent
- trip_id: UUID
- event_type: trip_created | trip_corrected | trip_voided
- actor_id: authentifizierter Fahrer
- vehicle_id / Kennzeichen
- server_received_at: UTC, serverseitig vergeben
- event_payload: Fahrtwerte bzw. Korrektur mit vorherigen und neuen Werten
- reason: verpflichtend bei Korrektur und Stornierung
- previous_event_hash, event_hash: SHA-256 über kanonisch serialisierte Ereignisse
- chain_anchor: regelmäßig unabhängig gesicherter Prüfstand

Fahrtwerte: Datum, Abfahrtszeit, Ankunftszeit, Startort, Zielort, Baustelle, Kilometerstand Start/Ende, Fahrtart, Fahrtzweck, Anmerkung, Fahrer und Kennzeichen. Serverseitig validieren, niemals Client-Daten blind vertrauen.

## Sicherheit
1. Keine SQLite-Datenbank oder Verwaltungs-API öffentlich bereitstellen.
2. Verschlüsselter Zugriff (z. B. über privates VPN); Authentifizierung, Berechtigungsprüfung, Rate-Limits.
3. Eingaben prüfen, parametrisierte SQL-Abfragen, Transaktionen, Ereignisse ausschließlich anfügen.
4. Audit-Hashkette regelmäßig gegen **extern** gespeicherte Prüfstände abgleichen. Hashkette allein verhindert Manipulation durch Serveradministratoren nicht.
5. Verschlüsselte, versionierte Backups an einem zweiten Ort und regelmäßige Wiederherstellungstests.
6. Server-Ausfall: kein Speichern; Fehlermeldung statt lokalem Ersatz-Speicher.
7. Öffentlicher GitHub-Code darf keine Schlüssel, personenbezogenen Fahrten oder Zugangsdaten enthalten.

## Phase-2-Arbeitspakete
1. Servergerüst und lokale Startanleitung erstellen.
2. SQLite-Schema und Migrationen für Fahrer, Fahrzeuge, Ereignisse und Prüfanker.
3. Sichere Anmeldung und serverseitige Autorisierung.
4. API: Fahrt anlegen, korrigieren, stornieren, lesen; serverseitiger Zeitstempel.
5. Integritätsprüfung und revisionsfähiger Export.
6. Automatisierte Tests: Original bleibt erhalten, fehlende Begründung abgewiesen, doppelte Anfrage idempotent, unberechtigte Änderung abgewiesen, Serverausfall kein Erfolg.
7. Erst danach separate Frontend-Testintegration; XLSX-Export unverändert lassen.

## Rechtlicher Vorbehalt
Technische Nachvollziehbarkeit ist keine Garantie für steuerliche Anerkennung. Vor einer Bezeichnung als finanzamtkonform: Anforderungen des konkreten österreichischen Einsatzzwecks fachlich prüfen.
