document.addEventListener('DOMContentLoaded', () => {
    const intro = document.getElementById('intro');
    const mainSite = document.getElementById('mainSite');

    // ===== ПРЕДЗАГРУЗКА ОБЛОЖЕК ВО ВРЕМЯ ИНТРО =====
    function preloadCovers(done, maxMs) {
        const ids = Object.keys(booksData || {});
        if (!ids.length) { done(); return; }
        let loaded = 0, finished = false;
        const total = ids.length;
        const finalize = () => { if (!finished) { finished = true; done(); } };
        const timeout = setTimeout(finalize, maxMs);
        ids.forEach(id => {
            const img = new Image();
            img.onload = img.onerror = () => {
                loaded++;
                if (loaded >= total) { clearTimeout(timeout); finalize(); }
            };
            img.src = booksData[id].image;
        });
    }

    function hideIntro() {
        if (intro) {
            intro.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => { intro.style.display = 'none'; }, 500);
        }
        if (mainSite) {
            mainSite.style.animation = 'none';
            mainSite.style.opacity = '1';
        }
    }

    if (sessionStorage.getItem('cg_intro_shown')) {
        if (intro) intro.style.display = 'none';
        if (mainSite) { mainSite.style.animation = 'none'; mainSite.style.opacity = '1'; }
    } else {
        sessionStorage.setItem('cg_intro_shown', '1');
        preloadCovers(hideIntro, 4000);
    }

    // ===== ПОЛЬЗОВАТЕЛЬ =====
    function getUser() {
        try {
            const raw = localStorage.getItem('cg_user');
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function updateHeader() {
        const user = getUser();
        const headerUser = document.getElementById('headerUser');
        const heroButton = document.getElementById('heroButton');
        if (!headerUser) return;
        if (user) {
            headerUser.innerHTML = `
                <div class="user-info">
                    <span>👤 ${user.name}</span>
                    <a href="account.html" class="btn-account">Аккаунт</a>
                    <button class="btn-logout" id="logoutBtn">Выйти</button>
                </div>`;
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('cg_user');
                    location.reload();
                });
            }
            if (heroButton) {
                heroButton.textContent = 'Перейти в аккаунт';
                heroButton.href = 'account.html';
            }
        } else {
            headerUser.innerHTML = `<a href="login.html" class="btn-login">Войти</a>`;
        }
    }
    updateHeader();

    // ===== КУРСОР =====
    const cursor = document.getElementById('cursor');
    if (cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
        const bindHover = () => {
            document.querySelectorAll('a, button, .book-card, input, .modal__close').forEach(el => {
                el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
                el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
            });
        };
        bindHover();
        setTimeout(bindHover, 500);
    }

    // ===== РЕНДЕР КНИГ =====
    const booksGrid = document.getElementById('booksGrid');
    if (booksGrid && typeof booksData !== 'undefined') {
        Object.keys(booksData).forEach((id, idx) => {
            const book = booksData[id];
            const card = document.createElement('div');
            card.className = 'book-card';
            card.dataset.book = id;
            const priceLabel = book.free ? 'Бесплатно' : `${book.price} ₽`;
            card.innerHTML = `
                <div class="book-card__image-wrap">
                    <img class="book-card__image" alt="${book.title}">
                </div>
                <div class="book-card__info">
                    <h3 class="book-card__title">${book.title}</h3>
                    <p class="book-card__author">${book.author}</p>
                    <p class="book-card__price">${priceLabel}</p>
                </div>`;
            const imgEl = card.querySelector('.book-card__image');
            attachCover(imgEl, book, idx);
            booksGrid.appendChild(card);
        });
    }

    // ===== МОДАЛКА =====
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modalClose');
    const modalBuy = document.getElementById('modalBuy');
    let currentBookId = null;

    function openModal(id) {
        const book = booksData[id];
        if (!book) return;
        currentBookId = id;
        document.getElementById('modalTitle').textContent = book.title;
        document.getElementById('modalAuthor').textContent = 'Автор: ' + book.author;
        document.getElementById('modalDescription').textContent = book.description;
        const priceLabel = book.free ? 'Бесплатно (после входа)' : book.price + ' ₽';
        document.getElementById('modalPrice').textContent = 'Цена: ' + priceLabel;
        const modalImg = document.getElementById('modalImage');
        modalImg.alt = book.title;
        attachCover(modalImg, book, Number(id));
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (modal) {
        document.querySelectorAll('.book-card').forEach(card => {
            card.addEventListener('click', () => openModal(card.dataset.book));
        });
        modalClose.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

        modalBuy.addEventListener('click', () => {
            if (!currentBookId) return;
            const user = getUser();
            if (!user) {
                if (confirm('Чтобы купить или читать книгу, нужно войти в аккаунт. Перейти на страницу входа?')) {
                    window.location.href = 'login.html?redirect=index.html';
                }
                return;
            }
            const book = booksData[currentBookId];
            if (book.free) {
                window.location.href = 'account.html';
                return;
            }
            const cart = JSON.parse(localStorage.getItem('cg_cart') || '[]');
            const idNum = Number(currentBookId);
            if (!cart.includes(idNum)) cart.push(idNum);
            localStorage.setItem('cg_cart', JSON.stringify(cart));
            window.location.href = 'payment.html';
        });
    }

    // ===== ИИ-ЧАТ =====
    const aiChat = document.getElementById('aiChat');
    const aiToggle = document.getElementById('aiToggle');
    const aiClose = document.getElementById('aiClose');
    const aiInput = document.getElementById('aiInput');
    const aiSend = document.getElementById('aiSend');
    const aiMessages = document.getElementById('aiMessages');

    if (aiChat) {
        aiToggle.addEventListener('click', () => aiChat.classList.toggle('active'));
        aiClose.addEventListener('click', () => aiChat.classList.remove('active'));

        function addMessage(text, isUser) {
            const msg = document.createElement('div');
            msg.className = 'ai-message ' + (isUser ? 'ai-message--user' : 'ai-message--bot');
            msg.textContent = text;
            aiMessages.appendChild(msg);
            aiMessages.scrollTop = aiMessages.scrollHeight;
        }

        function getBotResponse(text) {
            const lower = text.toLowerCase();
            if (lower.includes('привет') || lower.includes('здравств')) return 'Привет! Я ИИ-помощник Читай-Город. Чем могу помочь?';
            if (lower.includes('книг') || lower.includes('каталог')) return 'У нас в каталоге 50 книг! Прокрутите вниз до раздела «Каталог».';
            if (lower.includes('бесплат') || lower.includes('читать')) return 'Некоторые книги можно читать бесплатно после регистрации. Ищите пометку «Бесплатно».';
            if (lower.includes('оплат') || lower.includes('купить') || lower.includes('корзин')) return 'Нажмите на книгу, выберите «Купить» — откроется страница оплаты. Оплата демонстрационная.';
            if (lower.includes('регистр') || lower.includes('вход') || lower.includes('войти')) return 'Нажмите «Войти» в шапке сайта. Регистрация бесплатная.';
            if (lower.includes('контакт') || lower.includes('телефон')) return 'Наш телефон: +7 (999) 123-45-67. Email: info@chitay-gorod.ru';
            if (lower.includes('спасибо')) return 'Всегда пожалуйста! Если будут вопросы — обращайтесь!';
            return 'Я ИИ-помощник Читай-Город. Спросите о книгах, оплате, регистрации или чтении онлайн!';
        }

        function sendMessage() {
            const text = aiInput.value.trim();
            if (!text) return;
            addMessage(text, true);
            aiInput.value = '';
            setTimeout(() => addMessage(getBotResponse(text), false), 400);
        }

        aiSend.addEventListener('click', sendMessage);
        aiInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    }
});