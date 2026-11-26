(() => {
  'use strict';
  const buffer = document.querySelector('[data-buffer-card]');
  if (buffer) {
    const choices = buffer.querySelector('.buffer-choice');
    const switchVariant = () => {
      const current = choices.querySelector('input:checked').value;
      buffer.querySelectorAll('[data-variant]').forEach(pane => {
        pane.hidden = pane.dataset.variant !== current;
      });
    };
    choices.addEventListener('change', switchVariant);
    buffer.dataset.enhanced = '';
    choices.hidden = false;
    switchVariant();
    window.addEventListener('pageshow', switchVariant);
  }

  const dialog = document.querySelector('.scheme-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const head = dialog.querySelector('h2');
  const context = dialog.querySelector('.dialog-context');
  const content = dialog.querySelector('.dialog-content');
  const close = dialog.querySelector('.dialog-close');
  const actions = document.createElement('div');
  actions.className = 'dialog-tools';
  close.before(actions);
  const fit = document.createElement('button');
  fit.type = 'button';
  fit.className = 'diagram-toggle';
  actions.append(fit, close);
  dialog.id = 'scheme-detail-dialog';
  let opener = null;

  function show(trigger, details, drawing) {
    opener = trigger;
    head.textContent = details.querySelector('summary :is(h2,h3)').textContent;
    context.textContent = (drawing ? 'Чертёж' : 'Спецификация') + ' · ' + details.dataset.context;
    fit.hidden = !drawing;
    close.setAttribute('aria-label', drawing ? 'Закрыть чертёж' : 'Закрыть спецификацию');
    fit.textContent = 'Весь чертёж';
    dialog.classList.toggle('is-drawing', drawing);
    dialog.classList.remove('is-fit');
    dialog.showModal();
    content.scrollTo(0, 0);
  }

  document.querySelectorAll('.scheme-spec').forEach(details => {
    const summary = details.querySelector('summary');
    summary.setAttribute('aria-haspopup','dialog');
    summary.setAttribute('aria-controls',dialog.id);
    summary.addEventListener('click', event => {
      event.preventDefault();
      content.replaceChildren(details.querySelector('.spec-body').cloneNode(true));
      show(summary, details, false);
    });
  });
  document.querySelectorAll('.scheme-plate').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const panel = link.closest('.buffer-pane, .scheme-card');
      const image = link.querySelector('img').cloneNode();
      event.preventDefault();
      content.replaceChildren(image);
      show(link, panel.querySelector('.scheme-spec'), true);
    });
  });
  fit.addEventListener('click', () => {
    const fitted = dialog.classList.toggle('is-fit');
    fit.textContent = fitted ? 'Крупнее' : 'Весь чертёж';
    content.scrollTo(0, 0);
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    content.replaceChildren();
    if (opener?.isConnected) opener.focus({preventScroll:true});
    opener = null;
  });
})();
