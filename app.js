const STORAGE_KEY = 'derasaty-data-v1';
const REMINDER_KEY = 'derasaty-reminders-enabled';
const LAST_REMINDER_KEY = 'derasaty-last-reminder';
const TASK_EMOJIS = ['📚','✏️','📝','🧮','🔬','🌍','🎓','⭐'];
const seed = {
  subjects: [
    {id:'math', name:'الرياضيات', icon:'∑', color:'#eee8f7', detail:'تدريب وفهم'},
    {id:'arabic', name:'اللغة العربية', icon:'أ', color:'#f9eee1', detail:'قراءة وقواعد'},
    {id:'science', name:'العلوم', icon:'⚗', color:'#e7f1eb', detail:'اكتشاف وتجربة'},
    {id:'english', name:'اللغة الإنجليزية', icon:'A', color:'#e8eef7', detail:'كلمات ومحادثة'}
  ],
  tasks: [
    {id:'t1', name:'حل تدريبات درس الكسور', subject:'math', time:'16:00', done:false, emoji:'🧮'},
    {id:'t2', name:'قراءة قصة قصيرة', subject:'arabic', time:'17:00', done:false, emoji:'📚'},
    {id:'t3', name:'مراجعة الجهاز الهضمي', subject:'science', time:'18:00', done:false, emoji:'🔬'}
  ],
  sessions: [
    {id:'s1', time:'04:00 م', title:'تدريبات الرياضيات', duration:40, subject:'math'},
    {id:'s2', time:'05:00 م', title:'قراءة اللغة العربية', duration:30, subject:'arabic'},
    {id:'s3', time:'06:00 م', title:'مراجعة العلوم', duration:35, subject:'science'}
  ],
  week: {},
  profile: {name:'طالب دراستي', stage:'', school:''}
};
const cloneData = value => JSON.parse(JSON.stringify(value));
const makeId = () => (window.crypto && typeof window.crypto['randomUUID'] === 'function') ? window.crypto['randomUUID']() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let data;
try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || cloneData(seed); }
catch { data = cloneData(seed); }
data.focusLog = Array.isArray(data.focusLog) ? data.focusLog : [];
data.week = data.week && typeof data.week === 'object' ? data.week : {};
data.dailyGoalMinutes = Number(data.dailyGoalMinutes) || 60;
data.subjects.forEach(subject => { subject.lessons = Array.isArray(subject.lessons) ? subject.lessons : []; subject.flashcards = Array.isArray(subject.flashcards) ? subject.flashcards : []; });
const cloudConfig = window.DARASTY_SUPABASE || {};
let cloudReady = false;
let cloud = null;
function initializeCloudClient(){
  cloudReady=Boolean(cloudConfig.url&&cloudConfig.publishableKey&&window.supabase?.createClient);
  cloud=cloudReady?window.supabase.createClient(cloudConfig.url,cloudConfig.publishableKey):null;
  return cloudReady;
}
initializeCloudClient();
let currentUser = null;
let cloudTimer;
const $ = (selector) => document.querySelector(selector);
const HERO_SCENE_KEY = 'derasaty-hero-scene-v1';
function chooseHeroScene() {
  const previous = Number(localStorage.getItem(HERO_SCENE_KEY));
  const options = [0, 1, 2, 3].filter(scene => scene !== previous);
  const scene = options[Math.floor(Math.random() * options.length)];
  $('#heroArt').dataset.scene = String(scene);
  $('#heroPanel').dataset.scene = String(scene);
  $('#heroPanel').style.backgroundImage=`linear-gradient(270deg,#183a32bf 0%,#183a3270 53%,#183a3220 100%),url('./study-scene-${scene+1}.svg')`;
  $('#heroPanel').style.backgroundPosition='center';
  $('#heroPanel').style.backgroundSize='cover';
  localStorage.setItem(HERO_SCENE_KEY, String(scene));
}
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const subjectFor = id => data.subjects.find(subject => subject.id === id);
const dayKey = date => { const d = new Date(date); d.setHours(0,0,0,0); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); render(); scheduleCloudSave(); }
let activeLessonSubjectId = null;
let focusTimerId = null;
let focusSecondsLeft = 25 * 60;
let focusMode = 'study';

function renderLessonList() {
  const subject = data.subjects.find(item => item.id === activeLessonSubjectId);
  const list = $('#lessonList');
  const empty = $('#emptyLessons');
  if (!subject || !list || !empty) return;
  subject.lessons = Array.isArray(subject.lessons) ? subject.lessons : [];
  $('#lessonSubjectName').textContent = subject.name;
  list.replaceChildren();
  empty.hidden = subject.lessons.length > 0;
  subject.lessons.forEach(lesson => {
    const row = document.createElement('div');
    row.className = `lesson-row${lesson.done ? ' done' : ''}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(lesson.done);
    checkbox.setAttribute('aria-label', `إتمام ${lesson.name}`);
    const name = document.createElement('span');
    name.className = 'lesson-name';
    name.textContent = lesson.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'lesson-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `حذف ${lesson.name}`);
    checkbox.addEventListener('change', () => {
      lesson.done = checkbox.checked;
      save();
      renderLessonList();
    });
    remove.addEventListener('click', () => {
      subject.lessons = subject.lessons.filter(item => item.id !== lesson.id);
      save();
      renderLessonList();
    });
    row.append(checkbox, name, remove);
    list.append(row);
  });
}

function openLessonManager(subjectId) {
  activeLessonSubjectId = subjectId;
  renderLessonList();
  $('#lessonDialog').showModal();
}

function showTaskMotivation(task) {
  const messages = [
    'أحسنت! كل خطوة صغيرة تقرّبك من هدفك 🌟',
    'إنجاز رائع! استمر، أنت قادر على المزيد 💪',
    'ممتاز! مهمة خلصت وخطوة جديدة للأمام 🎉',
    'برافو عليك! تعبك اليوم يصنع نجاحك بكرة 📚',
    'فخورين بإنجازك! خذ نفسًا وواصل طريقك ✨'
  ];
  playSuccessChime();
  $('#motivationTaskName').textContent = task.name;
  $('#motivationMessage').textContent = messages[Math.floor(Math.random() * messages.length)];
  $('#motivationDialog').showModal();
}

let activeFlashcardSubjectId = null;

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.28, ctx.currentTime);
    master.connect(ctx.destination);
    [
      { frequency: 659.25, delay: 0, length: 0.75 },
      { frequency: 830.61, delay: 0.20, length: 0.85 },
      { frequency: 987.77, delay: 0.40, length: 0.95 },
      { frequency: 1318.51, delay: 0.62, length: 1.15 }
    ].forEach(note => {
      const start = ctx.currentTime + note.delay;
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(note.frequency, start);
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + note.length);
      oscillator.connect(volume);
      volume.connect(master);
      oscillator.start(start);
      oscillator.stop(start + note.length + 0.03);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1900);
  } catch {}
}

function currentStudyStreak() {
  const activeDays = new Set();
  Object.entries(data.week || {}).forEach(([day, count]) => { if (Number(count) > 0) activeDays.add(day); });
  (data.focusLog || []).forEach(entry => { if (entry.finishedAt) activeDays.add(dayKey(new Date(entry.finishedAt))); });
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  if (!activeDays.has(dayKey(cursor))) return 0;
  let streak = 0;
  while (activeDays.has(dayKey(cursor)) && streak < 3650) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function updateDailyGoalUi() {
  const targetInput = $('#dailyGoalInput');
  if (!targetInput) return;
  const target = Math.max(15, Math.min(600, Number(data.dailyGoalMinutes) || 60));
  data.dailyGoalMinutes = target;
  if (document.activeElement !== targetInput) targetInput.value = target;
  const today = dayKey(new Date());
  const minutes = (data.focusLog || []).filter(entry => entry.finishedAt && dayKey(new Date(entry.finishedAt)) === today)
    .reduce((sum, entry) => sum + Number(entry.minutes || 25), 0);
  $('#dailyGoalMinutes').textContent = minutes;
  $('#dailyGoalTarget').textContent = target;
  $('#dailyGoalBar').style.width = `${Math.min(100, Math.round(minutes / target * 100))}%`;
  $('#dailyGoalMessage').textContent = minutes >= target ? 'حققت هدفك اليوم! ممتاز 🎉' : `باقي ${target - minutes} دقيقة على هدفك.`;
  const streak = currentStudyStreak();
  $('#studyStreak').textContent = streak >= 7 ? `🔥 ${streak} أيام متتالية · بطل الأسبوع!` : `🔥 سلسلة إنجازك: ${streak} يوم`;
}

function renderFlashcardList() {
  const subject = data.subjects.find(item => item.id === activeFlashcardSubjectId);
  const list = $('#flashcardList');
  const empty = $('#emptyFlashcards');
  if (!subject || !list || !empty) return;
  subject.flashcards = Array.isArray(subject.flashcards) ? subject.flashcards : [];
  $('#flashcardSubjectName').textContent = subject.name;
  list.replaceChildren();
  empty.hidden = subject.flashcards.length > 0;
  subject.flashcards.forEach(card => {
    const item = document.createElement('article');
    item.className = 'flashcard-item';
    const question = document.createElement('strong');
    question.className = 'flashcard-question';
    question.textContent = card.question;
    const answer = document.createElement('p');
    answer.className = 'flashcard-answer';
    answer.textContent = card.answer;
    answer.hidden = true;
    const actions = document.createElement('div');
    actions.className = 'flashcard-actions';
    const reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'outline-button flashcard-reveal';
    reveal.textContent = 'اظهر الإجابة';
    reveal.addEventListener('click', () => {
      answer.hidden = !answer.hidden;
      reveal.textContent = answer.hidden ? 'اظهر الإجابة' : 'اخفِ الإجابة';
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'lesson-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'حذف البطاقة');
    remove.addEventListener('click', () => {
      subject.flashcards = subject.flashcards.filter(entry => entry.id !== card.id);
      save();
      renderFlashcardList();
    });
    actions.append(reveal, remove);
    item.append(question, answer, actions);
    list.append(item);
  });
}

function openFlashcards(subjectId) {
  activeFlashcardSubjectId = subjectId;
  renderFlashcardList();
  $('#flashcardDialog').showModal();
}

function updateFocusUi() {
  const clock = $('#focusClock');
  if (!clock) return;
  const minutes = Math.floor(focusSecondsLeft / 60);
  const seconds = focusSecondsLeft % 60;
  clock.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  $('#focusModeLabel').textContent = focusMode === 'study' ? 'وقت المذاكرة' : 'وقت الراحة';
  const logs = data.focusLog || [];
  const total = logs.reduce((sum, entry) => sum + Number(entry.minutes || 25), 0);
  $('#focusStats').textContent = `أنجزت ${logs.length} جلسة تركيز · ${total} دقيقة`;
  updateDailyGoalUi();
}

function finishFocusPhase() {
  clearInterval(focusTimerId);
  focusTimerId = null;
  if (focusMode === 'study') {
    data.focusLog.push({
      id: makeId(),
      minutes: 25,
      subject: $('#focusSubject').value,
      task: $('#focusTask').value,
      finishedAt: new Date().toISOString()
    });
    save();
    showToast('أحسنت! انتهت جلسة التركيز. خذ راحة 5 دقائق ☕');
    focusMode = 'break';
    focusSecondsLeft = 5 * 60;
    $('#focusStart').textContent = 'ابدأ الراحة';
  } else {
    showToast('انتهت الراحة. جاهز لجلسة مذاكرة جديدة؟ 📚');
    focusMode = 'study';
    focusSecondsLeft = 25 * 60;
    $('#focusStart').textContent = 'ابدأ المذاكرة';
  }
  updateFocusUi();
}

function updateFocusOptions() {
  const subjectSelect = $('#focusSubject');
  const taskSelect = $('#focusTask');
  if (!subjectSelect || !taskSelect) return;
  const previousSubject = subjectSelect.value;
  const previousTask = taskSelect.value;
  subjectSelect.replaceChildren(new Option('اختر المادة (اختياري)', ''));
  data.subjects.forEach(subject => subjectSelect.add(new Option(subject.name, subject.id)));
  if (data.subjects.some(subject => subject.id === previousSubject)) subjectSelect.value = previousSubject;
  taskSelect.replaceChildren(new Option('اختر المهمة (اختياري)', ''));
  data.tasks.filter(task => !task.done).forEach(task => taskSelect.add(new Option(task.name, task.id)));
  if (data.tasks.some(task => task.id === previousTask && !task.done)) taskSelect.value = previousTask;
}

function ensureFeatureUi() {
  const hero = $('#heroPanel');
  if (hero && !$('#focusTimer')) {
    const timer = document.createElement('section');
    timer.id = 'focusTimer';
    timer.className = 'focus-timer card';
    timer.innerHTML = `<div class="focus-intro"><p class="eyebrow">ركّز خطوة بخطوة</p><h2>مؤقّت المذاكرة</h2><p>25 دقيقة تركيز ثم 5 دقائق راحة</p><label>المادة<select id="focusSubject"></select></label><label>المهمة<select id="focusTask"></select></label></div><div class="focus-clock-area"><span id="focusModeLabel">وقت المذاكرة</span><strong id="focusClock">25:00</strong><div class="focus-buttons"><button id="focusStart" type="button">ابدأ المذاكرة</button><button id="focusReset" type="button">إعادة</button></div><small id="focusStats">أنجزت 0 جلسة · 0 دقيقة</small></div><section class="daily-target"><div class="daily-target-heading"><div><p class="eyebrow">هدفي اليوم</p><strong><span id="dailyGoalMinutes">0</span> / <span id="dailyGoalTarget">60</span> دقيقة</strong></div><label>الهدف بالدقائق<input id="dailyGoalInput" type="number" min="15" max="600" step="15" value="60"></label></div><div class="daily-target-bar"><span id="dailyGoalBar"></span></div><div class="daily-target-foot"><span id="dailyGoalMessage"></span><strong id="studyStreak">🔥 سلسلة إنجازك: 0 يوم</strong></div></section>`;
    hero.after(timer);
  }
  if (!$('#lessonDialog')) {
    const dialog = document.createElement('dialog');
    dialog.id = 'lessonDialog';
    dialog.className = 'feature-dialog';
    dialog.innerHTML = `<div class="dialog-header"><div><p class="eyebrow">دروس المادة</p><h2 id="lessonSubjectName"></h2></div><button class="close-button" id="closeLessons" type="button" aria-label="إغلاق">×</button></div><form id="lessonForm"><label>اسم الدرس<input id="lessonNameInput" maxlength="100" required placeholder="اكتب اسم الدرس"></label><button class="button button-primary" type="submit">＋ أضف الدرس</button></form><p id="emptyLessons" class="empty-state">اكتب أسماء دروس المادة هنا، ثم علّم على الدرس بعد الانتهاء منه.</p><div id="lessonList" class="lesson-list"></div>`;
    document.body.append(dialog);
  }
  if (!$('#flashcardDialog')) {
    const dialog = document.createElement('dialog');
    dialog.id = 'flashcardDialog';
    dialog.className = 'feature-dialog';
    dialog.innerHTML = `<div class="dialog-header"><div><p class="eyebrow">بطاقات مراجعة</p><h2 id="flashcardSubjectName"></h2></div><button class="close-button" id="closeFlashcards" type="button" aria-label="إغلاق">×</button></div><form id="flashcardForm"><label>السؤال<textarea id="flashcardQuestion" rows="2" maxlength="300" required placeholder="اكتب سؤالًا للمراجعة"></textarea></label><label>الإجابة<textarea id="flashcardAnswer" rows="2" maxlength="500" required placeholder="اكتب الإجابة"></textarea></label><button class="button button-primary" type="submit">＋ أضف بطاقة</button></form><p id="emptyFlashcards" class="empty-state">أضف سؤالًا وإجابته، ثم اختبر ذاكرتك بإخفاء الإجابة.</p><div id="flashcardList" class="flashcard-list"></div>`;
    document.body.append(dialog);
  }
  if (!$('#motivationDialog')) {
    const dialog = document.createElement('dialog');
    dialog.id = 'motivationDialog';
    dialog.className = 'feature-dialog motivation-dialog';
    dialog.innerHTML = `<button class="close-button motivation-close" id="closeMotivation" type="button" aria-label="إغلاق">×</button><div class="motivation-emoji">🎉</div><p class="eyebrow">إنجاز جديد</p><h2 id="motivationTaskName"></h2><p id="motivationMessage"></p>`;
    document.body.append(dialog);
  }
  $('#closeLessons').addEventListener('click', () => $('#lessonDialog').close());
  $('#closeFlashcards').addEventListener('click', () => $('#flashcardDialog').close());
  $('#flashcardForm').addEventListener('submit', event => {
    event.preventDefault();
    const subject = data.subjects.find(item => item.id === activeFlashcardSubjectId);
    const question = $('#flashcardQuestion').value.trim();
    const answer = $('#flashcardAnswer').value.trim();
    if (!subject || !question || !answer) return;
    subject.flashcards = Array.isArray(subject.flashcards) ? subject.flashcards : [];
    subject.flashcards.push({ id: makeId(), question, answer });
    $('#flashcardQuestion').value = '';
    $('#flashcardAnswer').value = '';
    save();
    renderFlashcardList();
    showToast('تمت إضافة بطاقة المراجعة 📚');
  });
  $('#dailyGoalInput').addEventListener('change', () => {
    data.dailyGoalMinutes = Math.max(15, Math.min(600, Number($('#dailyGoalInput').value) || 60));
    save();
    updateDailyGoalUi();
  });
  $('#closeMotivation').addEventListener('click', () => $('#motivationDialog').close());
  $('#lessonForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#lessonNameInput').value.trim();
    const subject = data.subjects.find(item => item.id === activeLessonSubjectId);
    if (!name || !subject) return;
    subject.lessons = Array.isArray(subject.lessons) ? subject.lessons : [];
    subject.lessons.push({ id: makeId(), name, done: false });
    $('#lessonNameInput').value = '';
    save();
    renderLessonList();
    showToast('تمت إضافة الدرس للمادة 📚');
  });
  $('#focusStart').addEventListener('click', () => {
    if (focusTimerId) {
      clearInterval(focusTimerId);
      focusTimerId = null;
      $('#focusStart').textContent = 'متابعة';
      return;
    }
    $('#focusStart').textContent = 'إيقاف مؤقت';
    focusTimerId = setInterval(() => {
      focusSecondsLeft -= 1;
      if (focusSecondsLeft <= 0) { focusSecondsLeft = 0; updateFocusUi(); finishFocusPhase(); }
      else updateFocusUi();
    }, 1000);
  });
  $('#focusReset').addEventListener('click', () => {
    clearInterval(focusTimerId);
    focusTimerId = null;
    focusMode = 'study';
    focusSecondsLeft = 25 * 60;
    $('#focusStart').textContent = 'ابدأ المذاكرة';
    updateFocusUi();
  });
  updateFocusOptions();
  updateFocusUi();
}
function renderProfile(){
  data.profile=data.profile||{name:'طالب دراستي',stage:'',school:''};
  const name=(data.profile.name||'طالب دراستي').trim()||'طالب دراستي';
  const initial=[...name.trim()][0]||'ط';
  const avatarData=data.profile.avatarData||'';
  $('#sidebarAvatar').innerHTML=avatarData?`<img src="${avatarData}" alt="صورة ${escapeHtml(name)}">`:escapeHtml(initial);
  $('#sidebarProfileName').textContent=name;
  $('#sidebarProfileMeta').textContent=data.profile.stage||'أضف مرحلتك الدراسية';
  $('#profileAvatar').innerHTML=avatarData?`<img src="${avatarData}" alt="صورة ${escapeHtml(name)}">`:escapeHtml(initial);
  $('#profileDisplayName').textContent=name;
  $('#heroGreeting').textContent='مرحبًا يا '+name+' 👋';
  $('#profileIntro').textContent=data.profile.stage?`رحلتك في ${data.profile.stage} تبدأ بخطوة كل يوم.`:'خصص ملفك الدراسي لتتابع رحلتك التعليمية.';
  $('#profileStageDisplay').textContent=data.profile.stage||'لم تُحدد بعد';
  $('#profileSchoolDisplay').textContent=data.profile.school||'لم تُضف بعد';
  $('#profileSyncNote').textContent=currentUser?'ملفك محفوظ مع حسابك ويظهر على أجهزتك بعد تسجيل الدخول.':cloudReady?'ملفك محفوظ على هذا الجهاز؛ سجّل الدخول لمزامنته مع أجهزتك.':'ملفك محفوظ على هذا الجهاز فقط.';
  $('#welcomeTitle').textContent=`مرحبًا بك يا ${name} في دراستي`;
}
function render() {
  data.subjects.forEach(subject => { subject.lessons = Array.isArray(subject.lessons) ? subject.lessons : []; });
  data.focusLog = Array.isArray(data.focusLog) ? data.focusLog : [];
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
    row.innerHTML = `<input class="check-task" type="checkbox" aria-label="إنجاز ${escapeHtml(task.name)}" ${task.done?'checked':''}><div class="task-copy"><button class="task-emoji" type="button" aria-label="تغيير رمز المهمة">${escapeHtml(task.emoji||'📚')}</button><strong>${escapeHtml(task.name)}</strong><small>${subject?escapeHtml(subject.name):'بدون مادة'}</small></div><span class="task-time">${escapeHtml(task.time||'')}</span><button class="delete-task" aria-label="حذف المهمة">×</button>`;
    const emojiNames={'📚':'كتاب','✏️':'كتابة','📝':'واجب','🧮':'رياضيات','🔬':'علوم','🌍':'لغة','🎓':'مذاكرة','⭐':'أخرى'};
    const emojiSelect=document.createElement('select');
    emojiSelect.className='task-emoji-select';
    emojiSelect.setAttribute('aria-label','رمز المهمة: '+task.name);
    TASK_EMOJIS.forEach(emoji=>emojiSelect.add(new Option(emoji+' '+emojiNames[emoji],emoji, false, emoji===(task.emoji||'📚'))));
    row.querySelector('.delete-task').before(emojiSelect);
    emojiSelect.addEventListener('change',()=>{task.emoji=emojiSelect.value;save();});
    row.querySelector('.task-emoji').addEventListener('click', () => { const index=TASK_EMOJIS.indexOf(task.emoji||'📚'); task.emoji=TASK_EMOJIS[(index+1)%TASK_EMOJIS.length]; save(); });
    row.querySelector('input').addEventListener('change', e => { task.done=e.target.checked; const key=dayKey(new Date()); data.week[key]=Math.max(0,(data.week[key]||0)+(task.done?1:-1)); save(); if(task.done)showTaskMotivation(task); });
    row.querySelector('.delete-task').addEventListener('click', () => { data.tasks=data.tasks.filter(item=>item.id!==task.id); save(); }); taskList.append(row);
  });
  $('#emptyTasks').hidden = data.tasks.length > 0;
  const schedule = $('#scheduleList'); schedule.replaceChildren();
  data.sessions.slice().sort((a,b)=>a.time.localeCompare(b.time)).forEach(session=>{
    const subject=subjectFor(session.subject); const row=document.createElement('div'); row.className='schedule-row';
    row.innerHTML=`<span class="schedule-time">${escapeHtml(session.time)}</span><span class="schedule-dot"></span><div class="schedule-copy"><strong>${escapeHtml(session.title)}</strong><small>${escapeHtml(String(session.duration))} دقيقة${subject?' · '+escapeHtml(subject.name):''}</small></div>`; schedule.append(row);
  });
  const subjects=$('#subjectList'); subjects.replaceChildren();
  data.subjects.forEach(subject=>{
    const lessons=Array.isArray(subject.lessons)?subject.lessons:[];
    const flashcards=Array.isArray(subject.flashcards)?subject.flashcards:[];
    const completed=lessons.filter(lesson=>lesson.done).length;
    const card=document.createElement('div');
    card.className='subject-card';
    card.innerHTML=`<span class="subject-mark" style="background:${escapeHtml(subject.color)}">${escapeHtml(subject.icon)}</span><div class="subject-copy"><strong>${escapeHtml(subject.name)}</strong><small>${escapeHtml(subject.detail||'مادة دراسية')}</small><small class="subject-lesson-count">الدروس: ${completed}/${lessons.length}</small></div><button class="subject-cards" type="button">بطاقات (${flashcards.length})</button><button class="subject-lessons" type="button">الدروس</button><button class="subject-remove" aria-label="حذف ${escapeHtml(subject.name)}">×</button>`;
    card.querySelector('.subject-cards').addEventListener('click',()=>openFlashcards(subject.id));
    card.querySelector('.subject-lessons').addEventListener('click',()=>openLessonManager(subject.id));
    card.querySelector('.subject-remove').addEventListener('click',()=>{data.subjects=data.subjects.filter(s=>s.id!==subject.id);data.tasks.forEach(t=>{if(t.subject===subject.id)t.subject='';});data.sessions.forEach(s=>{if(s.subject===subject.id)s.subject='';});save();});
    subjects.append(card);
  });
  const currentMonday = new Date(); currentMonday.setDate(currentMonday.getDate()-((currentMonday.getDay()+6)%7));
  const dayNames=['ن','ث','ر','خ','ج','س','ح']; const week=$('#weekDays'); week.replaceChildren();
  dayNames.forEach((name,index)=>{const date=new Date(currentMonday);date.setDate(currentMonday.getDate()+index);const el=document.createElement('div');el.className=`week-day${date.toDateString()===new Date().toDateString()?' today':''}`;el.innerHTML=`${name}<i>${data.week[dayKey(date)]||0}</i>`;week.append(el);});
  const today=new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long'}).format(new Date()); $('#todayLabel').textContent=today;
  updateFocusOptions();
  updateFocusUi();
  renderProfile();
}

const dialog=$('#formDialog'); let mode='task';
const taskEmojiLabel=document.createElement('label');
taskEmojiLabel.id='taskEmojiLabel';
taskEmojiLabel.textContent='اختار رمز المهمة';
const taskEmojiSelect=document.createElement('select');
taskEmojiSelect.id='taskEmojiSelect';
[['📚','كتاب'],['✏️','قلم'],['📝','واجب'],['🧮','رياضيات'],['🔬','علوم'],['🌍','لغة'],['🎓','مذاكرة'],['⭐','أخرى']].forEach(([emoji,name])=>taskEmojiSelect.add(new Option(`${emoji} ${name}`,emoji)));
taskEmojiLabel.append(taskEmojiSelect);
$('#entryForm').insertBefore(taskEmojiLabel,$('#detailLabel'));
function openForm(nextMode){mode=nextMode;$('#entryForm').reset();$('#entryTime').value='16:00';$('#entryDuration').value=30;
  const labels={task:['مهمة جديدة','أضف مهمة','اسم المهمة','المادة'],subject:['مادة جديدة','أضف مادة','اسم المادة','وصف قصير'],session:['جلسة جديدة','أضف جلسة دراسة','عنوان الجلسة','المادة']};
  const copy=labels[mode]; $('#formEyebrow').textContent=copy[0];$('#formTitle').textContent=copy[1];$('#nameLabel').firstChild.textContent=copy[2];$('#detailLabel').firstChild.textContent=copy[3];
  taskEmojiLabel.hidden=mode!=='task';taskEmojiSelect.value='📚';
  $('#detailLabel').hidden=mode==='subject';$('#timeLabel').hidden=mode!=='session';$('#durationLabel').hidden=mode!=='session';
  const select=$('#entrySubject');select.replaceChildren();const empty=new Option('اختر مادة (اختياري)','');select.add(empty);data.subjects.forEach(s=>select.add(new Option(s.name,s.id)));
  dialog.showModal();$('#entryName').focus();
}
$('#entryForm').addEventListener('submit',event=>{event.preventDefault();const name=$('#entryName').value.trim();if(!name)return;
  if(mode==='task') data.tasks.push({id:makeId(),name,subject:$('#entrySubject').value,time:'',done:false,emoji:taskEmojiSelect.value||'📚'});
  if(mode==='subject') data.subjects.push({id:makeId(),name,icon:'✦',color:['#eee8f7','#f9eee1','#e7f1eb','#e8eef7'][data.subjects.length%4],detail:'مادة دراسية'});
  if(mode==='session'){const raw=$('#entryTime').value;const [h,m]=raw.split(':').map(Number);const suffix=h>=12?'م':'ص';const hour=((h+11)%12)+1;data.sessions.push({id:makeId(),name,time:`${String(hour).padStart(2,'0')}:${String(m).padStart(2,'0')} ${suffix}`,title:name,duration:$('#entryDuration').value,subject:$('#entrySubject').value});}
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
  if(row?.data){data={...cloneData(seed),...row.data};localStorage.setItem(STORAGE_KEY,JSON.stringify(data));render();$('#syncStatus').textContent='تم تحميل بياناتك ومزامنتها.';}
  else { data.profile=cloneData(seed.profile); render(); await syncNow(); }
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
  if(!cloud){
    window.addEventListener('derasaty-supabase-ready',()=>{if(initializeCloudClient())initializeAccount();},{once:true});
    return;
  }
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
  $('#profileImageInput').value='';
  $('#avatarFileHint').textContent=data.profile.avatarData?'الصورة الحالية محفوظة':'اختر صورة من جهازك';
  pendingAvatarData=undefined;
  showProfileImagePreview(data.profile.avatarData||'');
  $('#profileDialog').showModal();
}
let pendingAvatarData;
function showProfileImagePreview(imageData){
  const preview=$('#profileImagePreview');
  if(imageData){preview.innerHTML=`<img src="${imageData}" alt="معاينة صورة الملف الشخصي">`;return;}
  const name=$('#profileNameInput').value.trim()||'طالب دراستي';
  preview.textContent=[...name][0]||'ط';
}
async function resizeAvatarImage(file){
  let image;
  if('createImageBitmap'in window) image=await createImageBitmap(file);
  else image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('read'));reader.onload=()=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('image'));img.src=reader.result;};reader.readAsDataURL(file);});
  const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
  const scale=Math.min(256/width,256/height),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  const context=canvas.getContext('2d');if(!context)throw new Error('canvas');
  context.drawImage(image,0,0,canvas.width,canvas.height);image.close?.();
  return canvas.toDataURL('image/jpeg',.78);
}
$('#profileImageInput').addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  if(!file.type.startsWith('image/')){showToast('اختر ملف صورة');event.target.value='';return;}
  try{
    pendingAvatarData=await resizeAvatarImage(file);
    showProfileImagePreview(pendingAvatarData);
    $('#avatarFileHint').textContent='تم اختيار الصورة';
  }catch{showToast('تعذّر فتح الصورة. جرّب صورة بصيغة JPG أو PNG.');}
});
$('#removeProfileImage').addEventListener('click',()=>{pendingAvatarData='';$('#profileImageInput').value='';$('#avatarFileHint').textContent='ستظهر الحروف الأولى من اسمك';showProfileImagePreview('');});
$('#profileButton').addEventListener('click',openProfileDialog);
$('#closeWelcome').addEventListener('click',()=>$('#welcomeDialog').close());
$('#editProfileButton').addEventListener('click',openProfileDialog);
$('#cancelProfileButton').addEventListener('click',()=>$('#profileDialog').close());
$('#profileForm').addEventListener('submit',event=>{
  event.preventDefault();
  data.profile={name:$('#profileNameInput').value.trim(),stage:$('#profileStageInput').value.trim(),school:$('#profileSchoolInput').value.trim(),avatarData:pendingAvatarData===undefined?(data.profile.avatarData||''):pendingAvatarData};
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
ensureFeatureUi();
initializeAccount();
render();
chooseHeroScene();
$('#welcomeDialog').showModal();
setTimeout(()=>{const dialog=$('#welcomeDialog');if(dialog?.open)dialog.close();},8000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')chooseHeroScene();});
