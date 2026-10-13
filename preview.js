export function buildPreview(s, code) {
 const steps=[]; let serial=0;
 const add=(title,detail,kind,anchor)=>{let pos=anchor?code.indexOf(anchor):-1;steps.push({title,detail,kind,pos:pos<0?100000+serial:pos,serial:serial++});};
 if(s.mode==='start'){
 add('Warm up',s.standbyOn?'Initial nozzle setting: '+s.standby+' °C. Later temperatures follow the factory routine and filament profile.':'Factory preheat; final printing temperatures come from your filament profile.','heat','M104');
 if(s.printer!=='P1S')add(s.startSound?'Startup melody':'Startup melody off',s.startSound?'Factory opening sound is enabled.':'Melody commands are removed.','sound','start printer sound');
 add('Prepare filament',s.purgeMode==='factory'?'Factory loading and main purge stages.':s.purgeMode==='skip'?'Two main purges skipped. Loading, calibration and finishing extrusion can still occur.':s.purgeCount+' repetitions per main stage · '+s.purgeAmount+' mm filament each · '+s.purgeSeconds+' s each · '+s.purgePause+' s between repetitions. Up to two stages; execution depends on material-loading conditions.','purge','prepare print temperature and material');
 if(s.soak)add('Bed heat soak','Wait '+s.soak+' seconds after the bed reaches its target.','heat','; Bill 3D Printer Studio: bed soak');
 if(s.before)add('Pause before cleaning',s.before+' seconds of extra waiting.','wait','; Bill 3D Printer Studio: wait before');
 add('Clean the nozzle','Factory wipe sequence. The animated sweep is illustrative, not the exact wipe path.','wipe',';===== wipe nozzle ');
 if(s.after)add('Pause after cleaning',s.after+' seconds of extra waiting.','wait','; Bill 3D Printer Studio: wait after');
 add('Level and home','Factory checks and homing follow the selected printer template; conditional checks may be skipped.','home',';===== bed leveling ');
 add(s.primeOn?'Draw prime lines':'Prime lines skipped',s.primeOn?'Factory priming lines prepare the nozzle before the model.':'Front-of-bed priming strokes are disabled. Other calibration commands remain.','prime',s.primeOn?';===== nozzle load line':'; Bill 3D Printer Studio: prime');
 steps.sort((a,b)=>a.pos-b.pos||a.serial-b.serial);
 steps.push({title:'Ready to print',detail:'Bambu Studio adds your sliced model after this start routine.',kind:'ready'});
 }else{
 add('Factory finish','Finish extrusion, turn heaters off and follow the printer’s factory ending and parking sequence.','park');
 if(s.printer!=='P1S')add(s.endSound?'Finish melody':'Finish melody off',s.endSound?'The factory melody plays before custom cooling and push actions.':'Completion melody commands are removed.','sound');
 if(s.park!=='factory')add(s.park==='over'?'Hover above the model':'Adjust height beside the model',(s.heightDirection==='above'?'Add ':'Subtract ')+s.heightOffset+' mm '+(s.heightDirection==='above'?'above ':'below ')+(s.heightRef==='highest'?'the highest layer.':'the first-layer height.')+' Out-of-range moves are skipped by slicer conditions.','hover');
 if(s.coolMode!=='off'){
 add('Cool the print','Part fan '+s.fan+'%'+(s.printer==='P1S'?' · side fan '+s.auxFan+'% · exhaust '+s.chamberFan+'%':'')+'. '+(s.coolMode==='time'?'Run for '+s.minutes+' minutes.':'Experimental bed target '+s.bedTarget+' °C; duration unknown, may reheat and has no timeout.'),'cool');
 add('Stop cooling fans','Turn off the selected cooling fans. Cooling does not prove the part is loose.','wait');
 }
 if(s.ejectOn){
 add('Lift clear','Lift 10 mm above the highest layer, if the entire push routine passes the slicer’s bounds checks.','lift');
 add('Move behind the part','Stage '+s.pushMargin+' mm behind the first-layer footprint. Example geometry only.','behind');
 add('Lower to contact height',(s.ejectRef==='top'?s.ejectOffset+' mm below the highest layer.':s.ejectOffset+' mm above the first layer.')+' Only for an already-loose, suitable single part.','lower');
 add('Push toward the front','Move toward Y '+s.pushEndY+' at '+s.pushSpeed+' mm/s. Experimental: motion is shown, successful removal is not predicted.','push');
 add('Lift and park','Lift 10 mm above the highest layer and return to the printer’s park position.','park');
 }
 if(s.finish)add('Final pause','Wait '+s.finish+' seconds at the end.','wait');
 add('Routine complete','End routine finished. Actual execution depends on slicer conditions, firmware and the print.','done');
 }
 return steps;
}
export function createPreview(getSnapshot){
 const dialog=document.createElement('dialog');dialog.className='routine-preview';
 dialog.setAttribute('aria-labelledby','previewTitle');
 dialog.innerHTML=`<div class="preview-top"><div><span class="section-label">YOUR ROUTINE IN MOTION</span><h2 id="previewTitle">Printer preview</h2></div><button id="previewClose" aria-label="Close printer preview">✕</button></div>
 <p class="preview-disclaimer">Illustrated 2D walkthrough · not an exact G-code or collision simulation. Example 50 mm model, not your uploaded print; drawn heights are compressed to fit. Waits are shortened; conditional steps may be skipped.</p>
 <div class="preview-layout"><div><div class="preview-stage">
 <svg viewBox="0 0 520 330" role="img" aria-label="Illustrative printer motion, side view, front of bed at left">
 <defs><pattern id="previewGrid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#dce5d5"/></pattern></defs>
 <rect width="520" height="330" fill="url(#previewGrid)"/><path d="M80 275V55H450V275" fill="none" stroke="#84968b" stroke-width="12"/>
 <path d="M85 110H445" stroke="#bbc9bd" stroke-width="10"/>
 <rect x="50" y="263" width="420" height="16" rx="5" fill="#324e41"/>
 <path d="M65 285H455" stroke="#a6b79c" stroke-width="5"/>
 <g id="previewModel"><rect x="220" y="193" width="90" height="70" rx="6" fill="#b5d875"/><path d="M225 205H305M225 217H305M225 229H305M225 241H305M225 253H305" stroke="#8eb858" stroke-width="2"/></g>
 <path id="previewPurge" d="M95 237q-12 8 0 12t0 12" fill="none" stroke="#b5d875" stroke-width="5" opacity="0"/><path id="previewPrime" d="M120 259H195" stroke="#a2c85b" stroke-width="4" opacity="0"/>
 <g id="previewHead"><rect x="-20" y="-43" width="40" height="36" rx="6" fill="#204d3b"/><circle cy="-25" r="11" fill="#d9f56a"/><path d="M-7-7H7L0 4Z" fill="#be9956"/>
 <g id="previewAir" opacity="0" fill="none" stroke="#57a5a5" stroke-width="3"><path d="M-16 12L-25 35M0 14V40M16 12L25 35"/></g></g>
 <text x="30" y="313" fill="#526953" font-size="13">← FRONT</text><text x="325" y="313" fill="#526953" font-size="13">SIDE VIEW · NOT TO SCALE</text>
 </svg><span id="previewBadge"></span></div>
 <div class="preview-caption" aria-live="polite"><span id="previewCounter"></span><h3 id="previewStepTitle"></h3><p id="previewDetail"></p></div>
 <div class="preview-playback"><button id="previewPrevious" aria-label="Previous step">←</button><button id="previewPlay">Play</button><button id="previewNext" aria-label="Next step">→</button><button id="previewRestart">Restart</button><label>Speed <select id="previewSpeed"><option value="1">1×</option><option value="2">2×</option><option value="0.5">0.5×</option></select></label></div>
 </div><ol id="previewTimeline" aria-label="Routine steps"></ol></div>`;
 document.body.append(dialog);
 const el=id=>dialog.querySelector('#'+id);
 let steps=[],snapshot,index=0,frame=0,playing=false,elapsed=0,last=0;
 function stop(){playing=false;cancelAnimationFrame(frame);el('previewPlay').textContent='Play';}
 function draw(progress=0){
 const kind=steps[index].kind;let x=390,y=170;const sampleTop=50,scale=1.4;const parkZ=(snapshot.heightRef==='highest'?sampleTop:0.2)+(snapshot.heightDirection==='above'?1:-1)*snapshot.heightOffset;const parkY=263-Math.max(0.5,Math.min(150,parkZ))*scale;const contactZ=snapshot.ejectRef==='top'?sampleTop-snapshot.ejectOffset:0.2+snapshot.ejectOffset;const contactY=263-Math.max(0.5,Math.min(49.5,contactZ))*scale;
 el('previewModel').style.opacity=snapshot.mode==='end'?'1':'.15';
 el('previewAir').setAttribute('opacity',kind==='cool'&&(snapshot.fan>0||(snapshot.printer==='P1S'&&(snapshot.auxFan>0||snapshot.chamberFan>0)))?'1':'0');
 el('previewPrime').setAttribute('opacity',kind==='prime'&&snapshot.primeOn?'1':'0');
 el('previewPurge').setAttribute('opacity',kind==='purge'&&snapshot.purgeMode!=='skip'?'1':'0');
 if(kind==='purge'){x=95;y=225+Math.sin(progress*30)*4;}
 if(kind==='wipe'){x=380+Math.sin(progress*30)*35;y=230;}
 if(kind==='home'){x=100+progress*290;y=150;}
 if(kind==='prime'&&snapshot.primeOn){x=120+progress*75;y=251;}
 if(kind==='hover'||kind==='cool'){x=snapshot.park==='over'?265:390;y=snapshot.park==='factory'?170:parkY;}
 if(kind==='lift'){x=390;y=190-progress*55;}
 if(kind==='behind'){x=390-progress*40;y=135;}
 if(kind==='lower'){x=350;y=135+progress*(contactY-135);}
 if(kind==='push'){x=350-progress*220;y=contactY;}
 if(kind==='park'){x=300+progress*90;y=145;}
 el('previewHead').setAttribute('transform','translate('+x+' '+y+')');
 el('previewBadge').textContent=kind==='heat'?'Heating':kind==='cool'?'Cooling':kind==='push'?'Illustrative push path':kind==='sound'?'Sound setting':kind==='wait'?'Waiting':'Illustrative motion';
 }
 function show(i){index=i;elapsed=0;el('previewCounter').textContent='STEP '+(i+1)+' OF '+steps.length;el('previewStepTitle').textContent=steps[i].title;el('previewDetail').textContent=steps[i].detail;
 el('previewTimeline').querySelectorAll('button').forEach((b,j)=>{b.classList.toggle('active',i===j);if(i===j)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 el('previewPrevious').disabled=i===0;el('previewNext').disabled=i===steps.length-1;draw();}
 function tick(t){if(!playing)return;elapsed+=Math.min(t-last,100)*Number(el('previewSpeed').value);last=t;draw(Math.min(elapsed/2600,1));if(elapsed>=2600){if(index===steps.length-1){stop();return;}show(index+1);}frame=requestAnimationFrame(tick);}
 el('previewPlay').onclick=()=>{if(playing){stop();return;}if(index===steps.length-1)show(0);playing=true;last=performance.now();el('previewPlay').textContent='Pause';frame=requestAnimationFrame(tick);};
 el('previewPrevious').onclick=()=>{stop();show(Math.max(0,index-1));};el('previewNext').onclick=()=>{stop();show(Math.min(steps.length-1,index+1));};
 el('previewRestart').onclick=()=>{stop();show(0);};
 el('previewClose').onclick=()=>dialog.close();dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);
 return ()=>{stop();const {settings,code}=getSnapshot();snapshot={...settings};steps=buildPreview(snapshot,code);el('previewTitle').textContent=snapshot.printer+' · '+(snapshot.mode==='start'?'Start':'End')+' routine';
 el('previewTimeline').replaceChildren(...steps.map((s,i)=>{const li=document.createElement('li'),b=document.createElement('button');b.textContent=(i+1)+'. '+s.title;b.onclick=()=>{stop();show(i);};li.append(b);return li;}));show(0);dialog.showModal();};
}
