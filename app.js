/* Journal data stays in localStorage. Never render user notes as HTML. */
(() => {
  const form = document.querySelector('#mood-form');
  const note = document.querySelector('#daily-note');
  const save = document.querySelector('#save-mood');
  const reset = document.querySelector('#start-over');
  const fieldset = form.querySelector('fieldset');
  const history = document.querySelector('[aria-labelledby="history-heading"]');
  const list = document.querySelector('#mood-entries');
  const empty = document.querySelector('#empty-history');
  const status = document.querySelector('#save-status');
  const key = 'daily-mood-tracker.entries.v1';
  const moods = {
    happy: ['Happy', 'happy-puppy'], calm: ['Calm', 'calm-bunny'],
    okay: ['Okay', 'okay-bear'], low: ['Low', 'crying-kitten'],
    overwhelmed: ['Overwhelmed', 'overwhelmed']
  };
  let entries = [];
  let busy = false;
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(stored)) entries = stored.filter(entry => entry &&
      Object.hasOwn(moods, entry.mood) && typeof entry.note === 'string' &&
      typeof entry.date === 'string' && Number.isFinite(Date.parse(entry.date)));
  } catch {
    status.textContent = 'Your browser couldn’t load saved entries. You can still check in here.';
  }

  function render() {
    list.replaceChildren();
    empty.hidden = entries.length > 0;
    entries.forEach(entry => {
      const item = document.createElement('li');
      const article = document.createElement('article');
      const icon = document.createElement('img');
      icon.src = `assets/icons/${moods[entry.mood][1]}.svg`;
      icon.alt = '';
      icon.width = icon.height = 42;
      const heading = document.createElement('h3');
      heading.append(icon, document.createTextNode(moods[entry.mood][0]));
      const date = document.createElement('time');
      date.dateTime = entry.date;
      date.textContent = new Date(entry.date).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      });
      const text = document.createElement('p');
      text.className = 'entry-note';
      text.textContent = entry.note || 'A quiet check-in. No words needed.';
      article.append(heading, date, text);
      item.append(article);
      list.append(item);
    });
  }

  const animate = async (element, frames, options) => {
    if (typeof element.animate !== 'function') return;
    await element.animate(frames, options).finished;
  };

  async function sendPaper(text) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    await animate(save, [
      { background: '#526c48' }, { background: '#b0c893', boxShadow: '0 0 0 7px #aabd9344' },
      { background: '#526c48' }
    ], { duration: 260 });
    const source = note.getBoundingClientRect();
    const paper = document.createElement('div');
    paper.className = 'flying-paper';
    paper.setAttribute('aria-hidden', 'true');
    paper.textContent = text || 'A little moment for me.';
    Object.assign(paper.style, {
      left: `${source.left}px`, top: `${source.top}px`,
      width: `${source.width}px`, height: `${source.height}px`
    });
    document.body.append(paper);
    note.style.visibility = 'hidden';
    try {
      const crumpled = 'polygon(14% 4%, 37% 10%, 62% 0, 85% 15%, 100% 40%, 88% 65%, 93% 85%, 64% 100%, 40% 89%, 17% 97%, 0 69%, 8% 38%)';
      await animate(paper, [
        { transform: 'scale(1) rotate(0deg)', clipPath: 'inset(0 round 16px)' },
        { transform: 'scale(.72, .55) rotate(-12deg)', clipPath: crumpled, offset: .55 },
        { transform: 'scale(.24, .3) rotate(16deg)', clipPath: crumpled,
          background: 'repeating-conic-gradient(from 20deg at 44% 50%, #e0d5bf 0deg 32deg, #fffaf0 38deg 76deg, #ece2ce 85deg 120deg)' }
      ], { duration: 580, fill: 'forwards', easing: 'ease-in-out' });
      // Bring an offscreen history into view before measuring the landing point.
      const target = history.getBoundingClientRect();
      if (target.top > innerHeight - 100 || target.bottom < 0) {
        history.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 450));
      }
      const landing = list.getBoundingClientRect();
      const endX = landing.left + 45 - (source.left + source.width / 2);
      const endY = landing.top + 30 - (source.top + source.height / 2);
      await animate(paper, [
        { transform: 'translate(0, 0) scale(.24, .3) rotate(16deg)', opacity: 1 },
        { transform: `translate(${endX * .5}px, ${endY * .5 - 70}px) scale(.2) rotate(-45deg)`, opacity: 1, offset: .5 },
        { transform: `translate(${endX}px, ${endY}px) scale(.08) rotate(-140deg)`, opacity: 0 }
      ], { duration: 720, easing: 'ease-in-out', fill: 'forwards' });
    } finally {
      paper.remove();
      note.style.visibility = '';
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const mood = form.querySelector('input[name="mood"]:checked').value;
    const entry = { mood, note: note.value.trim(), date: new Date().toISOString() };
    busy = true;
    save.disabled = reset.disabled = fieldset.disabled = note.disabled = true;
    save.textContent = 'Saving your moment…';
    status.textContent = '';
    try {
      // Animation failures must never discard a user's entry.
      try { await sendPaper(entry.note); } catch { /* Continue with saving. */ }
      entries.unshift(entry);
      let persisted = true;
      try { localStorage.setItem(key, JSON.stringify(entries)); } catch { persisted = false; }
      render();
      note.value = '';
      list.firstElementChild.classList.add('entry-arrived');
      status.textContent = persisted ? 'Your moment is saved. Every feeling belongs here.' :
        'Added for this visit. Browser storage is unavailable, so this entry won’t remain after you close or refresh the page.';
    } finally {
      busy = false;
      save.disabled = reset.disabled = fieldset.disabled = note.disabled = false;
      save.textContent = 'Save My Mood';
    }
  });

  form.addEventListener('reset', event => {
    if (busy) { event.preventDefault(); return; }
    status.textContent = 'A fresh page for you. Your previous entries are still here.';
    // Native form reset clears the radio group and note, never the history.
    requestAnimationFrame(() => form.querySelector('input[name="mood"]').focus());
  });
  render();
})();
