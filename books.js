const booksData = {
    // ===== ДОСТУПНЫЕ КНИГИ =====
    1: { title: "Маленький принц", author: "Антуан де Сент-Экзюпери", price: 0, free: true, available: true,
        image: "covers/1.jpg", url: "http://lib.ru/EKZUPERY/mprinc.txt",
        description: "Философская сказка о маленьком принце с планеты Б-612." },
    2: { title: "Евгений Онегин", author: "Александр Пушкин", price: 0, free: true, available: true,
        image: "covers/2.jpg", url: "http://lib.ru/LITRA/PUSHKIN/ENGLISH/onegin_j.txt",
        description: "Роман в стихах — энциклопедия русской жизни." },
    3: { title: "Герой нашего времени", author: "Михаил Лермонтов", price: 0, free: true, available: true,
        image: "covers/3.jpg", url: "http://www.lib.ru/LITRA/LERMONTOW/geroi.txt",
        description: "Первый психологический роман в русской литературе." },
    4: { title: "Собачье сердце", author: "Михаил Булгаков", price: 450, available: true,
        image: "covers/4.jpg", url: "http://az.lib.ru/b/bulgakow_m_a/text_0020.shtml",
        description: "Сатирическая повесть о превращении собаки в человека." },
    8: { title: "1984", author: "Джордж Оруэлл", price: 650, available: true,
        image: "covers/8.jpg", url: "http://lib.ru/ORWELL/r1984.txt",
        description: "Антиутопия о тоталитарном обществе." },
    10: { title: "Преступление и наказание", author: "Фёдор Достоевский", price: 780, available: true,
         image: "covers/10.jpg", url: "http://az.lib.ru/d/dostoewskij_f_m/text_0010.shtml",
         description: "Психологический роман о студенте Раскольникове." },
    11: { title: "Война и мир", author: "Лев Толстой", price: 1200, available: true,
         image: "covers/11.jpg", url: "http://az.lib.ru/t/tolstoj_lew_nikolaewich/text_0010.shtml",
         description: "Эпопея о русском обществе в эпоху наполеоновских войн." },
    12: { title: "Анна Каренина", author: "Лев Толстой", price: 890, available: true,
         image: "covers/12.jpg", url: "http://az.lib.ru/t/tolstoj_lew_nikolaewich/text_0020.shtml",
         description: "Трагическая история любви замужней аристократки." },
    13: { title: "Идиот", author: "Фёдор Достоевский", price: 720, available: true,
         image: "covers/13.jpg", url: "http://az.lib.ru/d/dostoewskij_f_m/text_0020.shtml",
         description: "Роман о князе Мышкине." },
    14: { title: "Мёртвые души", author: "Николай Гоголь", price: 680, available: true,
         image: "covers/14.jpg", url: "http://az.lib.ru/g/gogol_n_w/text_0020.shtml",
         description: "Сатирическая поэма о продавце мёртвых душ." },
    15: { title: "Братья Карамазовы", author: "Фёдор Достоевский", price: 950, available: true,
         image: "covers/15.jpg", url: "http://az.lib.ru/d/dostoewskij_f_m/text_0030.shtml",
         description: "Философский роман о вере, сомнении и морали." },
    17: { title: "Отцы и дети", author: "Иван Тургенев", price: 540, available: true,
         image: "covers/17.jpg", url: "http://az.lib.ru/t/turgenew_i_s/text_0040.shtml",
         description: "Роман о конфликте поколений и нигилизме." },
    18: { title: "Обломов", author: "Иван Гончаров", price: 620, available: true,
         image: "covers/18.jpg", url: "http://az.lib.ru/g/goncharow_i_a/text_0020.shtml",
         description: "Роман о ленивом помещике Илье Ильиче Обломове." },
    19: { title: "Тихий Дон", author: "Михаил Шолохов", price: 1100, available: true,
         image: "covers/19.jpg", url: "http://www.lib.ru/PROZA/SHOLOHOW/tihijdon12.txt",
         description: "Эпопея о донском казачестве." },
    20: { title: "Белая гвардия", author: "Михаил Булгаков", price: 580, available: true,
         image: "covers/20.jpg", url: "http://lib.ru/BULGAKOW/whtguard.txt",
         description: "Роман о семье Турбиных в годы Гражданской войны." },
    21: { title: "Пикник на обочине", author: "Братья Стругацкие", price: 620, available: true,
         image: "covers/21.jpg", url: "http://www.lib.ru/STRUGACKIE/picnic.txt",
         description: "Научная фантастика о Зоне." },
    22: { title: "Трудно быть богом", author: "Братья Стругацкие", price: 590, available: true,
         image: "covers/22.jpg", url: "http://lib.ru/STRUGACKIE/be_god.txt",
         description: "Повесть о прогрессоре на планете, застрявшей в Средневековье." },
    27: { title: "Над пропастью во ржи", author: "Джером Сэлинджер", price: 540, available: true,
         image: "covers/27.jpg", url: "http://lib.ru/SELINGER/sel_1.txt",
         description: "История подростка Холдена Колфилда." },
    31: { title: "Дубровский", author: "Александр Пушкин", price: 420, available: true,
         image: "covers/31.jpg", url: "http://lib.ru/LITRA/PUSHKIN/dubrowskij.txt",
         description: "Незаконченный роман о благородном разбойнике." },
    32: { title: "Капитанская дочка", author: "Александр Пушкин", price: 450, available: true,
         image: "covers/32.jpg", url: "http://az.lib.ru/p/pushkin_a_s/text_0120.shtml",
         description: "Исторический роман о Пугачёвском восстании." },
    33: { title: "Ревизор", author: "Николай Гоголь", price: 390, available: true,
         image: "covers/33.jpg", url: "http://az.lib.ru/g/gogol_n_w/text_0010.shtml",
         description: "Комедия о чиновниках." },
    34: { title: "Гроза", author: "Александр Островский", price: 410, available: true,
         image: "covers/34.jpg", url: "http://az.lib.ru/o/ostrowskij_a_n/text_0010.shtml",
         description: "Драма о трагической судьбе Катерины." },
    35: { title: "Вишнёвый сад", author: "Антон Чехов", price: 430, available: true,
         image: "covers/35.jpg", url: "http://az.lib.ru/c/chehow_a_p/text_0030.shtml",
         description: "Пьеса о продаже родового имения." },
    36: { title: "Три сестры", author: "Антон Чехов", price: 440, available: true,
         image: "covers/36.jpg", url: "http://az.lib.ru/c/chehow_a_p/text_0020.shtml",
         description: "Пьеса о мечтах и разочарованиях." },
    37: { title: "Дядя Ваня", author: "Антон Чехов", price: 420, available: true,
         image: "covers/37.jpg", url: "http://az.lib.ru/c/chehow_a_p/text_0010.shtml",
         description: "Пьеса о крушении иллюзий." },
    38: { title: "Палата № 6", author: "Антон Чехов", price: 380, available: true,
         image: "covers/38.jpg", url: "http://lib.ru/LITRA/CHEHOW/6.txt",
         description: "Повесть о безумии и равнодушии." },
    39: { title: "Человек в футляре", author: "Антон Чехов", price: 350, available: true,
         image: "covers/39.jpg", url: "http://az.lib.ru/c/chehow_a_p/text_0050.shtml",
         description: "Рассказ об учителе Беликове." },
    40: { title: "Дама с собачкой", author: "Антон Чехов", price: 360, available: true,
         image: "covers/40.jpg", url: "http://az.lib.ru/c/chehow_a_p/text_0060.shtml",
         description: "Рассказ о внезапной любви." },
    43: { title: "Мы", author: "Евгений Замятин", price: 520, available: true,
         image: "covers/43.jpg", url: "http://az.lib.ru/z/zamjatin_e_i/text_0050.shtml",
         description: "Первая антиутопия." },
    44: { title: "Котлован", author: "Андрей Платонов", price: 490, available: true,
         image: "covers/44.jpg", url: "http://az.lib.ru/p/platonow_a_p/text_0020.shtml",
         description: "Повесть о строительстве социализма." },
    45: { title: "Чевенгур", author: "Андрей Платонов", price: 510, available: true,
         image: "covers/45.jpg", url: "http://az.lib.ru/p/platonow_a_p/text_0030.shtml",
         description: "Утопический роман." },
    46: { title: "Доктор Живаго", author: "Борис Пастернак", price: 880, available: true,
         image: "covers/46.jpg", url: "http://lib.ru/POEZIQ/PASTERNAK/doktor.txt",
         description: "Роман о судьбе интеллигенции в годы революции." },
    47: { title: "Архипелаг ГУЛАГ", author: "Александр Солженицын", price: 1300, available: true,
         image: "covers/47.jpg", url: "http://www.lib.ru/PROZA/SOLZHENICYN/gulag.txt",
         description: "Художественное исследование советских лагерей." },
    48: { title: "Один день Ивана Денисовича", author: "Александр Солженицын", price: 550, available: true,
         image: "covers/48.jpg", url: "http://www.lib.ru/PROZA/SOLZHENICYN/ivan_den.txt",
         description: "Рассказ о жизни в лагере." },
    49: { title: "Матрёнин двор", author: "Александр Солженицын", price: 450, available: true,
         image: "covers/49.jpg", url: "http://www.lib.ru/PROZA/SOLZHENICYN/matren.txt",
         description: "Рассказ о русской деревне." },
    50: { title: "Василий Тёркин", author: "Александр Твардовский", price: 460, available: true,
         image: "covers/50.jpg", url: "http://www.lib.ru/POEZIQ/TWARDOWSKIJ/terkin.txt",
         description: "Поэма о солдате." },

    // ===== ЗАЩИЩЕННЫЕ АВТОРСКИМ ПРАВОМ (COMING SOON) =====
    5: { title: "Записки юного врача", author: "Михаил Булгаков", price: 480, available: false, image: "covers/5.jpg" },
    6: { title: "Роковые яйца", author: "Михаил Булгаков", price: 420, available: false, image: "covers/6.jpg" },
    7: { title: "Мастер и Маргарита", author: "Михаил Булгаков", price: 750, available: false, image: "covers/7.jpg" },
    9: { title: "Дюна", author: "Фрэнк Герберт", price: 980, available: false, image: "covers/9.jpg" },
    16: { title: "Властелин колец", author: "Дж.Р.Р. Толкин", price: 1350, available: false, image: "covers/16.jpg" },
    23: { title: "Понедельник начинается в субботу", author: "Братья Стругацкие", price: 510, available: false, image: "covers/23.jpg" },
    24: { title: "Метро 2033", author: "Дмитрий Глуховский", price: 690, available: false, image: "covers/24.jpg" },
    25: { title: "Пищеблок", author: "Алексей Иванов", price: 720, available: false, image: "covers/25.jpg" },
    26: { title: "Тень ветра", author: "Карлос Руис Сафон", price: 890, available: false, image: "covers/26.jpg" },
    28: { title: "Сто лет одиночества", author: "Габриэль Маркес", price: 810, available: false, image: "covers/28.jpg" },
    29: { title: "Убить пересмешника", author: "Харпер Ли", price: 670, available: false, image: "covers/29.jpg" },
    30: { title: "Гордость и предубеждение", author: "Джейн Остин", price: 580, available: false, image: "covers/30.jpg" },
    41: { title: "Лолита", author: "Владимир Набоков", price: 790, available: false, image: "covers/41.jpg" },
    42: { title: "Дар", author: "Владимир Набоков", price: 760, available: false, image: "covers/42.jpg" }
};

// Заглушка для обложек, если локальная картинка не загрузится
function attachCover(imgElement, book, id) {
    imgElement.src = book.image; // пути вида covers/1.jpg
    imgElement.onerror = () => {
        imgElement.src = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
                <rect width="200" height="300" fill="#1a1a2e"/>
                <text x="100" y="150" fill="#e8d5b7" font-size="16" text-anchor="middle" font-family="sans-serif">Обложка</text>
            </svg>
        `);
        imgElement.onerror = null;
    };
}

// ===== СИНХРОНИЗАЦИЯ С СЕРВЕРОМ (книги из админки) =====
// При первом заходе подтягиваем книги из БД (если админ их добавил/импортировал)
// и один раз перезагружаем страницу, чтобы каталог увидел обновления.
(async () => {
    try {
        const resp = await fetch('/api/books', { cache: 'no-store' });
        if (!resp.ok) return;
        const list = await resp.json();
        if (!Array.isArray(list) || list.length === 0) return;

        let changed = false;
        list.forEach(b => {
            if (!b || !b.id) return;
            const cur = booksData[b.id];

            // Строим нормализованную запись из серверных данных.
            // Поле url приоритетно берём локальное (чтобы не потерять ссылку на текст),
            // а если его нет — используем text с сервера.
            const normalized = {
                title: b.title,
                author: b.author || '',
                price: Number(b.price) || 0,
                free: !!b.free,
                available: true,
                image: b.image || (cur ? cur.image : ''),
                description: b.description || '',
                url: (cur && cur.url) || b.text || ''
            };

            if (!cur) {
                // Новая книга, добавленная через админку
                booksData[b.id] = normalized;
                changed = true;
                return;
            }

            // Существующую книгу обновляем, если что-то изменилось
            if (cur.title !== normalized.title ||
                cur.author !== normalized.author ||
                cur.price !== normalized.price ||
                cur.free !== normalized.free ||
                cur.image !== normalized.image ||
                cur.description !== normalized.description ||
                cur.available !== normalized.available) {
                booksData[b.id] = Object.assign({}, cur, normalized);
                changed = true;
            }
        });

        if (changed && !sessionStorage.getItem('cg_books_synced')) {
            sessionStorage.setItem('cg_books_synced', '1');
            location.reload();
        }
    } catch (e) {
        // Сервер недоступен — работаем со статическим books.js (это нормально)
    }
})();
