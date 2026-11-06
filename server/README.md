# Fahrtenbuch 3.0 – isolierter Server-Prototyp

**Nicht produktiv verwenden.** Nur Entwicklungsstand: keine Benutzerkonten, keine revisionssicheren externen Prüfanker, kein Backup-Automatismus, keine steuerliche Freigabe. Die gemeinsame Test-Token-Authentifizierung identifiziert keine Fahrer verlässlich; actorId wird noch vom Client übergeben. Deshalb ausschließlich lokal an 127.0.0.1 gebunden.

## Voraussetzung
Node.js 22.13+ mit eingebautem node:sqlite.

## Lokal starten
```sh
cd server
export FAHRtenBUCH_TOKEN="$(openssl rand -hex 32)"
node src/server.js
```

Der Server lauscht nur auf 127.0.0.1:8787. **Nicht ins öffentliche Internet stellen.** Die Tokenvariable ist nur für den lokalen Prototyp.

## Tests
```sh
cd server
node --test
```

## Noch zu erledigen
- Fahrer-Login und serverseitig abgeleitete Identität, Berechtigungen und sichere Sessions
- Vollständige serverseitige Validierung aller Fahrt- und Korrekturdaten
- Unabhängige Integritätsanker, verschlüsselte externe Backups und Wiederherstellungstests
- Sichere Erreichbarkeit vom iPhone (TLS/VPN), CORS- und CSRF-Konzept
- Frontend-Anbindung und separater Prüfbericht
- Steuerrechtliche Fachprüfung

Der bisherige XLSX-Export und der bestehende Browser-Speicher werden nicht verändert.
