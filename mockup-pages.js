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
})();