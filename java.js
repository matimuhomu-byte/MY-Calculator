let expr = "";
let shiftOn = false;
let degMode = true;
let memory = 0;
let lastAns = 0;

const exprEl = document.getElementById('expr');
const resultEl = document.getElementById('result');
const shiftBtn = document.getElementById('shift-btn');
const stShift = document.getElementById('st-shift');
const stDeg = document.getElementById('st-deg');
const stM = document.getElementById('st-m');

const SHIFT_MAP = {
    sin: 'asin', cos: 'acos', tan: 'atan',
    log: '10^', ln: 'e^', sqrt: 'sq'
};

function render() {
    exprEl.textContent = expr.length ? prettify(expr) : '\u00a0';
    stShift.className = shiftOn ? 'lit' : '';
    stDeg.className = degMode ? 'lit' : '';
    stM.className = memory !== 0 ? 'lit' : '';
    shiftBtn.classList.toggle('active', shiftOn);
}

function prettify(s) {
    return s
        .replace(/\*/g, '\u00d7')
        .replace(/\//g, '\u00f7')
        .replace(/pi/g, '\u03c0')
        .replace(/sqrt/g, '\u221a')
        .replace(/asin/g, 'sin\u207b\u00b9')
        .replace(/acos/g, 'cos\u207b\u00b9')
        .replace(/atan/g, 'tan\u207b\u00b9');
}

function press(v) {
    expr += v;
    render();
}

function fn(name) {
    const target = shiftOn ? (SHIFT_MAP[name] || name) : name;
    if (target === '10^') { expr += '10^('; }
    else if (target === 'e^') { expr += 'e^('; }
    else if (target === 'sq') { expr += 'sq('; }
    else { expr += target + '('; }
    if (shiftOn) { shiftOn = false; }
    render();
}

function toggleShift() {
    shiftOn = !shiftOn;
    render();
}

function toggleDeg() {
    degMode = !degMode;
    render();
}

function backspace() {
    expr = expr.slice(0, -1);
    render();
}

function clearAll() {
    expr = "";
    resultEl.textContent = "0";
    render();
}

function memAdd() {
    const val = evaluate(expr || resultEl.textContent);
    if (val !== null) { memory += val; render(); }
}

function memRecall() {
    press('(' + memory + ')');
}

// ---- Expression evaluator (recursive-descent, no eval) ----
function evaluate(source) {
    try {
        let s = source
            .replace(/Ans/g, '(' + lastAns + ')')
            .replace(/pi/g, 'PI')
            .replace(/\bsq\(/g, 'sq(');

        let i = 0;

        function peek() { return s[i]; }
        function eat(ch) {
            if (s[i] !== ch) throw new Error('Expected ' + ch);
            i++;
        }
        function skipWs() { while (s[i] === ' ') i++; }

        function parseExpr() {
            skipWs();
            let v = parseTerm();
            skipWs();
            while (peek() === '+' || peek() === '-') {
                const op = s[i++];
                const rhs = parseTerm();
                v = op === '+' ? v + rhs : v - rhs;
                skipWs();
            }
            return v;
        }

        function parseTerm() {
            skipWs();
            let v = parseUnary();
            skipWs();
            while (peek() === '*' || peek() === '/') {
                const op = s[i++];
                const rhs = parseUnary();
                v = op === '*' ? v * rhs : v / rhs;
                skipWs();
            }
            return v;
        }

        function parseUnary() {
            skipWs();
            if (peek() === '-') { i++; return -parseUnary(); }
            if (peek() === '+') { i++; return parseUnary(); }
            return parsePow();
        }

        function parsePow() {
            let v = parsePostfix();
            skipWs();
            if (peek() === '^') {
                i++;
                const rhs = parseUnary();
                v = Math.pow(v, rhs);
            }
            return v;
        }

        function parsePostfix() {
            let v = parseAtom();
            skipWs();
            while (peek() === '!') {
                i++;
                v = factorial(v);
                skipWs();
            }
            return v;
        }

        function parseAtom() {
            skipWs();
            if (peek() === '(') {
                i++;
                const v = parseExpr();
                skipWs();
                eat(')');
                return v;
            }
            const funcNames = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'sq', '10^', 'e^'];
            for (const name of funcNames) {
                if (s.startsWith(name, i)) {
                    i += name.length;
                    skipWs();
                    eat('(');
                    const arg = parseExpr();
                    skipWs();
                    eat(')');
                    return applyFunc(name, arg);
                }
            }
            if (s.startsWith('PI', i)) { i += 2; return Math.PI; }
            if (s[i] === 'e' && !/[a-zA-Z]/.test(s[i + 1] || '')) { i += 1; return Math.E; }

            let start = i;
            while (/[0-9.]/.test(s[i] || '')) i++;
            if (i === start) throw new Error('Unexpected token at ' + i);
            return parseFloat(s.slice(start, i));
        }

        function toRad(x) { return degMode ? x * Math.PI / 180 : x; }
        function fromRad(x) { return degMode ? x * 180 / Math.PI : x; }

        function applyFunc(name, arg) {
            switch (name) {
                case 'sin': return Math.sin(toRad(arg));
                case 'cos': return Math.cos(toRad(arg));
                case 'tan': return Math.tan(toRad(arg));
                case 'asin': return fromRad(Math.asin(arg));
                case 'acos': return fromRad(Math.acos(arg));
                case 'atan': return fromRad(Math.atan(arg));
                case 'log': return Math.log10(arg);
                case 'ln': return Math.log(arg);
                case 'sqrt': return Math.sqrt(arg);
                case 'sq': return arg * arg;
                case '10^': return Math.pow(10, arg);
                case 'e^': return Math.exp(arg);
            }
        }

        function factorial(n) {
            if (n < 0 || !Number.isInteger(n)) return NaN;
            let r = 1;
            for (let k = 2; k <= n; k++) r *= k;
            return r;
        }

        const result = parseExpr();
        skipWs();
        if (i !== s.length) throw new Error('Unexpected trailing input');
        if (!isFinite(result)) return null;
        return result;
    } catch (e) {
        return null;
    }
}

function formatResult(n) {
    if (Object.is(n, -0)) n = 0;
    if (Math.abs(n) !== 0 && (Math.abs(n) < 1e-9 || Math.abs(n) >= 1e12)) {
        return n.toExponential(6).replace(/e\+?(-?)(\d+)/, ' \u00d710^$1$2');
    }
    let s = Math.round(n * 1e10) / 1e10;
    return String(s);
}

function calculate() {
    if (!expr.length) return;
    const val = evaluate(expr);
    if (val === null) {
        resultEl.textContent = 'Math ERROR';
        return;
    }
    lastAns = val;
    resultEl.textContent = formatResult(val);
    render();
}

document.addEventListener('keydown', (e) => {
    const k = e.key;
    if (/[0-9.+\-*/^()]/.test(k)) { press(k); e.preventDefault(); }
    else if (k === 'Enter' || k === '=') { calculate(); e.preventDefault(); }
    else if (k === 'Backspace') { backspace(); e.preventDefault(); }
    else if (k === 'Escape') { clearAll(); e.preventDefault(); }
});

render();