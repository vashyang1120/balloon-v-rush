import numpy as np
from PIL import Image, ImageDraw, ImageFilter
S=1024
yy,xx=np.mgrid[0:S,0:S].astype(np.float32)
def mask_from(draw_fn):
    m=Image.new('L',(S,S),0); d=ImageDraw.Draw(m); draw_fn(d); return m
cx,cy,r=512,410,268
# glass: circle + tapered neck
def glass(d):
    d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=255)
    d.polygon([(cx-205,cy+170),(cx+205,cy+170),(cx+120,cy+330),(cx-120,cy+330)],fill=255)
gm=mask_from(glass).filter(ImageFilter.GaussianBlur(6)).point(lambda v:255 if v>127 else 0)
def base(d):
    d.rounded_rectangle([cx-138,cy+318,cx+138,cy+470],radius=30,fill=255)
    d.ellipse([cx-70,cy+440,cx+70,cy+530],fill=255)
bm=mask_from(base)
rays=[]
import math
def raysd(d):
    for a in [-150,-120,-90,-60,-30, -180, 0]:
        t=math.radians(a); r1=r+48; r2=r+118
        if a in (-180,0): r1=r+40; r2=r+95
        x1,y1=cx+r1*math.cos(t),cy+r1*math.sin(t); x2,y2=cx+r2*math.cos(t),cy+r2*math.sin(t)
        d.line([(x1,y1),(x2,y2)],fill=255,width=40)
        for (x,y) in [(x1,y1),(x2,y2)]: d.ellipse([x-20,y-20,x+20,y+20],fill=255)
rm=mask_from(raysd)
out=np.zeros((S,S,4),np.float32)
def paint(mask,rgb,alpha=1.0):
    a=(np.asarray(mask,np.float32)/255.0*alpha)[...,None]
    col=np.broadcast_to(np.array(rgb,np.float32),(S,S,3)) if np.ndim(rgb)==1 else rgb
    out[...,:3]=out[...,:3]*(1-a)+col*a
    out[...,3:]=out[...,3:]*(1-a)+a
OUT=(158,86,22)
def outline(mask,w):
    return mask.filter(ImageFilter.MaxFilter(w))
# rays
paint(outline(rm,19),OUT)
rg=np.zeros((S,S,3),np.float32); t=np.clip((yy-100)/700,0,1)[...,None]
rg[:]=np.array([255,236,120])*(1-t)+np.array([255,184,20])*t
paint(rm,rg)
# glass outline + base outline
paint(outline(Image.fromarray(np.maximum(np.asarray(gm),np.asarray(bm))),21),OUT)
# glass radial gradient
d=np.sqrt(((xx-(cx-80))/ (r*1.25))**2+((yy-(cy-90))/(r*1.25))**2)
d=np.clip(d,0,1)[...,None]
c0=np.array([255,250,200]);c1=np.array([255,210,40]);c2=np.array([232,140,0])
g=np.where(d<0.55, c0*(1-d/0.55)+c1*(d/0.55), c1*(1-(d-0.55)/0.45)+c2*((d-0.55)/0.45))
paint(gm,g)
# inner rim shading near edge (darker gold) using eroded mask difference
er=gm.filter(ImageFilter.MinFilter(41)).filter(ImageFilter.GaussianBlur(18))
rim=np.clip(np.asarray(gm,np.float32)-np.asarray(er,np.float32),0,255)
paint(Image.fromarray(rim.astype(np.uint8)),(214,120,0),0.55)
# filament
fm=Image.new('L',(S,S),0); fd=ImageDraw.Draw(fm)
pts=[(cx-70,cy+250),(cx-70,cy+110),(cx-95,cy+40),(cx-45,cy-10),(cx,cy+45),(cx+45,cy-10),(cx+95,cy+40),(cx+70,cy+110),(cx+70,cy+250)]
fd.line(pts,fill=255,width=26,joint='curve')
paint(fm.filter(ImageFilter.GaussianBlur(14)),(255,255,230),0.9)
paint(fm,(196,96,0),0.85)
fm2=Image.new('L',(S,S),0); ImageDraw.Draw(fm2).line(pts,fill=255,width=9,joint='curve')
paint(fm2,(255,240,150),0.9)
# highlights
hm=mask_from(lambda d: d.ellipse([cx-200,cy-215,cx-60,cy-60],fill=255)).filter(ImageFilter.GaussianBlur(16))
paint(hm,(255,255,255),0.75)
hm2=mask_from(lambda d: d.ellipse([cx-215,cy-30,cx-170,cy+60],fill=255)).filter(ImageFilter.GaussianBlur(8))
paint(hm2,(255,255,255),0.7)
hm3=mask_from(lambda d: d.ellipse([cx-150,cy-190,cx-105,cy-145],fill=255)).filter(ImageFilter.GaussianBlur(3))
paint(hm3,(255,255,255),0.95)
# base metallic silver-blue with ridges
bg=np.zeros((S,S,3),np.float32); u=np.clip((xx-(cx-138))/276,0,1)[...,None]
bg[:]=np.array([150,165,190])*(1-u)+np.array([90,100,125])*u
sheen=np.exp(-((xx-(cx-60))/40)**2)[...,None]
bg=bg*(1-0.6*sheen)+np.array([240,245,255])*0.6*sheen
paint(bm,bg)
for k in range(3):
    y0=cy+352+k*38
    ridge=mask_from(lambda d: d.rounded_rectangle([cx-140,y0,cx+140,y0+12],radius=6,fill=255))
    ridge=Image.fromarray(np.minimum(np.asarray(ridge),np.asarray(bm)))
    paint(ridge,(70,72,92),0.8)
cm=mask_from(lambda d: d.ellipse([cx-70,cy+440,cx+70,cy+530],fill=255))
cm=Image.fromarray(np.minimum(np.asarray(cm),255-np.asarray(mask_from(lambda d: d.rectangle([0,0,S,cy+472],fill=255)))))
paint(cm,(80,62,58))
# sparkles
def sparkle(x,y,s):
    m=mask_from(lambda d: d.polygon([(x,y-s),(x+s*0.22,y-s*0.22),(x+s,y),(x+s*0.22,y+s*0.22),(x,y+s),(x-s*0.22,y+s*0.22),(x-s,y),(x-s*0.22,y-s*0.22)],fill=255))
    paint(m.filter(ImageFilter.GaussianBlur(10)),(255,255,210),0.8); paint(m,(255,255,255))
sparkle(cx+215,cy-215,62); sparkle(cx-290,cy+150,40)
img=Image.fromarray(np.clip(out*np.array([1,1,1,255]),0,255).astype(np.uint8),'RGBA')
bbox=img.getbbox(); print('bbox',bbox)
# fit to 256 with margin
w=bbox[2]-bbox[0];h=bbox[3]-bbox[1];side=max(w,h)+40
can=Image.new('RGBA',(side,side),(0,0,0,0)); can.alpha_composite(img.crop(bbox),((side-w)//2,(side-h)//2))
can.resize((256,256),Image.LANCZOS).save('/tmp/bulb/item_knowledge_bulb.png')
