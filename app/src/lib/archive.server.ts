import {bindings} from './bindings.server';
import {z} from 'zod';
export function db(){const d=bindings().DB;if(!d)throw new Error('Storage is being prepared. Please try again shortly.');return d}
function bucket(){const b=bindings().STORAGE;if(!b)throw new Error('Audio storage is unavailable.');return b}
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
async function digest(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(n=>n.toString(16).padStart(2,'0')).join('')}
export async function authorized(request:Request){const t=request.headers.get('cookie')?.match(/(?:^|; )as_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!t)return false;return !!await db().prepare('SELECT token_hash FROM admin_sessions WHERE token_hash=? AND expires_at>?').bind(await digest(t),Date.now()).first()}
function originCheck(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new Response('Invalid request origin',{status:403})}
const recordingSchema=z.object({id:z.string().uuid().optional(),surah_id:z.number().int().min(1).max(114),reciter_id:z.string().uuid(),audio_id:z.string().uuid(),title:z.string().trim().min(1).max(200),description:z.string().max(5000),status:z.enum(['draft','published','unpublished']),featured:z.boolean(),allow_download:z.boolean(),rights_confirmed:z.boolean(),sort_order:z.number().int().min(0).max(999999)});
export async function catalog(admin=false){const d=db();const [s,r,c,t]=await Promise.all([d.prepare('SELECT * FROM surahs ORDER BY sort_order,number').all(),d.prepare(`SELECT r.*,a.duration,c.name reciter_name FROM recordings r JOIN audio_files a ON a.id=r.audio_id JOIN reciters c ON c.id=r.reciter_id ${admin?'':"WHERE r.status='published' AND r.rights_confirmed=1"} ORDER BY r.sort_order,r.surah_id,r.created_at,r.id`).all(),d.prepare('SELECT * FROM reciters ORDER BY name').all(),d.prepare("SELECT * FROM settings WHERE key IN ('logo_url','about')").all()]);return {surahs:s.results,recordings:r.results,reciters:c.results,settings:Object.fromEntries((t.results as {key:string;value:string}[]).map(x=>[x.key,x.value]))}}
export async function handle(request:Request){
try{
const u=new URL(request.url), action=u.pathname.replace('/api/archive/','');
if(request.method==='POST')originCheck(request);
if(action==='catalog'&&request.method==='GET')return json(await catalog());
if(action==='logo'&&request.method==='GET'){const obj=await bucket().get('brand/original');if(!obj)return new Response(null,{status:404});return new Response(obj.body as unknown as ReadableStream,{headers:{'Content-Type':obj.httpMetadata?.contentType||'image/png','Cache-Control':'public, max-age=300'}})}
if(action==='session'&&request.method==='GET')return json({authenticated:await authorized(request),configured:(bindings().ADMIN_PASSWORD?.length||0)>=16});
if(action==='login'&&request.method==='POST'){
 const secret=bindings().ADMIN_PASSWORD;if(!secret||secret.length<16)return json({error:'Secure owner access has not been configured for this website.'},503);
 const body=z.object({password:z.string().min(1).max(512)}).parse(await request.json());
 const now=Date.now(),key=await digest((request.headers.get('cf-connecting-ip')||'local')+secret),d=db();
 await d.prepare('INSERT INTO login_attempts (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<? THEN ? ELSE expires_at END').bind(key,now+900000,now,now,now+900000).run();
 const row=await d.prepare('SELECT count FROM login_attempts WHERE key=?').bind(key).first<{count:number}>();if((row?.count||0)>8)return json({error:'Too many sign-in attempts. Please wait 15 minutes.'},429);
 const a=await digest(body.password),b=await digest(secret);let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);if(diff)return json({error:'The password is incorrect.'},401);
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');
 await d.prepare('INSERT INTO admin_sessions (token_hash,expires_at) VALUES (?,?)').bind(await digest(token),now+28800000).run();
 await d.prepare('DELETE FROM admin_sessions WHERE expires_at<?').bind(now).run();
 return json({ok:true},200,{'Set-Cookie':`as_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`});
}
if(action==='audio'&&request.method==='GET'){
 const id=u.searchParams.get('id');if(!id||!z.string().uuid().safeParse(id).success)return json({error:'Recording not found.'},404);
 const r=await db().prepare('SELECT a.*,r.status,r.allow_download,r.rights_confirmed FROM recordings r JOIN audio_files a ON a.id=r.audio_id WHERE r.id=?').bind(id).first<{storage_key:string;content_type:string;original_name:string;status:string;allow_download:number;rights_confirmed:number}>();
 const admin=await authorized(request);if(!r||(!(r.status==='published'&&r.rights_confirmed)&&!admin))return json({error:'Recording not available.'},404);
 if(u.searchParams.has('download')&&!r.allow_download&&!admin)return json({error:'Download is not enabled for this recording.'},403);
 const head=await bucket().head(r.storage_key);if(!head)return json({error:'Audio file not found.'},404);
 let range: {offset:number;length:number}|undefined;const h=request.headers.get('range');if(h){const m=/^bytes=(\d*)-(\d*)$/.exec(h);if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${head.size}`}});const start=m[1]?Number(m[1]):Math.max(0,head.size-Number(m[2]));const end=m[1]?(m[2]?Math.min(Number(m[2]),head.size-1):head.size-1):head.size-1;if(start>=head.size||start>end)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${head.size}`}});range={offset:start,length:end-start+1}}
 const obj=await bucket().get(r.storage_key,range?{range}:{});if(!obj)return json({error:'Audio unavailable.'},404);
 const headers:Record<string,string>={'Content-Type':r.content_type,'Accept-Ranges':'bytes','Cache-Control':'private, no-store','Content-Length':String(range?.length||head.size)};
 if(range)headers['Content-Range']=`bytes ${range.offset}-${range.offset+range.length-1}/${head.size}`;
 if(u.searchParams.has('download'))headers['Content-Disposition']=`attachment; filename="${r.original_name.replace(/[^a-zA-Z0-9._-]/g,'_')}"`;
 return new Response(obj.body as unknown as ReadableStream,{status:range?206:200,headers});
}
if(!await authorized(request))return json({error:'Please sign in as an administrator.'},401);
if(action==='logo'&&request.method==='POST'){const form=await request.formData(),file=form.get('file');if(!(file instanceof File)||file.size>5*1024*1024)return json({error:'Choose a PNG, JPEG or WebP logo up to 5 MB.'},400);const b=new Uint8Array(await file.arrayBuffer());let mime='';if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)mime='image/png';else if(b[0]===255&&b[1]===216&&b[2]===255)mime='image/jpeg';else if(new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP')mime='image/webp';if(!mime)return json({error:'The logo must be an original PNG, JPEG or WebP image.'},400);await bucket().put('brand/original',b,{httpMetadata:{contentType:mime}});await db().prepare("INSERT INTO settings (key,value) VALUES ('logo_url',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind('/api/archive/logo?v='+Date.now()).run();return json({ok:true})}
if(action==='logout'&&request.method==='POST'){const t=request.headers.get('cookie')?.match(/as_session=([a-f0-9]{64})/)?.[1];if(t)await db().prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(t)).run();return json({ok:true},200,{'Set-Cookie':'as_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'})}
if(action==='admin'&&request.method==='GET'){const data=await catalog(true);const files=await db().prepare('SELECT * FROM audio_files ORDER BY created_at DESC').all();return json({...data,files:files.results})}
if(action==='upload'&&request.method==='POST'){
 const len=Number(request.headers.get('content-length'));if(len>53*1024*1024)return json({error:'Audio files must be 50 MB or smaller.'},413);
 const form=await request.formData(),file=form.get('file'),duration=Number(form.get('duration'));
 if(!(file instanceof File)||file.size<128||file.size>50*1024*1024||!Number.isFinite(duration)||duration<=0||duration>43200)return json({error:'Choose a playable MP3, M4A or WAV file up to 50 MB.'},400);
 const b=new Uint8Array(await file.arrayBuffer()),prefix=new TextDecoder().decode(b.slice(0,12));let mime='',ext='';
 if(prefix.startsWith('ID3')||(b[0]===255&&(b[1]&224)===224)){mime='audio/mpeg';ext='mp3'}else if(prefix.startsWith('RIFF')&&prefix.slice(8)==='WAVE'){mime='audio/wav';ext='wav'}else if(prefix.slice(4,8)==='ftyp'){mime='audio/mp4';ext='m4a'}
 if(!mime||!new RegExp('\\.'+ext+'$','i').test(file.name))return json({error:'The file contents do not match a supported audio format.'},400);
 const id=crypto.randomUUID(),key='recordings/'+id+'.'+ext;
 await bucket().put(key,b,{httpMetadata:{contentType:mime}});const saved=await bucket().head(key);if(!saved||saved.size!==file.size){await bucket().delete(key);throw new Error('Upload could not be verified. Please try again.')}
 try{await db().prepare('INSERT INTO audio_files (id,storage_key,original_name,content_type,size,duration) VALUES (?,?,?,?,?,?)').bind(id,key,file.name.slice(0,200),mime,file.size,duration).run()}catch(e){await bucket().delete(key);throw e}
 return json({id,duration,name:file.name});
}
if(action==='save-recording'&&request.method==='POST'){
 const v=recordingSchema.parse(await request.json());if(v.status==='published'&&!v.rights_confirmed)return json({error:'Confirm distribution rights before publishing.'},400);
 const audio=await db().prepare('SELECT id FROM audio_files WHERE id=?').bind(v.audio_id).first(),reciter=await db().prepare('SELECT id FROM reciters WHERE id=?').bind(v.reciter_id).first();if(!audio||!reciter)return json({error:'Select a saved audio file and reciter.'},400);
 const id=v.id||crypto.randomUUID();await db().prepare('INSERT INTO recordings (id,surah_id,reciter_id,audio_id,title,description,status,featured,allow_download,rights_confirmed,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET surah_id=excluded.surah_id,reciter_id=excluded.reciter_id,audio_id=excluded.audio_id,title=excluded.title,description=excluded.description,status=excluded.status,featured=excluded.featured,allow_download=excluded.allow_download,rights_confirmed=excluded.rights_confirmed,sort_order=excluded.sort_order,updated_at=CURRENT_TIMESTAMP').bind(id,v.surah_id,v.reciter_id,v.audio_id,v.title,v.description,v.status,+v.featured,+v.allow_download,+v.rights_confirmed,v.sort_order).run();return json({id});
}
if(action==='delete-recording'&&request.method==='POST'){const v=z.object({id:z.string().uuid(),confirm:z.literal(true)}).parse(await request.json());await db().batch([db().prepare('DELETE FROM ayah_timestamps WHERE recording_id=?').bind(v.id),db().prepare('DELETE FROM recordings WHERE id=?').bind(v.id)]);return json({ok:true})}
if(action==='save-reciter'&&request.method==='POST'){const v=z.object({id:z.string().uuid().optional(),name:z.string().trim().min(1).max(100),description:z.string().max(2000)}).parse(await request.json());const id=v.id||crypto.randomUUID();await db().prepare('INSERT INTO reciters (id,name,slug,description) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description').bind(id,v.name,id,v.description).run();return json({id})}
if(action==='save-surah'&&request.method==='POST'){const v=z.object({id:z.number().int().min(1).max(114),name:z.string().min(1).max(100),arabic_name:z.string().min(1).max(200),transliteration:z.string().min(1).max(100),revelation_type:z.enum(['Makki','Madani']),ayah_count:z.number().int().min(1).max(286)}).parse(await request.json());await db().prepare('UPDATE surahs SET name=?,arabic_name=?,transliteration=?,revelation_type=?,ayah_count=? WHERE id=?').bind(v.name,v.arabic_name,v.transliteration,v.revelation_type,v.ayah_count,v.id).run();return json({ok:true})}
if(action==='settings'&&request.method==='POST'){const v=z.object({about:z.string().max(5000)}).parse(await request.json());await db().prepare("INSERT INTO settings (key,value) VALUES ('about',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(v.about).run();return json({ok:true})}
return json({error:'Page not found.'},404)
}catch(e){if(e instanceof Response)return e;if(e instanceof z.ZodError)return json({error:'Please check the form fields and try again.'},400);console.error('Archive request failed',e instanceof Error?e.name:'Unknown error');return json({error:'The request could not be completed. Please try again.'},500)}
}
