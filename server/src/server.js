import { createServer } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { openStore } from './store.js';
const token=process.env.FAHRtenBUCH_TOKEN;
if (!token || token.length<32) { console.error('FAHRtenBUCH_TOKEN muss mindestens 32 Zeichen lang sein'); process.exit(1); }
const store=openStore(process.env.FAHRtenBUCH_DB||'./data/fahrtenbuch.sqlite');
const port=Number(process.env.PORT||8787);
const reply=(res,status,obj)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(obj));};
createServer(async(req,res)=>{
  const auth=(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!auth || Buffer.byteLength(auth)!==Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(auth),Buffer.from(token))) return reply(res,401,{error:'Nicht autorisiert'});
  if(req.method==='GET' && req.url==='/health') return reply(res,200,{ok:true});
  if(req.method==='GET' && req.url==='/verify') return reply(res,200,store.verify());
  if(req.method==='GET' && req.url==='/events') return reply(res,200,{events:store.events()});
  if(req.method==='POST' && req.url==='/events'){
    try{
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>65536) return reply(res,413,{error:'Zu groß'});}
      const data=JSON.parse(raw);
      // Single-user development prototype only. No public network access or production use.
      const event=store.append({eventId:data.eventId||randomUUID(),tripId:data.tripId,actorId:data.actorId,vehicleId:data.vehicleId,type:data.type,payload:data.payload,reason:data.reason});
      return reply(res,201,event);
    }catch(e){return reply(res,400,{error:e.message});}
  }
  return reply(res,404,{error:'Nicht gefunden'});
}).listen(port,'127.0.0.1',()=>console.log('Testserver auf http://127.0.0.1:'+port));
