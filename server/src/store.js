import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const canonical = value => JSON.stringify(value, Object.keys(value).sort());
const sha = value => createHash('sha256').update(value).digest('hex');
const required = (v, name) => { if (typeof v !== 'string' || !v.trim()) throw new Error(name + ' erforderlich'); return v.trim(); };
export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE NOT NULL,
      trip_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('trip_created','trip_corrected','trip_voided')),
      payload TEXT NOT NULL,
      reason TEXT,
      server_received_at TEXT NOT NULL,
      previous_hash TEXT NOT NULL,
      event_hash TEXT UNIQUE NOT NULL
    );`);
  function append({ eventId=randomUUID(), tripId, actorId, vehicleId, type, payload, reason }) {
    required(eventId,'Ereignis-ID'); required(tripId,'Fahrt-ID'); required(actorId,'Fahrer'); required(vehicleId,'Kennzeichen');
    if (!['trip_created','trip_corrected','trip_voided'].includes(type)) throw new Error('Unbekannter Ereignistyp');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Ungültige Fahrtdaten');
    if (type !== 'trip_created') required(reason,'Korrekturgrund');
    db.exec('BEGIN IMMEDIATE');
    try {
      const existing=db.prepare('SELECT * FROM events WHERE event_id=?').get(eventId);
      if (existing) { db.exec('COMMIT'); return { ...existing, duplicate:true }; }
      const prior=db.prepare('SELECT * FROM events WHERE trip_id=? ORDER BY seq DESC LIMIT 1').get(tripId);
      if (type==='trip_created' && prior) throw new Error('Fahrt existiert bereits');
      if (type!=='trip_created' && !prior) throw new Error('Fahrt nicht gefunden');
      if (prior && (prior.actor_id!==actorId || prior.vehicle_id!==vehicleId)) throw new Error('Keine Berechtigung');
      if (prior?.event_type==='trip_voided') throw new Error('Stornierte Fahrt');
      if (type==='trip_created') {
        for(const field of ['date','from','to','purpose','driver','plate']) required(payload[field],field);
        if (!Number.isSafeInteger(payload.start) || !Number.isSafeInteger(payload.end) || payload.end<payload.start || payload.start<0) throw new Error('Ungültige Kilometerstände');
      }
      const last=db.prepare('SELECT event_hash FROM events ORDER BY seq DESC LIMIT 1').get();
      const previousHash=last?.event_hash||'GENESIS';
      const at=new Date().toISOString();
      const record={event_id:eventId,trip_id:tripId,actor_id:actorId,vehicle_id:vehicleId,event_type:type,payload:JSON.stringify(payload),reason:reason||null,server_received_at:at,previous_hash:previousHash};
      const eventHash=sha(canonical(record));
      db.prepare('INSERT INTO events(event_id,trip_id,actor_id,vehicle_id,event_type,payload,reason,server_received_at,previous_hash,event_hash) VALUES(?,?,?,?,?,?,?,?,?,?)').run(eventId,tripId,actorId,vehicleId,type,record.payload,record.reason,at,previousHash,eventHash);
      db.exec('COMMIT');
      return { ...record,event_hash:eventHash,duplicate:false };
    } catch(e) { db.exec('ROLLBACK'); throw e; }
  }
  function events() { return db.prepare('SELECT * FROM events ORDER BY seq').all(); }
  function verify() {
    let previous='GENESIS';
    for(const row of events()){
      const {seq,event_hash,...record}=row;
      if(record.previous_hash!==previous || sha(canonical(record))!==event_hash) return {ok:false,seq};
      previous=event_hash;
    }
    return {ok:true,count:events().length,head:previous};
  }
  return {append,events,verify,close:()=>db.close()};
}
