(() => {
    const prevEl = document.getElementById('previous');
    const currEl = document.getElementById('currentValue');
    const clearBtn = document.getElementById('clearAll');
    const keys = document.querySelectorAll('.key');

    let current = '0';
    let previous = '';
    let lastEval = null;
    let justEvaluated = false;

    function render(){
        prevEl.textContent = previous || '0';
        // animate scale when long number
        const display = String(current);
        currEl.textContent = display;
        // small animation on change
        currEl.animate([{transform:'translateY(8px) scale(.98)', opacity:0},{transform:'translateY(0)',opacity:1}],{duration:220,easing:'cubic-bezier(.2,.9,.3,1)'});
        // shrink font if overflow-ish
        const len = display.length;
        currEl.style.fontSize = (len > 12 ? Math.max(36 - (len-12)*1.6, 18) : '') ;
    }

    function pushRipple(btn){
        const r = document.createElement('span');
        r.className = 'ripple';
        btn.appendChild(r);
        r.style.opacity = '0.08';
        setTimeout(()=> r.style.opacity='0', 200);
        setTimeout(()=> r.remove(), 480);
    }

    function sanitize(expr){
        // allow digits, operators, parentheses, decimal and spaces
        if(!/^[0-9+\-*/().% \t\r\n]*$/.test(expr)) return null;
        // collapse repeated operators like "--" handled by eval - keep as-is
        return expr;
    }

    function evaluateExpression(expr){
        const s = sanitize(expr);
        if(s === null) return null;
        // replace unicode operators if present
        const safe = s.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/%/g, '/100');
        try {
            // Use Function rather than eval for slight isolation
            const fn = new Function('return (' + safe + ')');
            const res = fn();
            if(!isFinite(res)) return null;
            return Number(Math.round((res + Number.EPSILON) * 1e12) / 1e12); // round to sensible precision
        } catch(e){
            return null;
        }
    }

    function inputNum(n){
        if(justEvaluated && /[0-9.]/.test(n)){
            // start new
            current = n === '.' ? '0.' : n;
            justEvaluated = false;
            render();
            return;
        }
        if(current === '0' && n !== '.') current = n;
        else if(n === '.' && current.includes('.')) return;
        else current = current + n;
        render();
    }

    function inputOp(op){
        if(justEvaluated){
            // continue from lastEval
            current = String(lastEval);
            justEvaluated = false;
        }
        // move current to previous with operator
        if(previous && /[+\-*/]$/.test(previous)){
            // replace last operator
            previous = previous.slice(0, -1) + op;
        } else {
            previous = (previous ? previous + ' ' : '') + current + ' ' + op;
        }
        current = '0';
        render();
    }

    function doEquals(){
        let expr = '';
        if(previous){
            expr = previous + ' ' + current;
        } else {
            expr = current;
        }
        expr = expr.replace(/\s+/g,'');
        const result = evaluateExpression(expr);
        if(result === null){
            current = 'Error';
            previous = '';
        } else {
            previous = expr + ' =';
            current = String(result);
            lastEval = result;
            justEvaluated = true;
        }
        render();
    }

    function backspace(){
        if(justEvaluated){
            current = '0';
            justEvaluated = false;
            render();
            return;
        }
        if(current.length <= 1) current = '0';
        else current = current.slice(0, -1);
        render();
    }

    function percent(){
        // convert current to percentage
        const val = evaluateExpression(current);
        if(val === null) {
            current = 'Error'; render(); return;
        }
        current = String(val / 100);
        render();
    }

    function toggleSign(){
        if(current === '0' || current === 'Error') return;
        if(current.startsWith('-')) current = current.slice(1);
        else current = '-' + current;
        render();
    }

    function clearAll(){
        current = '0';
        previous = '';
        lastEval = null;
        justEvaluated = false;
        render();
    }

    // attach button handlers
    keys.forEach(k => {
        k.addEventListener('click', (e) => {
            pushRipple(k);
            const num = k.dataset.num;
            const op = k.dataset.op;
            const action = k.dataset.action;
            if(num !== undefined) inputNum(num);
            else if(op !== undefined) inputOp(op);
            else if(action){
                if(action === 'equals') doEquals();
                else if(action === 'back') backspace();
                else if(action === 'percent') percent();
                else if(action === 'toggle-sign') toggleSign();
            }
        });
    });

    clearBtn.addEventListener('click', () => {
        clearAll();
        clearBtn.animate([{transform:'scale(1.02)'},{transform:'scale(1)'}],{duration:180});
    });

    // keyboard support
    window.addEventListener('keydown', (ev) => {
        if(ev.key >= '0' && ev.key <= '9'){ inputNum(ev.key); ev.preventDefault(); return; }
        if(ev.key === '.') { inputNum('.'); ev.preventDefault(); return; }
        if(ev.key === 'Enter' || ev.key === '='){ doEquals(); ev.preventDefault(); return; }
        if(ev.key === 'Backspace'){ backspace(); ev.preventDefault(); return; }
        if(ev.key === 'Escape'){ clearAll(); ev.preventDefault(); return; }
        if(ev.key === '+' || ev.key === '-' || ev.key === '*' || ev.key === '/'){ inputOp(ev.key); ev.preventDefault(); return; }
        if(ev.key === '%'){ percent(); ev.preventDefault(); return; }
    });

    // initial render
    render();

    // small floating tilt on mousemove
    const wrap = document.querySelector('.calc-wrap');
    document.addEventListener('pointermove', (e) => {
        const r = wrap.getBoundingClientRect();
        const cx = r.left + r.width/2;
        const cy = r.top + r.height/2;
        const dx = (e.clientX - cx) / r.width;
        const dy = (e.clientY - cy) / r.height;
        wrap.style.transform = `perspective(900px) rotateX(${ -dy * 6 }deg) rotateY(${ dx * 6 }deg) translateZ(0)`;
    });
    document.addEventListener('pointerleave', ()=> wrap.style.transform = '');
})();