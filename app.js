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
 const presets=mode==='start'?[['factory','Factory setup','Original purge + prime lines'],['less','Less main purge','25 mm per main stage'],['noPrime','No prime line','Skip the lines on the bed']]:[['factory','Normal finish','Keep the factory ending'],['cool','Cool above model','100% fan for 5 minutes'],['eject','Cool + push forward','Experimental single-part sweep']];
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
 html+=heading('2','Prime line on the bed','Choose whether to draw the startup lines before your model.');
 html+=toggleCard('primeOn','Draw prime lines','On keeps the factory front-of-bed priming lines. Off skips those lines, including the front-line calibration strokes, while retaining the other calibration commands.');
 html+='<details class="extras"><summary>Other startup settings · temperature, pauses & sound</summary>';

 html+=toggleCard('standbyOn','Choose an initial nozzle temperature','Off keeps Bambu’s default. On changes only the first preheat command, before the cleaning and printing temperatures take over.');
 html+=numberCard('standby','Initial nozzle temperature','The nozzle briefly starts at this temperature. This does not set the temperature used to print your model.','°C',170,75);
 html+=numberCard('soak','Let the bed warm evenly','Extra waiting time after the bed reaches its target temperature. Example: 120 seconds adds a 2-minute heat soak. Set 0 to skip.','sec',600);
 
 html+=numberCard('before','Pause before nozzle cleaning','Wait this many seconds before the printer starts its normal wipe. Zero means no extra pause.','sec',60);
 html+=numberCard('after','Pause after nozzle cleaning','Wait after the wipe finishes, before the rest of startup continues.','sec',60);
 if(sound)html+=toggleCard('startSound','Play startup melody','On plays the normal opening sound. Off removes the melody commands.');html+='</details>';
 }else{
 html+=heading('1','Where should the nozzle finish?','Choose a position, then reveal only the height controls you need.');
 html+=selectCard('park','Nozzle position','Factory parking is beside the print. Hovering moves above the center of the first-layer footprint.',[['factory','Keep the normal parking position'],['over','Hover above the model'],['outside','Stay beside the model, change height']]);
 html+=selectCard('heightRef','Measure height from','Highest layer means the top of the printed job. First layer means the nominal first-layer Z, near the build plate.',[['highest','Top of the print — highest layer'],['first','First layer — near the build plate']]);
 html+=selectCard('heightDirection','Move above or below that layer','Above adds your offset. Below subtracts it. Hovering over a model only allows above its highest layer.',[['above','Above'],['below','Below']]);
 html+=numberCard('heightOffset','Distance from that layer','Example: a 50 mm tall print + 10 mm above = nozzle at Z 60 mm. Use at least 2 mm above the top when hovering.','mm',200);
 html+='<div class="height-preview" id="heightPreview"></div>';
 html+=heading('2','How should the fans cool the print?','Choose a timer, then set the airflow. Fans stop after the wait.');
 html+=selectCard('coolMode','Stop cooling when…','Timed cooling is the predictable option. A bed-temperature target depends on firmware behavior.',[['off','No extra fan cooling'],['time','My timer finishes'],['temperature','The bed reaches a target · experimental']]);
 html+=numberCard('minutes','Run the fans for','Time in minutes. Example: 5 runs the selected fans for 300 seconds. Cooling time does not guarantee the model has released.','min',120,0.1);
 html+=numberCard('bedTarget','Bed temperature target','Example: 35 °C. A target below room temperature may never be reached.','°C',80,25);
 html+=numberCard('fan','Part cooling fan speed','The fan on the toolhead. 100% is full airflow; 0% leaves it off. Hover above the model to direct the air at the print.','%',100);
 if(model==='P1S'){html+=numberCard('auxFan','Side fan speed','The P1S auxiliary fan blows across the bed from the side.','%',100);html+=numberCard('chamberFan','Exhaust fan speed','The P1S chamber fan moves air out of the enclosure.','%',100);}
 html+='<div id="temperatureNote" class="notice callout">Experimental: the bed-target command can reheat a cold bed and has no timeout. Cooling-wait behavior is unverified on your firmware. Use a timer until you have tested it. Temperature mode cannot be combined with push-off.</div>';
 html+=heading('3','Move the finished part?','Optional. The website builds the movement code from your choices.');
 html+=toggleCard('ejectOn','Push the part toward the front edge','After timed cooling: lift → move behind the part → lower → push forward slowly → lift and park. No pasted G-code needed.');
 html+='<div id="ejectFields"><div class="notice callout">Experimental contact movement: use one straight-sided part whose first-layer outline covers its whole shape, with no brim, supports, or other objects. The part must already be loose. Verify a clear toolhead path and '+(model==='P1S'?'open front-door exit on the P1S':'unobstructed front edge on the '+model)+'. This is a front-edge sweep, not guaranteed automatic removal.</div>';
 html+=selectCard('ejectRef','Where should the nozzle touch the part?','Use a low, sturdy contact point. This push height is separate from the cooling height above.',[['top','Below the highest layer'],['first','Above the first layer']]);
 html+=numberCard('ejectOffset','Push height offset','Example: 5 mm below a 30 mm tall model gives Z 25 mm. Above a 0.2 mm first layer + 5 mm gives Z 5.2 mm.','mm',100,0.5);
 html+=numberCard('pushMargin','Space behind the model','Distance from the first-layer back edge to the starting nozzle position. Measure clearance for the entire toolhead. Default 40 mm; the routine is skipped if it does not fit.','mm',70,30);
 html+=numberCard('pushSpeed','Push speed','How slowly the nozzle travels toward the front. Default 5 mm/second. The printer has no force or stuck-part check.','mm/s',10,1);
 html+=numberCard('pushEndY','Stop this far from the front edge','Bed coordinates: front edge = Y 0. Default Y 5 stops the nozzle 5 mm inside the front edge. The part may still require manual removal.','mm',20);
 html+='<div class="height-preview" id="pushPreview"></div><div class="path-diagram"><span>① Lift above print</span><span>② Stage behind</span><span>③ Lower & push ↓</span><span>④ Lift & park</span></div></div>';
 html+='<details class="extras"><summary>Finishing touches</summary>';
 html+=numberCard('finish','Extra pause at the very end','Optional delay after the routine completes. Zero adds no wait.','sec',600);
 if(sound)html+=toggleCard('endSound','Play finish melody','Keeps the factory completion melody. It plays before your extra cooling and push actions.');html+='</details>';
 }
 $('controls').innerHTML=html;
 for(const el of $('controls').querySelectorAll('input,select')){if(el.type==='checkbox')el.checked=s[el.id];else el.value=Number.isNaN(s[el.id])?'':s[el.id];el.addEventListener('input',()=>{s[el.id]=el.type==='checkbox'?el.checked:el.tagName==='SELECT'?el.value:el.value===''?NaN:Number(el.value);if(el.id==='ejectOn'&&s.ejectOn){s.coolMode='time';$('coolMode').value='time';}render();});}
 $('controls').querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const fresh=defaults(model);const keys=mode==='start'?['purgeMode','purgeCount','purgeAmount','purgeSeconds','purgePause','primeOn','standbyOn','standby','before','after','soak','startSound']:Object.keys(fresh).filter(k=>!['purgeMode','purgeCount','purgeAmount','purgeSeconds','purgePause','primeOn','standbyOn','standby','before','after','soak','startSound'].includes(k));keys.forEach(k=>s[k]=fresh[k]);if(b.dataset.preset==='less'){s.purgeMode='custom';s.purgeAmount=25;s.purgeSeconds=10;}if(b.dataset.preset==='noPrime')s.primeOn=false;if(b.dataset.preset==='quiet')s.startSound=false;if(b.dataset.preset==='soak')s.soak=120;if(b.dataset.preset==='cool'||b.dataset.preset==='eject'){s.park='over';s.coolMode='time';s.minutes=5;s.fan=100;}if(b.dataset.preset==='eject')s.ejectOn=true;controls();toast('Preset applied. Adjust any option below.');});render();}
function render(){const printer=$('printer').value,s={...settings[printer],printer,mode,comments};let error='';try{output=generate(s,data);}catch(e){output='';error=data?e.message:'Loading printer templates…';}
 $('error').hidden=!error;$('error').textContent=error;$('previewRoutine').disabled=!!error;$('copy').disabled=!!error;$('download').disabled=!!error;
 $('filename').textContent=printer.toLowerCase().replaceAll(' ','-')+'-'+mode+'-template.txt';
 $('code').replaceChildren();const lines=output.trimEnd().split('\n');lines.forEach((line,i)=>{const row=document.createElement('span');row.className='line';const n=document.createElement('span');n.className='num';n.textContent=i+1;const txt=document.createElement('span');txt.className='txt';const at=line.indexOf(';');const cmd=document.createElement('span');cmd.className='cmd';cmd.textContent=at<0?line:line.slice(0,at);txt.append(cmd);if(at>=0){const c=document.createElement('span');c.className='comment';c.textContent=line.slice(at);txt.append(c);}row.append(n,txt);$('code').append(row);});
 $('lineCount').textContent=output?lines.length+' lines · '+printer+' · '+mode:'No valid template';
 $('summary').replaceChildren();const chips=[printer,mode==='start'?'Start routine':'End routine',mode==='start'?(s.primeOn?'Prime lines on':'Prime lines off'):s.coolMode==='off'?'No extra cooling':s.coolMode==='time'?s.minutes+' min cooling':s.bedTarget+' °C target'];for(const t of chips){const el=document.createElement('span');el.textContent=t;$('summary').append(el);}
 $('modeNote').textContent='Complete '+mode+' template for '+printer+'. Start and end settings are saved separately while this page is open.';
 $('usage').textContent='Copy into Bambu Studio → Printer preset → Machine G-code → Machine '+mode+' G-code. This is a complete slicer template; slice before use.';
 $('preservedTitle').textContent=mode==='start'?'✓ Factory preparation preserved':'✓ Factory shutdown preserved';
 $('preservedNote').textContent=mode==='start'?'Cleaning movements, homing, leveling, and material handling use this printer’s official sequence. Print temperatures come from your filament profile.':'The routine keeps factory shutdown, then runs your selected parking, cooling, and front-edge push actions. Each movement is guarded by the configured travel limits; geometry and adhesion still need physical checking.';
 $('templateLink').href='https://github.com/bambulab/BambuStudio/blob/'+(data?.revision||'master')+'/resources/profiles/BBL/machine/'+encodeURIComponent('Bambu Lab '+printer+' 0.4 nozzle template machine_'+mode+'_gcode.json');
 const show=(id,visible)=>{if($(id))$(id).closest('.field-card').hidden=!visible;};
 if(mode==='start'){show('standby',s.standbyOn);$('purgeFields').hidden=s.purgeMode!=='custom';$('purgePreview').textContent=s.purgeCount+' × '+s.purgeAmount+' mm = '+(s.purgeCount*s.purgeAmount)+' mm filament per main stage. Feed speed: '+(s.purgeAmount*60/s.purgeSeconds).toFixed(1)+' mm/min. Extrusion + pauses: '+(s.purgeCount*s.purgeSeconds+(s.purgeCount-1)*s.purgePause)+' seconds per stage.';}else{
  for(const k of ['heightRef','heightDirection','heightOffset'])show(k,s.park!=='factory');
  $('heightPreview').hidden=s.park==='factory';$('heightPreview').textContent=(s.heightDirection==='above'?'Above ':'Below ')+(s.heightRef==='highest'?'the highest layer':'the first layer')+' by '+s.heightOffset+' mm. Out-of-range Z moves are skipped during slicing.';
  show('minutes',s.coolMode==='time');show('bedTarget',s.coolMode==='temperature');$('temperatureNote').hidden=s.coolMode!=='temperature';for(const k of ['fan','auxFan','chamberFan'])show(k,s.coolMode!=='off');
  $('ejectFields').hidden=!s.ejectOn;$('pushPreview').textContent='Contact height: '+ejectionHeight(s)+' mm. Minimum Z is 1 mm. A 4 mm print minus 5 mm is −1 mm: the entire push is skipped, not clamped. Lift 10 mm above the print → stage '+s.pushMargin+' mm behind → push toward Y '+s.pushEndY+' at '+s.pushSpeed+' mm/s.';
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
