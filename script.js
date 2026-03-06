// ====== Config ======
const API_URL = 'https://api.coingecko.com/api/v3/coins/markets';
const TF_KEY = {
    hour:  'price_change_percentage_1h_in_currency',
    day:   'price_change_percentage_24h_in_currency',
    week:  'price_change_percentage_7d_in_currency',
    month: 'price_change_percentage_30d_in_currency',
    year:  'price_change_percentage_1y_in_currency'
};

// ====== State ======
let timeframe = 'day';
let allData = [];
let nodes = [];
let coinImages = {};
let resizeTimer;
const DPR = window.devicePixelRatio || 1;

// ====== DOM ======
const chartDiv = document.getElementById('bubble-chart');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltipEl = document.getElementById('tooltip');
const searchInput = document.getElementById('search-input');

// ====== Init ======
document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    await fetchData();
    layout();
    draw();
});

// ====== Events ======
function bindEvents() {
    document.getElementById('timeframe-tabs').addEventListener('click', e => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('selected'));
        tab.classList.add('selected');
        timeframe = tab.dataset.tf;
        layout();
        draw();
    });

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { layout(); draw(); }, 200);
    });

    // Tooltip on hover
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left);
        const my = (e.clientY - rect.top);
        const hit = nodes.find(n => {
            const dx = mx - n.x, dy = my - n.y;
            return dx * dx + dy * dy <= n.r * n.r;
        });
        if (hit) {
            canvas.style.cursor = 'pointer';
            showTip(e, hit);
        } else {
            canvas.style.cursor = 'auto';
            hideTip();
        }
    });
    canvas.addEventListener('mouseleave', hideTip);

    // Search filter
    searchInput.addEventListener('input', () => { layout(); draw(); });
}

// ====== Data ======
async function fetchData() {
    try {
        const params = new URLSearchParams({
            vs_currency: 'usd', order: 'market_cap_desc',
            per_page: '100', page: '1', sparkline: 'false',
            price_change_percentage: '1h,24h,7d,30d,1y'
        });
        const res = await fetch(`${API_URL}?${params}`);
        if (!res.ok) throw new Error(res.status);
        allData = await res.json();
        if (!Array.isArray(allData) || !allData.length) throw new Error('empty');
    } catch (e) {
        console.warn('API unavailable, using mock data:', e.message);
        allData = mockData();
    }
    // Preload coin images
    allData.forEach(c => {
        if (c.image) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = c.image;
            img.onload = () => { coinImages[c.id] = img; draw(); };
        }
    });
}

// ====== Layout ======
function layout() {
    const W = chartDiv.clientWidth;
    const H = chartDiv.clientHeight;

    // Resize canvas
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    // Filter by search
    const q = (searchInput.value || '').toLowerCase().trim();
    let data = allData;
    if (q) data = data.filter(c =>
        c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
    data = data.slice(0, 100);

    // Compute change + radius
    const processed = data.map(c => ({
        ...c,
        change: c[TF_KEY[timeframe]] || 0
    }));

    // SIZE BY ABS(% CHANGE) — matching original screenshot
    const minR = Math.max(14, Math.min(W, H) * 0.022);
    const maxR = Math.min(W, H) * 0.2;
    const maxAbs = Math.max(1, d3.max(processed, d => Math.abs(d.change)));
    const radiusScale = d3.scaleSqrt().domain([0, maxAbs]).range([minR, maxR]);

    nodes = processed.map(d => ({
        ...d,
        r: Math.max(minR, radiusScale(Math.abs(d.change))),
        x: 0, y: 0
    }));

    // Shuffle for even distribution
    for (let i = nodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
    }

    // Pack from center outward — tight packing
    nodes.sort((a, b) => b.r - a.r); // big first
    nodes.forEach((n, i) => {
        const a = Math.random() * Math.PI * 2;
        const dist = Math.random() * Math.min(W, H) * 0.2;
        n.x = W / 2 + Math.cos(a) * dist;
        n.y = H / 2 + Math.sin(a) * dist;
    });

    // Very tight collision, minimal gap
    const sim = d3.forceSimulation(nodes)
        .force('x', d3.forceX(W / 2).strength(0.012))
        .force('y', d3.forceY(H / 2).strength(0.012))
        .force('collide', d3.forceCollide(d => d.r + 0.8).strength(1).iterations(10))
        .stop();

    for (let i = 0; i < 500; i++) {
        sim.tick();
        nodes.forEach(n => {
            n.x = Math.max(n.r, Math.min(W - n.r, n.x));
            n.y = Math.max(n.r, Math.min(H - n.r, n.y));
        });
    }
}

// ====== Draw ======
function draw() {
    const W = chartDiv.clientWidth;
    const H = chartDiv.clientHeight;

    ctx.save();
    ctx.scale(DPR, DPR);

    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, W, H);

    // Sort: draw glowing ones last so glow is on top
    const sorted = [...nodes].sort((a, b) => {
        const ag = a.change > 2 ? 1 : 0;
        const bg = b.change > 2 ? 1 : 0;
        return ag - bg;
    });

    sorted.forEach(n => drawBubble(n));
    ctx.restore();
}

// ====== Draw Single Bubble ======
function drawBubble(n) {
    const { x, y, r, change } = n;
    const abs = Math.abs(change);
    const t = Math.min(abs / 12, 1);

    // Base color HSL
    let h, s, l;
    if (change >= 0) {
        h = 148; s = 20 + t * 42; l = 16 + t * 14;
    } else {
        h = 340 + t * 6; s = 18 + t * 26; l = 18 + t * 8;
    }

    // Green glow for positive coins
    if (change > 2) {
        const gi = Math.min((change - 2) / 12, 1);
        ctx.save();
        ctx.shadowBlur = 15 + gi * 45;
        ctx.shadowColor = `rgba(20, 255, 80, ${(0.25 + gi * 0.55).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        ctx.fill();
        ctx.restore();

        // Green ring border
        ctx.beginPath();
        ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(20, 255, 80, ${(0.25 + gi * 0.6).toFixed(2)})`;
        ctx.lineWidth = 1.5 + gi * 1.5;
        ctx.stroke();
    } else {
        // Regular bubble
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        ctx.fill();

        // Subtle border
        ctx.beginPath();
        ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = change > 0
            ? `rgba(100, 200, 130, 0.12)`
            : `rgba(180, 140, 150, ${(0.08 + t * 0.08).toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 3D sphere highlight overlay
    const grad = ctx.createRadialGradient(
        x - r * 0.18, y - r * 0.22, r * 0.05,
        x, y, r
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // ---- Content ----
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    const d = r * 2;

    // Coin logo
    const img = coinImages[n.id];
    if (img && d > 40) {
        const imgS = Math.max(12, Math.min(36, r * 0.42));
        const imgY = y - r * 0.22;
        ctx.globalAlpha = 0.92;
        ctx.drawImage(img, x - imgS / 2, imgY - imgS / 2, imgS, imgS);
        ctx.globalAlpha = 1;
    }

    // Symbol
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symSize = Math.max(7, r * 0.3);
    ctx.font = `800 ${symSize}px Verdana, Arial, sans-serif`;
    const symY = img && d > 40 ? y + r * 0.12 : y - r * 0.06;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 3;
    ctx.fillText((n.symbol || '').toUpperCase(), x, symY);
    ctx.shadowBlur = 0;

    // Change %
    if (d > 30) {
        const chSize = Math.max(6, r * 0.22);
        ctx.font = `700 ${chSize}px Verdana, Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        const sign = change > 0 ? '+' : '';
        const chY = img && d > 40 ? y + r * 0.38 : y + r * 0.24;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 2;
        ctx.fillText(`${sign}${change.toFixed(1)}%`, x, chY);
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

// ====== Tooltip ======
function showTip(e, n) {
    const rows = [
        ['1h', n[TF_KEY.hour]], ['24h', n[TF_KEY.day]],
        ['7d', n[TF_KEY.week]], ['30d', n[TF_KEY.month]],
        ['1y', n[TF_KEY.year]]
    ];
    const imgTag = n.image ? `<img src="${esc(n.image)}" onerror="this.style.display='none'">` : '';
    tooltipEl.innerHTML = `
        <div class="tt-header">${imgTag}<div><div class="tt-name">${esc(n.name)}</div><div class="tt-sym">${esc((n.symbol||'').toUpperCase())}</div></div></div>
        <div class="tt-row"><span class="tt-label">Price</span><span class="tt-val">${fmtPrice(n.current_price)}</span></div>
        <div class="tt-row"><span class="tt-label">Market Cap</span><span class="tt-val">${fmtCap(n.market_cap)}</span></div>
        ${rows.map(([l, v]) => v == null ? '' :
            `<div class="tt-row"><span class="tt-label">${l}</span><span class="tt-val ${v >= 0 ? 'tt-pos' : 'tt-neg'}">${v >= 0 ? '+' : ''}${v.toFixed(2)}%</span></div>`
        ).join('')}`;
    tooltipEl.classList.add('visible');
    moveTip(e);
}
function moveTip(e) {
    const p = 14;
    let x = e.clientX + p, y = e.clientY + p;
    if (x + tooltipEl.offsetWidth > innerWidth - p) x = e.clientX - tooltipEl.offsetWidth - p;
    if (y + tooltipEl.offsetHeight > innerHeight - p) y = e.clientY - tooltipEl.offsetHeight - p;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top = y + 'px';
}
function hideTip() { tooltipEl.classList.remove('visible'); }

// ====== Helpers ======
function fmtPrice(p) {
    if (p == null) return '\u2014';
    if (p >= 1) return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 0.01) return '$' + p.toFixed(4);
    return '$' + p.toPrecision(3);
}
function fmtCap(c) {
    if (c == null) return '\u2014';
    if (c >= 1e12) return '$' + (c / 1e12).toFixed(2) + 'T';
    if (c >= 1e9) return '$' + (c / 1e9).toFixed(2) + 'B';
    if (c >= 1e6) return '$' + (c / 1e6).toFixed(1) + 'M';
    return '$' + c.toLocaleString();
}
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// ====== Mock Data ======
function mockData() {
    const rn = m => +(((Math.random() - 0.5) * 2 * m).toFixed(2));
    const coins = [
        ['bitcoin','btc','Bitcoin',1250e9,68500],['ethereum','eth','Ethereum',410e9,3420],
        ['tether','usdt','Tether',97e9,1.0],['binancecoin','bnb','BNB',88e9,595],
        ['solana','sol','Solana',78e9,185],['ripple','xrp','XRP',68e9,1.25],
        ['usd-coin','usdc','USD Coin',46e9,1.0],['cardano','ada','Cardano',36e9,1.02],
        ['dogecoin','doge','Dogecoin',29e9,0.2],['avalanche-2','avax','Avalanche',26e9,68],
        ['polkadot','dot','Polkadot',21e9,16.2],['chainlink','link','Chainlink',19e9,32],
        ['tron','trx','TRON',17e9,0.19],['polygon','matic','Polygon',15e9,1.55],
        ['shiba-inu','shib','Shiba Inu',13e9,0.000022],['litecoin','ltc','Litecoin',11.5e9,155],
        ['uniswap','uni','Uniswap',10.5e9,17.2],['bitcoin-cash','bch','Bitcoin Cash',9.8e9,500],
        ['cosmos','atom','Cosmos',8.5e9,29],['stellar','xlm','Stellar',7.8e9,0.28],
        ['near','near','NEAR Protocol',7.2e9,7.5],['monero','xmr','Monero',6.8e9,365],
        ['internet-computer','icp','ICP',6.2e9,14],['ethereum-classic','etc','Ethereum Classic',5.8e9,40],
        ['aptos','apt','Aptos',5.2e9,12.5],['hedera','hbar','Hedera',4.8e9,0.14],
        ['filecoin','fil','Filecoin',4.2e9,9],['the-graph','grt','The Graph',3.9e9,0.44],
        ['arbitrum','arb','Arbitrum',3.6e9,2.9],['optimism','op','Optimism',3.3e9,3.9],
        ['render-token','rndr','Render',3.1e9,8.5],['injective','inj','Injective',2.9e9,36],
        ['sui','sui','Sui',2.7e9,2.0],['immutable-x','imx','Immutable',2.4e9,3.3],
        ['sei','sei','Sei',2.2e9,0.88],['celestia','tia','Celestia',2.1e9,19],
        ['aave','aave','Aave',2.0e9,140],['maker','mkr','Maker',1.9e9,2000],
        ['stacks','stx','Stacks',1.8e9,2.9],['theta','theta','Theta',1.7e9,1.7],
        ['algorand','algo','Algorand',1.6e9,0.48],['the-sandbox','sand','Sandbox',1.5e9,0.78],
        ['axie-infinity','axs','Axie Infinity',1.4e9,11],['decentraland','mana','Decentraland',1.3e9,0.68],
        ['flow','flow','Flow',1.2e9,1.1],['curve-dao','crv','Curve DAO',1.1e9,1.2],
        ['pepe','pepe','Pepe',1.05e9,0.0000023],['bonk','bonk','Bonk',950e6,0.000015],
        ['floki','floki','FLOKI',880e6,0.00019],['quant','qnt','Quant',820e6,118],
        ['okb','okb','OKB',4.5e9,55],['toncoin','ton','Toncoin',12e9,5.8],
        ['kaspa','kas','Kaspa',3.2e9,0.15],['ondo','ondo','Ondo',2.5e9,1.2],
        ['flare','flr','Flare',1.5e9,0.035],['decred','dcr','Decred',1.1e9,65],
        ['pancakeswap','cake','PancakeSwap',900e6,3.8],['nexo','nexo','Nexo',850e6,1.6],
        ['hyperliquid','hype','Hyperliquid',1.3e9,12],['trump','trump','TRUMP',800e6,15],
        ['vechain','vet','VeChain',2.8e9,0.04],['xdc','xdc','XDC Network',1.2e9,0.06],
        ['worldcoin','wld','Worldcoin',1.8e9,3.5],['mantle','mnt','Mantle',2e9,0.85],
        ['kucoin','kcs','KuCoin',1e9,12],['whitebit','wbt','WhiteBIT',850e6,8.5],
        ['pengu','pengu','Pudgy Penguins',700e6,0.018],['morpho','morpho','Morpho',500e6,2.8],
        ['river','river','River',300e6,0.5],['kite','kite','Kite',250e6,0.08],
        ['dash','dash','Dash',750e6,42],['paxos-gold','paxg','PAX Gold',600e6,2050],
        ['jupiter','jup','Jupiter',750e6,1.4],['dogwifhat','wif','dogwifhat',700e6,2.9],
        ['lido','ldo','Lido DAO',650e6,3.6],['synthetix','snx','Synthetix',600e6,4.9],
        ['blur','blur','Blur',550e6,0.68],['eos','eos','EOS',520e6,1.25],
        ['tezos','xtz','Tezos',480e6,1.7],['chiliz','chz','Chiliz',450e6,0.13],
        ['compound','comp','Compound',420e6,88],['rocket-pool','rpl','Rocket Pool',400e6,36],
        ['gala','gala','Gala',380e6,0.055],['enjin','enj','Enjin Coin',360e6,0.38],
        ['fetch-ai','fet','Fetch.ai',340e6,2.3],['ocean','ocean','Ocean',320e6,1.1],
        ['mask','mask','Mask Network',300e6,5.5],['mina','mina','Mina',280e6,1.8],
        ['celo','celo','Celo',260e6,0.85],['1inch','1inch','1inch',240e6,0.55],
        ['loopring','lrc','Loopring',220e6,0.35],['ankr','ankr','Ankr',200e6,0.045],
        ['harmony','one','Harmony',185e6,0.025],['iotex','iotx','IoTeX',170e6,0.065],
        ['sushi','sushi','SushiSwap',155e6,1.85],['yearn','yfi','Yearn',145e6,12500],
        ['balancer','bal','Balancer',135e6,5.2],['illuvium','ilv','Illuvium',125e6,125],
        ['stable','stable','Stable',100e6,1.0],['ena','ena','Ethena',1.8e9,0.95],
        ['virtual','virtual','Virtuals',1.2e9,1.5],['sky','sky','Sky',800e6,5.2],
    ];
    return coins.map(([id, symbol, name, mcap, price]) => ({
        id, symbol, name, market_cap: mcap, current_price: price, image: '',
        price_change_percentage_1h_in_currency: rn(4),
        price_change_percentage_24h_in_currency: rn(8),
        price_change_percentage_7d_in_currency: rn(14),
        price_change_percentage_30d_in_currency: rn(25),
        price_change_percentage_1y_in_currency: rn(100),
    }));
}
