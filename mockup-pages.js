(()=> {
  const splash=document.getElementById('launchSplash');
  const welcome=document.getElementById('welcomeDialog');
  if(welcome?.open) welcome.close();
  const start=document.getElementById('launchStart');
  start?.addEventListener('click',()=>{
    splash?.classList.add('launch-splash-hide');
    if(welcome) welcome.showModal();
  });
  document.getElementById('topbarProfileButton')?.addEventListener('click',()=>document.querySelector('[data-view="profile"]')?.click());
  document.querySelectorAll('.page-heading-avatar').forEach(button=>button.addEventListener('click',()=>document.querySelector('[data-view="profile"]')?.click()));
  const avatar=document.getElementById('topbarAvatar'), source=document.getElementById('sidebarAvatar');
  if(avatar&&source){
    const copyAvatar=()=>{
      avatar.innerHTML=source.innerHTML;
      document.querySelectorAll('.page-heading-avatar span').forEach(target=>target.innerHTML=source.innerHTML);
    };
    copyAvatar();
    new MutationObserver(copyAvatar).observe(source,{childList:true,subtree:true,characterData:true});
  }

  const heroTitle=document.querySelector('#heroPanel h2');
  if(heroTitle)heroTitle.textContent='أهلًا يا '+(document.getElementById('profileDisplayName')?.textContent||'صديقي')+'، يوم جديد!';
  const stats=document.querySelector('.app-page[data-app-page="home"] .stats-grid');
  if(stats&&!document.getElementById('homeStreakStat')){
    const streak=document.createElement('article');
    streak.className='stat-card card reference-streak';
    streak.id='homeStreakStat';
    streak.innerHTML='<span class="stat-icon orange">🔥</span><div><span>سلسلة الالتزام</span><strong id="homeStreakValue">٠ أيام</strong></div><small>أيام متتالية</small>';
    stats.append(streak);
  }
  const syncStreak=()=>{
    const fromTimer=document.getElementById('studyStreak')?.textContent?.trim();
    const value=document.getElementById('homeStreakValue');
    if(value&&fromTimer)value.textContent=fromTimer;
  };
  syncStreak();
  const target=document.querySelector('.app-page[data-app-page="home"] .daily-target');
  if(target&&!target.querySelector('.daily-target-encouragement')){
    const encouragement=document.createElement('div');
    encouragement.className='daily-target-encouragement';
    encouragement.innerHTML='<span>🌟</span><div><strong>أنت ماشي كويس!</strong><small>كل دقيقة تقرّبك من هدفك.</small></div>';
    target.append(encouragement);
  }

  const schedule=document.getElementById('schedule');
  if(schedule){
    const calendar=document.createElement('section');
    calendar.className='planner-calendar card';
    calendar.innerHTML='<div class="calendar-head"><button type="button" class="calendar-arrow" aria-label="الأسبوع السابق">‹</button><h3 class="calendar-month"></h3><button type="button" class="calendar-arrow" aria-label="الأسبوع التالي">›</button></div><div class="calendar-weekdays"></div><div class="calendar-days"></div>';
    schedule.before(calendar);
    let shown=new Date();shown.setHours(0,0,0,0);
    const weekdayNames=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    const heading=calendar.querySelector('.calendar-month'),weekdayRow=calendar.querySelector('.calendar-weekdays'),days=calendar.querySelector('.calendar-days');
    weekdayRow.innerHTML=weekdayNames.map(name=>'<span>'+name+'</span>').join('');
    const renderWeek=()=>{
      heading.textContent=new Intl.DateTimeFormat('ar-EG',{weekday:'long',month:'long',year:'numeric'}).format(shown);
      days.replaceChildren();
      const start=new Date(shown);start.setDate(start.getDate()-start.getDay());
      for(let i=0;i<7;i++){
        const date=new Date(start);date.setDate(start.getDate()+i);
        const button=document.createElement('button');button.type='button';button.className='calendar-day';
        button.innerHTML='<small>'+weekdayNames[date.getDay()]+'</small><b>'+new Intl.NumberFormat('ar-EG').format(date.getDate())+'</b>';
        if(date.toDateString()===shown.toDateString())button.classList.add('calendar-selected');
        if(date.toDateString()===new Date().toDateString())button.classList.add('calendar-today');
        button.addEventListener('click',()=>{shown=date;renderWeek();});
        days.append(button);
      }
    };
    const arrows=calendar.querySelectorAll('.calendar-arrow');
    arrows[0].addEventListener('click',()=>{shown=new Date(shown);shown.setDate(shown.getDate()-7);renderWeek();});
    arrows[1].addEventListener('click',()=>{shown=new Date(shown);shown.setDate(shown.getDate()+7);renderWeek();});
    renderWeek();
  }

  const subjectList=document.getElementById('subjectList');
  if(subjectList){
    const subjectColors=['#211a35','#477cda','#b96570','#4b8068','#a47ab4'];
    const addMeters=()=>{
      subjectList.querySelectorAll('.subject-card').forEach((card,index)=>{
        const subject=data.subjects?.[index];
        const copy=card.querySelector('.subject-copy');
        const count=card.querySelector('.subject-lesson-count')?.textContent||'';
        const match=count.match(/(\d+)\s*\/\s*(\d+)/);
        const done=match?Number(match[1]):0,total=match?Number(match[2]):0,pct=total?Math.round(done/total*100):0;
        let wrap=card.querySelector('.subject-progress');
        if(!wrap){wrap=document.createElement('div');wrap.className='subject-progress';card.append(wrap);}
        wrap.setAttribute('aria-label','تقدم الدروس '+pct+'%');
        wrap.innerHTML='<span style="width:'+pct+'%;background:'+subjectColors[index%subjectColors.length]+'"></span>';
        if(subject){
          const button=card.querySelector('.subject-lessons');
          if(button)button.textContent='＋ أضف درسًا';
          const flashcards=card.querySelector('.subject-cards');
          if(flashcards)flashcards.setAttribute('aria-label','بطاقات مراجعة '+subject.name);
        }
      });
    };
    addMeters();
    new MutationObserver(addMeters).observe(subjectList,{childList:true,subtree:true});
  }

  // Add the reference's task status chips while leaving task records in app.js intact.
  const taskSection=document.getElementById('tasks');
  const taskList=document.getElementById('taskList');
  if(taskSection&&taskList){
    const filters=document.createElement('div');
    filters.className='task-filters';
    filters.setAttribute('aria-label','تصفية المهام');
    filters.innerHTML='<button type="button" class="task-filter active" data-filter="all">الكل</button><button type="button" class="task-filter" data-filter="open">قيد الدراسة</button><button type="button" class="task-filter" data-filter="done">مكتملة</button><button type="button" class="task-filter task-filter-add" data-filter-add>＋ أضف مهمة</button>';
    taskList.before(filters);
    let filterMode='all';
    const applyTaskFilter=()=>{
      taskList.querySelectorAll(':scope > .task-row').forEach(row=>{
        const isDone=row.classList.contains('done');
        row.classList.toggle('task-filter-hidden',filterMode==='done'&&!isDone||filterMode==='open'&&isDone);
      });
    };
    filters.addEventListener('click',event=>{
      if(event.target.closest('[data-filter-add]')){document.getElementById('addTask')?.click();return;}
      const button=event.target.closest('[data-filter]');
      if(!button)return;
      filterMode=button.dataset.filter;
      filters.querySelectorAll('.task-filter').forEach(item=>item.classList.toggle('active',item===button));
      applyTaskFilter();
    });
    new MutationObserver(applyTaskFilter).observe(taskList,{childList:true,subtree:true});
    applyTaskFilter();
  }

  // Show each student's lesson checklist directly inside its subject card.
  const decorateLessons=()=>{
    try{
      const list=document.getElementById('subjectList');
      if(!list||!Array.isArray(data.subjects))return;
      [...list.querySelectorAll(':scope > .subject-card')].forEach((card,index)=>{
        const subject=data.subjects[index];
        if(!subject)return;
        const lessons=Array.isArray(subject.lessons)?subject.lessons:[];
        if(card.dataset.inlineLessonCount===String(lessons.length)&&card.querySelector('.inline-subject-lessons'))return;
        card.querySelector('.inline-subject-lessons')?.remove();
        const wrap=document.createElement('div');
        wrap.className='inline-subject-lessons';
        wrap.dataset.inlineLessonCount=String(lessons.length);
        if(!lessons.length){
          const note=document.createElement('span');
          note.className='inline-subject-empty';
          note.textContent='اكتب أسماء دروس المادة، وعلّم على كل درس بعد الانتهاء.';
          wrap.append(note);
        }else lessons.forEach((lesson,lessonIndex)=>{
          const row=document.createElement('label');
          row.className='inline-subject-lesson';
          const check=document.createElement('input');
          check.type='checkbox';check.checked=Boolean(lesson.done);
          check.setAttribute('aria-label','إنجاز '+lesson.name);
          const name=document.createElement('span');name.textContent=lesson.name;
          const status=document.createElement('small');status.textContent=lesson.done?'مكتمل':'لم يكتمل';
          check.addEventListener('change',()=>{
            const current=data.subjects.find(item=>item.id===subject.id);
            if(!current||!current.lessons?.[lessonIndex])return;
            current.lessons[lessonIndex].done=check.checked;
            save();
          });
          row.append(check,name,status);wrap.append(row);
        });
        const buttons=card.querySelector('.subject-cards,.subject-lessons,.subject-remove');
        card.insertBefore(wrap,buttons||null);
        card.dataset.inlineLessonCount=String(lessons.length);
      });
    }catch(error){console.warn('تعذر عرض قائمة الدروس داخل المواد',error);}
  };

  // Build the progress and review-card page using the user's actual saved data.
  const progressRoot=document.getElementById('progress');
  if(progressRoot&&!progressRoot.querySelector('.reference-progress-summary')){
    const summary=document.createElement('div');
    summary.className='reference-progress-summary';
    summary.innerHTML='<article><small>هدف اليوم</small><strong id="referenceGoalPercent">٠٪</strong></article><article><small>سلسلة الالتزام 🔥</small><strong id="referenceStreakCount">٠ أيام</strong></article><article><small>مهام مكتملة هذا الأسبوع</small><strong id="referenceDoneCount">٠ مهام</strong></article>';
    const columns=document.createElement('div');
    columns.className='reference-progress-columns';
    columns.innerHTML='<section class="reference-subject-progress"><h3>تقدم المواد</h3><div class="reference-subject-bars"></div></section><section class="reference-review-card"><h3>بطاقات المراجعة</h3><p class="reference-review-note">راجع معلومة بسرعة قبل ما تبدأ مذاكرتك.</p><div class="reference-flash"><small class="reference-flash-count"></small><strong class="reference-flash-question"></strong><p class="reference-flash-answer" hidden></p><div><button type="button" class="reference-flash-reveal">إظهار الإجابة</button><button type="button" class="reference-flash-next">التالي ←</button></div></div></section>';
    progressRoot.append(summary,columns);
    const refreshProgress=()=>{
      const tasks=Array.isArray(data.tasks)?data.tasks:[];
      const completed=tasks.filter(task=>task.done).length;
      const minutes=(data.focusLog||[]).reduce((sum,entry)=>sum+Number(entry.minutes||25),0);
      const goal=Math.max(15,Number(data.dailyGoalMinutes)||60);
      const pct=Math.min(100,Math.round(minutes/goal*100));
      progressRoot.querySelector('#referenceGoalPercent').textContent=new Intl.NumberFormat('ar-EG').format(pct)+'٪';
      progressRoot.querySelector('#referenceStreakCount').textContent=document.getElementById('studyStreak')?.textContent?.trim()||'٠ أيام';
      progressRoot.querySelector('#referenceDoneCount').textContent=new Intl.NumberFormat('ar-EG').format(completed)+' مهام';
      const barRoot=progressRoot.querySelector('.reference-subject-bars');
      barRoot.replaceChildren();
      const colors=['#211a35','#477cda','#b96570','#4b8068','#a47ab4'];
      (data.subjects||[]).forEach((subject,index)=>{
        const lessons=Array.isArray(subject.lessons)?subject.lessons:[];
        const done=lessons.filter(lesson=>lesson.done).length;
        const row=document.createElement('div');row.className='reference-subject-bar';
        const top=document.createElement('div');top.className='reference-subject-bar-label';
        const name=document.createElement('strong');name.textContent=subject.name;
        const count=document.createElement('span');count.textContent=new Intl.NumberFormat('ar-EG').format(done)+' / '+new Intl.NumberFormat('ar-EG').format(lessons.length)+' دروس';
        const track=document.createElement('div');track.className='reference-subject-track';
        const fill=document.createElement('i');fill.style.width=(lessons.length?Math.round(done/lessons.length*100):0)+'%';fill.style.background=colors[index%colors.length];
        top.append(name,count);track.append(fill);row.append(top,track);barRoot.append(row);
      });
    };
    let flashIndex=0,showAnswer=false;
    const renderReview=()=>{
      const cards=(data.subjects||[]).flatMap(subject=>(subject.flashcards||[]).map(card=>({...card,subjectName:subject.name})));
      const item=cards[flashIndex%Math.max(1,cards.length)]||{question:'ما وحدة قياس القوة؟',answer:'النيوتن'};
      progressRoot.querySelector('.reference-flash-count').textContent='بطاقة '+new Intl.NumberFormat('ar-EG').format(flashIndex+1)+' من '+new Intl.NumberFormat('ar-EG').format(Math.max(cards.length,10));
      progressRoot.querySelector('.reference-flash-question').textContent=item.question;
      const answer=progressRoot.querySelector('.reference-flash-answer');answer.textContent=item.answer;answer.hidden=!showAnswer;
      progressRoot.querySelector('.reference-flash-reveal').textContent=showAnswer?'إخفاء الإجابة':'إظهار الإجابة';
    };
    progressRoot.querySelector('.reference-flash-reveal').addEventListener('click',()=>{showAnswer=!showAnswer;renderReview();});
    progressRoot.querySelector('.reference-flash-next').addEventListener('click',()=>{flashIndex++;showAnswer=false;renderReview();});
    refreshProgress();renderReview();
    [taskList,subjectList].filter(Boolean).forEach(root=>new MutationObserver(refreshProgress).observe(root,{childList:true,subtree:true}));
  }

  decorateLessons();
  const lessonsRoot=document.getElementById('subjectList');
  if(lessonsRoot)new MutationObserver(decorateLessons).observe(lessonsRoot,{childList:true,subtree:true});
})();