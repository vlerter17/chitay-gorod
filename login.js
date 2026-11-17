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

    // Переключение Вход/Регистрация
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

    // Переключение методов входа (Пароль / Код)
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

    // Отправка кода для входа
    const sendLoginCodeBtn = document.getElementById('sendLoginCodeBtn');
    sendLoginCodeBtn.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        if (!email || !email.includes('@')) return alert('Введите корректный email');
        
        sendLoginCodeBtn.disabled = true;
        sendLoginCodeBtn.textContent = '...';
        try {
            const resp = await fetch('/api/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // ВАЖНО: для сохранения сессии
                body: JSON.stringify({ email, action: "login" })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error);
            alert('Код отправлен на почту!');
            document.getElementById('loginCodeGroup').style.display = 'block';
        } catch (err) {
            alert(err.message);
        } finally {
            sendLoginCodeBtn.disabled = false;
            sendLoginCodeBtn.textContent = 'Отправить';
        }
    });

    // Обработка формы входа
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
                credentials: 'include', // ВАЖНО: сохраняет куки сессии
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
            errorEl.textContent = err.message;
        }
    });

    // ===== НОВАЯ ЛОГИКА РЕГИСТРАЦИИ =====
    const sendRegCodeBtn = document.getElementById('sendRegCodeBtn');
    sendRegCodeBtn.addEventListener('click', async () => {
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        if (!email || !email.includes('@')) return alert('Введите корректный email');
        
        sendRegCodeBtn.disabled = true;
        sendRegCodeBtn.textContent = '...';
        try {
            const resp = await fetch('/api/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, action: "register" })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error);
            alert('Код подтверждения отправлен на почту!');
            document.getElementById('verifyGroup').style.display = 'block';
        } catch (err) {
            alert(err.message);
        } finally {
            sendRegCodeBtn.disabled = false;
            sendRegCodeBtn.textContent = 'Получить код';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const password = document.getElementById('regPassword').value;
        const verifyCode = document.getElementById('verifyCode').value.trim();
        const errorEl = document.getElementById('registerError');

        if (!verifyCode) {
            errorEl.textContent = 'Сначала получите и введите код из почты';
            return;
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

            alert('Регистрация успешна! Теперь войдите в аккаунт.');
            tabs[0].click(); // Переключаемся на вкладку входа
        } catch (err) {
            errorEl.textContent = err.message;
        }
    });

    // Восстановление пароля
    document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
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
            alert('Ошибка запроса');
        }
    });
});
