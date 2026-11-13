document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('cursor');
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    document.querySelectorAll('a, button, input').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });

    const API_URL = 'http://localhost:5000';
    const redirect = new URLSearchParams(location.search).get('redirect') || 'index.html';

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');

    // ===== ИНДИКАТОР ПАРОЛЯ =====
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

    // ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
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

    function getUsers() {
        try { return JSON.parse(localStorage.getItem('cg_users') || '[]'); }
        catch (e) { return []; }
    }

    // ===== ВХОД =====
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');
        const users = getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) { errorEl.textContent = 'Неверный email или пароль'; return; }
        localStorage.setItem('cg_user', JSON.stringify({ name: user.name, email: user.email }));
        window.location.href = redirect;
    });

    // ===== РЕГИСТРАЦИЯ С ОТПРАВКОЙ КОДА =====
    const verifyGroup = document.getElementById('verifyGroup');
    const verifyCodeInput = document.getElementById('verifyCode');
    const regEmailInput = document.getElementById('regEmail');
    let codeWasSent = false;

    regEmailInput?.addEventListener('blur', async () => {
        const email = regEmailInput.value.trim().toLowerCase();
        const errorEl = document.getElementById('registerError');

        if (!email || !email.includes('@')) return;
        if (codeWasSent) return;

        errorEl.style.color = '#999';
        errorEl.textContent = 'Отправляем код на почту...';

        try {
            const resp = await fetch(`${API_URL}/api/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await resp.json();
            if (resp.ok) {
                codeWasSent = true;
                verifyGroup.style.display = 'block';
                errorEl.style.color = '#2ecc71';
                errorEl.textContent = 'Код отправлен! Проверьте почту и папку «Спам».';
            } else {
                errorEl.style.color = '#e74c3c';
                errorEl.textContent = data.error || 'Не удалось отправить код';
            }
        } catch (err) {
            errorEl.style.color = '#e74c3c';
            errorEl.textContent = 'Сервер недоступен. Запустите python server.py';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = regEmailInput.value.trim().toLowerCase();
        const password = regPassword.value;
        const errorEl = document.getElementById('registerError');
        errorEl.style.color = '#e74c3c';

        if (!codeWasSent) {
            errorEl.textContent = 'Сначала укажите email — мы отправим код.';
            return;
        }
        if (password.length < 6) {
            errorEl.textContent = 'Пароль должен быть не менее 6 символов';
            return;
        }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            errorEl.textContent = 'Пароль должен содержать буквы и цифры';
            return;
        }

        const enteredCode = (verifyCodeInput.value || '').trim();
        if (enteredCode.length !== 6) {
            errorEl.textContent = 'Введите 6-значный код из письма';
            return;
        }

        try {
            const resp = await fetch(`${API_URL}/api/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: enteredCode })
            });
            const data = await resp.json();
            if (!resp.ok) {
                errorEl.textContent = data.error || 'Неверный код';
                return;
            }
        } catch (err) {
            errorEl.textContent = 'Сервер недоступен. Проверьте, что python server.py запущен.';
            return;
        }

        const users = getUsers();
        if (users.some(u => u.email === email)) {
            errorEl.textContent = 'Пользователь с таким email уже существует';
            return;
        }
        users.push({ name, email, password });
        localStorage.setItem('cg_users', JSON.stringify(users));
        localStorage.setItem('cg_user', JSON.stringify({ name, email }));
        window.location.href = redirect;
    });
});