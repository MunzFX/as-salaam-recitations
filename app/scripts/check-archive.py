"""Integration checks against a disposable, local-only D1/R2 archive.

Run after building. --keep holds port 8788 open for browser playback checks.
The preview database on port 8787 and the hosted site are never touched.
"""
import io, json, os, pathlib, secrets, subprocess, sys, time, urllib.error, urllib.request, uuid, wave

APP = pathlib.Path(__file__).resolve().parents[1]
QA = APP.parent / '.tooling' / ('qa-' + uuid.uuid4().hex[:8])
QA.mkdir(parents=True)
BASE = 'http://127.0.0.1:8788'
password = secrets.token_urlsafe(32)
secret_file = QA / '.dev.vars'
secret_file.write_text('ADMIN_PASSWORD=' + password + '\n')
secret_file.chmod(0o600)
config = {
 'name':'as-salaam-disposable-qa','main':str(APP/'dist/server/server.js'),
 'compatibility_date':'2026-09-17','compatibility_flags':['nodejs_compat'],
 'assets':{'directory':str(APP/'dist/client'),'binding':'ASSETS','not_found_handling':'none'},
 'd1_databases':[{'binding':'DB','database_name':'as-salaam-qa-db','database_id':'00000000-0000-0000-0000-000000000002','migrations_dir':str(APP/'migrations')}],
 'r2_buckets':[{'binding':'STORAGE','bucket_name':'as-salaam-qa-audio'}]
}
config_file=QA/'wrangler.jsonc';config_file.write_text(json.dumps(config))
env=os.environ.copy();env['WRANGLER_LOG_PATH']=str(QA/'wrangler.log');env['WRANGLER_SEND_METRICS']='false';env['XDG_CONFIG_HOME']=str(QA/'config')
node='/Users/munzfx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin'
env['PATH']=node+os.pathsep+env.get('PATH','')
wrangler=[str(APP/'node_modules/.bin/wrangler')]
common=['--config',str(config_file),'--persist-to',str(QA/'storage')]
checks=[]
def check(name,condition):
    checks.append({'check':name,'passed':bool(condition)})
    print(('PASS ' if condition else 'FAIL ')+name,flush=True)
    assert condition,name

def request(path,body=None,cookie='',origin=BASE,raw=None,headers=None):
    h={'Origin':origin,**(headers or {})}
    if cookie:h['Cookie']=cookie
    if body is not None:h['Content-Type']='application/json'
    data=json.dumps(body).encode() if body is not None else raw
    r=urllib.request.Request(BASE+'/api/archive/'+path,data=data,headers=h)
    try:response=urllib.request.urlopen(r,timeout=20)
    except urllib.error.HTTPError as e:response=e
    data=response.read()
    parsed=json.loads(data) if 'application/json' in response.headers.get('Content-Type','') else data
    return response.status,parsed,response.headers

log=open(QA/'server.log','w')
server=None
try:
    subprocess.run(wrangler+['d1','migrations','apply','as-salaam-qa-db','--local']+common,env=env,cwd=APP,stdout=log,stderr=log,check=True)
    server=subprocess.Popen(wrangler+['dev','--local','--port','8788','--ip','127.0.0.1']+common,env=env,cwd=APP,stdout=log,stderr=log)
    for _ in range(80):
        try:
            if request('session')[0]==200:break
        except (OSError,urllib.error.URLError):pass
        time.sleep(.25)
    status,public,_=request('catalog')
    check('Isolated catalog: 114 Surahs, zero recordings',status==200 and len(public['surahs'])==114 and not public['recordings'])
    check('Private admin rejects anonymous visitors',request('admin')[0]==401)
    check('Login rejects incorrect password',request('login',{'password':'invalid'})[0]==401)
    status,_,headers=request('login',{'password':password})
    cookie=headers.get('Set-Cookie','').split(';')[0]
    check('Owner login has secure HttpOnly, strict session cookie',status==200 and all(x in headers.get('Set-Cookie','') for x in ['HttpOnly','Secure','SameSite=Strict']))
    check('Authenticated session is recognised',request('session',cookie=cookie)[1]['authenticated'])
    check('Cross-origin writes are rejected',request('settings',{'about':'blocked'},cookie=cookie,origin='https://untrusted.example')[0]==403)
    _,reciter,_=request('save-reciter',{'name':'Local audio check','description':'Test fixture; not a reciter or Qur’an recording.'},cookie=cookie)
    buffer=io.BytesIO()
    with wave.open(buffer,'wb') as audio:
        audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(16000);audio.writeframes(b'\0\0'*(16000*20))
    wav=buffer.getvalue();boundary='AsSalaamTest'+uuid.uuid4().hex
    multipart=(f'--{boundary}\r\nContent-Disposition: form-data; name="duration"\r\n\r\n20\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="silent-local-check.wav"\r\nContent-Type: audio/wav\r\n\r\n').encode()+wav+f'\r\n--{boundary}--\r\n'.encode()
    status,file,_=request('upload',cookie=cookie,raw=multipart,headers={'Content-Type':'multipart/form-data; boundary='+boundary})
    check('Validated audio upload is stored',status==200 and bool(file.get('id')))
    recording={'surah_id':1,'reciter_id':reciter['id'],'audio_id':file['id'],'title':'Local playback check — not a recitation','description':'Silent test audio. Disposable local environment only.','status':'draft','featured':True,'allow_download':False,'rights_confirmed':False,'sort_order':0}
    _,saved,_=request('save-recording',recording,cookie=cookie);recording['id']=saved['id']
    check('Drafts stay out of the public catalog',not request('catalog')[1]['recordings'])
    check('Draft audio remains private',request('audio?id='+saved['id'])[0]==404)
    recording['status']='published'
    check('Publishing requires distribution-rights confirmation',request('save-recording',recording,cookie=cookie)[0]==400)
    recording['rights_confirmed']=True
    check('Confirmed recording can be published',request('save-recording',recording,cookie=cookie)[0]==200)
    status,chunk,headers=request('audio?id='+saved['id'],headers={'Range':'bytes=0-99'})
    check('Byte-range seeking returns 206 with exactly 100 bytes',status==206 and len(chunk)==100 and headers.get('Content-Range','').startswith('bytes 0-99/'))
    check('Out-of-range audio requests return 416',request('audio?id='+saved['id'],headers={'Range':'bytes=999999999-'})[0]==416)
    check('Downloads obey the owner permission',request('audio?id='+saved['id']+'&download=1')[0]==403)
    second={**recording,'surah_id':18,'title':'Second local playback check','featured':False,'sort_order':1,'allow_download':True};second.pop('id')
    request('save-recording',second,cookie=cookie)
    check('Published recordings feed the player queue',len(request('catalog')[1]['recordings'])==2)
    check('Logout revokes the server session',request('logout',{},cookie=cookie)[0]==200 and request('admin',cookie=cookie)[0]==401)
    output=APP.parent/'design'/'integration-checks.json'
    output.write_text(json.dumps({'environment':'Disposable local D1/R2 only','checks':checks},indent=2))
    print('Integration checks complete. No hosted data was changed.',flush=True)
    if '--keep' in sys.argv:
        print('Browser audio test available at http://127.0.0.1:8788 (silent fixtures only).',flush=True)
        while True:time.sleep(1)
except KeyboardInterrupt:pass
finally:
    if server:
        server.terminate()
        try:server.wait(timeout=5)
        except subprocess.TimeoutExpired:server.kill()
    secret_file.unlink(missing_ok=True)
    log.close()
