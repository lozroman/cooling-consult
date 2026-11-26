import { calculators } from './thermal-models.js?v=20261126a';

const app = document.querySelector('.tc-app');
const menu = app.querySelector('.tc-index');
const picker = app.querySelector('#tc-picker');
const articles = new Map([...app.querySelectorAll('.tc-tool')].map(article => [article.id, article]));
const menuLinks = [...menu.querySelectorAll('a[href^="#"]')];
const defaultId = menuLinks[0].hash.slice(1);
const formats = new Map();

function formatNumber(value, digits) {
  if (value !== 0 && Math.abs(value) < 0.5 * 10 ** -digits) {
    return value.toLocaleString('ru-RU', { maximumSignificantDigits: 2 });
  }
  if (!formats.has(digits)) formats.set(digits, new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }));
  return formats.get(digits).format(value);
}

function element(tag, className, text) {
  const item = document.createElement(tag);
  item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function displayResult(area, result) {
  area.classList.toggle('tc-result--invalid', Boolean(result.error));
  if (result.error) {
    area.replaceChildren(
      element('h3', 'tc-result-label', 'Проверьте исходные данные'),
      element('p', 'tc-error', result.error.message)
    );
    return;
  }
  const [main, ...other] = result.rows;
  const value = element('p', 'tc-number');
  value.append(element('strong', '', formatNumber(main.value, main.digits)), element('span', 'tc-main-unit', main.unit));
  const content = [element('h3', 'tc-result-label', main.label), value];
  const total = result.shares?.reduce((sum, part) => sum + part, 0) || 0;
  if (total > 0) {
    const bar = element('div', 'tc-bar');
    bar.setAttribute('aria-hidden', 'true');
    result.shares.forEach((part, i) => {
      const piece = element('span', 'tc-share-' + i);
      piece.style.width = (part / total * 100) + '%';
      bar.append(piece);
    });
    content.push(bar);
  }
  const list = element('dl', 'tc-metrics');
  other.forEach((row, index) => {
    const line = element('div', '');
    const term = element('dt', '', row.label);
    if (total > 0 && index < result.shares.length) {
      term.prepend(element('span', 'tc-key tc-share-' + index));
    }
    const shown = formatNumber(row.value, row.digits) + (row.unit ? ' ' + row.unit : '');
    line.append(term, element('dd', '', shown));
    list.append(line);
  });
  content.push(list);
  if (result.notice) content.push(element('p', 'tc-notice', result.notice));
  area.replaceChildren(...content);
}

function parseEntry(field) {
  if (field.tagName === 'SELECT') return { value: field.value };
  const raw = field.value.trim().replace(/[\u2212]/g, '-');
  const label = field.labels[0].textContent;
  if (!raw) return { error: 'Заполните поле «' + label + '».' };
  // Accept both decimal separators and Russian thousands grouping, including non-breaking spaces.
  if (!/^[+-]?(?:(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) {
    return { error: 'Введите число в поле «' + label + '». Дробную часть можно отделить запятой или точкой.' };
  }
  const value = Number(raw.replace(/[ \u00a0\u202f]/g, '').replace(',', '.'));
  if (!Number.isFinite(value)) return { error: 'Проверьте число в поле «' + label + '».' };
  const bounds = field.dataset;
  const boundText = n => String(n).replace('.', ',');
  if (bounds.gt !== undefined && value <= Number(bounds.gt)) {
    return { error: 'Значение поля «' + label + '» должно быть больше ' + boundText(bounds.gt) + '.' };
  }
  if (bounds.min !== undefined && value < Number(bounds.min)) {
    return { error: 'Минимальное значение поля «' + label + '» — ' + boundText(bounds.min) + '.' };
  }
  if (bounds.max !== undefined && value > Number(bounds.max)) {
    return { error: 'Максимальное значение поля «' + label + '» — ' + boundText(bounds.max) + '.' };
  }
  if (bounds.integer !== undefined && !Number.isInteger(value)) {
    return { error: 'Для поля «' + label + '» введите целое число.' };
  }
  return { value };
}

function recalculate(article) {
  const form = article.querySelector('form');
  const area = article.querySelector('.tc-result');
  const values = {};
  let issue;
  for (const field of form.querySelectorAll('[name]')) {
    field.removeAttribute('aria-invalid');
    const parsed = parseEntry(field);
    if (parsed.error) {
      field.setAttribute('aria-invalid', 'true');
      issue ??= { field: field.name, message: parsed.error };
    } else {
      values[field.name] = parsed.value;
    }
  }
  let result = issue ? { error: issue } : calculators[article.id](values);
  if (result.rows?.some(row => !Number.isFinite(row.value))) {
    result = { error: { message: 'Числа выходят за пределы вычисления. Проверьте значения и единицы измерения.' } };
  }
  if (result.error?.field) form.elements.namedItem(result.error.field)?.setAttribute('aria-invalid', 'true');
  displayResult(area, result);
  return result;
}

function activate(id) {
  const active = articles.get(id);
  for (const article of articles.values()) article.hidden = article !== active;
  for (const link of menuLinks) {
    if (link.hash === '#' + id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  const group = menuLinks.find(link => link.hash === '#' + id).closest('details');
  for (const section of menu.querySelectorAll('details')) section.open = section === group;
  picker.value = id;
  recalculate(active);
}

function visit(id, focusTitle) {
  if (!articles.has(id)) return;
  if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  activate(id);
  const article = articles.get(id);
  if (focusTitle) article.querySelector('h2').focus({ preventScroll: true });
  const bounds = article.getBoundingClientRect();
  const header = document.querySelector('.site-header').getBoundingClientRect().height;
  if (bounds.top < header || bounds.top > innerHeight - 120) article.scrollIntoView({ block: 'start' });
}

function restoreLocation() {
  const id = location.hash.slice(1);
  if (articles.has(id)) activate(id);
  else if (!id) activate(defaultId);
}

app.addEventListener('click', event => {
  const anchor = event.target.closest('a[href^="#"]');
  if (!anchor || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const id = anchor.hash.slice(1);
  if (!articles.has(id)) return;
  event.preventDefault();
  visit(id, true);
});
picker.addEventListener('change', () => visit(picker.value, false));
app.addEventListener('input', event => {
  const article = event.target.closest('.tc-tool');
  if (article && event.target.matches('input, select')) recalculate(article);
});
app.addEventListener('change', event => {
  const article = event.target.closest('.tc-tool');
  if (article && event.target.matches('input, select')) recalculate(article);
});
app.addEventListener('reset', event => {
  const article = event.target.closest('.tc-tool');
  // The browser restores each input's default value after the reset event has finished.
  if (article) setTimeout(() => recalculate(article), 0);
});
app.addEventListener('submit', event => {
  const article = event.target.closest('.tc-tool');
  if (!article) return;
  event.preventDefault();
  const result = recalculate(article);
  if (result.error?.field) {
    const field = event.target.elements.namedItem(result.error.field);
    const group = field.closest('details');
    if (group) group.open = true;
    field.focus();
  } else article.querySelector('.tc-result').focus();
});

for (const article of articles.values()) article.querySelector('fieldset').disabled = false;
app.classList.add('tc-ready');
const entry = location.hash.slice(1);
activate(articles.has(entry) ? entry : defaultId);
if (articles.has(entry)) requestAnimationFrame(() => articles.get(entry).scrollIntoView({ block: 'start', behavior: 'instant' }));
window.addEventListener('popstate', restoreLocation);
window.addEventListener('hashchange', restoreLocation);
window.addEventListener('pageshow', () => {
  const active = app.querySelector('.tc-tool:not([hidden])');
  if (active) recalculate(active);
});
