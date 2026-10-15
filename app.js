const STORAGE_KEY = 'derasaty-data-v1';
const REMINDER_KEY = 'derasaty-reminders-enabled';
const LAST_REMINDER_KEY = 'derasaty-last-reminder';
const seed = {
  subjects: [
    {id:'math', name:'الرياضيات', icon:'∑', color:'#eee8f7', detail:'تدريب وفهم'},
    {id:'arabic', name:'اللغة العربية', icon:'أ', color:'#f9eee1', detail:'قراءة وقواعد'},
    {id:'science', name:'العلوم', icon:'⚗', color:'#e7f1eb', detail:'اكتشاف وتجربة'},
    {id:'english', name:'اللغة الإنجليزية', icon:'A', color:'#e8eef7', detail:'كلمات ومحادثة'}
  ],
  tasks: [
    {id:'t1', name:'حل تدريبات درس الكسور', subject:'math', time:'16:00', done:false},
    {id:'t2', name:'قراءة قصة قصيرة', subject:'arabic', time:'17:00', done:false},
    {id:'t3', name:'مراجعة الجهاز الهضمي', subject:'science', time:'18:00', done:false}
  ],
  sessions: [
    {id:'s1', time:'04:00 م', title:'تدريبات الرياضيات', duration:40, subject:'math'},
    {id:'s2', time:'05:00 م', title:'قراءة اللغة العربية', duration:30, subject:'arabic'},
    {id:'s3', time:'06:00 م', title:'مراجعة العلوم', duration:35, subject:'science'}
  ],
  week: {},
  profile: {name:'طالب دراستي', stage:'', school:''}
};
let data;
try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(seed); }
catch { data = structuredClone(seed); }
const cloudConfig = window.DARASTY_SUPABASE || {};
const cloudReady = Boolean(cloudConfig.url && cloudConfig.publishableKey && window.supabase?.createClient);
const cloud = cloudReady ? window.supabase.createClient(cloudConfig.url, cloudConfig.publishableKey) : null;
let currentUser = null;
let cloudTimer;
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const subjectFor = id => data.subjects.find(subject => subject.id === id);
const dayKey = date => { const d = new Date(date); d.setHours(0,0,0,0); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); render(); scheduleCloudSave(); }
function renderProfile(){
  data.profile=data.profile||{name:'طالب دراستي',stage:'',school:''};
  const name=(data.profile.name||'طالب دراستي').trim()||'طالب دراستي';
  const initial=[...name.trim()][0]||'ط';
  $('#sidebarAvatar').textContent=initial;
  $('#sidebarProfileName').textContent=name;
  $('#sidebarProfileMeta').textContent=data.profile.stage||'أضف مرحلتك الدراسية';
  $('#profileAvatar').textContent=initial;
  $('#profileDisplayName').textContent=name;
  $('#heroGreeting').textContent='مرحبًا يا '+name+' 👋';
  $('#profileIntro').textContent=data.profile.stage?`رحلتك في ${data.profile.stage} تبدأ بخطوة كل يوم.`:'خصص ملفك الدراسي لتتابع رحلتك التعليمية.';
  $('#profileStageDisplay').textContent=data.profile.stage||'لم تُحدد بعد';
  $('#profileSchoolDisplay').textContent=data.profile.school||'لم تُضف بعد';
  $('#profileSyncNote').textContent=currentUser?'ملفك محفوظ مع حسابك ويظهر على أجهزتك بعد تسجيل الدخول.':cloudReady?'ملفك محفوظ على هذا الجهاز؛ سجّل الدخول لمزامنته مع أجهزتك.':'ملفك محفوظ على هذا الجهاز فقط.';
}
function render() {
  const pending = data.tasks.filter(task => !task.done).length;
  const totalMinutes = data.sessions.reduce((sum, session) => sum + Number(session.duration || 0), 0);
  const pct = data.tasks.length ? Math.round(data.tasks.filter(task => task.done).length / data.tasks.length * 100) : 0;
  $('#subjectCount').textContent = data.subjects.length;
  $('#remainingCount').textContent = pending;
  $('#studyTime').innerHTML = `${totalMinutes} <em>د</em>`;
  $('#weeklyProgress').innerHTML = `${pct}<em>%</em>`;
  $('#progressValue').textContent = `${pct}%`;
  $('#progressBar').style.width = `${pct}%`;
  $('#progressCaption').textContent = pct === 100 ? 'رائع! أنجزت كل مهامك. استمر بهذا التألق! 🎉' : pct ? 'أحسنت! واصل التقدم، أنت قريب من هدفك.' : 'كل مهمة تنجزها تقرّبك من هدفك.';
  const taskList = $('#taskList'); taskList.replaceChildren();
  data.tasks.forEach(task => {
    const subject = subjectFor(task.subject);
    const row = document.createElement('div'); row.className = `task-row${task.done?' done':''}`;
    row.innerHTML = `<input class="check-task" type="checkbox" aria-label="إنجاز ${escapeHtml(task.name)}" ${task.done?'checked':''}><div class="task-copy"><strong>${escapeHtml(task.name)}</strong><small>${subject?escapeHtml(subject.name):'بدون مادة'}</small></div><span class="task-time">${escapeHtml(task.time||'')}</span><button class="delete-task" aria-label="حذف المهمة">×</button>`;
    row.querySelector('input').addEventListener('change', e => { task.done=e.target.checked; const key=dayKey(new Date()); data.week[key]=Math.max(0,(data.week[key]||0)+(task.done?1:-1)); save(); });
    row.querySelector('.delete-task').addEventListener('click', () => { data.tasks=data.tasks.filter(item=>item.id!==task.id); save(); }); taskList.append(row);
  });
  $('#emptyTasks').hidden = data.tasks.length > 0;
  const schedule = $('#scheduleList'); schedule.replaceChildren();
  data.sessions.slice().sort((a,b)=>a.time.localeCompare(b.time)).forEach(session=>{
    const subject=subjectFor(session.subject); const row=document.createElement('div'); row.className='schedule-row';
    row.innerHTML=`<span class="schedule-time">${escapeHtml(session.time)}</span><span class="schedule-dot"></span><div class="schedule-copy"><strong>${escapeHtml(session.title)}</strong><small>${escapeHtml(String(session.duration))} دقيقة${subject?' · '+escapeHtml(subject.name):''}</small></div>`; schedule.append(row);
  });
  const subjects=$('#subjectList'); subjects.replaceChildren();
  data.subjects.forEach(subject=>{const card=document.createElement('div');card.className='subject-card';card.innerHTML=`<span class="subject-mark" style="background:${escapeHtml(subject.color)}">${escapeHtml(subject.icon)}</span><div><strong>${escapeHtml(subject.name)}</strong><small>${escapeHtml(subject.detail||'مادة دراسية')}</small></div><button class="subject-remove" aria-label="حذف ${escapeHtml(subject.name)}">×</button>`;card.querySelector('button').addEventListener('click',()=>{data.subjects=data.subjects.filter(s=>s.id!==subject.id);data.tasks.forEach(t=>{if(t.subject===subject.id)t.subject='';});data.sessions.forEach(s=>{if(s.subject===subject.id)s.subject='';});save();});subjects.append(card);});
  const currentMonday = new Date(); currentMonday.setDate(currentMonday.getDate()-((currentMonday.getDay()+6)%7));
  const dayNames=['ن','ث','ر','خ','ج','س','ح']; const week=$('#weekDays'); week.replaceChildren();
  dayNames.forEach((name,index)=>{const date=new Date(currentMonday);date.setDate(currentMonday.getDate()+index);const el=document.createElement('div');el.className=`week-day${date.toDateString()===new Date().toDateString()?' today':''}`;el.innerHTML=`${name}<i>${data.week[dayKey(date)]||0}</i>`;week.append(el);});
  const today=new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long'}).format(new Date()); $('#todayLabel').textContent=today;
  renderProfile();
}

const dialog=$('#formDialog'); let mode='task';
function openForm(nextMode){mode=nextMode;$('#entryForm').reset();$('#entryTime').value='16:00';$('#entryDuration').value=30;
  const labels={task:['مهمة جديدة','أضف مهمة','اسم المهمة','المادة'],subject:['مادة جديدة','أضف مادة','اسم المادة','وصف قصير'],session:['جلسة جديدة','أضف جلسة دراسة','عنوان الجلسة','المادة']};
  const copy=labels[mode]; $('#formEyebrow').textContent=copy[0];$('#formTitle').textContent=copy[1];$('#nameLabel').firstChild.textContent=copy[2];$('#detailLabel').firstChild.textContent=copy[3];
  $('#detailLabel').hidden=mode==='subject';$('#timeLabel').hidden=mode!=='session';$('#durationLabel').hidden=mode!=='session';
  const select=$('#entrySubject');select.replaceChildren();const empty=new Option('اختر مادة (اختياري)','');select.add(empty);data.subjects.forEach(s=>select.add(new Option(s.name,s.id)));
  dialog.showModal();$('#entryName').focus();
}
$('#entryForm').addEventListener('submit',event=>{event.preventDefault();const name=$('#entryName').value.trim();if(!name)return;
  if(mode==='task') data.tasks.push({id:crypto.randomUUID(),name,subject:$('#entrySubject').value,time:'',done:false});
  if(mode==='subject') data.subjects.push({id:crypto.randomUUID(),name,icon:'✦',color:['#eee8f7','#f9eee1','#e7f1eb','#e8eef7'][data.subjects.length%4],detail:'مادة دراسية'});
  if(mode==='session'){const raw=$('#entryTime').value;const [h,m]=raw.split(':').map(Number);const suffix=h>=12?'م':'ص';const hour=((h+11)%12)+1;data.sessions.push({id:crypto.randomUUID(),name,time:`${String(hour).padStart(2,'0')}:${String(m).padStart(2,'0')} ${suffix}`,title:name,duration:$('#entryDuration').value,subject:$('#entrySubject').value});}
  dialog.close();save();showToast('تمت الإضافة بنجاح ✨');
});
$('#addTask').addEventListener('click',()=>openForm('task'));$('#quickAdd').addEventListener('click',()=>openForm('task'));$('#addSubject').addEventListener('click',()=>openForm('subject'));$('#addSession').addEventListener('click',()=>openForm('session'));
$('#navQuickAdd').addEventListener('click',()=>openForm('task'));
document.querySelectorAll('[data-view]').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav-link').forEach(item=>item.classList.toggle('active',item.dataset.view===link.dataset.view));}));
let toastTimer;function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);}

function setAuthMessage(message, isError=false){const el=$('#authMessage');el.textContent=message;el.classList.toggle('error',isError);}
function updateAccountUi(){
  $('#accountButtonText').textContent=currentUser ? (currentUser.email || 'حسابي') : 'تسجيل الدخول والمزامنة';
  $('#signOutButton').hidden=!currentUser;
  renderProfile();
  $('#syncStatus').textContent=!cloudReady ? 'المزامنة تحتاج إعداد Supabase مرة واحدة.' : currentUser ? 'الحساب متصل. تتم مزامنة التغييرات تلقائيًا.' : 'سجّل الدخول بنفس الحساب على أجهزتك لمزامنة بياناتك.';
}
async function loadCloudData(){
  if(!cloud||!currentUser)return;
  $('#syncStatus').textContent='جارٍ تحميل بيانات حسابك…';
  const {data:row,error}=await cloud.from('user_data').select('data').eq('user_id',currentUser.id).maybeSingle();
  if(error){$('#syncStatus').textContent='تعذّر تحميل المزامنة. راجع إعداد قاعدة البيانات.';return;}
  if(row?.data){data={...structuredClone(seed),...row.data};localStorage.setItem(STORAGE_KEY,JSON.stringify(data));render();$('#syncStatus').textContent='تم تحميل بياناتك ومزامنتها.';}
  else await syncNow();
}
function scheduleCloudSave(){if(!cloud||!currentUser)return;clearTimeout(cloudTimer);cloudTimer=setTimeout(syncNow,650);}
async function syncNow(){
  if(!cloud||!currentUser)return;
  $('#syncStatus').textContent='جارٍ حفظ التغييرات…';
  const {error}=await cloud.from('user_data').upsert({user_id:currentUser.id,data,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  $('#syncStatus').textContent=error?'تعذّر الحفظ على السحابة. بياناتك محفوظة على هذا الجهاز.':'تمت المزامنة الآن.';
}
async function initializeAccount(){
  updateAccountUi();
  if(!cloud)return;
  const {data:sessionData}=await cloud.auth.getSession();
  currentUser=sessionData.session?.user||null;updateAccountUi();
  if(currentUser)loadCloudData();
  cloud.auth.onAuthStateChange((event,session)=>{
    const nextUser=session?.user||null;
    if(nextUser?.id!==currentUser?.id){currentUser=nextUser;updateAccountUi();if(currentUser)loadCloudData();}
  });
}
function openProfileDialog(){
  data.profile=data.profile||{name:'طالب دراستي',stage:'',school:''};
  $('#profileNameInput').value=data.profile.name||'';
  $('#profileStageInput').value=data.profile.stage||'';
  $('#profileSchoolInput').value=data.profile.school||'';
  $('#profileDialog').showModal();
}
$('#profileButton').addEventListener('click',openProfileDialog);
$('#editProfileButton').addEventListener('click',openProfileDialog);
$('#cancelProfileButton').addEventListener('click',()=>$('#profileDialog').close());
$('#profileForm').addEventListener('submit',event=>{
  event.preventDefault();
  data.profile={name:$('#profileNameInput').value.trim(),stage:$('#profileStageInput').value.trim(),school:$('#profileSchoolInput').value.trim()};
  $('#profileDialog').close();
  save();
  showToast('تم حفظ ملفك الشخصي ✨');
});
$('#accountButton').addEventListener('click',()=>{$('#accountDialog').showModal();setAuthMessage('');});
async function accountAction(kind){
  if(!cloud){setAuthMessage('إعداد قاعدة المزامنة لم يكتمل بعد. اتبع خطوات ملف الإعداد المرفق.',true);return;}
  const email=$('#accountEmail').value.trim(),password=$('#accountPassword').value;
  if(!email||password.length<6){setAuthMessage('اكتب بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل.',true);return;}
  setAuthMessage(kind==='signup'?'جارٍ إنشاء الحساب…':'جارٍ تسجيل الدخول…');
  const redirectUrl=new URL('./',window.location.href).href;
  const result=kind==='signup'?await cloud.auth.signUp({email,password,options:{emailRedirectTo:redirectUrl}}):await cloud.auth.signInWithPassword({email,password});
  if(result.error){setAuthMessage(result.error.message==='Invalid login credentials'?'البريد أو كلمة المرور غير صحيحة.':result.error.message,true);return;}
  if(kind==='signup'&&!result.data.session){setAuthMessage('تم إنشاء الحساب. افتح رسالة التأكيد التي وصلتك إلى بريدك، ثم سجّل الدخول.');return;}
  setAuthMessage('تم تسجيل الدخول. جارٍ مزامنة بياناتك…');
}
$('#signInButton').addEventListener('click',()=>accountAction('signin'));
$('#signUpButton').addEventListener('click',()=>accountAction('signup'));
const resendButton=document.createElement('button');
resendButton.type='button';
resendButton.className='text-button';
resendButton.textContent='إعادة إرسال رسالة التأكيد';
resendButton.addEventListener('click',async()=>{
  if(!cloud){setAuthMessage('إعداد قاعدة المزامنة لم يكتمل بعد.',true);return;}
  const email=$('#accountEmail').value.trim();
  if(!email){setAuthMessage('اكتب بريدك الإلكتروني أولًا.',true);return;}
  setAuthMessage('جارٍ إرسال رسالة التأكيد…');
  const redirectUrl=new URL('./',window.location.href).href;
  const {error}=await cloud.auth.resend({type:'signup',email,options:{emailRedirectTo:redirectUrl}});
  if(error){setAuthMessage(error.message,true);return;}
  setAuthMessage('طلبنا إرسال رسالة جديدة. افحص الوارد ومجلد الرسائل غير المرغوب فيها.');
});
$('#signUpButton').parentElement.after(resendButton);
$('#signOutButton').addEventListener('click',async()=>{if(cloud){await cloud.auth.signOut();currentUser=null;updateAccountUi();setAuthMessage('تم تسجيل الخروج. بيانات هذا الجهاز باقية محفوظة محليًا.');}});

function parseSessionTime(value){const match=String(value||'').match(/^(\d{1,2}):(\d{2})\s*(ص|م)?$/);if(!match)return null;let hour=Number(match[1])%12;if(match[3]==='م')hour+=12;return {hour,minute:Number(match[2])};}
const notificationWorkerReady=('serviceWorker'in navigator)?navigator.serviceWorker.register('./service-worker.js').then(()=>navigator.serviceWorker.ready).catch(()=>null):Promise.resolve(null);
function checkStudyReminders(){
  if(localStorage.getItem(REMINDER_KEY)!=='true'||Notification.permission!=='granted')return;
  const now=new Date(),today=dayKey(now);
  for(const session of data.sessions){const time=parseSessionTime(session.time);if(!time||time.hour!==now.getHours()||time.minute!==now.getMinutes())continue;
    const token=`${today}:${session.id}`;if(localStorage.getItem(LAST_REMINDER_KEY)===token)continue;
    localStorage.setItem(LAST_REMINDER_KEY,token);
    notificationWorkerReady.then(registration=>{if(registration)registration.showNotification('موعد المذاكرة — دراستي',{body:session.title,icon:'./darasty-192.png',badge:'./darasty-192.png',tag:token});else if('Notification'in window)new Notification('موعد المذاكرة — دراستي',{body:session.title,icon:'./darasty-192.png'});});
  }
}
$('#reminderButton').addEventListener('click',async()=>{
  if(!('Notification'in window)){showToast('المتصفح لا يدعم تنبيهات المواقع');return;}
  if(localStorage.getItem(REMINDER_KEY)==='true'){localStorage.setItem(REMINDER_KEY,'false');$('#reminderButton').innerHTML='🔔 <span>تفعيل التنبيهات</span>';showToast('تم إيقاف التنبيهات');return;}
  const permission=await Notification.requestPermission();
  if(permission==='granted'){localStorage.setItem(REMINDER_KEY,'true');$('#reminderButton').innerHTML='🔕 <span>إيقاف التنبيهات</span>';showToast('ستصلك التنبيهات أثناء فتح الموقع');checkStudyReminders();}
  else showToast('اسمح بالإشعارات من إعدادات المتصفح');
});
if(localStorage.getItem(REMINDER_KEY)==='true'&&'Notification'in window&&Notification.permission==='granted')$('#reminderButton').innerHTML='🔕 <span>إيقاف التنبيهات</span>';
setInterval(checkStudyReminders,30000);
initializeAccount();
render();
