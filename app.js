const tbody = document.querySelector('#sites');
const results = new Map();
let domains = [];
let activeFilter = 'all';

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function evidence(result) {
  if (!result) return 'Aún sin medir';
  if (result.kind === 'request-error') return result.detail;
  const signals = [];
  signals.push(result.http?.redirectsToHttps ? 'HTTP → HTTPS' : result.http?.responded ? 'HTTP abierto' : 'HTTP sin respuesta');
  signals.push(result.https?.responded ? `${result.https.tlsProtocol || 'TLS'} activo` : 'HTTPS no verificado');
  if (result.https?.responded) signals.push(result.https.hsts ? 'HSTS activo' : 'sin HSTS');
  if (Number.isInteger(result.https?.certificateDaysRemaining)) signals.push(`cert. ${result.https.certificateDaysRemaining} días`);
  return signals.join(' · ');
}

function needsAttention(result) {
  return result && ['C', 'F', '?'].includes(result.grade);
}

function visible(item) {
  const result = results.get(item.host);
  const query = document.querySelector('#search').value.trim().toLowerCase();
  const matchesQuery = !query || `${item.label} ${item.host}`.toLowerCase().includes(query);
  if (!matchesQuery) return false;
  if (activeFilter === 'attention') return needsAttention(result);
  if (activeFilter === 'protected') return result?.grade === 'A';
  return true;
}

function updateStats() {
  const measured = [...results.values()].filter(item => item.kind !== 'request-error');
  document.querySelector('#count-checked').firstChild.textContent = String(measured.length);
  document.querySelector('#count-a').textContent = String(measured.filter(item => item.grade === 'A').length);
  document.querySelector('#count-http').textContent = String(measured.filter(item => item.grade === 'C').length);
  document.querySelector('#count-critical').textContent = String(measured.filter(item => ['F', '?'].includes(item.grade)).length);
  document.querySelector('#export-report').disabled = measured.length === 0;
  if (results.size) document.querySelector('#last-check').textContent = `Última medición: ${new Date().toLocaleString('es-PE')}`;
}

function render() {
  tbody.replaceChildren();
  const shown = domains.filter(visible);
  for (const item of shown) {
    const result = results.get(item.host);
    const row = document.createElement('tr');
    const site = document.createElement('td');
    site.append(element('strong', '', item.label), element('span', 'domain', item.host));
    row.append(site);

    const gradeCell = document.createElement('td');
    gradeCell.append(
      element('span', `grade grade-${(result?.grade || 'pending').toLowerCase()}`, result?.grade || '—'),
      element('span', 'grade-copy', result?.gradeLabel || 'Pendiente')
    );
    row.append(gradeCell);
    row.append(element('td', 'evidence', evidence(result)));

    const action = document.createElement('td');
    const button = element('button', 'check-one', result ? 'Actualizar ↗' : 'Comprobar ↗');
    button.addEventListener('click', () => check(item.host, button));
    action.append(button);
    row.append(action);
    tbody.append(row);
  }
  if (!shown.length) {
    const row = document.createElement('tr');
    const empty = element('td', 'loading', 'No hay sitios que coincidan con este filtro.');
    empty.colSpan = 4;
    row.append(empty);
    tbody.append(row);
  }
  updateStats();
}

async function check(host, button) {
  if (button) {
    button.disabled = true;
    button.textContent = 'Midiendo…';
  }
  try {
    const response = await fetch(`/api/check?host=${encodeURIComponent(host)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error de comprobación');
    results.set(host, data);
  } catch (error) {
    results.set(host, {
      kind: 'request-error',
      grade: '?',
      gradeLabel: 'Consulta no disponible',
      detail: 'La red no permitió completar esta medición. Intenta nuevamente más tarde.'
    });
  }
  render();
}

function downloadReport() {
  const rows = domains.filter(item => results.has(item.host)).map(item => ({ sitio: item.label, ...results.get(item.host) }));
  const report = {
    title: 'Observatorio .PE · Evidencia de transporte web',
    generatedAt: new Date().toISOString(),
    scope: 'Comprobación puntual y no invasiva de la raíz de dominios del catálogo.',
    results: rows
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `observatorio-pe-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function init() {
  try {
    const response = await fetch('/domains.json');
    if (!response.ok) throw new Error('Catálogo no disponible');
    domains = await response.json();
    document.querySelector('.denom').textContent = ` / ${domains.length}`;
    document.querySelector('#catalog-size').textContent = String(domains.length);
    render();
  } catch {
    tbody.replaceChildren();
    const row = document.createElement('tr');
    const message = element('td', 'loading', 'No se pudo cargar el catálogo.');
    message.colSpan = 4;
    row.append(message);
    tbody.append(row);
  }
}

document.querySelector('#scan-all').addEventListener('click', async event => {
  const master = event.currentTarget;
  master.disabled = true;
  for (const [index, item] of domains.entries()) {
    master.querySelector('span').textContent = `${index + 1}/${domains.length}`;
    await check(item.host);
  }
  master.querySelector('span').textContent = '↗';
  master.firstChild.textContent = 'Volver a medir ';
  master.disabled = false;
});

document.querySelector('#filters').addEventListener('click', event => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
  render();
});
document.querySelector('#search').addEventListener('input', render);
document.querySelector('#export-report').addEventListener('click', downloadReport);

init();
