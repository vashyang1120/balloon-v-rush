'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const {createPreview}=require('../../../tests/preview-entry.cjs');
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
await page.waitForFunction(()=>assetBootReady,undefined,{timeout:120000});
await page.locator('#btn-start-gate-go').click();
await page.locator('#h2-nav-go').waitFor({timeout:120000});
await snap('01-home');
const guide=page.locator('.h2-more').filter({hasText:'打開氣球秘笈'});
await guide.click();
await page.locator('button[data-id="balloonDice"]').click();
await snap('02-dice-crafted');
assert.equal(await page.evaluate(()=>v395Count('balloonDice')),1);
await page.locator('#btn-close-guidebook').click();
await page.locator('#h2-nav-go').click();
await snap('03-depart');
const deadline=Date.now()+240000;let lastJump=0;let lastShot=0;
while(Date.now()<deadline){
const s=await page.evaluate(()=>({x:player.x,y:player.y,ground:player.onGround,hp:player.hp,state:gameState,dialog:!!rpgActive,slot:activeSlot,tree:breakableTrees.find(t=>t.c3Art)?.state,chest:playerInventory.chapter3Chests,coins:playerInventory.coins,dice:v395Count('balloonDice'),wet:c34.wet,pool:c34.level,angle:wd.ang,gate:assetGateActive||gameStartGateActive}));
log.push(s); if(log.length%20===0) console.log(JSON.stringify(s));
if(s.dialog){await page.keyboard.up('ArrowRight');await page.keyboard.up('z');await page.keyboard.press('Enter');await page.waitForTimeout(180);continue;}
if(await page.locator('[data-choice="accept"]').isVisible()){await page.keyboard.up('ArrowRight');await snap('04-invitation');await page.locator('[data-choice="accept"]').click();await page.waitForTimeout(2500);await snap('05-dice-settlement');const done=page.locator('.ch3-treasure-actions button').filter({hasText:/繼續|確定|收下/});if(await done.count())await done.first().click();continue;}
if(s.state==='clear'){await snap('06-clear-home');assert.ok(s.chest?.['3-4:high-bank']);console.log('NORMAL_FLOW_PASS');return;}
if(['failed','gameover'].includes(s.state)){await snap('failed');throw Error('Normal exploration ended: '+s.state);}
if(s.gate){const go=page.locator('#btn-start-gate-go');if(await go.isVisible())await go.click();await page.waitForTimeout(200);continue;}
if(s.state!=='playing'){await page.waitForTimeout(200);continue;}
await page.keyboard.down('ArrowRight');
if(s.x<1000)await page.keyboard.press('Digit3');
else if(s.x<1080 && s.angle===30){await page.keyboard.up('ArrowRight');await page.keyboard.press('Digit2');await page.keyboard.press('z');await page.waitForTimeout(700);await page.keyboard.press('Digit3');await page.keyboard.down('ArrowRight');}
else if(s.x>2100&&s.x<2420){await page.keyboard.press('Digit2');if(Date.now()-lastShot>650){await page.keyboard.press('z');lastShot=Date.now();}}
else if(s.x>3300&&s.x<3500){await page.keyboard.press('Digit3');await page.keyboard.up('ArrowRight');await page.waitForTimeout(1500);}
else await page.keyboard.press('Digit3');
if(s.ground&&Date.now()-lastJump>650&&s.x>1100){await page.keyboard.press('Space');lastJump=Date.now();}
await page.waitForTimeout(180);
}
await snap('exploration-timeout');throw Error('Normal exploration did not reach clear within four minutes');
}finally{await writeFile(out+'/normal-flow-log.json',JSON.stringify(log,null,2));await context.close();await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
