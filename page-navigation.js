(() => {
  const main = document.querySelector('main.main-content');
  if (!main || main.dataset.pagesReady === 'true') return;
  main.dataset.pagesReady = 'true';

  const titles = {
    home: 'الرئيسية', subjects: 'المواد الدراسية', tasks: 'المهام',
    schedule: 'جدول اليوم', focus: 'جلسة التركيز', progress: 'تقدمي', profile: 'ملفي الشخصي'
  };
  const pages = new Map();
  for (const [key, title] of Object.entries(titles)) {
    const page = document.createElement('section');
    page.className = 'app-page';
    page.dataset.appPage = key;
    page.hidden = true;
    page.innerHTML = `<header class="page-heading"><p class="eyebrow">مساحتك الدراسية</p><h2>${title}</h2></header>`;
    main.append(page);
    pages.set(key, page);
  }

  const put = (selector, key) => {
    const element = main.querySelector(selector);
    if (element) pages.get(key).append(element);
  };
  put('header.topbar', 'home');
  put('.hero', 'home');
  put('.quick-shortcuts', 'home');
  put('#focusTimer .daily-target', 'progress');
  put('#focusTimer', 'focus');
  put('.stats-grid', 'home');
  put('#tasks', 'tasks');
  put('#subjects', 'subjects');
  put('#schedule', 'schedule');
  put('#progress', 'progress');
  put('#profile', 'profile');
  put('#profileSection', 'profile');

  // Keep the app footer on the home screen and remove now-empty layout wrappers.
  put('footer', 'home');
  const homePage = pages.get('home');
  const taskSource = main.querySelector('#taskList');
  if (taskSource) {
    const preview = document.createElement('section');
    preview.className = 'home-today card';
    preview.innerHTML = '<div class="section-heading"><div><p class="eyebrow">خطواتك القادمة</p><h2>مهام اليوم</h2></div><a class="text-button" href="#tasks" data-view="tasks">عرض الكل ‹</a></div><div class="home-task-preview"></div>';
    const previewList = preview.querySelector('.home-task-preview');
    const copyTasks = () => {
      previewList.replaceChildren(...Array.from(taskSource.querySelectorAll(':scope > .task-row')).slice(0,3).map(row => {
        const copy = row.cloneNode(true);
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        copy.querySelectorAll('button,input').forEach(node => { node.disabled = true; node.tabIndex = -1; });
        return copy;
      }));
    };
    copyTasks();
    new MutationObserver(copyTasks).observe(taskSource,{childList:true,subtree:true,characterData:true,attributes:true});
    const hero = homePage.querySelector('#heroPanel');
    if (hero) hero.after(preview); else homePage.append(preview);
  }

  const weekSource = main.querySelector('#weekDays');
  if (weekSource) {
    const week = document.createElement('section');
    week.className = 'home-week card';
    week.innerHTML = '<div class="section-heading"><div><p class="eyebrow">خطّط لأيامك</p><h2>جدولك الأسبوعي</h2></div><a class="text-button" href="#schedule" data-view="schedule">التقويم ‹</a></div><div class="home-week-days"></div>';
    const weekCopy = week.querySelector('.home-week-days');
    const copyWeek = () => weekCopy.replaceChildren(...Array.from(weekSource.children).map(day=>day.cloneNode(true)));
    copyWeek();
    new MutationObserver(copyWeek).observe(weekSource,{childList:true,subtree:true,characterData:true,attributes:true});
    const preview = homePage.querySelector('.home-today');
    (preview || homePage.querySelector('.hero') || homePage).after(week);
  }

  main.querySelectorAll('.content-grid,.bottom-grid').forEach(wrapper => {
    if (!wrapper.querySelector('#tasks,#subjects,#schedule,#progress')) wrapper.remove();
  });

  const style = document.createElement('style');
  style.textContent = `
    .app-page{width:100%;min-height:65vh;animation:page-in .18s ease-out}
    .app-page[hidden]{display:none!important}
    .page-heading{margin:2px 0 16px;padding:4px 2px}
    .page-heading h2{margin:0;color:#183a32;font-size:22px;font-weight:800}
    .app-page>#tasks,.app-page>#subjects,.app-page>#schedule,.app-page>#progress,.app-page>#profile,.app-page>#profileSection{display:block;width:100%;margin:0}
    .app-page>#tasks,.app-page>#subjects,.app-page>#schedule,.app-page>#progress,.app-page>#profile,.app-page>#profileSection{padding:20px}
    @keyframes page-in{from{opacity:.5;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
    @media(max-width:720px){.page-heading{margin:0 0 10px}.page-heading h2{font-size:18px}.app-page>#tasks,.app-page>#subjects,.app-page>#schedule,.app-page>#progress,.app-page>#profile,.app-page>#profileSection{padding:14px;border-radius:17px}}
  `;
  document.head.append(style);

  function showPage(key, addHistory = false) {
    if (!pages.has(key)) key = 'home';
    for (const [name, page] of pages) page.hidden = name !== key;
    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
      const active = link.dataset.view === key;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (addHistory && location.hash !== `#${key}`) history.pushState({page:key}, '', `#${key}`);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-view]');
    if (!link) return;
    const key = link.dataset.view;
    if (!pages.has(key)) return;
    event.preventDefault();
    showPage(key, true);
  });
  window.addEventListener('popstate', () => showPage(location.hash.slice(1) || 'home'));
  showPage(location.hash.slice(1) || 'home');
})();
