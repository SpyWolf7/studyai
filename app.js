const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let docs=[],tab='notes',S=null,busy=false;
try{docs=JSON.parse(localStorage.getItem('scrip')||'[]')}catch(e){}
const save=()=>{try{localStorage.setItem('scrip',JSON.stringify(docs))}catch(e){toast('Archive is full – remove a scroll')}};
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._x);t._x=setTimeout(()=>t.style.display='none',3000)}
/* ---------- Archive ---------- */
async function parse(f){const n=f.name.toLowerCase(),b=await f.arrayBuffer();
 if(n.endsWith('.pdf')){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const p=await pdfjsLib.getDocument({data:b}).promise;let t='';for(let i=1;i<=p.numPages;i++){const c=await(await p.getPage(i)).getTextContent();t+=c.items.map(x=>x.str).join(' ')+'\n'}return t}
 if(n.endsWith('.docx'))return(await mammoth.extractRawText({arrayBuffer:b})).value;
 if(n.endsWith('.pptx')){const z=await JSZip.loadAsync(b),ks=Object.keys(z.files).filter(k=>/^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a,c)=>+a.match(/\d+/)[0]-+c.match(/\d+/)[0]);let t='';
  for(const k of ks){const x=await z.files[k].async('string');t+='[Slide] '+[...x.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m=>m[1]).join(' ')+'\n'}return t}
 return new TextDecoder().decode(b)}
async function add(files){for(const f of files){try{toast('Reading '+f.name+'…');const t=(await parse(f)).replace(/\s+\n/g,'\n').trim().slice(0,200000);
 if(!t){toast('No text found in '+f.name);continue}docs.push({id:Date.now()+Math.random(),name:f.name,text:t,on:true})}catch(e){toast('Could not read '+f.name)}}save();drawDocs()}
function drawDocs(){const d=$('#docs');d.innerHTML=docs.length?'':'<div class="small">The archive is empty.</div>';
 docs.forEach(x=>{const r=document.createElement('div');r.className='doc';r.innerHTML=`<input type="checkbox" ${x.on?'checked':''}><label title="${esc(x.name)}">${esc(x.name)}</label><button title="Remove">✕</button>`;
  r.querySelector('input').onchange=e=>{x.on=e.target.checked;save();cnt()};r.querySelector('label').onclick=()=>r.querySelector('input').click();
  r.querySelector('button').onclick=()=>{docs=docs.filter(y=>y!==x);save();drawDocs()};d.append(r)});cnt()}
const picked=()=>docs.filter(d=>d.on);
function cnt(){$('#sel').textContent=picked().length+' of '+docs.length+' scrolls will be consulted'}
function ctx(){let c='';for(const d of picked()){c+='\n### SOURCE: '+d.name+'\n'+d.text+'\n'}return c.slice(0,45000)}
const dz=$('#drop');dz.onclick=()=>$('#file').click();$('#file').onchange=e=>{add([...e.target.files]);e.target.value=''};
dz.ondragover=e=>{e.preventDefault();dz.classList.add('on')};dz.ondragleave=()=>dz.classList.remove('on');dz.ondrop=e=>{e.preventDefault();dz.classList.remove('on');add([...e.dataTransfer.files])};
/* ---------- LLM ---------- */
function direct(){let k=localStorage.getItem('akey')||prompt('Paste your Anthropic API key (kept only in this browser):');if(!k)throw new Error('An API key is needed to wake the AI');localStorage.setItem('akey',k.trim());
 const f=async(p,o={})=>{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':localStorage.getItem('akey'),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-5-5',max_tokens:4000,messages:[{role:'user',content:p}]})});
  const j=await r.json();if(!r.ok){if(r.status===401)localStorage.removeItem('akey');throw new Error(j.error?.message||'API error')}
  const text=j.content.map(c=>c.text||'').join('');o.onText&&o.onText({text});return{text}};
 f.json=async(p,o)=>JSON.parse((await f(p,o)).text.replace(/```json|```/g,'').trim());return f}
async function llm(){if(!S)S=window.claude?await claude.use('sample'):direct();if(!S)throw new Error('The Palantír is dark – the AI is unavailable here.');return S}
const SYS='You are a wise, encouraging study tutor in Middle-earth. Use ONLY the source material provided. Teach for understanding, not memorisation.\n\nSOURCES:';
function need(){if(!picked().length){toast('Select at least one scroll first');return false}return true}
function md(t){let h='',ul=false;for(const l of t.split('\n')){const e=esc(l).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
 if(/^\s*[-*] /.test(l)){if(!ul){h+='<ul>';ul=true}h+='<li>'+e.replace(/^\s*[-*] /,'')+'</li>';continue}
 if(ul){h+='</ul>';ul=false}if(/^#+ /.test(l))h+='<h3>'+e.replace(/^#+ /,'')+'</h3>';else if(l.trim())h+='<p>'+e+'</p>'}return h+(ul?'</ul>':'')}
/* ---------- Views ---------- */
const V=$('#view');
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{tab=b.dataset.t;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));render()});
function render(){
 if(tab==='notes')V.innerHTML=`<div class="row"><input id="foc" placeholder="Focus topic (optional)" style="flex:1;min-width:160px"><button id="g">Scribe Notes</button></div><div class="out" id="o">Choose scrolls, then ask for study notes.</div>`,$('#g').onclick=notes;
 if(tab==='quiz')V.innerHTML=`<div class="row"><input id="foc" placeholder="Focus topic (optional)" style="flex:1;min-width:160px"><select id="n"><option>5</option><option selected>8</option><option>12</option></select><button id="g">Forge Quiz</button></div><div class="out" id="o">Test thy knowledge.</div>`,$('#g').onclick=quiz;
 if(tab==='cards')V.innerHTML=`<div class="row"><input id="foc" placeholder="Focus topic (optional)" style="flex:1;min-width:160px"><select id="n"><option>8</option><option selected>12</option><option>20</option></select><button id="g">Craft Flashcards</button></div><div class="out" id="o">Cards will appear here.</div>`,$('#g').onclick=cards;
 if(tab==='ask')V.innerHTML=`<div class="out chat" id="o"><div class="msg">Ask me anything about thy chosen scrolls.</div></div><div class="row"><input id="q" placeholder="Ask a question…" style="flex:1;min-width:160px"><button id="g">Ask</button></div>`,$('#g').onclick=ask,$('#q').onkeydown=e=>{if(e.key==='Enter')ask()}}
async function run(fn){if(busy||!need())return;busy=true;const g=$('#g');g.disabled=true;try{await fn(await llm())}catch(e){if(e.code==='not_granted')toast('Permission to consult the AI was declined');else toast(e.message||'The quest failed – try again');}busy=false;g.disabled=false}
const foc=()=>($('#foc')?.value.trim()?'\nFocus especially on: '+$('#foc').value.trim():'');
function notes(){run(async s=>{const o=$('#o');o.textContent='Scribing…';
 await s(SYS+ctx()+'\n\nWrite clear, well-structured study notes in Markdown (# headings, - bullets, **bold** key terms). Include key concepts, explanations of WHY things work, worked examples where present, and a short "Check your understanding" list of 3 self-test questions.'+foc(),{onText:({text})=>o.innerHTML=md(text),cache:false})})}
function quiz(){run(async s=>{const o=$('#o');o.textContent='Forging questions…';const n=$('#n').value;
 const qs=await s.json(SYS+ctx()+`\n\nCreate ${n} multiple-choice questions that test understanding. Reply with ONLY a JSON array: [{"q":string,"options":[4 strings],"answer":0-3 index,"why":short explanation}].`+foc(),{cache:false});
 let sc=0,dn=0;o.innerHTML='<h3 id="sc"></h3>';const sh=()=>$('#sc').textContent=`Score: ${sc} / ${qs.length}`;sh();
 qs.forEach((q,i)=>{const d=document.createElement('div');d.className='q';d.innerHTML=`<b>${i+1}. ${esc(q.q)}</b>`;const w=document.createElement('div');
  q.options.forEach((t,j)=>{const b=document.createElement('button');b.className='opt';b.textContent=t;b.onclick=()=>{if(d.dataset.done)return;d.dataset.done=1;dn++;
   [...w.children].forEach((x,k)=>{x.disabled=false;if(k===q.answer)x.classList.add('ok')});if(j===q.answer)sc++;else b.classList.add('no');
   const y=document.createElement('div');y.className='why';y.textContent=q.why||'';d.append(y);sh()};w.append(b)});d.append(w);o.append(d)})})}
function cards(){run(async s=>{const o=$('#o');o.textContent='Crafting cards…';
 const cs=await s.json(SYS+ctx()+`\n\nCreate ${$('#n').value} flashcards. Prefer "why/how" prompts over bare definitions. Reply with ONLY a JSON array: [{"front":string,"back":string}].`+foc(),{cache:false});let i=0;
 o.innerHTML='<div class="fc"><div><span></span><span></span></div></div><div class="row" style="justify-content:center"><button class="ghost" id="pv">◀</button><span id="ct" class="small"></span><button class="ghost" id="nx">▶</button><button class="ghost" id="sf">Shuffle</button></div>';
 const fc=o.querySelector('.fc'),sp=fc.querySelectorAll('span');const show=()=>{fc.classList.remove('flip');sp[0].textContent=cs[i].front;sp[1].textContent=cs[i].back;$('#ct').textContent=`${i+1} / ${cs.length}`};
 fc.onclick=()=>fc.classList.toggle('flip');$('#pv').onclick=()=>{i=(i-1+cs.length)%cs.length;show()};$('#nx').onclick=()=>{i=(i+1)%cs.length;show()};
 $('#sf').onclick=()=>{cs.sort(()=>Math.random()-.5);i=0;show()};show()})}
let hist=[];
function ask(){const q=$('#q').value.trim();if(!q)return;run(async s=>{const o=$('#o');$('#q').value='';
 const u=document.createElement('div');u.className='msg u';u.textContent=q;const a=document.createElement('div');a.className='msg';a.textContent='…';o.append(u,a);o.scrollTop=o.scrollHeight;
 const h=hist.slice(-6).map(m=>m.role+': '+m.c).join('\n');
 const r=await s(SYS+ctx()+'\n\nConversation so far:\n'+h+'\n\nAnswer the latest question, explaining the reasoning. If the sources do not cover it, say so.\nQuestion: '+q,{onText:({text})=>{a.innerHTML=md(text);o.scrollTop=o.scrollHeight},cache:false});
 hist.push({role:'Student',c:q},{role:'Tutor',c:r.text})})}
/* ---------- Timer ---------- */
let end=0,left=25*60,mode='f',iv=null,done=0;
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
const len=()=>Math.max(1,+(mode==='f'?$('#fmin'):$('#bmin')).value||1)*60;
function paint(){$('#clock').textContent=fmt(left);$('#mode').textContent=mode==='f'?'Focus':'Rest by the hearth';document.title=(iv?fmt(left)+' · ':'')+'The Scriptorium'}
function tick(){left=Math.max(0,Math.round((end-Date.now())/1000));paint();if(left<=0){clearInterval(iv);iv=null;$('#go').textContent='Begin';
 if(mode==='f'){done++;$('#cnt').textContent='Quests completed: '+done;toast('Well fought! Take thy rest.')}else toast('The road calls – back to study!');mode=mode==='f'?'b':'f';left=len();paint()}}
$('#go').onclick=()=>{if(iv){clearInterval(iv);iv=null;$('#go').textContent='Resume';paint()}else{end=Date.now()+left*1000;iv=setInterval(tick,500);$('#go').textContent='Pause'}};
$('#rs').onclick=()=>{clearInterval(iv);iv=null;mode='f';left=len();$('#go').textContent='Begin';paint()};
['fmin','bmin'].forEach(i=>$('#'+i).onchange=()=>{if(!iv){left=len();paint()}});
drawDocs();render();paint();
