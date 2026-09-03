# Skud Pai Sho — правила цієї реалізації

Перша версія реалізує базовий набір **без expansions**. Сервер є єдиним арбітром. За довідкове джерело взято [офіційну сторінку Skud Pai Sho](https://skudpaisho.com/site/games/skud-pai-sho/pai-sho-rules/). Цей документ також точно фіксує межі поточної програмної реалізації, щоб механіки не були приховано вигадані.

## Дошка та Gardens

Дошка має 17×17 ліній і допустимі перетини всередині круглого поля. Чотири крайні кардинальні перетини — **Gates**. Осі нейтральні; протилежні квадранти утворюють Red і White Gardens. Червона Basic Flower не може завершити хід у White Garden, біла — у Red Garden. Плитки Plant вводяться на вільний Gate; після виходу з Gate Basic Flower стає Blooming.

## Набір і хід

Кожен гравець має по три Rose, Chrysanthemum, Rhododendron, Jasmine, Lily та White Jade (18 Basic Flowers), White Lotus, Orchid і дві обрані перед грою Accent Tiles. Host ходить першим. **Plant** виставляє плитку через Gate. **Arrange** рухає плитку по прямій ортогональній або діагональній лінії; перестрибувати плитки не можна.

Дальності: Rose 3, Chrysanthemum 3, Rhododendron 4; Jasmine 3, Lily 3, White Jade 4; White Lotus 2, Orchid 6; Knotweed 2; Rock, Wheel і Boat 1.

## Harmony, Clash і завершення

Blooming квіти одного власника утворюють Harmony на незаблокованій ортогональній лінії: Rose—White Jade, Chrysanthemum—Jasmine, Rhododendron—Lily. White Lotus гармонує з кожною Basic Flower. Пари Clash: Rose—Jasmine, Chrysanthemum—Lily, Rhododendron—White Jade; хід на таку ворожу плитку виконує capture. Harmony, що перетинає центральну вісь (**midline**), враховується при фінальному підрахунку. Замкнений цикл Harmony — **Harmony Ring** і перемога. Коли Basic Flowers у запасах вичерпані, перемагає більша кількість midline Harmonies; рівність — нічия. Здача негайно віддає перемогу супернику. Хід, що залишив би суперника без жодної допустимої дії, заборонений.

## Accent та Special Flowers

* **Rock** не можна захопити звичайним рухом, і він блокує лінії Harmony.
* **Wheel** після розміщення повертає суміжні плитки на 90°, якщо всі отримані точки допустимі та вільні.
* **Knotweed** глушить Blooming/Harmony суміжних квітів і сам не захоплює.
* **Boat** може витіснити плитку на явно вказану вільну допустиму точку; без такої точки прибирає її.
* **White Lotus** гармонує з усіма Basic Flowers.
* **Orchid** рухається на 6, може захопити Basic Flower та глушиться Knotweed.

## Зафіксовані обмеження v1

Harmony Bonus представлено серверною автоматичною переоцінкою Harmony після кожного Arrange; окремого довільного клієнтського bonus-командування немає. «Стартова плитка» означає перший Plant Host через Gate — сервер не ставить прихованої плитки до цього ходу. Boat secondary placement поки не пропонується UI: якщо його не вказано, захоплена плитка вилучається. Ці явні обмеження потребують звірки з організатором конкретного турніру перед турнірною грою.
