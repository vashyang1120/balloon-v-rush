'use strict';

// Local playtest renderer. The original simulation still supplies the canopy and landing positions.
const c34PreviewWater = (() => {
  const cache = new WeakMap();
  const layer = document.createElement('canvas');
  const paint = layer.getContext('2d', {willReadFrequently:true});
  const source = document.createElement('canvas');
  const read = source.getContext('2d', {willReadFrequently:true});
  const smooth = (v) => { v=Math.max(0,Math.min(1,v)); return v*v*(3-2*v); };
  let last;

  function texture(image) {
    if (cache.has(image)) return cache.get(image);
    source.width=362;
    source.height=1080;
    read.drawImage(image,0,0,362,1080);
    const pixels=read.getImageData(0,0,362,1080).data;
    cache.set(image,pixels);
    return pixels;
  }

  function draw(f, cx, time, top, canopy, profile) {
    const spriteKey=c2UmbArtKey(), image=c34Art.image('01_waterfall_main',time);
    const sprite=umbImgs[spriteKey];
    if (!image || !sprite || !profile.left || !profile.right) return false;
    const {left,right,root}=profile;
    const transform=c34UmbrellaTransform(spriteKey);
    const pad=24;
    const x0=Math.floor(Math.min(left.x,root.x,f.x-f.w/2)-pad);
    const y0=Math.floor(root.y-40);
    const width=Math.ceil(Math.max(right.x,root.x,f.x+f.w/2)+pad)-x0;
    const height=Math.ceil(Math.max(left.y,right.y)+7)-y0;
    const phase=Math.floor(time/(1000/60*5))%12;
    const reachLeft=canopy.overhead ? f.x-f.w/2 : canopy.reach0;
    const reachRight=canopy.overhead ? f.x+f.w/2 : canopy.reach1;
    const average=(left.width+right.width)/2;
    if (width<=0 || height<=0 || width*height>350000) return false;
    c34Art.clip(reachLeft-cx,top,reachRight-reachLeft,Math.max(0,y0-top),() =>
      c34Art.column(f.x-cx,top,canopy.outY,f.w,time,{surfaceAt:x=>profile.surfaceAt(x+cx)}));
    const key=[f.id,root.x,root.y,left.dx,left.dy,right.dx,right.dy,transform.toX(0),transform.toY(0),phase].join(':');
    if (!last || last.key!==key || last.image!==image || last.sprite!==sprite) {
      layer.width=width;
      layer.height=height;
      paint.setTransform(transform.sign*transform.k,0,0,transform.k,transform.toX(0)-x0,transform.toY(0)-y0);
      paint.imageSmoothingQuality='high';
      paint.drawImage(sprite,0,0);
      paint.resetTransform();
      const data=paint.getImageData(0,0,width,height);
      const pixels=texture(image);
      const scale=135/f.w;
      const half=f.w/2;
      const columns=Array.from({length:width},(_,i)=>{
        const x=x0+i+0.5;
        const branch=x<root.x?left:right;
        const t=Math.max(0,Math.min(1,(x-root.x)/branch.dx));
        return {x,branch,t,seam:root.y+branch.dy*t*t};
      });
      for (let iy=0;iy<height;iy++) {
        const y=y0+iy+0.5;
        for (let ix=0;ix<width;ix++) {
          const k=(iy*width+ix)*4;
          const spriteAlpha=data.data[k+3];
          data.data[k+3]=0;
          if(spriteAlpha>=12) continue;
          const {x,branch,t:initial,seam}=columns[ix];
          const dx=branch.dx, dy=branch.dy;
          let t=initial;
          for(let n=0;n<2;n++){
            const xx=root.x+dx*t-x, yy=root.y+dy*t*t-y, slope=2*dy*t;
            t=Math.max(0,Math.min(1,t-(xx*dx+yy*slope)/Math.max(1,dx*dx+slope*slope+yy*2*dy)));
          }
          const px=root.x+dx*t, py=root.y+dy*t*t;
          const span=(average+(branch.width-average)*Math.min(1,t*5))*(0.78-0.09*t);
          const normal=((x-px)*2*dy*t-(y-py)*dx)/Math.hypot(dx,2*dy*t);
          const cross=2*normal*Math.sign(dx)/span;
          const edge=(1-smooth((Math.abs(cross)-0.89)/0.16));
          const branchAlpha=edge*0.91*(1-smooth((y-branch.y+3)/4));
          const inside=Math.min(x-reachLeft,reachRight-x);
          const incoming=smooth(inside+0.5)*(1-smooth(y-seam+0.5));
          const coverage=Math.max(incoming*0.99,branchAlpha);
          if(coverage<0.006) continue;
          const bend=(1-smooth((Math.abs(x-f.x)-half+13)/29))*(1-smooth((y-seam+19)/29));
          const columnMix=Math.max(bend,incoming*(1-smooth((y-seam+20)/24)));
          const columnU=181+(x-f.x)*scale;
          const branchU=181+68.5*cross;
          const u=Math.max(0,Math.min(360,branchU+(columnU-branchU)*columnMix));
          const path=Math.hypot(px-root.x,py-root.y)*1.04;
          const v1=1080+(y-canopy.outY)*scale;
          const v2=1080+(root.y-canopy.outY+path+Math.max(0,y-seam)*0.6)*scale
            -phase*90*smooth((Math.abs(x-f.x)-half)/90);
          const v=((v2+(v1-v2)*columnMix)%1080+1080)%1080;
          const sx=Math.floor(u), sy=Math.floor(v);
          const a=(sy*362+sx)*4, b=((sy+1)%1080*362+sx)*4;
          const fx=u-sx, fy=v-sy;
          const w0=(1-fx)*(1-fy)*pixels[a+3], w1=fx*(1-fy)*pixels[a+7];
          const w2=(1-fx)*fy*pixels[b+3], w3=fx*fy*pixels[b+7];
          const total=w0+w1+w2+w3;
          const center=(sy*362+181)*4;
          for(let c=0;c<3;c++) data.data[k+c]=total>16
            ? (pixels[a+c]*w0+pixels[a+4+c]*w1+pixels[b+c]*w2+pixels[b+4+c]*w3)/total
            : pixels[center+c];
          data.data[k+3]=coverage*255;
        }
      }
      paint.putImageData(data,0,0);
      last={key,image,sprite};
    }
    ctx.drawImage(layer,x0-cx,y0);
    return true;
  }
  return {draw};
})();

