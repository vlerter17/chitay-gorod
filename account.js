document.addEventListener('DOMContentLoaded', () => {
    // ===== КУРСОР =====
    const cursor = document.getElementById('cursor');
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    const bindHover = () => {
        document.querySelectorAll('a, button, .account-book').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });
    };
    bindHover();

    // ===== ПОЛЬЗОВАТЕЛЬ =====
    let user = null;
    try {
        const raw = localStorage.getItem('cg_user');
        user = raw ? JSON.parse(raw) : null;
    } catch (e) { user = null; }

    if (!user) {
        window.location.href = 'login.html?redirect=account.html';
        return;
    }

    document.getElementById('headerUser').innerHTML = `
        <span>👤 ${user.name}</span>
        <button class="btn-logout" id="logoutBtn">Выйти</button>`;
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('cg_user');
        window.location.href = 'index.html';
    });

    document.getElementById('accountUser').innerHTML = `
        <p><strong>Имя:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>`;

    // ===== ДОСТУПНЫЕ КНИГИ =====
    const purchasedKey = 'cg_purchased_' + user.email;
    let purchased = [];
    try { purchased = JSON.parse(localStorage.getItem(purchasedKey) || '[]'); } catch (e) {}
    purchased = purchased.filter(id => booksData[id]).map(Number);

    const freeBooks = Object.keys(booksData).filter(id => booksData[id].free).map(Number);
    const allAvailable = [...new Set([...purchased, ...freeBooks])];

    const booksEl = document.getElementById('accountBooks');
    if (allAvailable.length === 0) {
        booksEl.innerHTML = '<p class="account-empty">У вас пока нет доступных книг. <a href="index.html#catalog">Перейти в каталог →</a></p>';
    } else {
        allAvailable.forEach(id => {
            const book = booksData[id];
            const isFree = book.free;
            const card = document.createElement('div');
            card.className = 'account-book';
            card.innerHTML = `
                <img alt="${book.title}">
                <div class="account-book__info">
                    <div class="account-book__title">${book.title}</div>
                    <div class="account-book__author">${book.author}</div>
                    <button class="account-book__read" data-id="${id}">Читать${isFree ? ' (бесплатно)' : ''}</button>
                </div>`;
            attachCover(card.querySelector('img'), book, Number(id));
            booksEl.appendChild(card);
        });

        booksEl.querySelectorAll('.account-book__read').forEach(btn => {
            btn.addEventListener('click', () => openReader(Number(btn.dataset.id)));
        });
    }

    // ===== КОРЗИНА =====
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem('cg_cart') || '[]'); } catch (e) {}
    cart = cart.map(item => typeof item === 'object' ? item.id : item).filter(id => booksData[id]).map(Number);

    const cartEl = document.getElementById('accountCart');
    if (cart.length === 0) {
        cartEl.innerHTML = '<p class="account-empty">Корзина пуста.</p>';
    } else {
        let total = 0;
        cart.forEach(id => {
            const book = booksData[id];
            total += book.price;
            const line = document.createElement('div');
            line.className = 'cart-line';
            line.innerHTML = `
                <img alt="${book.title}">
                <div class="cart-line__name">${book.title}</div>
                <div class="cart-line__price">${book.price} ₽</div>
                <button class="cart-line__remove" data-id="${id}">Убрать</button>`;
            attachCover(line.querySelector('img'), book, Number(id));
            cartEl.appendChild(line);
        });
        const actions = document.createElement('div');
        actions.className = 'cart-actions';
        actions.innerHTML = `
            <a href="payment.html" class="go-pay">Перейти к оплате (${total} ₽)</a>
            <a href="index.html#catalog" class="go-catalog">Продолжить покупки</a>`;
        cartEl.appendChild(actions);

        cartEl.querySelectorAll('.cart-line__remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                const newCart = cart.filter(x => x !== id);
                localStorage.setItem('cg_cart', JSON.stringify(newCart));
                location.reload();
            });
        });
    }

    // =============================================
    // ===== ЧИТАЛКА (постраничная) =====
    // =============================================
    const reader = document.getElementById('reader');
    const readerMeta = document.getElementById('readerMeta');
    const readerPageText = document.getElementById('readerPageText');
    const readerPageHeader = document.getElementById('readerPageHeader');
    const readerPageNumber = document.getElementById('readerPageNumber');
    const readerPageInfo = document.getElementById('readerPageInfo');
    const readerProgressBar = document.getElementById('readerProgressBar');
    const readerProgressLabel = document.getElementById('readerProgressLabel');
    const readerPrev = document.getElementById('readerPrev');
    const readerNext = document.getElementById('readerNext');
    const readerBack = document.getElementById('readerBack');

    // Размер страницы в символах (≈1 страница книги)
    const CHARS_PER_PAGE = 1800;

    let pages = [];
    let currentPage = 0;
    let currentBookId = null;
    let currentBookTitle = '';

    // Разбить текст на страницы по границам слов/абзацев
    function paginate(text, charsPerPage = CHARS_PER_PAGE) {
        if (!text) return ['Текст книги скоро появится.'];
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
        const result = [];
        let buf = '';

        const pushBuf = () => {
            if (buf.trim()) result.push(buf.trim());
            buf = '';
        };

        paragraphs.forEach(para => {
            const clean = para.trim();
            if (!clean) return;

            // Если абзац сам по себе больше страницы — режем по словам
            if (clean.length > charsPerPage) {
                pushBuf();
                const words = clean.split(/\s+/);
                let cur = '';
                words.forEach(w => {
                    if ((cur + ' ' + w).trim().length > charsPerPage) {
                        if (cur) result.push(cur.trim());
                        cur = w;
                    } else {
                        cur = cur ? cur + ' ' + w : w;
                    }
                });
                if (cur.trim()) result.push(cur.trim());
            } else {
                // Добавляем абзац, если хватает места
                if ((buf + '\n\n' + clean).trim().length > charsPerPage) {
                    pushBuf();
                    buf = clean;
                } else {
                    buf = buf ? buf + '\n\n' + clean : clean;
                }
            }
        });
        pushBuf();
        return result.length ? result : ['Текст книги скоро появится.'];
    }

    // Попытка загрузить текст: сначала texts/ID.txt, потом book.text
    async function loadBookText(bookId, book) {
        try {
            const resp = await fetch(`texts/${bookId}.txt`);
            if (resp.ok) {
                const t = await resp.text();
                if (t && t.trim().length > 100) return t;
            }
        } catch (e) {
            // нет файла — не страшно
        }
        return book.text || 'Текст книги скоро появится.';
    }

    // Отрисовка текущей страницы
    function renderPage() {
        if (!pages.length) return;
        currentPage = Math.max(0, Math.min(currentPage, pages.length - 1));

        readerPageHeader.textContent = currentBookTitle;
        readerPageText.textContent = pages[currentPage];
        readerPageNumber.textContent = `— ${currentPage + 1} —`;

        const percent = Math.round(((currentPage + 1) / pages.length) * 100);
        readerProgressBar.style.width = percent + '%';
        readerProgressLabel.textContent = percent + '%';
        readerPageInfo.textContent = `Страница ${currentPage + 1} из ${pages.length}`;

        readerPrev.disabled = currentPage === 0;
        readerNext.disabled = currentPage === pages.length - 1;

        // Всегда прокручиваем страницу вверх
        const pageEl = document.querySelector('.reader__page');
        if (pageEl) pageEl.scrollTop = 0;
    }

    // Открытие читалки
    async function openReader(bookId) {
        const book = booksData[bookId];
        if (!book) return;
        currentBookId = bookId;
        currentBookTitle = book.title;

        readerMeta.innerHTML = `<strong>${book.title}</strong><span>${book.author}</span>`;
        readerPageText.textContent = 'Загрузка текста…';
        reader.classList.add('active');
        document.body.style.overflow = 'hidden';

        const fullText = await loadBookText(bookId, book);
        pages = paginate(fullText);
        currentPage = 0;
        renderPage();
    }

    function closeReader() {
        reader.classList.remove('active');
        document.body.style.overflow = '';
        pages = [];
        currentPage = 0;
        currentBookId = null;
    }

    // Кнопки
    readerBack.addEventListener('click', closeReader);
    readerPrev.addEventListener('click', () => {
        if (currentPage > 0) { currentPage--; renderPage(); }
    });
    readerNext.addEventListener('click', () => {
        if (currentPage < pages.length - 1) { currentPage++; renderPage(); }
    });

    // Клавиши: стрелки, PageUp/PageDown, Escape
    document.addEventListener('keydown', (e) => {
        if (!reader.classList.contains('active')) {
            if (deleteModal.classList.contains('active') && e.key === 'Escape') {
                deleteModal.classList.remove('active');
            }
            return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            if (currentPage > 0) { currentPage--; renderPage(); }
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            if (currentPage < pages.length - 1) { currentPage++; renderPage(); }
        } else if (e.key === 'Escape') {
            closeReader();
        }
    });

    // ===== УДАЛЕНИЕ АККАУНТА =====
    const deleteBtn = document.getElementById('deleteAccountBtn');
    const deleteModal = document.getElementById('deleteModal');
    const deleteCancel = document.getElementById('deleteCancel');
    const deleteConfirm = document.getElementById('deleteConfirm');
    const deletePassword = document.getElementById('deletePassword');
    const deleteError = document.getElementById('deleteError');

    deleteBtn.addEventListener('click', () => {
        deletePassword.value = '';
        deleteError.textContent = '';
        deleteModal.classList.add('active');
        deletePassword.focus();
    });
    deleteCancel.addEventListener('click', () => deleteModal.classList.remove('active'));
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) deleteModal.classList.remove('active');
    });

    deleteConfirm.addEventListener('click', () => {
        const pwd = deletePassword.value;
        if (!pwd) { deleteError.textContent = 'Введите пароль'; return; }

        let users = [];
        try { users = JSON.parse(localStorage.getItem('cg_users') || '[]'); } catch (e) {}
        const account = users.find(u => u.email === user.email);
        if (!account || account.password !== pwd) {
            deleteError.textContent = 'Неверный пароль';
            return;
        }

        users = users.filter(u => u.email !== user.email);
        localStorage.setItem('cg_users', JSON.stringify(users));
        localStorage.removeItem('cg_user');
        localStorage.removeItem('cg_purchased_' + user.email);
        localStorage.removeItem('cg_cart');

        deleteModal.classList.remove('active');
        alert('Аккаунт удалён. Все данные стёрты.');
        window.location.href = 'index.html';
    });

    bindHover();
});