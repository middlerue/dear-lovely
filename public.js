(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const cfg = window.DEAR_LOVELY_CONFIG || {};
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.SUPABASE_URL || '') &&
  !!cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes('YOUR_') && !!window.supabase?.createClient;
let sb, filter = 'All', letters = [], openedId = null, toastTimer;
if (configured) sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
function toast(s) { const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),4600); }
function goto(where) { const el = $(where); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
document.querySelectorAll('[data-nav],[data-goto]').forEach(b=>b.addEventListener('click',()=>goto(b.dataset.nav || b.dataset.goto)));
function toggleEnvelope() {
 const env=$('heroEnvelope'), opened=env.classList.toggle('env-open');
 env.setAttribute('aria-pressed',String(opened));$('envelopeHint').textContent=opened?'TAP AGAIN TO CLOSE ♡':'TAP THE ENVELOPE TO OPEN ♡';
}
$('heroEnvelope').addEventListener('click',toggleEnvelope);
$('heroEnvelope').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleEnvelope();}});
function renderLetters(){
 const list=letters.filter(l=>filter==='All'||l.category===filter);
 $('lettersGrid').innerHTML=list.length ? list.map(l=>`<button type="button" class="letter-card" data-open="${esc(l.id)}" aria-label="Open letter: ${esc(l.subject)}"><span class="card-subject">Subject: ${esc(l.category)}</span><span class="mini-flap"></span><span class="card-wax">L</span><span class="lace-paper"><span class="card-kicker">FROM ${esc(l.nickname)} · ${esc(l.category)}</span><div class="card-title">${esc(l.subject)}</div><span class="card-sig">read this letter ♡</span></span></button>`).join('') : '<div class="empty">No published letters here yet. Your words might be the first ♡</div>';
 $('lettersGrid').querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{if(b.classList.contains('opening'))return;b.classList.add('opening');setTimeout(()=>openLetter(b.dataset.open),530);}));
}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderLetters();}));
async function loadLetters(){
 if(!sb) { $('lettersGrid').innerHTML='<div class="empty">The letterbox is being prepared ♡</div>';return; }
 const {data,error}=await sb.from('letters').select('id,nickname,subject,message,category,reply,published_at').eq('status','published').order('published_at',{ascending:false}).limit(100);
 if(error){ $('lettersGrid').innerHTML='<div class="empty">The letterbox is unavailable right now. Please try again later.</div>'; console.error('Public letters load failed:',error.message);return; }
 letters=data||[];renderLetters();
}
async function openLetter(id){
 const l=letters.find(x=>x.id===id);if(!l)return;
 openedId=id;
 $('letterModal').innerHTML=`<div class="modal-script">Dear Lovely ♡</div><div class="modal-subject">${esc(l.subject)}</div><div class="meta">${esc(l.category)} · LETTER FROM ${esc(l.nickname)}</div><div class="letter-body">${esc(l.message)}</div><div class="sign">— ${esc(l.nickname)}</div><div class="reply-box"><h4>Lovely's Reply ♡</h4><p>${esc(l.reply)}</p><div class="sign">— Lovely ♡</div></div><div class="comments"><h4>Little notes from other hearts ♡</h4><div id="commentsArea"><p class="muted">Opening the comments… ♡</p></div><form class="commentform" id="commentForm"><div class="field"><label for="commentNick">Your nickname (optional)</label><input id="commentNick" maxlength="40" placeholder="a kind reader"></div><div class="field"><label for="commentText">Leave a kind thought *</label><textarea id="commentText" maxlength="900" minlength="3" required placeholder="Your note to this heart..."></textarea></div><button class="btn burgundy small" type="submit">Submit comment for review ♡</button><p class="smallnote">Only approved comments are published. Please don't include names or personal details.</p></form></div>`;
 $('letterOverlay').classList.add('show');$('letterOverlay').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';$('closeModal').focus();
 $('commentForm').addEventListener('submit',submitComment);
 const {data,error}=await sb.from('comments').select('id,nickname,message,created_at').eq('letter_id',id).eq('approved',true).order('created_at',{ascending:true}).limit(100);
 if(openedId!==id)return;
 $('commentsArea').innerHTML=error?'<p class="muted">Comments are unavailable right now.</p>' : data?.length ? data.map(c=>`<div class="comment"><div class="name">${esc(c.nickname)}</div><p>${esc(c.message)}</p></div>`).join('') : '<p class="muted">Be the first to leave a thoughtful comment.</p>';
}
function closeLetter(){ $('letterOverlay').classList.remove('show');$('letterOverlay').setAttribute('aria-hidden','true');document.body.style.overflow='';openedId=null;document.querySelectorAll('.letter-card').forEach(c=>c.classList.remove('opening')); }
$('closeModal').addEventListener('click',closeLetter);
$('letterOverlay').addEventListener('click',e=>{if(e.target===$('letterOverlay'))closeLetter();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openedId)closeLetter();});
async function submitComment(e){
 e.preventDefault();if(!sb)return;
 const btn=e.target.querySelector('[type=submit]'),text=$('commentText').value.trim(),nickname=$('commentNick').value.trim()||'anonymous reader',id=openedId;
 if(text.length<3||text.length>900||nickname.length>40)return toast('Please check your comment.');
 btn.disabled=true;
 try{
   const {error}=await sb.from('comments').insert({letter_id:id,nickname,message:text,approved:false});
   if(error) throw error;
   e.target.reset();toast('Your comment was received! It will appear if Lovely approves it. ♡');
 }catch(err){console.error(err);toast('Could not send your comment. Please try again later.');}finally{btn.disabled=false;}
}
$('letterForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!sb)return toast('The letterbox is not connected yet.');
 const btn=e.target.querySelector('[type=submit]'),subject=$('subject').value.trim(),message=$('message').value.trim(),nickname=$('nickname').value.trim()||'Anonymous';
 if(subject.length<3||subject.length>110||message.length<12||message.length>4500||nickname.length>45||!$('letterConsent').checked) return toast('Please complete the letter and consent checkbox.');
 btn.disabled=true;
 try{
   const {error}=await sb.from('letters').insert({subject,message,nickname,category:$('category').value,status:'pending'});
   if(error)throw error;
   e.target.reset();toast('Letter sealed! Your message is in Lovely’s review inbox. ♡');goto('home');
 }catch(err){console.error(err);toast('Your letter could not be sent. Please try again later.');}finally{btn.disabled=false;}
});
if(!configured){$('setupNotice').classList.add('show');$('setupNotice').textContent='Website setup is in progress. Letter submissions are not yet available.';$('letterForm').querySelector('[type=submit]').disabled=true;}
loadLetters();
})();
