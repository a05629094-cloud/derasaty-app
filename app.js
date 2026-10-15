const STORAGE_KEY = 'derasaty-data-v1';
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
  week: {}
};
let data;
try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(seed); }
catch { data = structuredClone(seed); }
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const subjectFor = id => data.subjects.find(subject => subject.id === id);
const dayKey = date => { const d = new Date(date); d.setHours(0,0,0,0); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); render(); }
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
document.querySelectorAll('[data-view]').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav-link').forEach(item=>item.classList.toggle('active',item.dataset.view===link.dataset.view));}));
let toastTimer;function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);}
render();
