(() => {
  const form = document.querySelector('#entryForm');
  const detailLabel = document.querySelector('#detailLabel');
  if (!form || !detailLabel || typeof render !== 'function') return;

  const pickerLabel = document.createElement('label');
  pickerLabel.id = 'taskEmojiLabel';
  pickerLabel.textContent = 'اختار رمز المهمة';
  pickerLabel.hidden = true;
  const picker = document.createElement('select');
  picker.id = 'taskEmoji';
  picker.setAttribute('aria-label', 'اختار رمز المهمة');
  [
    ['📚', '📚 كتاب'], ['✏️', '✏️ قلم'], ['📝', '📝 واجب'],
    ['🧮', '🧮 رياضيات'], ['🔬', '🔬 علوم'], ['🌍', '🌍 لغة'],
    ['🎓', '🎓 دراسة'], ['⭐', '⭐ أخرى']
  ].forEach(([emoji, label]) => picker.add(new Option(label, emoji)));
  pickerLabel.append(picker);
  form.insertBefore(pickerLabel, detailLabel);

  const style = document.createElement('style');
  style.textContent = `
    #taskEmojiLabel{display:block;font-weight:700;font-size:11px;margin:12px 0}
    #taskEmojiLabel[hidden]{display:none!important}
    #taskEmoji{display:block;width:100%;margin-top:6px;border:1px solid #e4e8e1;border-radius:10px;padding:11px;font:inherit;background:#fff;color:#183c36}
    #taskList .task-copy{display:grid;grid-template-columns:30px minmax(0,1fr);column-gap:8px;align-items:center}
    #taskList .task-copy .task-emoji{grid-row:1 / span 2;display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:#e7eee6;font-size:19px}
  `;
  document.head.append(style);

  const originalRender = render;
  render = function (...args) {
    originalRender.apply(this, args);
    const rows = document.querySelectorAll('#taskList .task-row');
    const tasks = typeof data !== 'undefined' ? data.tasks : [];
    rows.forEach((row, index) => {
      const task = tasks[index];
      const copy = row.querySelector('.task-copy');
      if (!task || !copy) return;
      let icon = copy.querySelector('.task-emoji');
      if (!icon) {
        icon = document.createElement('span');
        icon.className = 'task-emoji';
        icon.setAttribute('aria-hidden', 'true');
        copy.insertBefore(icon, copy.firstChild);
      }
      icon.textContent = task.emoji || '📚';
    });
  };

  document.addEventListener('click', event => {
    const target = event.target.closest('#addTask, #quickAdd, #navQuickAdd');
    if (target) {
      picker.value = '📚';
      pickerLabel.hidden = false;
      return;
    }
    if (event.target.closest('#addSubject, #addSession')) pickerLabel.hidden = true;
  }, true);

  let selectedEmoji = '📚';
  let taskCountBeforeSubmit = -1;
  form.addEventListener('submit', () => {
    if (typeof mode !== 'undefined' && mode === 'task' && typeof data !== 'undefined') {
      selectedEmoji = picker.value || '📚';
      taskCountBeforeSubmit = data.tasks.length;
    }
  }, true);
  form.addEventListener('submit', () => {
    if (typeof mode !== 'undefined' && mode === 'task' && typeof data !== 'undefined' && data.tasks.length > taskCountBeforeSubmit) {
      data.tasks[data.tasks.length - 1].emoji = selectedEmoji;
      save();
    }
    taskCountBeforeSubmit = -1;
  });

  render();
})();
