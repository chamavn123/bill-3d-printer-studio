export const defaults = model => ({purgeMode:"factory",purgeCount:1,purgeAmount:50,purgeSeconds:15,purgePause:0,primeOn:true,standbyOn:false,standby:model==='P1S'?75:model==='A1 mini'?170:140,before:0,after:0,soak:0,startSound:true,endSound:true,cooling:0,fan:100,finish:0,coolMode:"off",minutes:5,bedTarget:35,auxFan:0,chamberFan:0,park:"factory",heightRef:"highest",heightDirection:"above",heightOffset:10,ejectOn:false,ejectRef:"top",ejectOffset:5,pushMargin:40,pushSpeed:5,pushEndY:5});
export function heightExpression(s){const base=s.heightRef==='highest'?'max_layer_z':'initial_layer_print_height';return base+(s.heightDirection==='above'?' + ':' - ')+s.heightOffset;}
export function ejectionHeight(s){return s.ejectRef==='top'?'max_layer_z - '+s.ejectOffset:'initial_layer_print_height + '+s.ejectOffset;}
export function generate(s,data){
 const source=data?.printers?.[s.printer]?.[s.mode];
 if(!source)throw Error('Printer template unavailable. Please reload.');
 if(!['start','end'].includes(s.mode))throw Error('Choose start or end G-code.');
 const bounds=s.mode==='start'?{...(s.purgeMode==='custom'?{purgeCount:[1,5],purgeAmount:[1,100],purgeSeconds:[1,120],purgePause:[0,30]}:{}),before:[0,60],after:[0,60],soak:[0,600],...(s.standbyOn?{standby:[75,170]}:{})}:{finish:[0,600],...(s.coolMode!=='off'?{fan:[0,100],auxFan:[0,100],chamberFan:[0,100],...(s.coolMode==='time'?{minutes:[0.1,120]}:{bedTarget:[25,80]})}:{}),...(s.park!=='factory'?{heightOffset:[0,200]}:{}),...(s.ejectOn?{ejectOffset:[0.5,100],pushMargin:[30,70],pushSpeed:[1,10],pushEndY:[0,20]}:{})};
 const labels={purgeCount:'Purge repetitions',purgeAmount:'Filament per purge',purgeSeconds:'Time per purge',purgePause:'Pause between purges',standby:'Initial nozzle temperature',before:'Pause before cleaning',after:'Pause after cleaning',soak:'Bed heat soak',finish:'Final pause',fan:'Part fan speed',auxFan:'Side fan speed',chamberFan:'Exhaust fan speed',minutes:'Cooling duration',bedTarget:'Bed temperature target',heightOffset:'Height offset',ejectOffset:'Push height offset',pushMargin:'Space behind the model',pushSpeed:'Push speed',pushEndY:'Push stopping point'};
 for(const [key,[min,max]] of Object.entries(bounds))if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error((labels[key]||key)+' must be a number from '+min+' to '+max+'.');
 let code=source;
 const patch=(re,fn)=>{const hits=code.match(new RegExp(re.source,re.flags.replace('g','')+'g'));if(hits?.length!==1)throw Error('Template structure changed. Export stopped.');code=code.replace(re,fn);};
 if(s.mode==='start'){
  if(!['factory','custom','skip'].includes(s.purgeMode))throw Error('Choose a purge setting.');
  if(s.purgeMode==='custom'){
   if(!Number.isInteger(s.purgeCount))throw Error('Purge repetitions must be a whole number.');
   if(s.purgeCount*s.purgeAmount>150)throw Error('Keep the total filament per purge stage at 150 mm or less.');
   if(s.purgeAmount*60/s.purgeSeconds>200)throw Error('Increase purge time to at least '+Math.ceil(s.purgeAmount*60/200)+' seconds for this amount.');
  }
  if(s.purgeMode!=='factory')patch(/;===== prepare print temperature and material =+\n[\s\S]*?;===== prepare print temperature and material end =+/,block=>{
   let count=0;
   const result=block.replace(/^[ \t]*G1 E50 F[^\n]+$/gm,()=>{
    count++;
    if(s.purgeMode==='skip')return '; Bill 3D Printer Studio: main purge skipped; loading and finishing extrusion remain';
    return Array.from({length:s.purgeCount},(_,i)=>'; Bill 3D Printer Studio: purge '+(i+1)+'/'+s.purgeCount+' — '+s.purgeAmount+' mm filament over '+s.purgeSeconds+' s\nG92 E0\nG1 E'+s.purgeAmount+' F'+(s.purgeAmount*60/s.purgeSeconds).toFixed(3)+'\nM400'+(i<s.purgeCount-1&&s.purgePause?'\nM400 S'+s.purgePause:'')).join('\n');
   });
   if(count!==2)throw Error('Purge stage structure changed. Export stopped.');
   return result;
  });
  if(!s.primeOn){
   const removeMotion=block=>block.split('\n').filter(line=>!/^\s*G(?:0|1|90|91)(?:\s|$)/.test(line)).join('\n');
   if(s.printer==='P1S'){
    patch(/;===== nozzle load line =+[\s\S]*?(?=;===== for Textured PEI Plate)/,block=>removeMotion(block)+'\nG90\nG1 Z5 F1200\n; Bill 3D Printer Studio: prime line disabled\n');
   }else{
    if(s.printer==='A1 mini')patch(/^[ \t]*G0 X68 Y-4 F30000\n[\s\S]*?^[ \t]*G0 Y0 Z0 F20000$/m,()=>'; Bill 3D Printer Studio: calibration front line disabled');
    patch(/;===== extrude cali test =+[\s\S]*?(?=;========turn off light and wait extrude temperature)/,block=>removeMotion(block)+'\nG90\nM83\nM109 S{nozzle_temperature_initial_layer[initial_extruder]}\nG1 Z5 F1200\n; Bill 3D Printer Studio: prime lines disabled\n');
   }
  }

  if(s.standbyOn){const first=code.match(/^M104 S\d+[^\n]*$/m);if(!first)throw Error('Standby command missing.');code=code.replace(first[0],'M104 S'+s.standby+' ; Bill 3D Printer Studio: initial standby temperature');}
  if(s.before)patch(/^;===== wipe nozzle =+$/m,m=>'; Bill 3D Printer Studio: wait before cleaning\nM400 S'+s.before+'\n'+m);
  if(s.after)patch(/^;===== wipe nozzle end =+$/m,m=>m+'\n; Bill 3D Printer Studio: wait after cleaning\nM400 S'+s.after);
  if(s.soak)patch(/^M190 S\[bed_temperature_initial_layer_single\][^\n]*$/m,m=>m+'\n; Bill 3D Printer Studio: bed soak after reaching target\nM400 S'+s.soak);
 }else{
  if(!['off','time','temperature'].includes(s.coolMode)||!['factory','outside','over'].includes(s.park))throw Error('Invalid end action.');
  if(!['highest','first'].includes(s.heightRef)||!['above','below'].includes(s.heightDirection))throw Error('Invalid height reference.');
  if(s.park==='over'&&(s.heightRef!=='highest'||s.heightDirection!=='above'||s.heightOffset<2))throw Error('Over-model parking needs at least 2 mm ABOVE the highest layer. Choose outside parking for lower positions.');
  if(s.ejectOn&&!['top','first'].includes(s.ejectRef))throw Error('Choose a push height reference.');
  if(s.ejectOn&&s.coolMode!=='time')throw Error('Choose timed cooling before using front-edge push. Bed-target mode is not a verified release check.');
  const active=s.park!=='factory'||s.coolMode!=='off'||s.ejectOn;
  if(active){
   // Keep motors energized through custom actions; restore original final motor commands afterward.
   const tail=[];code=code.split('\n').filter(l=>{if(/^M18 X Y Z\s*$/.test(l)||/^M17 X0\.8 Y0\.8 Z0\.5/.test(l)){tail.push(l);return false;}return true;}).join('\n');
   code+='\n; ===== Bill 3D Printer Studio end actions =====\nM400\nG90\n';
   const z=heightExpression(s),limit=s.printer==='A1 mini'?180:s.printer==='P1S'?250:256;
   if(s.park!=='factory'){
    code+='; Height is evaluated by the slicer. Skip the move if outside travel limits.\n{if ('+z+') >= 1 && ('+z+') <= '+limit+'}\n';
    code+='G1 Z{'+z+'} F600\n';
    if(s.park==='over'){
     // Z clearance must be established before lateral travel over the print.
     const x='first_layer_print_min[0] + first_layer_print_size[0]/2',y='first_layer_print_min[1] + first_layer_print_size[1]/2';
     code+='{if ('+x+') >= 0 && ('+x+') <= '+(s.printer==='A1 mini'?180:256)+' && ('+y+') >= 0 && ('+y+') <= '+(s.printer==='A1 mini'?180:256)+'}\nG1 X{'+x+'} Y{'+y+'} F3000\n{endif}\n';
    }
    code+='{endif}\nM400\n';
   }
   if(s.coolMode!=='off'){
    code+='; Cooling fans\nM106 P1 S'+Math.round(s.fan*255/100)+'\n';
    if(s.printer==='P1S')code+='M106 P2 S'+Math.round(s.auxFan*255/100)+'\nM106 P3 S'+Math.round(s.chamberFan*255/100)+'\n';
    if(s.coolMode==='time')code+='M400 S'+Math.round(s.minutes*60)+' ; timed cooling in seconds\n';
    else code+='; Experimental: confirm M190 S cooling behavior on your firmware.\n; Can heat if already below target; no timeout. Not a release detector.\nM190 S'+s.bedTarget+'\nM140 S0\n';
    code+='M106 P1 S0\n';if(s.printer==='P1S')code+='M106 P2 S0\nM106 P3 S0\n';
   }
   if(s.ejectOn){
    const ez=ejectionHeight(s),x='first_layer_print_min[0] + first_layer_print_size[0]/2',back='first_layer_print_min[1] + first_layer_print_size[1] + '+s.pushMargin;
    const bed=s.printer==='A1 mini'?180:256,home=s.printer==='P1S'?'X100 Y265':s.printer==='A1 mini'?'X-13 Y180':'X-48 Y180';
    code+='; ===== Experimental front-edge push =====\n; One straight-sided, already-released part. No brim, supports, or other objects.\n; First-layer footprint must bound the whole model. Clear exit path required.\n; Contact Z must be at least 1 mm. Skip the entire push below that height; never clamp.\n; Skip push if staging room, height or front clearance is insufficient.\n';
    code+='{if (max_layer_z + 10) <= '+limit+' && ('+ez+') >= 1 && ('+ez+') < (max_layer_z - 0.5) && ('+back+') <= '+(bed-5)+' && ('+x+') >= 30 && ('+x+') <= '+(bed-30)+' && first_layer_print_min[1] > '+(s.pushEndY+5)+' && first_layer_print_size[0] > 0 && first_layer_print_size[1] > 0}\n';
    code+='G90\nG1 Z{max_layer_z + 10} F600 ; clear the whole model before XY travel\nG1 X{'+x+'} Y{'+back+'} F1800 ; stage behind the part\nG1 Z{'+ez+'} F300 ; lower outside the model footprint\nG1 Y'+s.pushEndY+' F'+Math.round(s.pushSpeed*60)+' ; push slowly toward the front edge\nM400\nG1 Z{max_layer_z + 10} F600 ; lift before returning to park\nG1 '+home+' F1800\nM400\n{endif}\n';
   }
   code+='M400\n'+tail.join('\n')+'\n';
  }
  if(s.finish)code+='\n; Bill 3D Printer Studio: final delay\nM400 S'+s.finish+'\n';
 }

 if(!(s.mode==='start'?s.startSound:s.endSound))code=code.split('\n').filter(l=>!/^\s*M1006(?:\s|$)/.test(l)).join('\n');
 const header='; Bill 3D Printer Studio | Bambu Lab '+s.printer+' | 0.4 mm | '+s.mode+'\n; Paste into Machine '+s.mode+' G-code in Bambu Studio.\n; Slicer template: do not run directly on printer.\n';
 code=header+code;
 if(!s.comments)code=code.split('\n').map(l=>l.split(';')[0].trimEnd()).filter(l=>l.trim()).join('\n');
 return code.trimEnd()+'\n';
}
