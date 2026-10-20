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
  const avatar=document.getElementById('topbarAvatar'), source=document.getElementById('sidebarAvatar');
  if(avatar&&source){
    const copyAvatar=()=>{avatar.innerHTML=source.innerHTML;};
    copyAvatar();
    new MutationObserver(copyAvatar).observe(source,{childList:true,subtree:true,characterData:true});
  }

  const schedule=document.getElementById('schedule');
  if(schedule){
    const calendar=document.createElement('section');
    calendar.className='planner-calendar card';
    calendar.innerHTML='<div class="calendar-head"><button type="button" class="calendar-arrow" aria-label="الشهر السابق">‹</button><h3 class="calendar-month"></h3><button type="button" class="calendar-arrow" aria-label="الشهر التالي">›</button></div><div class="calendar-weekdays"></div><div class="calendar-days"></div>';
    schedule.before(calendar);
    let shown=new Date(); shown=new Date(shown.getFullYear(),shown.getMonth(),1);
    const weekdays=['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
    const heading=calendar.querySelector('.calendar-month');
    const days=calendar.querySelector('.calendar-days');
    calendar.querySelector('.calendar-weekdays').innerHTML=weekdays.map(x=>'<span>'+x+'</span>').join('');
    const renderCalendar=()=>{
      heading.textContent=new Intl.DateTimeFormat('ar-EG',{month:'long',year:'numeric'}).format(shown);
      days.replaceChildren();
      const firstOffset=(shown.getDay()+1)%7;
      const total=new Date(shown.getFullYear(),shown.getMonth()+1,0).getDate();
      const cells=Math.ceil((firstOffset+total)/7)*7;
      for(let i=0;i<cells;i++){
        const num=i-firstOffset+1, button=document.createElement('button');
        button.type='button'; button.className='calendar-day';
        if(num<1||num>total){button.disabled=true;button.classList.add('calendar-outside');button.textContent='';}
        else{
          button.textContent=num;
          const now=new Date();
          if(num===now.getDate()&&shown.getMonth()===now.getMonth()&&shown.getFullYear()===now.getFullYear())button.classList.add('calendar-today','calendar-selected');
          button.addEventListener('click',()=>{days.querySelectorAll('.calendar-selected').forEach(el=>el.classList.remove('calendar-selected'));button.classList.add('calendar-selected');});
        }
        days.append(button);
      }
    };
    const arrows=calendar.querySelectorAll('.calendar-arrow');
    arrows[0].addEventListener('click',()=>{shown=new Date(shown.getFullYear(),shown.getMonth()-1,1);renderCalendar();});
    arrows[1].addEventListener('click',()=>{shown=new Date(shown.getFullYear(),shown.getMonth()+1,1);renderCalendar();});
    renderCalendar();
  }

  const subjectList=document.getElementById('subjectList');
  if(subjectList){
    const addMeters=()=>{
      subjectList.querySelectorAll('.subject-card').forEach(card=>{
        if(card.querySelector('.subject-progress'))return;
        const copy=card.querySelector('.subject-copy');
        if(!copy)return;
        const count=card.querySelector('.subject-lesson-count')?.textContent||'';
        const match=count.match(/(\d+)\s*\/\s*(\d+)/);
        const done=match?Number(match[1]):0,total=match?Number(match[2]):0,pct=total?Math.round(done/total*100):0;
        const wrap=document.createElement('div');
        wrap.className='subject-progress';
        wrap.setAttribute('aria-label','تقدم الدروس '+pct+'%');
        wrap.innerHTML='<span style="width:'+pct+'%"></span>';
        copy.append(wrap);
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
    filters.innerHTML='<button type="button" class="task-filter active" data-filter="all">الكل</button><button type="button" class="task-filter" data-filter="open">قيد الدراسة</button><button type="button" class="task-filter" data-filter="done">مكتملة</button>';
    taskList.before(filters);
    let filterMode='all';
    const applyTaskFilter=()=>{
      taskList.querySelectorAll(':scope > .task-row').forEach(row=>{
        const isDone=row.classList.contains('done');
        row.classList.toggle('task-filter-hidden',filterMode==='done'&&!isDone||filterMode==='open'&&isDone);
      });
    };
    filters.addEventListener('click',event=>{
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
  decorateLessons();
  if(subjectList)new MutationObserver(decorateLessons).observe(subjectList,{childList:true,subtree:true});
})();