// admin-trigger.js — Konami-код + модалка входа в админку
(function () {
    'use strict';

    // Относительные пути: сайт и сервер на одном домене (Netrun).
    // Если сайт на GitHub Pages, а сервер на Netrun — замените на 'https://ваш-сервер.netrun.io'
    const API_BASE = '';

    const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','4','5','6','Enter'];
    let buffer = [];

    document.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        buffer.push(e.key);
        if (buffer.length > KONAMI.length) buffer.shift();

        if (buffer.length === KONAMI.length && buffer.every((k, i) => k === KONAMI[i])) {
            buffer = [];
            openAdminModal();
        }
    });

    let modalEl = null;

    function buildModal() {
        const div = document.createElement('div');
        div.className = 'admin-modal';
        div.id = 'adminModal';
        div.innerHTML = `
            <div class="admin-modal__box">
                <button class="admin-modal__close" id="adminModalClose">×</button>
                <h2 class="admin-modal__title">Вход в панель</h2>
                <p class="admin-modal__subtitle" id="adminModalSubtitle">Проверяем статус…</p>
                <div id="adminModalStep1" style="display:none;">
                    <label class="admin-modal__label" id="adminModalLabel">Код из Aegis</label>
                    <input class="admin-modal__input" id="adminModalInput" maxlength="60" autocomplete="one-time-code">
                    <button class="admin-modal__btn" id="adminModalSubmit">Войти</button>
                </div>
                <div id="adminModalError" class="admin-modal__error"></div>
            </div>
        `;
        document.body.appendChild(div);
        return div;
    }

    function injectStyles() {
        if (document.getElementById('adminModalStyles')) return;
        const style = document.createElement('style');
        style.id = 'adminModalStyles';
        style.textContent = `
            .admin-modal {
                position: fixed; inset: 0; z-index: 99999;
                background: rgba(0,0,0,0.85);
                display: none; justify-content: center; align-items: center;
                padding: 20px;
                font-family: Georgia, serif;
            }
            .admin-modal.active { display: flex; }
            .admin-modal__box {
                background: #1a1a2e; border-radius: 16px;
                padding: 30px 30px 25px; max-width: 440px; width: 100%;
                position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.6);
            }
            .admin-modal__close {
                position: absolute; top: 10px; right: 14px;
                background: transparent; border: none; color: #e8d5b7;
                font-size: 28px; cursor: pointer; line-height: 1;
            }
            .admin-modal__title { color: #e8d5b7; font-size: 24px; margin-bottom: 6px; }
            .admin-modal__subtitle { color: #999; font-size: 14px; margin-bottom: 18px; line-height: 1.5; }
            .admin-modal__label { display: block; color: #ccc; font-size: 14px; margin-bottom: 8px; }
            .admin-modal__input {
                width: 100%; padding: 14px 16px;
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 10px; color: #fff; font-size: 16px;
                outline: none; margin-bottom: 12px;
                font-family: inherit; letter-spacing: 1px;
            }
            .admin-modal__input:focus { border-color: #667eea; }
            .admin-modal__btn {
                width: 100%; padding: 14px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none; border-radius: 10px; color: #fff;
                font-size: 16px; font-weight: bold; cursor: pointer;
                font-family: inherit; transition: transform 0.2s;
            }
            .admin-modal__btn:hover { transform: translateY(-2px); }
            .admin-modal__btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .admin-modal__error {
                color: #e74c3c; font-size: 14px;
                margin-top: 12px; min-height: 18px; line-height: 1.4;
            }
            .admin-modal__qr {
                display: block; margin: 15px auto;
                background: #fff; padding: 10px; border-radius: 10px;
                width: 220px; height: 220px;
            }
            .admin-modal__secret {
                background: #131322; color: #e8d5b7;
                padding: 10px 14px; border-radius: 8px;
                font-family: monospace; font-size: 13px;
                word-break: break-all; margin-bottom: 12px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }

    function showError(msg) {
        const el = document.getElementById('adminModalError');
        if (el) el.textContent = msg || '';
    }

    async function openAdminModal() {
        injectStyles();
        if (!modalEl) modalEl = buildModal();

        modalEl.classList.add('active');
        showError('');
        document.getElementById('adminModalStep1').style.display = 'none';
        const subtitle = document.getElementById('adminModalSubtitle');
        subtitle.textContent = 'Проверяем статус…';

        document.getElementById('adminModalClose').onclick = () => modalEl.classList.remove('active');

        try {
            const resp = await fetch(`${API_BASE}/api/admin/status`);
            const data = await resp.json();
            const step1 = document.getElementById('adminModalStep1');
            const label = document.getElementById('adminModalLabel');
            const input = document.getElementById('adminModalInput');
            const submit = document.getElementById('adminModalSubmit');

            input.value = '';
            input.maxLength = data.configured ? 6 : 60;
            input.setAttribute('inputmode', data.configured ? 'numeric' : 'text');

            if (!data.configured) {
                subtitle.textContent = 'Панель ещё не настроена. Введите секретное слово для создания доступа.';
                label.textContent = 'Секретное слово';
                submit.textContent = 'Создать доступ';
            } else {
                subtitle.textContent = 'Введите 6-значный код из Aegis (Google Authenticator).';
                label.textContent = 'Код из Aegis';
                submit.textContent = 'Войти';
            }
            step1.style.display = 'block';
            input.focus();

            submit.onclick = () => handleSubmit(data.configured, input, submit, step1);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') handleSubmit(data.configured, input, submit, step1);
            };
        } catch (err) {
            subtitle.textContent = 'Сервер недоступен.';
            showError(err.message || 'Ошибка сети');
        }
    }

    async function handleSubmit(configured, input, submit, step1) {
        const value = input.value.trim();
        if (!value) { showError('Введите значение'); return; }

        submit.disabled = true;
        showError('');

        try {
            if (!configured) {
                const resp = await fetch(`${API_BASE}/api/admin/setup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret_word: value })
                });
                const data = await resp.json();

                if (!resp.ok) {
                    showError(data.error || 'Неверное секретное слово');
                    submit.disabled = false;
                    return;
                }
                showQrStep(data.qr_png_base64, data.secret, step1, input, submit);
            } else {
                const resp = await fetch(`${API_BASE}/api/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: value })
                });
                const data = await resp.json();

                if (!resp.ok) {
                    showError(data.error || 'Неверный код');
                    submit.disabled = false;
                    return;
                }
                localStorage.setItem('cg_admin_token', data.token);
                window.location.href = 'admin.html';
            }
        } catch (err) {
            showError('Ошибка сети. Проверьте подключение.');
            submit.disabled = false;
        }
    }

    function showQrStep(qrBase64, secret, step1, input, submit) {
        step1.innerHTML = `
            <p class="admin-modal__subtitle" style="color:#2ecc71;">
                Доступ создан! Отсканируйте QR-код в Aegis (или введите ключ вручную).
            </p>
            <img class="admin-modal__qr" src="data:image/png;base64,${qrBase64}" alt="QR">
            <div class="admin-modal__secret">${secret}</div>
            <label class="admin-modal__label">Введите код из Aegis, чтобы подтвердить</label>
            <input class="admin-modal__input" id="adminModalConfirm" maxlength="6" inputmode="numeric" autocomplete="one-time-code">
            <button class="admin-modal__btn" id="adminModalConfirmBtn">Подтвердить и войти</button>
        `;
        const confirmInput = document.getElementById('adminModalConfirm');
        const confirmBtn = document.getElementById('adminModalConfirmBtn');
        confirmInput.focus();

        const doConfirm = async () => {
            const code = confirmInput.value.trim();
            if (!code) { showError('Введите код из Aegis'); return; }
            confirmBtn.disabled = true;
            showError('');
            try {
                const resp = await fetch(`${API_BASE}/api/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const data = await resp.json();
                if (!resp.ok) {
                    showError(data.error || 'Неверный код');
                    confirmBtn.disabled = false;
                    return;
                }
                localStorage.setItem('cg_admin_token', data.token);
                window.location.href = 'admin.html';
            } catch (err) {
                showError('Ошибка сети');
                confirmBtn.disabled = false;
            }
        };

        confirmBtn.onclick = doConfirm;
        confirmInput.onkeydown = (e) => { if (e.key === 'Enter') doConfirm(); };
    }
})();