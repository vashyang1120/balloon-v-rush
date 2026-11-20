'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const {createPreview}=require('../../tests/preview-entry.cjs');
const {mkdir,writeFile}=require('node:fs/promises');
const assert=require('node:assert/strict');
(async()=>{
const out='entry-screenshots/batch-b-normal';
await mkdir(out,{recursive:true});
const server=createPreview(); await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:820},recordVideo:{dir:out,size:{width:1280,height:820}}});
const page=await context.newPage(); const log=[];
page.on('pageerror',e=>log.push({error:e.message}));
const snap=async name=>{await page.screenshot({path:out+'/'+name+'.png'});log.push({name,body:(await page.locator('body').innerText()).slice(-7000)});};
try{
await page.goto('http://127.0.0.1:'+server.address().port+'/playtest-adventure-v0.4.13-test-3-batch-b/');
await page.getByRole('link',{name:'3-4 出發前的小V之家',exact:true}).click();
await page.waitForURL('**/rpg-dual-continent-test/**');
const bootDeadline=Date.now()+120000;
while(!await page.evaluate(()=>typeof assetBootReady !== 'undefined' && assetBootReady)){if(Date.now()>bootDeadline)throw Error('Asset boot timeout');await page.waitForTimeout(100);}
await page.locator('#btn-start-gate-go').click();
await page.locator('#h2-nav-go').waitFor({timeout:120000});
await snap('01-home');
const guide=page.locator('.h2-more').filter({hasText:'打開氣球秘笈'});
await page.locator('#h2-title-recipes').click();
await guide.click();
await page.locator('button[data-h2-act="craft"][data-key="balloonDice"]').click();
await snap('02-dice-crafted');
assert.equal(await page.evaluate(()=>v395Count('balloonDice')),1);
await page.locator('#h2-panel-close').click();
await page.locator('#h2-nav-go').click();
await snap('03-depart');

const state=()=>page.evaluate(()=>({slot:activeSlot,hammer:equippedHammer,hammerTimer:player.hammerAnimTimer,hitBoxes:wd.hitBoxes,x:player.x,y:player.y,w:player.w,h:player.h,ground:player.onGround,hp:player.hp,state:gameState,dialog:!!rpgActive,done:c2Proto.done,tree:breakableTrees[0]?.state,coins:playerInventory.coins,dice:v395Count('balloonDice'),chest:playerInventory.chapter3Chests,pool:c34.level,angle:wd.ang,mech:wd.mech?.state,layout:C34_LAY,pad:platforms.find(p=>p.c34Pad),padHit:wdPadHitRect(),groundY:GROUND_Y}));
const held=new Set();
async function input(keys){for(const k of [...held])if(!keys.includes(k)){await page.keyboard.up(k);held.delete(k);}for(const k of keys)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}}
async function advance(name,predicate,keys,seconds=20){
const end=Date.now()+seconds*1000;let s;
while(Date.now()<end){s=await state(); if(s.dialog){await input([]);await page.keyboard.press('Enter');await page.waitForTimeout(180);continue;}
const phaseSlot=({'04-launcher':'hammer','04-angle-60':'hammer','05-first-mesa':'umbrella','06-first-edge':'umbrella','07-second-mesa':'umbrella','08-tree':'hammer','09-pillar':'hammer','10-canyon-top':'umbrella','11-upper-path':'sword','12-waterfall':'umbrella','13-filled':'umbrella','14-pool-edge':'umbrella','15-pad':'umbrella','16-pad-edge':'umbrella','17-bank':'umbrella','18-chest-approach':'sword'})[name];
if(phaseSlot&&s.slot!==phaseSlot){await input([]);await page.keyboard.press({sword:'Digit1',hammer:'Digit2',umbrella:'Digit3'}[phaseSlot]);await page.waitForTimeout(100);continue;}
if(predicate(s)){await input([]);log.push({checkpoint:name,...s});await snap(name);return s;}
if(['failed','gameover'].includes(s.state))throw Error(name+': '+s.state);
await input(typeof keys==='function'?keys(s):keys);await page.waitForTimeout(50);}
await input([]);log.push({checkpoint:name,timeout:true,...s});await snap(name+'-timeout');throw Error(name+' timed out: '+JSON.stringify(s));
}
const s0=await advance('03-playing',s=>s.state==='playing',[],25);
const L=s0.layout;const top=h=>s0.groundY-h;
const onMesa=(s,m)=>s.ground&&s.x+s.w>m.x&&s.x<m.x+m.w&&Math.abs(s.y+s.h-top(m.h))<3;
await page.keyboard.press('Digit2');
await advance('04-launcher',s=>s.x>=s.padHit.x+s.padHit.w/2-90,['ArrowRight'],15);
await advance('04-angle-60',s=>s.angle===60,['z'],15);
assert.equal((await state()).angle,60);
await page.keyboard.press('Digit3');
await advance('05-first-mesa',s=>onMesa(s,L.p1),s=>s.x<1780?['ArrowRight']:[],20);
await advance('06-first-edge',s=>s.x>=L.p1.x+L.p1.w-s.w-8,['ArrowRight']);
await advance('07-second-mesa',s=>onMesa(s,L.p2),['ArrowRight','Space']);
await page.keyboard.press('Digit2');
await advance('08-tree',s=>s.tree==='fallen',s=>s.x<L.tree.x-100?['ArrowRight','z']:['z']);
await advance('09-pillar',s=>onMesa(s,L.p3)&&s.x>=L.p3.x+70,['ArrowRight','z']);
await page.keyboard.press('Digit3');
await advance('10-canyon-top',s=>onMesa(s,L.ct),['ArrowRight','Space']);
await page.keyboard.press('Digit1');
await advance('11-upper-path',s=>s.x>=L.ct.x+440,['ArrowRight','z']);
await page.keyboard.press('Digit3');
await advance('12-waterfall',s=>s.x+s.w/2>=L.fallX,['ArrowRight']);
await advance('13-filled',s=>s.pool===1,[],25);
await advance('14-pool-edge',s=>s.x>=L.pool.x-s.w/2-4,['ArrowRight']);
await advance('15-pad',s=>s.ground&&s.x+s.w>s.pad.x&&s.x<s.pad.x+s.pad.w&&s.y+s.h<top(L.ct.h)+80,s=>s.x<s.pad.x+50?['ArrowRight','Space']:['Space']);
await advance('16-pad-edge',s=>s.x>=s.pad.x+s.pad.w-7,['ArrowRight']);
await advance('17-bank',s=>onMesa(s,L.bank),['ArrowRight','Space']);
await page.keyboard.press('Digit1');
await advance('18-chest-approach',s=>s.x>=L.bank.x+500,['ArrowRight','z']);


const end=Date.now()+30000;
while(Date.now()<end){const s=await state();if(s.dialog){await input([]);await page.keyboard.press('Enter');}
else if(await page.locator('[data-choice="accept"]').isVisible()){await input([]);await snap('20-invitation');await page.locator('[data-choice="accept"]').click();await page.getByRole('button',{name:'繼續冒險',exact:true}).waitFor();await snap('21-settlement');await page.getByRole('button',{name:'繼續冒險',exact:true}).click();break;}
else await input(['ArrowRight']);await page.waitForTimeout(120);}
await input([]);assert.ok((await state()).chest?.['3-4:high-bank']);
await advance('22-clear',s=>s.done||s.state==='clear',['ArrowRight','z'],20);
await page.locator('#h2-nav-go').waitFor({timeout:15000});await snap('23-clear-home');console.log('NORMAL_FLOW_PASS');

}finally{await writeFile(out+'/normal-flow-log.json',JSON.stringify(log,null,2));await context.close();await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
