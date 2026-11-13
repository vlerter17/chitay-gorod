document.addEventListener('DOMContentLoaded', () => {
    // ===== ПРОВЕРКА АВТОРИЗАЦИИ =====
    let currentUser = null;
    try {
        const raw = localStorage.getItem('cg_user');
        currentUser = raw ? JSON.parse(raw) : null;
    } catch (e) { currentUser = null; }

    if (!currentUser) {
        window.location.href = 'login.html?redirect=payment.html';
        return;
    }

    // ===== ДАННЫЕ КОРЗИНЫ =====
    let cartData = [];
    try { cartData = JSON.parse(localStorage.getItem('cg_cart') || '[]'); }
    catch (e) { cartData = []; }
    cartData = cartData.map(item => typeof item === 'object' ? item.id : item).filter(Boolean);

    const userInfo = document.getElementById('paymentUserInfo');
    userInfo.innerHTML = `<p><strong>Пользователь:</strong> ${currentUser.name}</p><p><strong>Email:</strong> ${currentUser.email}</p>`;

    // ===== ОТОБРАЖЕНИЕ ТОВАРОВ =====
    const paymentItems = document.getElementById('paymentItems');
    let subtotal = 0;

    if (cartData.length === 0) {
        paymentItems.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Корзина пуста. <a href="index.html" style="color:#e8d5b7;">Вернуться в каталог</a></p>';
    } else {
        cartData.forEach(id => {
            const book = booksData[id];
            if (book) {
                subtotal += book.price;
                const item = document.createElement('div');
                item.className = 'payment-item';
                item.innerHTML = `
                    <img class="payment-item-img" alt="${book.title}">
                    <div class="payment-item-info">
                        <div class="payment-item-name">${book.title}</div>
                        <div class="payment-item-author">${book.author}</div>
                    </div>
                    <div class="payment-item-price">${book.price} ₽</div>`;
                attachCover(item.querySelector('img'), book, Number(id));
                paymentItems.appendChild(item);
            }
        });
    }

    document.getElementById('paymentSubtotal').textContent = subtotal + ' ₽';
    document.getElementById('paymentTotal').textContent = subtotal + ' ₽';
    document.getElementById('paymentSubmitAmount').textContent = subtotal + ' ₽';

    // ===== ФОРМАТИРОВАНИЕ КАРТЫ =====
    const cardNumberInput = document.getElementById('cardNumber');
    const cardExpiryInput = document.getElementById('cardExpiry');
    const cardCvcInput = document.getElementById('cardCvc');

    cardNumberInput.addEventListener('input', function () {
        let value = this.value.replace(/\D/g, '').substring(0, 16);
        value = value.replace(/(.{4})/g, '$1 ').trim();
        this.value = value;
        document.getElementById('cardPreviewNumber').textContent = value || '•••• •••• •••• ••••';
    });

    cardExpiryInput.addEventListener('input', function () {
        let value = this.value.replace(/\D/g, '').substring(0, 4);
        if (value.length >= 2) value = value.substring(0, 2) + '/' + value.substring(2);
        this.value = value;
        document.getElementById('cardPreviewExpiry').textContent = value || 'MM/YY';
    });

    cardCvcInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').substring(0, 3);
    });

    // ===== ОПЛАТА =====
    document.getElementById('paymentForm').addEventListener('submit', function (e) {
        e.preventDefault();

        if (cartData.length === 0) { alert('Корзина пуста!'); return; }

        const btn = document.getElementById('paymentSubmit');
        btn.disabled = true;
        btn.textContent = 'Обработка...';

        setTimeout(() => {
            document.getElementById('paymentContainer').style.display = 'none';
            document.getElementById('paymentSuccess').style.display = 'flex';
            document.getElementById('successName').textContent = currentUser.name;

            const receiptItems = document.getElementById('receiptItems');
            let total = 0;
            receiptItems.innerHTML = '';
            cartData.forEach(id => {
                const book = booksData[id];
                if (book) {
                    total += book.price;
                    receiptItems.innerHTML += `<div class="receipt-item"><span>${book.title}</span><span>${book.price} ₽</span></div>`;
                }
            });

            document.getElementById('receiptTotal').textContent = total + ' ₽';
            document.getElementById('receiptId').textContent = 'CG-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            document.getElementById('receiptDate').textContent = new Date().toLocaleString('ru-RU');

            const key = 'cg_purchased_' + currentUser.email;
            let purchased = [];
            try { purchased = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
            cartData.forEach(id => { if (!purchased.includes(id)) purchased.push(id); });
            localStorage.setItem(key, JSON.stringify(purchased));

            localStorage.setItem('cg_cart', '[]');

            setTimeout(() => { window.location.href = 'account.html'; }, 3500);
        }, 1500);
    });

    document.getElementById('successBtn').addEventListener('click', () => {
        window.location.href = 'account.html';
    });
});