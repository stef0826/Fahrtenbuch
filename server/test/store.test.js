import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../src/store.js';
const trip={date:'2026-11-06',from:'Wien',to:'Graz',purpose:'Dienstfahrt',driver:'Testfahrer',plate:'TEST-1',start:100,end:150};
test('Original bleibt erhalten, Korrektur nur mit Grund, doppelte ID idempotent',()=>{
 const s=openStore(':memory:');
 try {
  const base={eventId:'event-1',tripId:'trip-1',actorId:'driver-1',vehicleId:'TEST-1',type:'trip_created',payload:trip};
  s.append(base);
  assert.equal(s.append(base).duplicate,true);
  assert.throws(()=>s.append({...base,eventId:'event-2',type:'trip_corrected',payload:{end:151}}),/Korrekturgrund/);
  s.append({...base,eventId:'event-3',type:'trip_corrected',payload:{end:151},reason:'Ablesefehler'});
  assert.equal(s.events().length,2);
  assert.equal(JSON.parse(s.events()[0].payload).end,150);
  assert.equal(s.verify().ok,true);
  assert.throws(()=>s.append({...base,eventId:'event-4',actorId:'another',type:'trip_voided',reason:'Irrtum'}),/Berechtigung/);
  s.append({...base,eventId:'event-5',type:'trip_voided',reason:'Doppelt erfasst'});
  assert.throws(()=>s.append({...base,eventId:'event-6',type:'trip_corrected',reason:'Tippfehler'}),/Stornierte/);
 }finally{s.close();}
});
