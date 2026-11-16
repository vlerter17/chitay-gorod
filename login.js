document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('cursor');
    if (cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
        document.querySelectorAll('a, button, input').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });
    }

    const redirect = new URLSearchParams(location.search).get('redirect') || 'index.html';
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');

    // ИНДИКАТОР ПАРОЛЯ
    const regPassword = document.getElementById('regPassword');
    const strengthBar = document.createElement('div');
    strengthBar.className = 'password-strength';
    strengthBar.style.display = 'none';
    strengthBar.innerHTML = '<div class="password-strength__bar"></div><span class="password-strength__label"></span>';
    if (regPassword) regPassword.parentNode.appendChild(strengthBar);

    function updateStrength() {
        const val = regPassword.value;
        if (val.length === 0) { strengthBar.style.display = 'none'; return; }
        strengthBar.style.display = 'flex';
        const bar = strengthBar.querySelector('.password-strength__bar');
        const label = strengthBar.querySelector('.password-strength__label');
        let score = 0;
        if (val.length >= 6) score++;
        if (val.length >= 10) score++;
        if (/[A-Za-z]/.test(val)) score++;
        if (/\d/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;
        const levels = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Сильный', 'Отличный'];
        const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60', '#2ecc71'];
        const idx = Math.min(score, 5);
        bar.style.width = (idx * 20) + '%';
        bar.style.background = colors[idx];
        label.textContent = levels[idx];
        label.style.color = colors[idx];
    }
    if (regPassword) regPassword.addEventListener('input', updateStrength);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.tab === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
        });
    });

    // ВХОД
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');

        try {
            const resp = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error);
            window.location.href = redirect;
        } catch (err) {
            errorEl.textContent = err.message || 'Ошибка входа';
        }
    });

    // РЕГИСТРАЦИЯ
    const verifyGroup = document.getElementById('verifyGroup');
    const verifyCodeInput = document.getElementById('verifyCode');
    const regEmailInput = document.getElementById('regEmail');
    let codeWasSent = false;

    regEmailInput?.addEventListener('blur', async () => {
        const email = regEmailInput.value.trim().toLowerCase();
        const errorEl = document.getElementById('registerError');
        if (!email || !email.includes('@') || codeWasSent) return;

        errorEl.style.color = '#999';
        errorEl.textContent = 'Отправляем код...';

        try {
            const resp = await fetch('/api/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await resp.json();
            if (resp.ok) {
                codeWasSent = true;
                verifyGroup.style.display = 'block';
                errorEl.style.color = '#2ecc71';
                errorEl.textContent = 'Код отправлен!';
            } else {
                errorEl.style.color = '#e74c3c';
                errorEl.textContent = data.error || 'Ошибка';
            }
        } catch (err) {
            errorEl.style.color = '#e74c3c';
            errorEl.textContent = 'Сервер недоступен.';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = regEmailInput.value.trim().toLowerCase();
        const password = regPassword.value;
        const errorEl = document.getElementById('registerError');
        errorEl.style.color = '#e74c3c';

        if (!codeWasSent) return errorEl.textContent = 'Сначала укажите email.';
        if (password.length < 6) return errorEl.textContent = 'Пароль слишком короткий';
        
        const enteredCode = (verifyCodeInput.value || '').trim();
        if (enteredCode.length !== 6) return errorEl.textContent = 'Введите 6-значный код';

        try {
            const verifyResp = await fetch('/api/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: enteredCode })
            });
            if (!verifyResp.ok) {
                const d = await verifyResp.json();
                throw new Error(d.error || 'Неверный код');
            }

            const regResp = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const regData = await regResp.json();
            if (!regResp.ok) throw new Error(regData.error);

            await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            window.location.href = redirect;
        } catch (err) {
            errorEl.textContent = err.message;
        }
    });

    // ЗАБЫЛИ ПАРОЛЬ
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
        forgotLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt('Введите ваш email для восстановления:');
            if (!email) return;
            
            try {
                const resp = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await resp.json();
                alert(data.message || 'Проверьте почту');
            } catch (err) {
                alert('Ошибка отправки запроса');
            }
        });
    }
});