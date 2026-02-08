// 🚀 متتبع العملات الرقمية - Crypto Tracker

// 🔑 CoinMarketCap API Key
const CMC_API_KEY = '5bd8800e37044ed6bacf93a46cdd4dd1';

const COINS = ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'dogecoin', 'shiba-inu', 'pepe', 'floki', 'bonk'];
const COIN_NAMES = {
    bitcoin: { name: 'بيتكوين', symbol: 'BTC', icon: '₿', type: 'major' },
    ethereum: { name: 'إيثيريوم', symbol: 'ETH', icon: 'Ξ', type: 'major' },
    binancecoin: { name: 'بينانس', symbol: 'BNB', icon: '🔶', type: 'major' },
    cardano: { name: 'كاردانو', symbol: 'ADA', icon: '₳', type: 'major' },
    solana: { name: 'سولانا', symbol: 'SOL', icon: '◎', type: 'major' },
    dogecoin: { name: 'دوجكوين', symbol: 'DOGE', icon: '🐕', type: 'meme' },
    'shiba-inu': { name: 'شيبا إينو', symbol: 'SHIB', icon: '🐕', type: 'meme' },
    pepe: { name: 'بيبي', symbol: 'PEPE', icon: '🐸', type: 'meme' },
    floki: { name: 'فلوكي', symbol: 'FLOKI', icon: '⚔️', type: 'meme' },
    bonk: { name: 'بونك', symbol: 'BONK', icon: '🔨', type: 'meme' }
};

let priceHistory = {};
let alerts = [];
let chart;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchPrices();
    setInterval(fetchPrices, 60000); // تحديث كل دقيقة
    loadAlerts();
    initTicker(); // تهيئة شريط الأخبار
});

// جلب الأسعار من CoinMarketCap API (أو CoinGecko كاحتياطي)
async function fetchPrices() {
    try {
        // محاولة جلب من CoinMarketCap أولاً
        const cmcResponse = await fetch(
            `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?slug=${COINS.join(',')}&convert=USD`,
            {
                headers: {
                    'X-CMC_PRO_API_KEY': CMC_API_KEY,
                    'Accept': 'application/json'
                }
            }
        );
        
        if (cmcResponse.ok) {
            const cmcData = await cmcResponse.json();
            const formattedData = formatCMCData(cmcData);
            currentPrices = formattedData;
            updateUI(formattedData);
            updateChart(formattedData);
            checkAlerts(formattedData);
            document.getElementById('last-update').textContent = new Date().toLocaleTimeString('ar-SA');
            console.log('✅ Prices fetched from CoinMarketCap');
            return;
        }
    } catch (cmcError) {
        console.log('⚠️ CoinMarketCap failed, trying CoinGecko...', cmcError);
    }
    
    // الاحتياطي: جلب من CoinGecko
    try {
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${COINS.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
        );
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        currentPrices = data;
        updateUI(data);
        updateChart(data);
        checkAlerts(data);
        
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString('ar-SA');
        console.log('✅ Prices fetched from CoinGecko');
    } catch (error) {
        console.error('Error fetching prices:', error);
        showError('تعذر تحديث الأسعار. سنحاول مرة أخرى...');
    }
}

// تنسيق بيانات CoinMarketCap لتتوافق مع الهيكل الحالي
function formatCMCData(cmcData) {
    const formatted = {};
    
    if (cmcData.data) {
        Object.values(cmcData.data).forEach(coin => {
            const slug = coin.slug;
            const quote = coin.quote.USD;
            
            formatted[slug] = {
                usd: quote.price,
                usd_24h_change: quote.percent_change_24h || 0,
                usd_market_cap: quote.market_cap || 0,
                usd_24h_vol: quote.volume_24h || 0
            };
        });
    }
    
    return formatted;
}

// تحديث واجهة المستخدم
function updateUI(data) {
    const container = document.getElementById('coins-container');
    
    COINS.forEach(coinId => {
        const coin = data[coinId];
        const info = COIN_NAMES[coinId];
        
        if (!coin) return;
        
        // تحديث أو إنشاء بطاقة العملة
        let card = document.getElementById(`card-${coinId}`);
        
        if (!card) {
            card = createCoinCard(coinId, info);
            container.appendChild(card);
        }
        
        updateCoinCard(card, coin, coinId);
        
        // حفظ السجل السعري
        if (!priceHistory[coinId]) priceHistory[coinId] = [];
        priceHistory[coinId].push({
            time: new Date(),
            price: coin.usd
        });
        
        // الاحتفاظ بآخر 50 نقطة فقط
        if (priceHistory[coinId].length > 50) {
            priceHistory[coinId].shift();
        }
    });
}

// إنشاء بطاقة عملة
function createCoinCard(coinId, info) {
    const card = document.createElement('div');
    card.id = `card-${coinId}`;
    // إضافة كلاس خاص للميم كوينز
    const cardClass = info.type === 'meme' ? 'coin-card meme-coin' : 'coin-card';
    card.className = cardClass;
    
    // إضافة شارة للميم كوينز
    const memeBadge = info.type === 'meme' ? '<span class="meme-badge">🚀 MEME</span>' : '';
    
    card.innerHTML = `
        <div class="coin-header">
            <div class="coin-icon">${info.icon}</div>
            <div class="coin-info">
                <h3>${info.name}</h3>
                <span class="coin-symbol">${info.symbol}</span>
                ${memeBadge}
            </div>
        </div>
        <div class="coin-price" id="price-${coinId}">$---</div>
        <span class="price-change" id="change-${coinId}">---</span>
        <div class="coin-stats">
            <div class="stat">
                <div class="stat-label">حجم التداول 24س</div>
                <div class="stat-value" id="vol-${coinId}">---</div>
            </div>
            <div class="stat">
                <div class="stat-label">القيمة السوقية</div>
                <div class="stat-value" id="cap-${coinId}">---</div>
            </div>
        </div>
    `;
    return card;
}

// تحديث بيانات البطاقة
function updateCoinCard(card, coin, coinId) {
    const priceEl = card.querySelector(`#price-${coinId}`);
    const changeEl = card.querySelector(`#change-${coinId}`);
    const volEl = card.querySelector(`#vol-${coinId}`);
    const capEl = card.querySelector(`#cap-${coinId}`);
    
    // التحقق من التغير في السعر للرسوم المتحركة
    const oldPrice = parseFloat(priceEl.dataset.price || 0);
    const newPrice = coin.usd;
    
    priceEl.textContent = formatPrice(coin.usd);
    priceEl.dataset.price = coin.usd;
    
    // تأثير وميض عند تغير السعر
    if (oldPrice !== 0 && oldPrice !== newPrice) {
        priceEl.style.color = newPrice > oldPrice ? 'var(--up)' : 'var(--down)';
        setTimeout(() => {
            priceEl.style.color = '';
        }, 500);
    }
    
    // تحديث التغير
    const change = coin.usd_24h_change;
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    changeEl.className = `price-change ${change >= 0 ? 'up' : 'down'}`;
    
    // تحديث الحجم والقيمة السوقية
    volEl.textContent = formatCompact(coin.usd_24h_vol);
    capEl.textContent = formatCompact(coin.usd_market_cap);
}

// تهيئة الرسم البياني
function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#a0aec0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y: {
                    ticks: { color: '#a0aec0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

// تحديث الرسم البياني
function updateChart(data) {
    const labels = priceHistory.bitcoin?.map(p => 
        p.time.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    ) || [];
    
    const datasets = COINS.slice(0, 3).map((coinId, index) => {
        const colors = ['#00d4aa', '#6c5ce7', '#f39c12'];
        return {
            label: COIN_NAMES[coinId].name,
            data: priceHistory[coinId]?.map(p => p.price) || [],
            borderColor: colors[index],
            backgroundColor: colors[index] + '20',
            tension: 0.4,
            fill: true
        };
    });
    
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.update('none');
}

// إضافة تنبيه
function addAlert() {
    const coin = document.getElementById('alert-coin').value;
    const price = parseFloat(document.getElementById('alert-price').value);
    
    if (!price || price <= 0) {
        alert('الرجاء إدخال سعر صحيح');
        return;
    }
    
    alerts.push({ coin, price, triggered: false });
    saveAlerts();
    renderAlerts();
    
    document.getElementById('alert-price').value = '';
}

// حذف تنبيه
function removeAlert(index) {
    alerts.splice(index, 1);
    saveAlerts();
    renderAlerts();
}

// عرض التنبيهات
function renderAlerts() {
    const container = document.getElementById('alerts-list');
    container.innerHTML = alerts.map((alert, index) => `
        <div class="alert-item">
            <span>${COIN_NAMES[alert.coin].name} عند $${formatPrice(alert.price)}</span>
            <button onclick="removeAlert(${index})">حذف</button>
        </div>
    `).join('');
}

// التحقق من التنبيهات
function checkAlerts(data) {
    alerts.forEach(alert => {
        if (alert.triggered) return;
        
        const currentPrice = data[alert.coin]?.usd;
        if (!currentPrice) return;
        
        if (currentPrice >= alert.price) {
            alert.triggered = true;
            showNotification(
                '🔔 تنبيه سعري!',
                `${COIN_NAMES[alert.coin].name} وصل إلى $${formatPrice(currentPrice)}`
            );
        }
    });
}

// حفظ التنبيهات
function saveAlerts() {
    localStorage.setItem('cryptoAlerts', JSON.stringify(alerts));
}

// تحميل التنبيهات
function loadAlerts() {
    const saved = localStorage.getItem('cryptoAlerts');
    if (saved) {
        alerts = JSON.parse(saved);
        renderAlerts();
    }
}

// تنسيق السعر
function formatPrice(price) {
    if (price >= 1000) {
        return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else if (price >= 1) {
        return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    } else {
        return price.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }
}

// تنسيق الأرقام الكبيرة
function formatCompact(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
}

// عرض إشعار
function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    } else {
        alert(`${title}\n${body}`);
    }
}

// طلب إذن الإشعارات
if ('Notification' in window) {
    Notification.requestPermission();
}

// عرض خطأ
function showError(message) {
    console.error(message);
}

// ==================== 🪟 نافذة الإعلان المنبثقة ====================

function openAdModal() {
    const modal = document.getElementById('ad-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // منع التمرير
}

function closeAdModal() {
    const modal = document.getElementById('ad-modal');
    modal.classList.remove('active');
    document.body.style.overflow = ''; // إعادة التمرير
}

// إغلاق النافذة عند الضغط خارجها
window.onclick = function(event) {
    const modal = document.getElementById('ad-modal');
    if (event.target === modal) {
        closeAdModal();
    }
}

// إغلاق النافذة بزر Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeAdModal();
    }
});

// ==================== 🎯 الإعلان العائم ====================

function toggleFloatingAd() {
    const ad = document.getElementById('floating-ad');
    const icon = document.getElementById('ad-toggle-icon');
    
    ad.classList.toggle('collapsed');
    
    if (ad.classList.contains('collapsed')) {
        icon.textContent = '+';
    } else {
        icon.textContent = '−';
    }
}

// ==================== 🧮 حاسبة الربح والخسارة ====================

let currentPrices = {};

function updateCalcPrice() {
    const coin = document.getElementById('calc-coin').value;
    if (currentPrices[coin]) {
        // يمكن استخدام السعر الحالي لاحقاً
    }
}

function fillCurrentPrice() {
    const coin = document.getElementById('calc-coin').value;
    if (currentPrices[coin] && currentPrices[coin].usd) {
        document.getElementById('calc-sell-price').value = currentPrices[coin].usd;
        // تأثير بصري
        const input = document.getElementById('calc-sell-price');
        input.style.borderColor = 'var(--neon-blue)';
        setTimeout(() => {
            input.style.borderColor = '';
        }, 500);
    } else {
        alert('الرجاء الانتظار حتى يتم تحميل الأسعار');
    }
}

function calculateProfit() {
    const coin = document.getElementById('calc-coin').value;
    const buyPrice = parseFloat(document.getElementById('calc-buy-price').value);
    const sellPrice = parseFloat(document.getElementById('calc-sell-price').value);
    const amount = parseFloat(document.getElementById('calc-amount').value) || 1;
    
    if (!buyPrice || !sellPrice || buyPrice <= 0 || sellPrice <= 0) {
        alert('الرجاء إدخال أسعار صحيحة');
        return;
    }
    
    const investment = buyPrice * amount;
    const revenue = sellPrice * amount;
    const profit = revenue - investment;
    const percent = ((profit / investment) * 100).toFixed(2);
    
    const resultDiv = document.getElementById('calc-result');
    const isProfit = profit >= 0;
    
    resultDiv.className = 'calc-result show ' + (isProfit ? 'profit' : 'loss');
    
    resultDiv.innerHTML = `
        <div class="calc-result-amount">
            ${isProfit ? '+' : ''}${formatPrice(profit)} $
        </div>
        <div class="calc-result-percent">
            ${isProfit ? '📈' : '📉'} ${isProfit ? '+' : ''}${percent}%
        </div>
        <div class="calc-result-details">
            <div>استثمار: $${formatPrice(investment)}</div>
            <div>عائد: $${formatPrice(revenue)}</div>
            <div>الكمية: ${amount} ${COIN_NAMES[coin]?.symbol || coin.toUpperCase()}</div>
        </div>
    `;
}

// تحديث الأسعار للحاسبة
function updateCurrentPrices(data) {
    currentPrices = data;
}

// ==================== 📰 أخبار العملات الرقمية ====================

let currentNewsTab = 'latest';

// تهيئة الأخبار والتحليلات
document.addEventListener('DOMContentLoaded', () => {
    fetchNews();
    fetchFearGreedIndex();
    generateTradingSignals();
    generateMarketAnalysis();
    
    // تحديث الأخبار والتحليلات كل 5 دقائق
    setInterval(() => {
        fetchNews();
        fetchFearGreedIndex();
        generateTradingSignals();
        generateMarketAnalysis();
    }, 300000);
});

// تبديل تبويب الأخبار
function switchNewsTab(tab) {
    currentNewsTab = tab;
    document.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    fetchNews();
}

// جلب الأخبار
async function fetchNews() {
    const container = document.getElementById('news-container');
    
    // بيانات أخبار افتراضية (في الإنتاج يمكن استخدام API حقيقي)
    const newsData = getMockNews();
    
    let filteredNews = newsData;
    if (currentNewsTab === 'bullish') {
        filteredNews = newsData.filter(n => n.sentiment === 'positive');
    } else if (currentNewsTab === 'bearish') {
        filteredNews = newsData.filter(n => n.sentiment === 'negative');
    } else if (currentNewsTab === 'binance') {
        filteredNews = newsData.filter(n => n.source.toLowerCase().includes('binance') || n.title.toLowerCase().includes('binance'));
    }
    
    container.innerHTML = filteredNews.map(news => `
        <div class="news-item ${news.sentiment}">
            <div class="news-title">${news.title}</div>
            <div class="news-meta">
                <span class="news-source">${news.source}</span>
                <span class="news-time">${news.time}</span>
            </div>
            <div class="news-desc">${news.description}</div>
            ${news.url ? `<a href="${news.url}" target="_blank" class="news-link">قراءة المزيد →</a>` : ''}
        </div>
    `).join('');
}

// بيانات أخبار تجريبية (يمكن استبدالها بـ API حقيقي)
function getMockNews() {
    const now = new Date();
    return [
        {
            title: 'البيتكوين يتجاوز مستوى مقاومة مهم عند $43,000',
            source: 'CoinDesk',
            time: 'منذ ساعة',
            description: 'حقق البيتكوين اختراقاً صعودياً مهماً بعد أيام من التداول ضمن نطاق ضيق، مما يشير إلى احتمالية استمرار الزخم الصاعد.',
            sentiment: 'positive',
            url: 'https://coindesk.com'
        },
        {
            title: 'Binance تعلن عن تحديثات جديدة في منصة التداول',
            source: 'Binance Blog',
            time: 'منذ ساعتين',
            description: 'أعلنت منصة بينانس عن ميزات جديدة تشمل تحسينات في واجهة المستخدم وأدوات تحليل متقدمة للمتداولين.',
            sentiment: 'positive',
            url: 'https://binance.com'
        },
        {
            title: 'تحذير من هيئة الأوراق المالية بشأن العملات الرقمية',
            source: 'Reuters',
            time: 'منذ 3 ساعات',
            description: 'أصدرت الهيئة تحذيراً للمستثمرين من مخاطر الاستثمار في العملات الرقمية غير المنظمة.',
            sentiment: 'negative',
            url: 'https://reuters.com'
        },
        {
            title: 'إيثيريوم 2.0: تحديثات جديدة في شبكة التحقق',
            source: 'Crypto News',
            time: 'منذ 4 ساعات',
            description: 'تم تنفيذ تحديثات مهمة في شبكة إيثيريوم 2.0 مما يساهم في تحسين سرعة المعاملات وخفض الرسوم.',
            sentiment: 'positive',
            url: 'https://cryptonews.com'
        },
        {
            title: 'انخفاض حجم التداول في أسواق العملات الرقمية',
            source: 'CoinMarketCap',
            time: 'منذ 5 ساعات',
            description: 'شهدت الأسواق انخفاضاً في أحجام التداول خلال الـ24 ساعة الماضية، مما يعكس حذر المستثمرين.',
            sentiment: 'negative',
            url: 'https://coinmarketcap.com'
        },
        {
            title: 'MicroStrategy تضيف المزيد من البيتكوين إلى محفظتها',
            source: 'Bloomberg',
            time: 'منذ 6 ساعات',
            description: 'استمرار استراتيجية الشركة في تكديس البيتكوين مع شراء دفعة جديدة بقيمة 100 مليون دولار.',
            sentiment: 'positive',
            url: 'https://bloomberg.com'
        }
    ];
}

// ==================== 📢 شريط الأخبار المتحرك ====================

let tickerData = [];

function initTicker() {
    updateTicker();
    // تحديث الشريط كل دقيقة
    setInterval(updateTicker, 60000);
}

function updateTicker() {
    const tickerContent = document.getElementById('ticker-content');
    if (!tickerContent) return;
    
    // بيانات الشريط (تجمع بين العملات والأخبار)
    const tickerItems = generateTickerData();
    
    // تكرار البيانات مرتين للتمرير المستمر
    const doubledItems = [...tickerItems, ...tickerItems];
    
    tickerContent.innerHTML = doubledItems.map(item => `
        <span class="ticker-item">
            ${item.icon} ${item.text}
        </span>
    `).join('');
}

function generateTickerData() {
    const items = [];
    
    // أسعار العملات الرئيسية
    if (currentPrices.bitcoin) {
        const btcChange = currentPrices.bitcoin.usd_24h_change;
        const btcIcon = btcChange >= 0 ? '📈' : '📉';
        items.push({
            icon: btcIcon,
            text: `BTC $${formatPrice(currentPrices.bitcoin.usd)} (${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(2)}%)`
        });
    }
    
    if (currentPrices.ethereum) {
        const ethChange = currentPrices.ethereum.usd_24h_change;
        const ethIcon = ethChange >= 0 ? '📈' : '📉';
        items.push({
            icon: ethIcon,
            text: `ETH $${formatPrice(currentPrices.ethereum.usd)} (${ethChange >= 0 ? '+' : ''}${ethChange.toFixed(2)}%)`
        });
    }
    
    // أخبار اقتصادية
    items.push(
        { icon: '🌍', text: 'الذهب يرتفع مع تراجع الدولار' },
        { icon: '🛢️', text: 'أسعار النفط تستقر عند 80$ للبرميل' },
        { icon: '💵', text: 'الدولار يقوى أمام اليورو' },
        { icon: '🏦', text: 'الفيدرالي يحافظ على أسعار الفائدة' },
        { icon: '📊', text: 'مؤشر S&P 500 يحقق أرباحاً جديدة' },
        { icon: '🪙', text: 'تبني العملات الرقمية يزداد عالمياً' },
        { icon: '🇨🇳', text: 'الاقتصاد الصيني ينمو بنسبة 5%' },
        { icon: '🇪🇺', text: 'الاتحاد الأوروبي يبحث تنظيم العملات الرقمية' },
        { icon: '💰', text: 'الاحتياطي الفيدرالي يبحث خفض التضخم' },
        { icon: '🚀', text: 'الاستثمار في التقنية يصل لأرقام قياسية' }
    );
    
    return items;
}

// تحديث الشريط عند تحديث الأسعار
const originalUpdateUI = updateUI;
updateUI = function(data) {
    originalUpdateUI(data);
    updateTicker();
};

// ==================== 📊 التحليلات ====================

// جلب مؤشر الخوف والجشع من API حقيقي
async function fetchFearGreedIndex() {
    try {
        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const indexData = data.data[0];
            const value = parseInt(indexData.value);
            
            let classification, colorClass;
            
            if (value <= 20) {
                classification = 'Extreme Fear';
                colorClass = 'fear-greed-extreme-fear';
            } else if (value <= 40) {
                classification = 'Fear';
                colorClass = 'fear-greed-fear';
            } else if (value <= 60) {
                classification = 'Neutral';
                colorClass = 'fear-greed-neutral';
            } else if (value <= 80) {
                classification = 'Greed';
                colorClass = 'fear-greed-greed';
            } else {
                classification = 'Extreme Greed';
                colorClass = 'fear-greed-extreme-greed';
            }
            
            updateFearGreedUI({ value, classification, colorClass });
        }
    } catch (error) {
        console.error('Error fetching fear & greed index:', error);
        // في حالة الخطأ، استخدم بيانات افتراضية
        const mockIndex = generateMockFearGreedIndex();
        updateFearGreedUI(mockIndex);
    }
}

function generateMockFearGreedIndex() {
    // توليد قيمة عشوائية بين 0 و 100 كاحتياطي
    const value = Math.floor(Math.random() * 100);
    let classification, colorClass;
    
    if (value <= 20) {
        classification = 'Extreme Fear';
        colorClass = 'fear-greed-extreme-fear';
    } else if (value <= 40) {
        classification = 'Fear';
        colorClass = 'fear-greed-fear';
    } else if (value <= 60) {
        classification = 'Neutral';
        colorClass = 'fear-greed-neutral';
    } else if (value <= 80) {
        classification = 'Greed';
        colorClass = 'fear-greed-greed';
    } else {
        classification = 'Extreme Greed';
        colorClass = 'fear-greed-extreme-greed';
    }
    
    return { value, classification, colorClass };
}

function updateFearGreedUI(data) {
    const container = document.getElementById('fear-greed-index');
    container.className = `fear-greed-container ${data.colorClass}`;
    
    // حساب موضع الإبرة (من 0% إلى 100%)
    const needlePosition = data.value;
    
    container.innerHTML = `
        <div class="gauge-container">
            <div class="gauge-value">${data.value}</div>
            <div class="gauge-label">${data.classification}</div>
            <div class="gauge-bar-container">
                <div class="gauge-bar-bg">
                    <div class="gauge-gradient"></div>
                </div>
                <div class="gauge-needle" style="left: ${needlePosition}%;"></div>
            </div>
            <div class="gauge-scale">
                <span>Extreme Fear</span>
                <span>Fear</span>
                <span>Neutral</span>
                <span>Greed</span>
                <span>Extreme Greed</span>
            </div>
        </div>
    `;
}

// تدفقات البيتكوين
function updateBitcoinFlows() {
    const flows = [
        { label: 'تدفق إلى المنصات (24س)', value: '+$125M', positive: false },
        { label: 'تدفق من المنصات (24س)', value: '-$89M', positive: true },
        { label: 'صافي التدفق', value: '-$36M', positive: true },
        { label: 'رصيد المنصات', value: '2.1M BTC', positive: null }
    ];
    
    const container = document.getElementById('bitcoin-flows');
    container.innerHTML = flows.map(flow => `
        <div class="flow-item">
            <span class="flow-label">${flow.label}</span>
            <span class="flow-value ${flow.positive === true ? 'positive' : flow.positive === false ? 'negative' : ''}">
                ${flow.value}
            </span>
        </div>
    `).join('');
}

// توصيات التداول
function generateTradingSignals() {
    const signals = [
        { coin: 'بيتكوين (BTC)', action: 'شراء', confidence: 75, reason: 'اختراق المقاومة' },
        { coin: 'إيثيريوم (ETH)', action: 'شراء', confidence: 68, reason: 'زخم إيجابي' },
        { coin: 'بينانس (BNB)', action: 'انتظار', confidence: 52, reason: 'تداول جانبي' },
        { coin: 'سولانا (SOL)', action: 'بيع', confidence: 62, reason: 'مقاومة قوية' }
    ];
    
    const container = document.getElementById('trading-signals');
    container.innerHTML = signals.map(signal => `
        <div class="signal-item ${signal.action === 'شراء' ? 'buy' : signal.action === 'بيع' ? 'sell' : 'hold'}">
            <div class="signal-coin">${signal.coin}</div>
            <div class="signal-action">${signal.action} - ${signal.reason}</div>
            <div class="signal-confidence">ثقة: ${signal.confidence}%</div>
        </div>
    `).join('');
}

// تحليل السوق
function generateMarketAnalysis() {
    const analyses = [
        '**البيتكوين** يتداول أعلى متوسط 50 يوم، مما يشير إلى اتجاه صاعد قصير المدى.',
        '**إيثيريوم** يظهر قوة نسبية مقارنة بالبيتكوين، مع زيادة في حجم التداول.',
        '**السوق العام** يشهد تحسناً في معنويات المستثمرين مع انخفاض مؤشر الخوف.',
        '**مستويات الدعم**: البيتكوين $41,200 | إيثيريوم $2,450',
        '**مستويات المقاومة**: البيتكوين $45,000 | إيثيريوم $2,800'
    ];
    
    const container = document.getElementById('market-analysis');
    container.innerHTML = analyses.map(text => 
        `<p>${text.replace(/\*\*(.+?)\*\*/g, '<span class="market-highlight">$1</span>')}</p>`
    ).join('');
}

// تحديث التدفقات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    updateBitcoinFlows();
});
