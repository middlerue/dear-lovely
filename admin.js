(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg=window.DEAR_LOVELY_CONFIG||{};
const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.SUPABASE_URL||'') && !!cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes('YOUR_') && !!window.supabase?.createClient;
const sb=configured?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY):null;
let activeAdmin=false,letters=[],comments=[],toastTimer;
function toast(s){const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),4700);}
function showLogin(error=''){activeAdmin=false;$('dashboard').classList.remove('show');$('startingStatus').hidden=true;$('loginView').hidden=false;$('loginError').textContent=error;}
function showDashboard(email){activeAdmin=true;$('loginView').hidden=true;$('startingStatus').hidden=true;$('dashboard').classList.add('show');$('adminIdentity').textContent='Signed in as '+email;}
async function verifyUser(){
 if(!sb)return showLogin('Supabase is not configured yet. Please complete the setup guide.');
 const {data:{user},error}=await sb.auth.getUser();
 if(error || !user) return showLogin();
 const {data,error:roleError}=await sb.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError || !data){await sb.auth.signOut();return showLogin('This account is not authorized for Lovely’s private inbox.');}
 showDashboard(user.email||'Lovely');await loadAdmin();
}
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!sb)return showLogin('Website setup is incomplete.');
 const btn=$('loginButton');btn.disabled=true;$('loginError').textContent='Signing in…';
 const {error}=await sb.auth.signInWithPassword({email:$('adminEmail').value.trim(),password:$('adminPassword').value});
 $('adminPassword').value='';btn.disabled=false;
 if(error)return showLogin('Could not sign in. Check your email and password.');
 await verifyUser();
});
$('logoutButton').addEventListener('click',async ()=>{await sb.auth.signOut();letters=[];comments=[];showLogin();});
async function loadAdmin(){
 if(!activeAdmin)return;
 const [lr,cr]=await Promise.all([
   sb.from('letters').select('id,subject,nickname,category,message,reply,status,created_at,published_at').order('created_at',{ascending:false}).limit(300),
   sb.from('comments').select('id,letter_id,nickname,message,approved,created_at').order('created_at',{ascending:false}).limit(300)
 ]);
 if(lr.error || cr.error){toast('Could not load the inbox. Check database permissions.');console.error(lr.error||cr.error);return;}
 letters=lr.data||[];comments=cr.data||[];renderAdmin();
}
function renderAdmin(){
 const pending=letters.filter(l=>l.status==='pending'),published=letters.filter(l=>l.status==='published'),unapproved=comments.filter(c=>!c.approved);
 $('pendingCount').textContent=`(${pending.length})`;$('commentCount').textContent=`(${unapproved.length})`;$('publishedCount').textContent=`(${published.length})`;
 $('pendingList').innerHTML=pending.length?pending.map(l=>`<div class="inboxitem"><div class="subj">${esc(l.subject)}</div><div class="smallnote">From ${esc(l.nickname)} · ${esc(l.category)}</div><p class="letter-preview">${esc(l.message)}</p><label class="smallnote" for="reply-${esc(l.id)}">Your reply (you can also edit the letter to remove identifying details before publishing)</label><textarea class="replyinput" id="reply-${esc(l.id)}" maxlength="8000" placeholder="Sweetheart, ..."></textarea><details><summary class="admin-muted">Edit letter before publishing</summary><div class="field"><label for="editSubject-${esc(l.id)}">Subject</label><input id="editSubject-${esc(l.id)}" maxlength="110" value="${esc(l.subject)}"></div><div class="field"><label for="editMessage-${esc(l.id)}">Letter (remove names, locations, etc.)</label><textarea id="editMessage-${esc(l.id)}" maxlength="4500" minlength="12">${esc(l.message)}</textarea></div></details><div class="adminbuttons"><button type="button" data-publish="${esc(l.id)}">Publish with my reply ♡</button><button type="button" class="remove" data-delete-letter="${esc(l.id)}">Decline & Delete</button></div></div>`).join(''):'<p class="admin-muted">Your inbox is all caught up. ♡</p>';
 $('pendingComments').innerHTML=unapproved.length?unapproved.map(c=>{const l=letters.find(x=>x.id===c.letter_id);return `<div class="inboxitem"><div class="subj">Comment on: ${esc(l?.subject||'Deleted letter')}</div><div class="smallnote">From ${esc(c.nickname)}</div><p class="letter-preview">${esc(c.message)}</p><div class="adminbuttons"><button type="button" data-approve="${esc(c.id)}">Approve</button><button type="button" class="remove" data-delete-comment="${esc(c.id)}">Reject & Delete</button></div></div>`;}).join(''):'<p class="admin-muted">No comments need your review right now.</p>';
 $('publishedAdminList').innerHTML=published.length?published.map(l=>`<div class="inboxitem"><div class="subj">${esc(l.subject)} <span class="status-pill">PUBLIC</span></div><div class="smallnote">${esc(l.category)} · ${esc(l.nickname)}</div><p class="letter-preview">${esc(l.message)}</p><label class="smallnote" for="publishedReply-${esc(l.id)}">Your public reply</label><textarea class="replyinput" id="publishedReply-${esc(l.id)}" maxlength="8000">${esc(l.reply)}</textarea><div class="adminbuttons"><button type="button" data-save-reply="${esc(l.id)}">Save reply edit</button><button type="button" class="remove" data-delete-letter="${esc(l.id)}">Delete public letter</button></div></div>`).join(''):'<p class="admin-muted">No published letters yet.</p>';
 $('pendingList').querySelectorAll('[data-publish]').forEach(b=>b.addEventListener('click',async ()=>{
   const id=b.dataset.publish,old=letters.find(l=>l.id===id),reply=$('reply-'+id).value.trim(),subject=$('editSubject-'+id).value.trim(),message=$('editMessage-'+id).value.trim();
   if(!old||reply.length<8||reply.length>8000||subject.length<3||subject.length>110||message.length<12||message.length>4500)return toast('Check the subject, letter and your reply before publishing.');
   if(!confirm('Publish this letter and reply for EVERY visitor to read?'))return;
   await action(b,()=>sb.from('letters').update({subject,message,reply,status:'published',published_at:new Date().toISOString()}).eq('id',id),'Letter published ♡');
 }));
 document.querySelectorAll('[data-delete-letter]').forEach(b=>b.addEventListener('click',async ()=>{
   if(!confirm('Permanently delete this letter and all of its comments?'))return;
   await action(b,()=>sb.from('letters').delete().eq('id',b.dataset.deleteLetter),'Letter deleted');
 }));
 document.querySelectorAll('[data-approve]').forEach(b=>b.addEventListener('click',()=>action(b,()=>sb.from('comments').update({approved:true}).eq('id',b.dataset.approve),'Comment approved ♡')));
 document.querySelectorAll('[data-delete-comment]').forEach(b=>b.addEventListener('click',()=>action(b,()=>sb.from('comments').delete().eq('id',b.dataset.deleteComment),'Comment deleted')));
 document.querySelectorAll('[data-save-reply]').forEach(b=>b.addEventListener('click',async ()=>{
   const id=b.dataset.saveReply,reply=$('publishedReply-'+id).value.trim();if(reply.length<8||reply.length>8000)return toast('Your reply must have at least 8 characters.');
   await action(b,()=>sb.from('letters').update({reply}).eq('id',id),'Public reply updated ♡');
 }));
}
async function action(btn,fn,success){if(!activeAdmin)return;btn.disabled=true;try{const {error}=await fn();if(error)throw error;toast(success);await loadAdmin();}catch(e){console.error(e);toast('Action failed. Please try again.');}finally{btn.disabled=false;}}
verifyUser();
})();
