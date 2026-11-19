document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = null;
    let cartData = [];
    let subtotal = 0;

    try {
        const resp = await fetch('/api/user');
        const data = await resp.json();
        if (!data.user) {
            window.location.href = 'login.html?redirect=payment.html';
            return;
        }
        currentUser = data.user;
        cartData = data.cart;
    } catch (e) {
        window.location.href = 'login.html';
        return;
    }

    const userInfo = document.getElementById('paymentUserInfo');
    userInfo.innerHTML = `<p><strong>Пользователь:</strong> ${currentUser.name}</p><p><strong>Email:</strong> ${currentUser.email}</p>`;

    const paymentItems = document.getElementById('paymentItems');

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

    // ===== Форматирование карты =====
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

    // ===== Оплата =====
    document.getElementById('paymentForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        if (cartData.length === 0) { alert('Корзина пуста!'); return; }

        // Собираем данные карты для отправки на сервер (полный номер НЕ сохраняется на сервере,
        // там хранятся только последние 4 цифры — так безопаснее).
        const cardNumberRaw = (document.getElementById('cardNumber').value || '').replace(/\D/g, '');

        const btn = document.getElementById('paymentSubmit');
        btn.disabled = true;
        btn.textContent = 'Обработка...';

        try {
            const resp = await fetch('/api/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    card_number: cardNumberRaw,
                    total: subtotal
                })
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.error || 'Ошибка оплаты');
            }

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

            setTimeout(() => { window.location.href = 'account.html'; }, 3500);
        } catch (e) {
            alert(e.message);
            btn.disabled = false;
            btn.textContent = 'Оплатить';
        }
    });

    document.getElementById('successBtn').addEventListener('click', () => {
        window.location.href = 'account.html';
    });
});
