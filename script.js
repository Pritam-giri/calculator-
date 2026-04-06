
// ── STATE
let expr = '';
let lastResult = '0';
let mode = 'simple';
let history = [];
let memory = 0;
let progBase = 'hex';
let justCalc = false;

// ── DOM
const exprEl   = document.getElementById('expr');
const resultEl = document.getElementById('result');
const memEl    = document.getElementById('memIndicator');
const histPanel = document.getElementById('historyPanel');
const histEmpty = document.getElementById('historyEmpty');

// ── DISPLAY UPDATE
function updateDisplay() {
  exprEl.textContent  = expr;
  resultEl.textContent = lastResult;
  resultEl.classList.remove('error');

  if (mode === 'prog') updateProgBases();
}

function setResult(val, isError) {
  lastResult = val;
  resultEl.textContent = val;
  resultEl.classList.toggle('error', !!isError);
  if (mode === 'prog') updateProgBases();
}

// ── MODE
function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode-tab').forEach((t,i) => {
    t.classList.toggle('active', ['simple','sci','prog'][i] === m);
  });
  document.getElementById('keypadSimple').style.display = m==='simple' ? 'grid' : 'none';
  document.getElementById('keypadSci').style.display    = m==='sci'    ? 'grid' : 'none';
  document.getElementById('keypadProg').style.display   = m==='prog'   ? 'grid' : 'none';
  document.getElementById('progBases').style.display    = m==='prog'   ? 'grid' : 'none';

  if (m === 'prog') {
    setBase(progBase);
    updateProgBases();
  }
  clearAll();
}

// ── PROG BASE
function setBase(base) {
  progBase = base;
  document.querySelectorAll('.base-row').forEach((r,i) => {
    r.classList.toggle('active-base', ['hex','dec','bin'][i] === base);
  });
  // disable digits above base
  const hexKeys = ['hA','hB','hC','hD','hE','hF'];
  const decKeys = ['p8','p9'];
  hexKeys.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('key-disabled', base !== 'hex');
  });
  decKeys.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('key-disabled', base === 'bin');
  });
  const p2 = document.getElementById('p2');
  const p3 = document.getElementById('p3');
  const p4 = document.getElementById('p4');
  const p5 = document.getElementById('p5');
  const p6 = document.getElementById('p6');
  const p7 = document.getElementById('p7');
  if(p2) p2.classList.toggle('key-disabled', base === 'bin');
  if(p3) p3.classList.toggle('key-disabled', base === 'bin');
  if(p4) p4.classList.toggle('key-disabled', base === 'bin');
  if(p5) p5.classList.toggle('key-disabled', base === 'bin');
  if(p6) p6.classList.toggle('key-disabled', base === 'bin');
  if(p7) p7.classList.toggle('key-disabled', base === 'bin');
}

function appendHex(ch) {
  if (progBase !== 'hex') return;
  if (justCalc) { expr = ''; justCalc = false; }
  expr += ch;
  exprEl.textContent = expr;
  liveEvalProg();
}

function updateProgBases() {
  try {
    const n = parseInt(getProgDecVal());
    if (isNaN(n)) { setProgBase('0','0','0'); return; }
    document.getElementById('hexVal').textContent = n.toString(16).toUpperCase();
    document.getElementById('decVal').textContent = n.toString(10);
    document.getElementById('binVal').textContent = n.toString(2);
  } catch(e) { setProgBase('ERR','ERR','ERR'); }
}

function setProgBase(h,d,b) {
  document.getElementById('hexVal').textContent = h;
  document.getElementById('decVal').textContent = d;
  document.getElementById('binVal').textContent = b;
}

function getProgDecVal() {
  // parse expr by base
  const raw = expr.trim();
  if (!raw) return '0';
  // simple single number
  try {
    if (progBase === 'hex') return parseInt(raw, 16);
    if (progBase === 'bin') return parseInt(raw, 2);
    return parseInt(raw, 10);
  } catch(e) { return '0'; }
}

function liveEvalProg() {
  try {
    let e = expr;
    if (progBase === 'hex') {
      // replace hex tokens with dec for eval
      e = e.replace(/[0-9A-Fa-f]+/g, m => parseInt(m, 16));
    } else if (progBase === 'bin') {
      e = e.replace(/[01]+/g, m => parseInt(m, 2));
    }
    const r = Function('"use strict"; return (' + e + ')')();
    const n = Math.trunc(r);
    if (progBase === 'hex') setResult(n.toString(16).toUpperCase());
    else if (progBase === 'bin') setResult(n.toString(2));
    else setResult(n.toString(10));
    updateProgBases();
  } catch(e) {}
}

// ── INPUT
function appendNum(n) {
  rippleEffect(event);
  if (justCalc) { expr = ''; justCalc = false; }
  expr += n;
  exprEl.textContent = expr;
  // live preview
  try {
    const r = Function('"use strict"; return (' + sanitize(expr) + ')')();
    if (isFinite(r)) setResult(formatNum(r));
  } catch(e) {}
}

function appendOp(op) {
  rippleEffect(event);
  justCalc = false;
  // Replace trailing op
  expr = expr.replace(/[\+\-\*\/\^%\|&]{1,2}$/, '') + opSymbol(op);
  exprEl.textContent = expr;
}

function appendDot() {
  rippleEffect(event);
  if (justCalc) { expr = lastResult; justCalc = false; }
  // don't double-dot current number
  const parts = expr.split(/[\+\-\*\/\^%\(\)]/);
  const last = parts[parts.length-1];
  if (last.includes('.')) return;
  if (!expr || /[\+\-\*\/\^%\(]$/.test(expr)) expr += '0';
  expr += '.';
  exprEl.textContent = expr;
}

function appendConst(name) {
  rippleEffect(event);
  if (justCalc) { expr = ''; justCalc = false; }
  if (name === 'pi') expr += Math.PI;
  if (name === 'e')  expr += Math.E;
  exprEl.textContent = expr;
  try {
    const r = Function('"use strict"; return (' + sanitize(expr) + ')')();
    if (isFinite(r)) setResult(formatNum(r));
  } catch(e) {}
}

function opSymbol(op) {
  const map = {'/':'/',  '*':'*', '+':'+', '-':'-', '^':'**', '%':'%',
               '(':'(', ')':')', '<<':'<<', '>>':'>>', '&':'&', '|':'|', '^b':'^'};
  return op;
}

function clearAll() {
  rippleEffect(event);
  expr = ''; lastResult = '0'; justCalc = false;
  updateDisplay();
}

function del() {
  rippleEffect(event);
  if (justCalc) { expr = ''; lastResult = '0'; justCalc = false; updateDisplay(); return; }
  expr = expr.slice(0, -1);
  exprEl.textContent = expr;
  if (!expr) { setResult('0'); }
}

function toggleSign() {
  rippleEffect(event);
  if (lastResult === '0') return;
  const n = parseFloat(lastResult) * -1;
  lastResult = formatNum(n);
  // rebuild expr
  if (justCalc) { expr = lastResult; justCalc = false; }
  else {
    // negate last number in expr
    expr = expr.replace(/([\d\.]+)$/, m => String(-parseFloat(m)));
  }
  updateDisplay();
}

// ── CALCULATE
function calculate() {
  rippleEffect(event);
  if (!expr) return;
  const origExpr = expr;
  try {
    let e = sanitize(expr);
    const r = Function('"use strict"; return (' + e + ')')();
    if (!isFinite(r)) throw new Error('Infinity');
    const formatted = formatNum(r);
    addHistory(origExpr + ' =', formatted);
    lastResult = formatted;
    expr = '';
    exprEl.textContent = origExpr;
    setResult(formatted);
    justCalc = true;
    if (mode === 'prog') updateProgBases();
  } catch(err) {
    setResult('Error', true);
    setTimeout(() => { setResult('0'); expr = ''; exprEl.textContent = ''; }, 1200);
  }
}

function sanitize(e) {
  return e
    .replace(/÷/g,'/')
    .replace(/×/g,'*')
    .replace(/−/g,'-')
    .replace(/\^/g,'**')
    .replace(/π/g, Math.PI)
    .replace(/e(?![0-9])/g, Math.E);
}

// ── SCIENTIFIC FUNCTIONS
function applyFn(fn) {
  rippleEffect(event);
  let val = parseFloat(lastResult);
  if (isNaN(val) && expr) {
    try { val = Function('"use strict"; return (' + sanitize(expr) + ')')(); } catch(e) {}
  }
  if (isNaN(val)) return;

  let result;
  const deg2rad = v => v * Math.PI / 180;

  switch(fn) {
    case 'sin':  result = Math.sin(deg2rad(val)); break;
    case 'cos':  result = Math.cos(deg2rad(val)); break;
    case 'tan':  result = Math.tan(deg2rad(val)); break;
    case 'log':  result = Math.log10(val); break;
    case 'ln':   result = Math.log(val); break;
    case 'sqrt': result = Math.sqrt(val); break;
    case 'sq':   result = val * val; break;
    case 'inv':  result = 1 / val; break;
    case 'abs':  result = Math.abs(val); break;
    case 'fact': result = factorial(Math.round(val)); break;
    case 'not':  result = ~Math.trunc(val); break;
  }

  const formatted = formatNum(result);
  addHistory(fn + '(' + formatNum(val) + ') =', formatted);
  lastResult = formatted;
  expr = '';
  exprEl.textContent = fn + '(' + formatNum(val) + ')';
  setResult(formatted);
  justCalc = true;
}

function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  if (n > 20) return Infinity;
  return n * factorial(n-1);
}

// ── MEMORY
function memStore() { memory = parseFloat(lastResult); updateMemIndicator(); }
function memRecall() {
  if (justCalc) { expr = ''; justCalc = false; }
  expr += memory;
  exprEl.textContent = expr;
  setResult(formatNum(memory));
}
function memAdd() { memory += parseFloat(lastResult); updateMemIndicator(); }
function memSub() { memory -= parseFloat(lastResult); updateMemIndicator(); }
function memClear() { memory = 0; updateMemIndicator(); }
function updateMemIndicator() {
  memEl.classList.toggle('visible', memory !== 0);
}

// ── HISTORY
function addHistory(e, r) {
  history.unshift({ expr: e, result: r });
  if (history.length > 20) history.pop();
  renderHistory();
}

function renderHistory() {
  const panel = document.getElementById('historyPanel');
  histEmpty.style.display = history.length ? 'none' : 'block';
  // remove old items
  panel.querySelectorAll('.history-item').forEach(el => el.remove());
  history.forEach(h => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `<span>${h.expr}</span><span class="h-res">${h.result}</span>`;
    div.onclick = () => {
      expr = h.result;
      lastResult = h.result;
      justCalc = true;
      updateDisplay();
      toggleHistory(false);
    };
    panel.appendChild(div);
  });
}

function toggleHistory(force) {
  const open = typeof force === 'boolean' ? force : !histPanel.classList.contains('open');
  histPanel.classList.toggle('open', open);
}

// ── FORMAT
function formatNum(n) {
  if (isNaN(n)) return 'Error';
  if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
  // avoid floating point noise
  const s = parseFloat(n.toPrecision(12));
  if (Math.abs(s) >= 1e12 || (Math.abs(s) < 1e-7 && s !== 0)) {
    return s.toExponential(6);
  }
  return String(+s.toPrecision(10));
}

// ── RIPPLE
function rippleEffect(e) {
  if (!e || !e.currentTarget) return;
  const btn = e.currentTarget;
  const r = document.createElement('span');
  r.className = 'ripple-el';
  const rect = btn.getBoundingClientRect();
  r.style.left = ((e.clientX||rect.left+rect.width/2) - rect.left) + 'px';
  r.style.top  = ((e.clientY||rect.top+rect.height/2) - rect.top) + 'px';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// ── KEYBOARD SUPPORT
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const k = e.key;
   if ('0123456789'.includes(k)) { appendNum(k); return; }
  if (k === '+') { appendOp('+'); return; }
  if (k === '-') { appendOp('-'); return; }
  if (k === '*') { appendOp('*'); return; }
  if (k === '/') { e.preventDefault(); appendOp('/'); return; }
  if (k === '%') { appendOp('%'); return; }
  if (k === '.') { appendDot(); return; }
  if (k === 'Enter' || k === '=') { calculate(); return; }
  if (k === 'Backspace') { del(); return; }
  if (k === 'Escape') { clearAll(); return; }
  if (k === '(') { appendOp('('); return; }
  if (k === ')') { appendOp(')'); return; }
});

// init
updateDisplay();
