export const defaults = model => ({purgeMode:"factory",purgeCount:1,purgeAmount:50,purgeSeconds:15,purgePause:0,primeOn:true,standbyOn:false,standby:model==='P1S'?75:model==='A1 mini'?170:140,before:0,after:0,soak:0,startSound:true,endSound:true,cooling:0,fan:100,finish:0,coolMode:"off",minutes:5,bedTarget:35,auxFan:0,chamberFan:0,park:"factory",heightRef:"highest",heightDirection:"above",heightOffset:10,ejectOn:false,ejectRef:"top",ejectOffset:5,pushMargin:40,pushSpeed:5,pushEndY:5});
export function heightExpression(s){const base=s.heightRef==='highest'?'max_layer_z':'initial_layer_print_height';return base+(s.heightDirection==='above'?' + ':' - ')+s.heightOffset;}
export function ejectionHeight(s){return s.ejectRef==='top'?'max_layer_z - '+s.ejectOffset:'initial_layer_print_height + '+s.ejectOffset;}
export function generate(s,data){
 const source=data?.printers?.[s.printer]?.[s.mode];
 if(!source)throw Error('Printer template unavailable. Please reload.');
 if(s.mode==='start'&&!s.primeOn)throw Error('Prime-line removal is paused: it also modifies calibration motion. Keep the factory prime lines.');
 if(s.mode==='end'&&(s.park!=='factory'||s.ejectOn))throw Error('Custom parking and push export are paused: nozzle bounds do not validate toolhead clearance or part release. Keep factory parking and turn push off.');
 if(s.mode==='end'&&s.coolMode==='temperature')throw Error('Bed-target cooling is paused: it can reheat and has no timeout. Use timed cooling.');
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
  if(s.standbyOn){const first=code.match(/^M104 S\d+[^\n]*$/m);if(!first)throw Error('Standby command missing.');code=code.replace(first[0],'M104 S'+s.standby+' ; Bill 3D Printer Studio: initial standby temperature');}
  if(s.before)patch(/^;===== wipe nozzle =+$/m,m=>'; Bill 3D Printer Studio: wait before cleaning\nM400 S'+s.before+'\n'+m);
  if(s.after)patch(/^;===== wipe nozzle end =+$/m,m=>m+'\n; Bill 3D Printer Studio: wait after cleaning\nM400 S'+s.after);
  if(s.soak)patch(/^M190 S\[bed_temperature_initial_layer_single\][^\n]*$/m,m=>m+'\n; Bill 3D Printer Studio: bed soak after reaching target\nM400 S'+s.soak);
 }else{
  if(!['off','time'].includes(s.coolMode))throw Error('Choose no cooling or timed cooling.');
  if(s.coolMode==='time'){
   // Preserve all factory motion and motor commands in their original order.
   code+='\n; ===== Bill 3D Printer Studio timed cooling at factory park =====\nM400\nM106 P1 S'+Math.round(s.fan*255/100)+'\n';
   if(s.printer==='P1S')code+='M106 P2 S'+Math.round(s.auxFan*255/100)+'\nM106 P3 S'+Math.round(s.chamberFan*255/100)+'\n';
   code+='M400 S'+Math.round(s.minutes*60)+' ; timed cooling in seconds\nM106 P1 S0\n';
   if(s.printer==='P1S')code+='M106 P2 S0\nM106 P3 S0\n';
  }
  if(s.finish)code+='\n; Bill 3D Printer Studio: final delay\nM400 S'+s.finish+'\n';
 }

 if(!(s.mode==='start'?s.startSound:s.endSound))code=code.split('\n').filter(l=>!/^\s*M1006(?:\s|$)/.test(l)).join('\n');
 const header='; Bill 3D Printer Studio | Bambu Lab '+s.printer+' | 0.4 mm | '+s.mode+'\n; Paste into Machine '+s.mode+' G-code in Bambu Studio.\n; Slicer template: do not run directly on printer.\n';
 code=header+code;
 if(!s.comments)code=code.split('\n').map(l=>l.split(';')[0].trimEnd()).filter(l=>l.trim()).join('\n');
 return code.trimEnd()+'\n';
}
