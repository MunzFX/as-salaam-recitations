"""Prepare the Higgsfield assets for same-origin scroll seeking."""
import concurrent.futures, json, os, pathlib, shutil, subprocess, urllib.request

ROOT = pathlib.Path(__file__).parent
SOURCE = ROOT / 'design' / 'source'
OUTPUT = ROOT / 'app' / 'public' / 'assets' / 'world'
SOURCE.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)
FFMPEG = os.environ.get('AS_SALAAM_FFMPEG') or shutil.which('ffmpeg')
if not FFMPEG:
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
PREFIX = 'https://d8j0ntlcm91z4.cloudfront.net/user_3D4BP6yscedGF4xhnbe1AIsZRra/'
PLATES = [
    'hf_20260917_153300_bfe6120c-1081-41f6-b147-33c5cf2fb3df.png',
    'hf_20260917_153300_e3744bd8-653d-4be0-862f-7dd81b1cb34d.png',
    'hf_20260917_153259_bf5d9cf7-60b6-4f5d-904e-81558fde0add.png',
    'hf_20260917_153259_408db8e4-ecef-42c6-a14b-2c89705b367c.png',
    'hf_20260917_153300_814e2126-514a-4ec2-b82e-022fdebf1fd3.png',
    'hf_20260917_153259_5162f6aa-4e05-46b8-ab8c-aed14fe59a38.png',
]
VIDEOS = [
    'hf_20260917_153450_8631c91c-df17-4d6a-901a-56fd87052dbf.mp4',
    'hf_20260917_153450_f25d4bfb-2f0d-4d0d-bd53-ff5c27360d19.mp4',
    'hf_20260917_153450_84343dd2-509b-40b7-9ce0-fbe7f74e14c3.mp4',
    'hf_20260917_153450_0d5cfed1-4716-403d-83c8-78f870cda2df.mp4',
    'hf_20260917_153450_77c83a91-7867-4d8d-8d6f-f8015c522d18.mp4',
]

def fetch(task):
    url, path = task
    if not path.exists(): urllib.request.urlretrieve(url, path)
    return path

tasks = [(PREFIX+name, SOURCE/f'plate-{i+1:02}.png') for i,name in enumerate(PLATES)]
tasks += [(PREFIX+name, SOURCE/f'transition-{i+1:02}.mp4') for i,name in enumerate(VIDEOS)]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(fetch, tasks))

def ff(*args):
    subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', *map(str,args)], check=True)

for i in range(1,6):
    for suffix,width,crf in [('',1600,25),('-mobile',960,28)]:
        target = OUTPUT/f'transition-{i:02}{suffix}.mp4'
        ff('-i', SOURCE/f'transition-{i:02}.mp4', '-an', '-vf', f'scale={width}:-2,fps=24',
           '-c:v','libx264','-preset','fast','-crf',crf,'-g',6,'-keyint_min',6,
           '-sc_threshold',0,'-pix_fmt','yuv420p','-movflags','+faststart',target)
        ff('-i',target,'-frames:v',1,OUTPUT/f'transition-{i:02}{suffix}-poster.png')
    print(f'Encoded transition {i}', flush=True)

from PIL import Image, ImageOps, ImageDraw
for poster in OUTPUT.glob('*poster.png'):
    Image.open(poster).convert('RGB').save(poster.with_suffix('.webp'),lossless=True,method=6)
for i in range(1,7):
    Image.open(SOURCE/f'plate-{i:02}.png').convert('RGB').resize((1600,900)).save(OUTPUT/f'plate-{i:02}.webp',quality=88)
    Image.open(SOURCE/f'plate-{i:02}.png').convert('RGB').resize((960,540)).save(OUTPUT/f'plate-{i:02}-mobile.webp',quality=82)

brand = ROOT/'app'/'public'/'assets'/'brand'
brand.mkdir(exist_ok=True)
logo = pathlib.Path('/Users/Works/AS SALAM INSTITUTE/NEW LOGO/PNG/6.png')
shutil.copy2(logo,brand/'as-salaam-original.png')
im=Image.open(logo).convert('RGBA')
# Only remove the existing empty outer margin; never redraw the mark.
bg=Image.new('RGBA', im.size, (255,255,255,255))
from PIL import ImageChops
diff=ImageChops.difference(Image.alpha_composite(bg,im).convert('RGB'),bg.convert('RGB'))
box=diff.getbbox()
im.crop(box).save(brand/'as-salaam-logo.png')

sheet=Image.new('RGB',(1200,450),'#13160f')
for i in range(6):
    tile=ImageOps.fit(Image.open(SOURCE/f'plate-{i+1:02}.png'),(400,225))
    sheet.paste(tile,((i%3)*400,(i//3)*225))
sheet.save(ROOT/'design'/'environment-contact.jpg')
manifest={'provider':'Higgsfield','plates':[PREFIX+x for x in PLATES],'transitions':[PREFIX+x for x in VIDEOS],
          'desktop_video_bytes':sum(p.stat().st_size for p in OUTPUT.glob('transition-??.mp4')),
          'mobile_video_bytes':sum(p.stat().st_size for p in OUTPUT.glob('transition-??-mobile.mp4'))}
(ROOT/'design'/'asset-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
