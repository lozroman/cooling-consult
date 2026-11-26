(() => {
  'use strict';
  const desktop = document.querySelector('.eng-menu--desk');
  if (desktop) {
    const trigger = desktop.querySelector('summary');
    let openedByHover = false;
    desktop.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && !desktop.open) {
        desktop.open = true;
        openedByHover = true;
      }
    });
    desktop.addEventListener('pointerleave', () => {
      if (openedByHover && !desktop.contains(document.activeElement)) desktop.open = false;
      openedByHover = false;
    });
    trigger.addEventListener('click', event => {
      if (openedByHover && desktop.open && event.detail > 0) event.preventDefault();
      openedByHover = false;
    });
    document.addEventListener('pointerdown', event => {
      if (!desktop.contains(event.target)) desktop.open = false;
    });
    desktop.addEventListener('focusout', event => {
      if (event.relatedTarget && !desktop.contains(event.relatedTarget)) desktop.open = false;
    });
  }
  document.querySelectorAll('.eng-menu').forEach(menu => {
    const panel = menu.querySelector('.eng-menu__panel');
    const templatesHref = '/shablony-dokumentov.html';
    if (panel && !panel.querySelector(`a[href="${templatesHref}"]`)) {
      const templatesLink = document.createElement('a');
      templatesLink.href = templatesHref;
      templatesLink.textContent = 'Шаблоны документов';
      panel.append(templatesLink);
    }

    menu.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !menu.open) return;
      event.stopPropagation();
      const group = event.target.closest('.eng-menu__panel details[open]');
      const closing = group || menu;
      closing.open = false;
      closing.querySelector('summary').focus();
    });
  });

  const scheme = document.querySelector('[data-scheme-builder]');
  if (scheme) {
    const source = document.getElementById('scheme-source');
    const layout = document.getElementById('scheme-layout');
    function redraw() {
      scheme.querySelectorAll('[data-layout]').forEach(figure => {
        figure.hidden = figure.dataset.layout !== layout.value;
        figure.querySelector('[data-source]').textContent = source.value;
        figure.querySelector('title').textContent = source.value + '. ' + layout.selectedOptions[0].textContent;
      });
    }
    scheme.addEventListener('change', redraw);
    redraw();
  }
  const form = document.getElementById('spec-form');
  if (form) {
    const result = document.getElementById('spec-text');
    function renderSpec() {
      const data = new FormData(form);
      const value = key => String(data.get(key) || '').trim() || 'Требуется уточнить';
      result.textContent = [
        'Техническое задание на поставку оборудования',
        'Объект: ' + value('site'),
        'Оборудование: ' + value('equipment'),
        'Расчётный режим и рабочая среда: ' + value('mode'),
        'Границы поставки и состав работ: ' + value('scope'),
        'Требования к документации и приёмке: ' + value('acceptance')
      ].join('\n\n');
    }
    form.addEventListener('input', renderSpec);
    renderSpec();
    form.addEventListener('submit', event => {
      event.preventDefault();
      renderSpec();
      const url = URL.createObjectURL(new Blob(['\uFEFF',result.textContent], {type:'text/plain;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Tekhnicheskoe_zadanie.txt';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
})();
