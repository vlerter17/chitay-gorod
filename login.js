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
        sendLogin
