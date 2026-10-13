import {createPreview} from './preview.js';
import {generate,defaults,heightExpression,ejectionHeight} from './generator.js';
const $=id=>document.getElementById(id);
let data,mode='start',comments=true,output='',timer;const settings=Object.fromEntries(['A1','A1 mini','P1S'].map(m=>[m,defaults(m)]));
const numberCard=(id,title,description,unit,max,min=0)=>'<div class="card field-card"><div class="card-title"><div><label for="'+id+'"><h3>'+title+'</h3></label><p>'+description+'</p></div><div class="value"><input id="'+id+'" type="number" step="any" min="'+min+'" max="'+max+'" aria-label="'+title+'"><span>'+unit+'</span></div></div></div>';
const toggleCard=(id,title,description)=>'<div class="card field-card"><div class="card-title"><div><h3>'+title+'</h3><p>'+description+'</p></div><label class="switch"><input id="'+id+'" type="checkbox" aria-label="'+title+'"><span></span></label></div></div>';
const selectCard=(id,title,description,options)=>'<div class="card field-card"><label for="'+id+'"><h3>'+title+'</h3></label><p>'+description+'</p><select id="'+id+'" class="wide-select" aria-label="'+title+'">'+options.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('')+'</select></div>';
const heading=(n,title,desc)=>'<div class="step-heading"><span>'+n+'</span><div><h3>'+title+'</h3><p>'+desc+'</p></div></div>';
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
function controls(){const model=$('printer').value,s=settings[model],sound=model!=='P1S';let html='<div class="preset-heading">ONE-CLICK STARTING POINT</div><div class="preset-grid">';
 const presets=mode==='start'?[['factory','Factory setup','Original purge + prime lines'],['less','Less main purge','25 mm per main stage']]:[['factory','Normal finish','Keep the factory ending'],['cool','Timed cooling at park','100% part fan for 5 minutes']];
 for(const [key,title,desc] of presets)html+='<button class="preset-choice" data-preset="'+key+'"><b>'+title+'</b><span>'+desc+'</span></button>';html+='</div>';
 if(mode==='start'){
 html+=heading('1','Choose your purge','Purge pushes filament out before printing. These settings change the two main flush stages.');
 html+=selectCard('purgeMode','How much purging do you want?','Factory keeps the original amounts and speeds. Custom lets you choose repetitions, amount, and time for each main stage.',[['factory','Keep factory purging'],['custom','Set my own purge'],['skip','Skip the two main purges']]);
 html+='<div id="purgeFields">';
 html+=numberCard('purgeCount','Purge repetitions per stage','Each of the two main stages repeats this many times. Example: 2 gives up to 4 main purges across startup. Material-loading conditions can affect execution.','times',5,1);
 html+=numberCard('purgeAmount','Filament per purge','Length of filament fed into the nozzle, not the size of the blob. Example: 25 mm is half the factory 50 mm main purge.','mm',100,1);
 html+=numberCard('purgeSeconds','Time per purge','How long to feed that amount. Longer means slower extrusion. Example: 50 mm over 15 seconds matches 200 mm/min.','sec',120,1);
 html+=numberCard('purgePause','Pause between repetitions','Wait between repeated purges in the same stage. Zero continues immediately.','sec',30);
 html+='<div class="height-preview" id="purgePreview"></div></div>';
 html+='<div class="notice">Loading, finishing extrusion, and flow calibration can still extrude filament. These options do not change AMS color-change flushing during the print.</div>';
 html+='<div class="notice">Factory prime lines and calibration movements are retained.</div>';
 html+='<details class="extras"><summary>Other startup settings · temperature, pauses & sound</summary>';

 html+=toggleCard('standbyOn','Choose an initial nozzle temperature','Off keeps Bambu’s default. On changes only the first preheat command, before the cleaning and printing temperatures take over.');
 html+=numberCard('standby','Initial nozzle temperature','The nozzle briefly starts at this temperature. This does not set the temperature used to print your model.','°C',170,75);
 html+=numberCard('soak','Let the bed warm evenly','Extra waiting time after the bed reaches its target temperature. Example: 120 seconds adds a 2-minute heat soak. Set 0 to skip.','sec',600);
 
 html+=numberCard('before','Pause before nozzle cleaning','Wait this many seconds before the printer starts its normal wipe. Zero means no extra pause.','sec',60);
 html+=numberCard('after','Pause after nozzle cleaning','Wait after the wipe finishes, before the rest of startup continues.','sec',60);
 if(sound)html+=toggleCard('startSound','Play startup melody','On plays the normal opening sound. Off removes the melody commands.');html+='</details>';
 }else{
 html+=heading('1','Cooling at the factory parking position','Keep the original finish movements. Optional cooling adds only fan commands and a timed wait.');
 html+=selectCard('coolMode','Extra fan cooling','Fans run after the factory ending and stop when the timer ends.',[['off','No extra fan cooling'],['time','Use a timer']]);
 html+=numberCard('minutes','Run the fans for','Cooling time does not guarantee the model has released.','min',120,0.1);
 html+=numberCard('fan','Part cooling fan speed','The toolhead stays at its normal parking position, so airflow may not reach the model.','%',100);
 if(model==='P1S'){html+=numberCard('auxFan','Side fan speed','Auxiliary fan airflow across the bed.','%',100);html+=numberCard('chamberFan','Exhaust fan speed','Chamber exhaust airflow.','%',100);}
 html+='<div class="notice">Custom parking and automatic pushing are unavailable. A 4 mm model minus a 5 mm push offset would request Z −1 mm, not 1 mm above the bed. This version exports no custom push movements; a height limit alone cannot check toolhead clearance or whether a part is loose.</div>';
 html+='<details class="extras"><summary>Finishing touches</summary>';
 html+=numberCard('finish','Extra pause at the very end','Optional delay after the routine completes. Zero adds no wait.','sec',600);
 if(sound)html+=toggleCard('endSound','Play finish melody','Keeps the factory completion melody. It plays before your extra timed cooling.');html+='</details>';
 }
 $('controls').innerHTML=html;
 for(const el of $('controls').querySelectorAll('input,select')){if(el.type==='checkbox')el.checked=s[el.id];else el.value=Number.isNaN(s[el.id])?'':s[el.id];el.addEventListener('input',()=>{s[el.id]=el.type==='checkbox'?el.checked:el.tagName==='SELECT'?el.value:el.value===''?NaN:Number(el.value);if(el.id==='ejectOn'&&s.ejectOn){s.coolMode='time';$('coolMode').value='time';}render();});}
 for(const id of ['primeOn','park','ejectOn'])if($(id)){$(id).disabled=true;$(id).title='Temporarily unavailable during safety review';}
 $('controls').querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const fresh=defaults(model);const keys=mode==='start'?['purgeMode','purgeCount','purgeAmount','purgeSeconds','purgePause','primeOn','standbyOn','standby','before','after','soak','startSound']:Object.keys(fresh).filter(k=>!['purgeMode','purgeCount','purgeAmount','purgeSeconds','purgePause','primeOn','standbyOn','standby','before','after','soak','startSound'].includes(k));keys.forEach(k=>s[k]=fresh[k]);if(b.dataset.preset==='less'){s.purgeMode='custom';s.purgeAmount=25;s.purgeSeconds=7.5;}if(b.dataset.preset==='noPrime')s.primeOn=false;if(b.dataset.preset==='quiet')s.startSound=false;if(b.dataset.preset==='soak')s.soak=120;if(b.dataset.preset==='cool'||b.dataset.preset==='eject'){s.park='factory';s.coolMode='time';s.minutes=5;s.fan=100;}if(b.dataset.preset==='eject')s.ejectOn=true;controls();toast('Preset applied. Adjust any option below.');});render();}
function render(){const printer=$('printer').value,s={...settings[printer],printer,mode,comments};let error='';try{output=generate(s,data);}catch(e){output='';error=data?e.message:'Loading printer templates…';}
 $('error').hidden=!error;$('error').textContent=error;$('previewRoutine').disabled=!!error;$('copy').disabled=!!error;$('download').disabled=!!error;
 $('filename').textContent=printer.toLowerCase().replaceAll(' ','-')+'-'+mode+'-template.txt';
 $('code').replaceChildren();const lines=output.trimEnd().split('\n');lines.forEach((line,i)=>{const row=document.createElement('span');row.className='line';const n=document.createElement('span');n.className='num';n.textContent=i+1;const txt=document.createElement('span');txt.className='txt';const at=line.indexOf(';');const cmd=document.createElement('span');cmd.className='cmd';cmd.textContent=at<0?line:line.slice(0,at);txt.append(cmd);if(at>=0){const c=document.createElement('span');c.className='comment';c.textContent=line.slice(at);txt.append(c);}row.append(n,txt);$('code').append(row);});
 $('lineCount').textContent=output?lines.length+' lines · '+printer+' · '+mode:'No valid template';
 $('summary').replaceChildren();const chips=[printer,mode==='start'?'Start routine':'End routine',mode==='start'?(s.primeOn?'Prime lines on':'Prime lines off'):s.coolMode==='off'?'No extra cooling':s.coolMode==='time'?s.minutes+' min cooling':s.bedTarget+' °C target'];for(const t of chips){const el=document.createElement('span');el.textContent=t;$('summary').append(el);}
 $('modeNote').textContent='Complete '+mode+' template for '+printer+'. Start and end settings are saved separately while this page is open.';
 $('usage').textContent='Copy into Bambu Studio → Printer preset → Machine G-code → Machine '+mode+' G-code. This is a complete slicer template; slice before use.';
 $('preservedTitle').textContent=mode==='start'?'✓ Factory preparation preserved':'✓ Factory shutdown preserved';
 $('preservedNote').textContent=mode==='start'?'Cleaning movements, homing, leveling, and material handling use this printer’s official sequence. Print temperatures come from your filament profile.':'The complete factory ending, including parking and motor commands, stays in its original order. Optional timed cooling adds fan commands and a wait without additional axis movement.';
 $('templateLink').href='https://github.com/bambulab/BambuStudio/blob/'+(data?.revision||'master')+'/resources/profiles/BBL/machine/'+encodeURIComponent('Bambu Lab '+printer+' 0.4 nozzle template machine_'+mode+'_gcode.json');
 const show=(id,visible)=>{if($(id))$(id).closest('.field-card').hidden=!visible;};
 if(mode==='start'){show('standby',s.standbyOn);$('purgeFields').hidden=s.purgeMode!=='custom';$('purgePreview').textContent=s.purgeCount+' × '+s.purgeAmount+' mm = '+(s.purgeCount*s.purgeAmount)+' mm filament per main stage. Feed speed: '+(s.purgeAmount*60/s.purgeSeconds).toFixed(1)+' mm/min. Extrusion + pauses: '+(s.purgeCount*s.purgeSeconds+(s.purgeCount-1)*s.purgePause)+' seconds per stage.';}else{
  show('minutes',s.coolMode==='time');for(const k of ['fan','auxFan','chamberFan'])show(k,s.coolMode==='time');
 }
 const steps=mode==='start'?[s.purgeMode==='factory'?'Use factory purge amounts and speeds':s.purgeMode==='skip'?'Skip the two main purges; other extrusion remains':s.purgeCount+' purges per main stage, '+s.purgeAmount+' mm over '+s.purgeSeconds+' seconds each',s.primeOn?'Draw factory prime lines on the bed':'Skip front-of-bed prime lines','Keep homing, nozzle cleaning, and filament-profile temperatures']:[s.park==='factory'?'Finish at the normal parking position':s.park==='over'?'Hover '+s.heightOffset+' mm above the highest layer':'Change nozzle height beside the print',s.coolMode==='off'?'No extra cooling':s.coolMode==='time'?'Run selected fans for '+s.minutes+' minutes':'Wait at '+s.bedTarget+' °C bed target (experimental)',...(s.ejectOn?['Generate a slow, guarded front-edge push']:[]),'Stop cooling fans and finish'];
 $('routineSteps').replaceChildren(...steps.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
 for(const m of ['start','end']){$(m+'Tab').classList.toggle('active',m===mode);$(m+'Tab').setAttribute('aria-selected',m===mode);}
}
for(const m of ['start','end'])$(m+'Tab').onclick=()=>{mode=m;controls();};
$('printer').onchange=controls;
$('reset').onclick=()=>{const p=$('printer').value;const fresh=defaults(p);const keys=mode==='start'?['purgeMode','purgeCount','purgeAmount','purgeSeconds','purgePause','primeOn','standbyOn','standby','before','after','soak','startSound']:['cooling','fan','finish','endSound','coolMode','minutes','bedTarget','auxFan','chamberFan','park','heightRef','heightDirection','heightOffset','ejectOn','ejectRef','ejectOffset','pushMargin','pushSpeed','pushEndY'];keys.forEach(k=>settings[p][k]=fresh[k]);controls();toast('Current routine reset to factory defaults.');};
$('comments').onclick=()=>{comments=!comments;$('comments').textContent='Comments '+(comments?'on':'off');$('comments').setAttribute('aria-pressed',comments);render();};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(output);toast(mode==='start'?'Start G-code copied.':'End G-code copied.');}catch{toast('Clipboard unavailable. Download the template instead.');}};
$('download').onclick=()=>{const url=URL.createObjectURL(new Blob([output],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download=$('filename').textContent;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Template downloaded.');};
$('guideOpen').onclick=()=>$('guide').showModal();$('guideClose').onclick=()=>$('guide').close();
$('previewRoutine').onclick=createPreview(()=>{const printer=$('printer').value;const s={...settings[printer],printer,mode,comments:true};return {settings:s,code:generate(s,data)};});
controls();try{const r=await fetch('./templates.json');if(!r.ok)throw Error();data=await r.json();render();}catch{$('error').textContent='Could not load templates. Reload the page to retry.';}
