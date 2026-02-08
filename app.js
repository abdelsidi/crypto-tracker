// 🚀 متتبع العملات الرقمية - Crypto Tracker

const COINS = ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana'];
const COIN_NAMES = {
    bitcoin: { name: 'بيتكوين', symbol: 'BTC', icon: '₿' },
    ethereum: { name: 'إيثيريوم', symbol: 'ETH', icon: 'Ξ' },
    binancecoin: { name: 'بينانس', symbol: 'BNB', icon: '🔶' },
    cardano: { name: 'كاردانو', symbol: 'ADA', icon: '₳' },
    solana: { name: 'سولانا', symbol: 'SOL', icon: '◎' }
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
});

// جلب الأسعار من CoinGecko API
async function fetchPrices() {
    try {
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${COINS.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
        );
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        updateUI(data);
        updateChart(data);
        checkAlerts(data);
        
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString('ar-SA');
    } catch (error) {
        console.error('Error fetching prices:', error);
        showError('تعذر تحديث الأسعار. سنحاول مرة أخرى...');
    }
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
    card.className = 'coin-card';
    card.innerHTML = `
        <div class="coin-header">
            <div class="coin-icon">${info.icon}</div>
            <div class="coin-info">
                <h3>${info.name}</h3>
                <span class="coin-symbol">${info.symbol}</span>
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

// ==================== 📊 التحليلات ====================

// جلب مؤشر الخوف والجشع
async function fetchFearGreedIndex() {
    try {
        // يمكن استخدام API حقيقي: https://api.alternative.me/fng/
        const mockIndex = generateMockFearGreedIndex();
        updateFearGreedUI(mockIndex);
    } catch (error) {
        console.error('Error fetching fear & greed index:', error);
    }
}

function generateMockFearGreedIndex() {
    // توليد قيمة عشوائية بين 0 و 100
    const value = Math.floor(Math.random() * 100);
    let classification, colorClass;
    
    if (value <= 20) {
        classification = 'خوف شديد';
        colorClass = 'fear-greed-extreme-fear';
    } else if (value <= 40) {
        classification = 'خوف';
        colorClass = 'fear-greed-fear';
    } else if (value <= 60) {
        classification = 'محايد';
        colorClass = 'fear-greed-neutral';
    } else if (value <= 80) {
        classification = 'جشع';
        colorClass = 'fear-greed-greed';
    } else {
        classification = 'جشع شديد';
        colorClass = 'fear-greed-extreme-greed';
    }
    
    return { value, classification, colorClass };
}

function updateFearGreedUI(data) {
    const container = document.getElementById('fear-greed-index');
    container.className = `fear-greed-meter ${data.colorClass}`;
    container.innerHTML = `
        <div class="meter-circle">
            <span class="meter-value">${data.value}</span>
            <span class="meter-label">${data.classification}</span>
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
