document.addEventListener('DOMContentLoaded', () => {
    // ===== КУРСОР =====
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

    // ===== ПЕРЕКЛЮЧЕНИЕ ВХОД / РЕГИСТРАЦИЯ =====
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
                generateCaptcha(); // Генерируем капчу при открытии регистрации
            }
        });
    });

    // ===== ПЕРЕКЛЮЧЕНИЕ МЕТОДОВ ВХОДА =====
    let loginMethod = 'password';
    const methodTabs = document.querySelectorAll('.method-tab');
    const passwordGroup = document.getElementById('passwordGroup');
    const loginCodeGroup = document.getElementById('loginCodeGroup');
    const submitBtn = document.getElementById('loginSubmitBtn');

    methodTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            methodTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loginMethod = tab.dataset.method;
            
            if (loginMethod === 'password') {
                passwordGroup.style.display = 'block';
                loginCodeGroup.style.display = 'none';
                submitBtn.textContent = 'Войти';
            } else {
                passwordGroup.style.display = 'none';
                loginCodeGroup.style.display = 'block';
                submitBtn.textContent = 'Войти по коду';
            }
        });
    });

    // ===== ОТПРАВКА КОДА ДЛЯ ВХОДА =====
    const sendLoginCodeBtn = document.getElementById('sendLoginCodeBtn');
    if (sendLoginCodeBtn) {
        sendLoginCodeBtn.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value.trim().toLowerCase();
            if (!email || !email.includes('@')) return showError('loginError', 'Введите корректный email');
            
            sendLoginCodeBtn.disabled = true;
            sendLoginCodeBtn.textContent = 'Отправка...';
            
            try {
                const resp = await fetch('/api/send-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, action: "login" })
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error);
                alert('Код отправлен на почту!');
                loginCodeGroup.style.display = 'block';
            } catch (err) {
                showError('loginError', err.message);
            } finally {
                sendLoginCodeBtn.disabled = false;
                sendLoginCodeBtn.textContent = 'Отправить';
            }
        });
    }

    // ===== ОБРАБОТКА ФОРМЫ ВХОДА =====
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim().toLowerCase();
            const errorEl = document.getElementById('loginError');
            const totpGroup = document.getElementById('totpGroup');
            const totpCode = document.getElementById('totpCodeInput').value;

            errorEl.textContent = 'Загрузка...';

            try {
                let endpoint = '/api/login';
                let bodyData = { email, totp_code: totpCode };

                if (loginMethod === 'password') {
                    bodyData.password = document.getElementById('loginPassword').value;
                } else {
                    endpoint = '/api/login-by-code';
                    bodyData.code = document.getElementById('loginCodeInput').value;
                }

                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(bodyData)
                });
                const data = await resp.json();
                
                if (!resp.ok) {
                    if (data.error === '2FA_REQUIRED') {
                        totpGroup.style.display = 'block';
                        throw new Error('Введите код из Google Authenticator');
                    }
                    throw new Error(data.error);
                }
                
                window.location.href = redirect;
            } catch (err) {
                showError('loginError', err.message);
            }
        });
    }

    // ===== ЛОГИКА КАПЧИ ДЛЯ РЕГИСТРАЦИИ =====
    let captchaAnswer = 0;
    function generateCaptcha() {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        captchaAnswer = num1 + num2;
        const qEl = document.getElementById('captchaQuestion');
        if (qEl) qEl.textContent = `Сколько будет ${num1} + ${num2}?`;
        const iEl = document.getElementById('captchaInput');
        if (iEl) iEl.value = '';
    }
    
    const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
    if (refreshCaptchaBtn) {
        refreshCaptchaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            generateCaptcha();
        });
    }

    // ===== ОТПРАВКА КОДА ДЛЯ РЕГИСТРАЦИИ =====
    const sendRegCodeBtn = document.getElementById('sendRegCodeBtn');
    if (sendRegCodeBtn) {
        sendRegCodeBtn.addEventListener('click', async () => {
            const email = document.getElementById('regEmail').value.trim().toLowerCase();
            const name = document.getElementById('regName').value.trim();
            const captchaInput = document.getElementById('captchaInput');
            const captchaVal = parseInt(captchaInput.value);
            const errorEl = document.getElementById('registerError');

            if (!email || !email.includes('@')) return showError('registerError', 'Введите корректный email');
            if (!name) return showError('registerError', 'Введите ваше имя');
            if (isNaN(captchaVal) || captchaVal !== captchaAnswer) {
                captchaInput.classList.add('shake');
                setTimeout(() => captchaInput.classList.remove('shake'), 500);
                return showError('registerError', 'Неверный ответ на проверочный вопрос');
            }

            sendRegCodeBtn.disabled = true;
            sendRegCodeBtn.textContent = 'Отправка...';
            errorEl.textContent = '';
            document.getElementById('registerSuccess').textContent = '';

            try {
                const resp = await fetch('/api/send-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, action: "register" })
                });
                const data = await resp.json();

                if (resp.status === 409 && data.exists) {
                    // КРАСИВОЕ СООБЩЕНИЕ, ЕСЛИ АККАУНТ УЖЕ ЕСТЬ
                    errorEl.innerHTML = `
                        <div class="exists-warning">
                            <span>⚠️</span>
                            <p>${data.message || 'Этот email уже зарегистрирован. Хотите войти?'}</p>
                            <button type="button" class="btn-switch-login" onclick="document.querySelector('[data-tab=login]').click()">Перейти ко входу</button>
                        </div>
                    `;
                } else if (!resp.ok) {
                    throw new Error(data.error);
                } else {
                    // УСПЕХ: Показываем отдельную плашку для кода
                    document.getElementById('regStep1').style.display = 'none';
                    document.getElementById('regStep2').style.display = 'block';
                    document.getElementById('regEmailDisplay').textContent = email;
                    document.getElementById('registerSuccess').textContent = data.message || 'Код успешно отправлен!';
                }
            } catch (err) {
                showError('registerError', err.message);
            } finally {
                sendRegCodeBtn.disabled = false;
                sendRegCodeBtn.textContent = 'Получить код';
            }
        });
    }

    // Повторная отправка кода
    const resendCodeLink = document.getElementById('resendCodeLink');
    if (resendCodeLink) {
        resendCodeLink.addEventListener('click', async (e) => {
            e.preventDefault();
            if (sendRegCodeBtn) sendRegCodeBtn.click();
        });
    }

    // ===== ОБРАБОТКА ФОРМЫ РЕГИСТРАЦИИ =====
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('regEmail').value.trim().toLowerCase();
            const name = document.getElementById('regName').value.trim();
            const password = document.getElementById('regPassword').value;
            const verifyCode = document.getElementById('verifyCode').value.trim();
            const errorEl = document.getElementById('registerError');

            if (!verifyCode || verifyCode.length !== 6) {
                return showError('registerError', 'Введите 6-значный код из письма');
            }

            errorEl.textContent = 'Проверка кода...';
            try {
                // 1. Проверяем код
                const verifyResp = await fetch('/api/verify-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, code: verifyCode })
                });
                const verifyData = await verifyResp.json();
                if (!verifyResp.ok) throw new Error(verifyData.error);

                // 2. Регистрируем
                errorEl.textContent = 'Создание аккаунта...';
                const regResp = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name, email, password })
                });
                const regData = await regResp.json();
                if (!regResp.ok) throw new Error(regData.error);

                alert('🎉 Регистрация успешна! Добро пожаловать в Читай-Город.');
                window.location.href = redirect;
            } catch (err) {
                showError('registerError', err.message);
            }
        });
    }

    // ===== ВОССТАНОВЛЕНИЕ ПАРОЛЯ =====
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt('Введите ваш email для восстановления:');
            if (!email) return;
            try {
                const resp = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email })
                });
                const data = await resp.json();
                alert(data.message);
            } catch (err) {
                alert('Ошибка запроса: ' + err.message);
            }
        });
    }

    // Вспомогательная функция для показа ошибок
    function showError(elementId, message) {
        const el = document.getElementById(elementId);
        if (el) {
            el.innerHTML = `<span class="error-text">❌ ${message}</span>`;
        }
    }
});
