/* KSA — «Наши мероприятия»: marketplace list, filters, calendar, detail popup.
   To add an event, append an object to EVENTS (poster goes to assets/events/). */
(() => {
  const { $, $$, gsap, lenis, reduce, EASE } = window.KSA;

  const EVENTS = [
    {
      id: 'emergency-care-2026-10',
      title: 'Неотложная помощь в стоматологии',
      format: 'Семинар-тренинг',
      category: 'Неотложная помощь',
      start: '2026-10-13',
      end: '2026-10-14',
      time: '14:00–16:00',
      city: 'Алматы',
      venue: 'Стоматологическая клиника Daris-TTE, ул. Тулебаева, 8',
      speaker: 'Кожахметова Акмарал Каировна',
      speakerRole: 'Заведующая анестезиологическим отделением ТОО УКЦ Стоматология, врач высшей категории, ассистент кафедры ортопедической и детской стоматологии НАО «Медицинский университет Астана», директор филиала КСА г. Астана',
      credits: 16,
      price: null,                       // null → «Цена по запросу»
      phones: ['+7 701 789 7815', '+7 701 752 0965'],
      poster: 'assets/events/emergency-care-2026-10.jpg'
    }
  ];

  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const d = s => { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); };
  const iso = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const dotted = s => s.split('-').reverse().join('.');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const price = e => e.price ? `${e.price.toLocaleString('ru-RU')} ₸` : 'Цена по запросу';
  const human = e => {
    const a = d(e.start), b = d(e.end);
    if (e.start === e.end) return `${a.getDate()} ${MONTHS_GEN[a.getMonth()]} ${a.getFullYear()}`;
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()}–${b.getDate()} ${MONTHS_GEN[a.getMonth()]} ${a.getFullYear()}`
      : `${a.getDate()} ${MONTHS_GEN[a.getMonth()]} – ${b.getDate()} ${MONTHS_GEN[b.getMonth()]} ${b.getFullYear()}`;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // upcoming only, soonest first
  const upcoming = EVENTS.filter(e => d(e.end) >= today).sort((a, b) => d(a.start) - d(b.start));

  const state = { q: '', city: new Set(), category: new Set(), credits: false, day: null };

  /* ---------- filter checkboxes ---------- */
  function buildChecks(key) {
    const box = $(`[data-filter="${key}"]`);
    const values = [...new Set(upcoming.map(e => e[key]))].sort((a, b) => a.localeCompare(b, 'ru'));
    box.innerHTML = values.map(v => {
      const n = upcoming.filter(e => e[key] === v).length;
      return `<label class="fcheck"><input type="checkbox" value="${esc(v)}"><span>${esc(v)}</span><em>${n}</em></label>`;
    }).join('') || '<p class="filters__none">Пока нет вариантов</p>';
    $$('input', box).forEach(i => i.addEventListener('change', () => { i.checked ? state[key].add(i.value) : state[key].delete(i.value); render(); }));
  }
  buildChecks('city');
  buildChecks('category');
  $('[data-filter-credits]').addEventListener('change', e => { state.credits = e.target.checked; render(); });
  let qt;
  $('[data-search]').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); render(); }, 150); });
  $$('[data-reset]').forEach(b => b.addEventListener('click', () => {
    state.q = ''; state.city.clear(); state.category.clear(); state.credits = false; state.day = null;
    $('[data-search]').value = '';
    $$('.filters input[type=checkbox]').forEach(i => { i.checked = false; });
    drawCal(); render();
  }));

  /* ---------- calendar ---------- */
  const first = upcoming[0] ? d(upcoming[0].start) : today;
  let calY = today.getFullYear(), calM = today.getMonth();
  if (first > today && (first.getFullYear() !== calY || first.getMonth() !== calM) && !hasEventsIn(calY, calM)) { calY = first.getFullYear(); calM = first.getMonth(); }
  function hasEventsIn(y, m) { return upcoming.some(e => { const a = d(e.start), b = d(e.end); return a <= new Date(y, m + 1, 0) && b >= new Date(y, m, 1); }); }
  const eventOn = day => upcoming.some(e => day >= d(e.start) && day <= d(e.end));

  function drawCal() {
    $('[data-cal-month]').textContent = `${MONTHS[calM]} ${calY}`;
    const lead = (new Date(calY, calM, 1).getDay() + 6) % 7;        // Monday first
    const days = new Date(calY, calM + 1, 0).getDate();
    let html = '<span></span>'.repeat(lead);
    for (let i = 1; i <= days; i++) {
      const dt = new Date(calY, calM, i), k = iso(dt);
      const cls = ['cal__d', eventOn(dt) && 'has-ev', +dt === +today && 'is-today', state.day === k && 'is-sel', dt < today && 'is-past'].filter(Boolean).join(' ');
      html += `<button type="button" class="${cls}" data-day="${k}" ${eventOn(dt) ? '' : 'tabindex="-1"'}>${i}</button>`;
    }
    $('[data-cal-grid]').innerHTML = html;
    $$('[data-cal-grid] .has-ev').forEach(b => b.addEventListener('click', () => {
      state.day = state.day === b.dataset.day ? null : b.dataset.day;
      drawCal(); render();
    }));
  }
  $('[data-cal-prev]').addEventListener('click', () => { calM--; if (calM < 0) { calM = 11; calY--; } drawCal(); });
  $('[data-cal-next]').addEventListener('click', () => { calM++; if (calM > 11) { calM = 0; calY++; } drawCal(); });
  drawCal();

  /* ---------- cards ---------- */
  const card = e => `
    <article class="evc" data-id="${e.id}" tabindex="0" role="button" aria-label="${esc(e.title)} — подробнее">
      <figure class="evc__poster">
        <img src="${e.poster}" alt="" loading="lazy">
        ${e.credits ? `<span class="evc__badge">${e.credits} зачётных единиц</span>` : ''}
        <span class="evc__cat">${esc(e.category)}</span>
      </figure>
      <div class="evc__body">
        <span class="evc__format">${esc(e.format)}</span>
        <h3 class="evc__title">${esc(e.title)}</h3>
        <strong class="evc__price">${price(e)}</strong>
        <span class="evc__city"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15z" fill="currentColor"/><circle cx="8" cy="6.5" r="1.8" fill="#fdfeff"/></svg>${esc(e.city)}</span>
        <span class="evc__dates">${dotted(e.start)}${e.end !== e.start ? ' – ' + dotted(e.end) : ''}</span>
      </div>
    </article>`;

  const soon = `
    <article class="evc evc--soon">
      <div class="evc__soon">
        <span class="evc__format">Скоро</span>
        <h3>Новые мероприятия уже готовятся</h3>
        <p>Члены КСА первыми узнают о семинарах и получают скидки на участие.</p>
        <button type="button" class="pill pill--lime" data-apply="Мероприятия · карточка «Скоро»"><i class="pill__dot"></i><span>Вступить в КСА</span></button>
      </div>
    </article>`;

  function filtered() {
    return upcoming.filter(e =>
      (!state.q || [e.title, e.format, e.category, e.city, e.speaker, e.venue].join(' ').toLowerCase().includes(state.q)) &&
      (!state.city.size || state.city.has(e.city)) &&
      (!state.category.size || state.category.has(e.category)) &&
      (!state.credits || e.credits) &&
      (!state.day || (d(state.day) >= d(e.start) && d(state.day) <= d(e.end))));
  }

  const plural = (n, a, b, c) => n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c;
  let firstRender = true;
  function render() {
    const list = filtered();
    const active = state.q || state.city.size || state.category.size || state.credits || state.day;
    const grid = $('[data-grid]');
    grid.innerHTML = list.map(card).join('') + (!active ? soon : '');
    $('[data-empty]').hidden = list.length > 0;
    $('[data-count-label]').textContent = `${list.length} ${plural(list.length, 'мероприятие', 'мероприятия', 'мероприятий')}`;
    const nActive = state.city.size + state.category.size + (state.credits ? 1 : 0) + (state.day ? 1 : 0);
    const fc = $('[data-filters-count]'); fc.hidden = !nActive; fc.textContent = nActive;
    $$('.evc[data-id]', grid).forEach(c => {
      c.addEventListener('click', () => openEvent(c.dataset.id));
      c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEvent(c.dataset.id); } });
    });
    if (!reduce) {
      gsap.fromTo($$('.evc', grid), { y: firstRender ? 80 : 30, opacity: 0 }, { y: 0, opacity: 1, duration: firstRender ? 1.4 : .8, ease: EASE, stagger: .07, delay: firstRender ? .3 : 0 });
      gsap.fromTo($$('.evc__poster img', grid), { scale: 1.25 }, { scale: 1, duration: 1.6, ease: EASE, stagger: .07, delay: firstRender ? .3 : 0 });
    }
    firstRender = false;
    window.ScrollTrigger?.refresh();
  }
  render();

  /* ---------- mobile filters drawer ---------- */
  const fbtn = $('[data-filters-toggle]'), fbox = $('[data-filters]');
  fbtn.addEventListener('click', () => {
    const open = fbox.classList.toggle('is-open');
    fbtn.setAttribute('aria-expanded', open);
    if (open && !reduce) gsap.fromTo(fbox, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .7, ease: 'expo.out' });
  });

  /* ---------- event detail popup ---------- */
  const evm = $('[data-modal="event"]');
  function openEvent(id) {
    const e = EVENTS.find(x => x.id === id);
    if (!e) return;
    $('[data-evd]', evm).innerHTML = `
      <figure class="evd__poster"><img src="${e.poster}" alt="Афиша: ${esc(e.title)}"></figure>
      <div class="evd__info">
        <span class="form__cap">${esc(e.format)} · ${esc(e.category)}</span>
        <h2 id="evd-title" class="evd__title">${esc(e.title)}</h2>
        ${e.credits ? `<div class="evd__credits"><b>${e.credits}</b><span>зачётных единиц —<br>участникам выдаётся сертификат</span></div>` : ''}
        <dl class="evd__meta">
          <div><dt>Даты</dt><dd>${human(e)}</dd></div>
          ${e.time ? `<div><dt>Время</dt><dd>${esc(e.time)}</dd></div>` : ''}
          <div><dt>Место</dt><dd>${esc(e.city)}, ${esc(e.venue)}</dd></div>
          ${e.speaker ? `<div><dt>Лектор</dt><dd><strong>${esc(e.speaker)}</strong>${e.speakerRole ? `<small>${esc(e.speakerRole)}</small>` : ''}</dd></div>` : ''}
          <div><dt>Стоимость</dt><dd>${price(e)}</dd></div>
          ${e.phones?.length ? `<div><dt>Запись</dt><dd>${e.phones.map(p => `<a href="tel:${p.replace(/\s/g, '')}" class="link-u">${esc(p)}</a>`).join('<br>')}</dd></div>` : ''}
        </dl>
        <div class="evd__cta">
          <button type="button" class="pill pill--lime pill--xl" data-apply="Мероприятие: ${esc(e.title)}" data-event="${esc(e.title)} · ${human(e)}"><i class="pill__dot"></i><span>Записаться</span></button>
          ${e.phones?.length ? `<a class="pill pill--outline evd__call" href="tel:${e.phones[0].replace(/\s/g, '')}"><i class="pill__dot"></i><span>Позвонить</span></a>` : ''}
        </div>
      </div>`;
    evm.hidden = false; lenis?.stop(); document.body.classList.add('modal-open');
    if (!reduce) {
      gsap.fromTo($('.modal__backdrop', evm), { opacity: 0 }, { opacity: 1, duration: .5 });
      gsap.fromTo($('.modal__panel', evm), { yPercent: 10, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: EASE });
      gsap.fromTo($('.evd__poster', evm), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'expo.inOut' });
      gsap.fromTo($$('.evd__info > *, .evd__meta > div', evm), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: EASE, stagger: .05, delay: .2 });
    }
    $('.modal__x', evm).focus();
  }
  function closeEvent(keepLock) {
    const fin = () => { evm.hidden = true; if (!keepLock) { document.body.classList.remove('modal-open'); lenis?.start(); } };
    if (reduce) return fin();
    gsap.to($('.modal__panel', evm), { yPercent: 8, opacity: 0, duration: .35, ease: 'power2.in' });
    gsap.to($('.modal__backdrop', evm), { opacity: 0, duration: .4, onComplete: fin });
  }
  $$('[data-close-ev]', evm).forEach(b => b.addEventListener('click', () => closeEvent()));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !evm.hidden) closeEvent(); });
  // «Записаться» hands over to the application popup (opened by main.js via [data-apply])
  evm.addEventListener('click', e => { if (e.target.closest('[data-apply]')) closeEvent(true); });

  // deep link: events.html#emergency-care-2026-10
  if (location.hash && EVENTS.some(e => e.id === location.hash.slice(1))) setTimeout(() => openEvent(location.hash.slice(1)), 600);
})();
