document.addEventListener('DOMContentLoaded', () => {
    const intro = document.getElementById('intro');
    const mainSite = document.getElementById('mainSite');
    let currentUser = null;

    // ===== АВТОРИЗАЦИЯ =====
    async function checkAuth() {
        try {
            const resp = await fetch('/api/user');
            const data = await resp.json();
            currentUser = data.user;
            updateHeader();
        } catch (e) {
            currentUser = null;
            updateHeader();
        }
    }

    function updateHeader() {
        const headerUser = document.getElementById('headerUser');
        const heroButton = document.getElementById('heroButton');
        if (!headerUser) return;
        
        if (currentUser) {
            headerUser.innerHTML = `
                <div class="user-info">
                    <span>👤 ${currentUser.name}</span>
                    <a href="account.html" class="btn-account">Аккаунт</a>
                    <button class="btn-logout" id="logoutBtn">Выйти</button>
                </div>`;
            document.getElementById('logoutBtn').addEventListener('click', async () => {
                await fetch('/api/logout', { method: 'POST' });
                location.reload();
            });
            if (heroButton) {
                heroButton.textContent = 'Перейти в аккаунт';
                heroButton.href = 'account.html';
            }
        } else {
            headerUser.innerHTML = `<a href="login.html" class="btn-login">Войти</a>`;
            if (heroButton) {
                heroButton.textContent = 'Начать читать';
                heroButton.href = 'login.html';
            }
        }
    }

    checkAuth();

    // ===== ИНТРО =====
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
            const comingSoonBadge = book.available === false ? '<span class="badge-coming-soon" style="color: #ff9800; font-size: 12px; font-weight: bold; display: block; margin-top: 5px;">Coming Soon</span>' : '';

            card.innerHTML = `
                <div class="book-card__image-wrap">
                    <img class="book-card__image" alt="${book.title}">
                </div>
                <div class="book-card__info">
                    <h3 class="book-card__title">${book.title}</h3>
                    <p class="book-card__author">${book.author}</p>
                    <p class="book-card__price">${priceLabel}</p>
                    ${comingSoonBadge}
                </div>`;
            const imgEl = card.querySelector('.book-card__image');
            attachCover(imgEl, book, Number(id));
            booksGrid.appendChild(card);
        });
    }

    // ===== МОДАЛКА =====
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modalClose');
    const modalBuy = document.getElementById('modalBuy');
    const priceLabel = document.getElementById('modalPrice');
    let currentBookId = null;

    function openModal(id) {
        const book = booksData[id];
        if (!book) return;
        currentBookId = id;
        
        document.getElementById('modalTitle').textContent = book.title;
        document.getElementById('modalAuthor').textContent = 'Автор: ' + book.author;
        document.getElementById('modalDescription').textContent = book.description || '';
        
        if (book.available === false) {
            priceLabel.textContent = 'Скоро в продаже';
            modalBuy.textContent = 'Coming Soon';
            modalBuy.disabled = true;
            modalBuy.style.opacity = '0.5';
        } else {
            priceLabel.textContent = 'Цена: ' + (book.free ? 'Бесплатно (после входа)' : book.price + ' ₽');
            modalBuy.textContent = book.free ? 'Читать' : 'Купить';
            modalBuy.disabled = false;
            modalBuy.style.opacity = '1';
        }

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

        modalBuy.addEventListener('click', async () => {
            if (!currentBookId) return;
            const book = booksData[currentBookId];
            
            if (book.available === false) {
                alert('Эта книга скоро появится в нашей библиотеке!');
                return;
            }

            if (!currentUser) {
                if (confirm('Чтобы купить или читать книгу, нужно войти. Перейти на страницу входа?')) {
                    window.location.href = 'login.html?redirect=index.html';
                }
                return;
            }
            
            if (book.free) {
                window.location.href = 'account.html';
                return;
            }
            
            try {
                await fetch('/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: "add", book_id: Number(currentBookId) })
                });
                window.location.href = 'payment.html';
            } catch (e) {
                alert('Ошибка добавления в корзину');
            }
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

        async function sendMessage() {
            const text = aiInput.value.trim();
            if (!text) return;
            
            addMessage(text, true);
            aiInput.value = '';
            
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'ai-message ai-message--bot';
            loadingMsg.textContent = 'Печатает...';
            aiMessages.appendChild(loadingMsg);
            aiMessages.scrollTop = aiMessages.scrollHeight;
            
            try {
                const resp = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text })
                });
                const data = await resp.json();
                loadingMsg.remove();
                
                if (data.reply) {
                    addMessage(data.reply, false);
                } else {
                    addMessage('Извините, произошла ошибка.', false);
                }
            } catch (e) {
                loadingMsg.remove();
                addMessage('Сервер недоступен.', false);
            }
        }

        aiSend.addEventListener('click', sendMessage);
        aiInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    }
});