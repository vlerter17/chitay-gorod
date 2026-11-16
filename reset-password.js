document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('cursor');
    if (cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const form = document.getElementById('resetForm');
    const errorEl = document.getElementById('resetError');
    
    if (!token) {
        errorEl.textContent = 'Неверная ссылка для сброса пароля';
        form.style.display = 'none';
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        
        if (password !== confirm) {
            errorEl.textContent = 'Пароли не совпадают';
            return;
        }
        
        try {
            const resp = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error);
            
            alert('Пароль успешно изменён! Теперь вы можете войти.');
            window.location.href = 'login.html';
        } catch (err) {
            errorEl.textContent = err.message;
        }
    });
});