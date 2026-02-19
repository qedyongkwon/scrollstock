const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// index.html 서빙
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// 유효 티커 목록
// ============================================
const validTickers = [
  'AAPL','MSFT','GOOGL','GOOG','AMZN','NVDA','META','TSLA','BRK.B','UNH',
  'JNJ','V','XOM','WMT','JPM','MA','PG','AVGO','HD','CVX',
  'MRK','ABBV','LLY','PEP','KO','COST','ADBE','CRM','AMD','NFLX',
  'TMO','ACN','MCD','CSCO','ABT','DHR','TXN','NEE','UPS','PM',
  'INTC','HON','LOW','UNP','AMGN','IBM','BA','GE','CAT','SBUX',
  'GS','BLK','ISRG','MDLZ','ADI','REGN','VRTX','GILD','BKNG','ADP',
  'MMC','SYK','LRCX','SCHW','CB','ZTS','TMUS','MO','PLD','CI',
  'SO','DUK','BDX','CME','CL','ICE','AON','BSX','SHW','FIS',
  'NOC','LMT','RTX','GD','HII',
  'PYPL','SQ','SHOP','COIN','MARA','RIOT',
  'PLTR','SNOW','CRWD','NET','DDOG','ZS','OKTA','MDB',
  'RIVN','NIO','LI','XPEV','LCID','F','GM','TM',
  'DIS','WBD','PARA','CMCSA','SNAP','PINS','RBLX',
  'ARM','SMCI','DELL','HPQ','ORCL','NOW','PANW',
  'TSM','ASML','QCOM','MRVL','MU','KLAC','AMAT',
  'BAC','MS','WFC','C','USB','PNC','TFC',
  'PFE','MRNA','BMY','AZN','NVO','SNY',
  'CVS','WBA','HCA','ELV',
  'COP','SLB','OXY','EOG','DVN','HAL',
  'BABA','JD','PDD','BIDU','TCEHY',
  'NKE','LULU','TJX','ROST',
  'UBER','LYFT','ABNB','DASH',
  'AI','BBAI','SOUN','UPST','PATH',
  'SOFI','HOOD','LC','NU',
  'ENPH','SEDG','FSLR','RUN',
  'SPY','QQQ','IWM','DIA','VOO',
  'GLD','SLV','USO','TLT'
];

function similarity(a, b) {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  let bonus = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) bonus += 0.15; else break;
  }
  if (longer.includes(shorter) || shorter.includes(longer)) bonus += 0.3;
  return Math.min(1, (longer.length - levenshtein(a, b)) / longer.length + bonus);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]!==b[j-1]?1:0));
  return dp[m][n];
}

app.post('/api/validate-ticker', (req, res) => {
  const upper = (req.body.ticker || '').toUpperCase().trim();
  if (validTickers.includes(upper)) return res.json({ valid: true, ticker: upper, suggestions: [] });
  const suggestions = validTickers
    .map(t => ({ ticker: t, score: similarity(upper, t) }))
    .filter(t => t.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(t => t.ticker);
  res.json({ valid: false, ticker: upper, suggestions });
});

// ============================================
// 섹터 매핑
// ============================================
const sectorMap = {
  'AAPL': { sector: 'tech', related: ['MSFT', 'GOOGL'], themes: ['스마트폰', 'AI', '클라우드'] },
  'MSFT': { sector: 'tech', related: ['AAPL', 'GOOGL', 'CRM'], themes: ['클라우드', 'AI', '엔터프라이즈'] },
  'GOOGL': { sector: 'tech', related: ['META', 'MSFT', 'AMZN'], themes: ['검색', 'AI', '광고'] },
  'META': { sector: 'tech', related: ['GOOGL', 'SNAP', 'PINS'], themes: ['소셜미디어', 'AI', '메타버스'] },
  'NVDA': { sector: 'semiconductor', related: ['AMD', 'INTC', 'TSM', 'AVGO', 'SMCI'], themes: ['AI칩', 'GPU', '데이터센터'] },
  'AMD': { sector: 'semiconductor', related: ['NVDA', 'INTC', 'TSM'], themes: ['CPU', 'GPU', '데이터센터'] },
  'INTC': { sector: 'semiconductor', related: ['NVDA', 'AMD', 'TSM'], themes: ['반도체', '파운드리', 'PC'] },
  'TSM': { sector: 'semiconductor', related: ['NVDA', 'AMD', 'ASML'], themes: ['파운드리', '반도체 제조', 'AI칩'] },
  'AVGO': { sector: 'semiconductor', related: ['NVDA', 'QCOM', 'TXN'], themes: ['네트워킹', '반도체', 'AI'] },
  'TSLA': { sector: 'ev', related: ['RIVN', 'NIO', 'LI', 'F', 'LCID'], themes: ['전기차', '자율주행', '배터리'] },
  'RIVN': { sector: 'ev', related: ['TSLA', 'LCID', 'F'], themes: ['전기차', 'EV 트럭', '생산'] },
  'NIO': { sector: 'ev', related: ['TSLA', 'LI', 'XPEV'], themes: ['중국 전기차', '배터리 교환', 'EV'] },
  'AMZN': { sector: 'ecommerce', related: ['SHOP', 'WMT', 'BABA'], themes: ['이커머스', 'AWS', '물류'] },
  'SHOP': { sector: 'ecommerce', related: ['AMZN', 'WMT', 'ETSY'], themes: ['이커머스', 'SaaS', '소상공인'] },
  'NFLX': { sector: 'entertainment', related: ['DIS', 'WBD', 'PARA'], themes: ['스트리밍', '콘텐츠', '구독'] },
  'DIS': { sector: 'entertainment', related: ['NFLX', 'WBD', 'CMCSA'], themes: ['스트리밍', '테마파크', '미디어'] },
  'JPM': { sector: 'finance', related: ['BAC', 'GS', 'MS', 'WFC'], themes: ['은행', '금리', '투자은행'] },
  'GS': { sector: 'finance', related: ['JPM', 'MS', 'BAC'], themes: ['투자은행', 'M&A', '트레이딩'] },
  'JNJ': { sector: 'healthcare', related: ['PFE', 'UNH', 'MRK'], themes: ['제약', '의료기기', '헬스케어'] },
  'PFE': { sector: 'healthcare', related: ['JNJ', 'MRNA', 'MRK'], themes: ['백신', '제약', '바이오'] },
  'XOM': { sector: 'energy', related: ['CVX', 'COP', 'SLB'], themes: ['석유', '에너지', '정유'] },
  'CVX': { sector: 'energy', related: ['XOM', 'COP', 'SLB'], themes: ['석유', '천연가스', '에너지'] },
  'PLTR': { sector: 'ai_software', related: ['AI', 'SNOW', 'CRWD'], themes: ['AI 분석', '정부 계약', '빅데이터'] },
  'COIN': { sector: 'crypto', related: ['MARA', 'RIOT', 'HOOD'], themes: ['암호화폐', '거래소', '비트코인'] },
  'SOFI': { sector: 'fintech', related: ['HOOD', 'PYPL', 'SQ'], themes: ['핀테크', '디지털뱅킹', '대출'] },
  'BA': { sector: 'defense', related: ['LMT', 'RTX', 'NOC', 'GD'], themes: ['방산', '항공', '우주'] },
  'LMT': { sector: 'defense', related: ['BA', 'RTX', 'NOC'], themes: ['방산', '미사일', 'F-35'] },
};

const sectorNames = {
  ko: { tech: '빅테크', semiconductor: '반도체', ev: '전기차', ecommerce: '이커머스', entertainment: '엔터테인먼트', finance: '금융', healthcare: '헬스케어', energy: '에너지', ai_software: 'AI 소프트웨어', crypto: '암호화폐', fintech: '핀테크', defense: '방산' },
  en: { tech: 'Big Tech', semiconductor: 'Semiconductors', ev: 'Electric Vehicles', ecommerce: 'E-Commerce', entertainment: 'Entertainment', finance: 'Finance', healthcare: 'Healthcare', energy: 'Energy', ai_software: 'AI Software', crypto: 'Crypto', fintech: 'Fintech', defense: 'Defense' }
};

// ============================================
// 뉴스 엔드포인트
// ============================================
app.post('/api/news', async (req, res) => {
  const { tickers, language } = req.body;
  try {
    const lang = language === 'ko' ? 'ko' : 'en';
    const news = generateAllNews(tickers, lang);
    res.json({ success: true, news });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function generateAllNews(tickers, lang) {
  const all = [];
  all.push(...generateCoreNews(tickers, lang));
  all.push(...generateRelatedNews(tickers, lang));
  all.push(...generateMarketNews(lang));
  all.push(...generateFedRateNews(lang));
  all.push(...generatePoliticsNews(lang));
  all.push(...generateUSChinaNews(lang));
  all.push(...generateGeopoliticsNews(lang));
  all.push(...generateCryptoNews(lang));
  all.push(...generateTechTrendsNews(lang));
  all.push(...generateCommoditiesNews(lang));
  all.push(...generateEarningsNews(lang));
  all.push(...generateTrendingNews(tickers, lang));
  return all;
}

function generateCoreNews(tickers, lang) {
  const T = {
    ko: {
      positive: [
        { title: "{t} 주가, 실적 발표 후 급등", content: "{t}가 예상을 뛰어넘는 분기 실적을 발표하며 주가가 상승세를 보이고 있습니다." },
        { title: "{t}, 신제품 발표로 시장 기대감 고조", content: "{t}가 혁신적인 신제품을 공개하며 투자자들의 관심을 끌고 있습니다." },
        { title: "{t} CEO, 낙관적 전망 제시", content: "{t}의 최고경영자가 향후 성장에 대한 강한 자신감을 표명했습니다." },
        { title: "{t}, 대규모 자사주 매입 발표", content: "{t}가 대규모 자사주 매입 프로그램을 발표하며 주주 가치 제고에 나섰습니다." },
        { title: "{t}, 전략적 파트너십으로 주가 상승", content: "{t}가 주요 기업과의 전략적 파트너십을 발표하며 시너지 효과 기대감이 높아지고 있습니다." },
        { title: "{t}, 목표가 상향 조정 잇따라", content: "주요 증권사들이 {t}의 목표주가를 일제히 상향 조정했습니다." },
        { title: "{t}, AI 사업 확대로 새 성장동력 확보", content: "{t}가 AI 관련 사업에 대규모 투자를 단행하며 차세대 성장동력을 확보하고 있습니다." }
      ],
      negative: [
        { title: "{t}, 규제 우려로 하락세", content: "{t}가 새로운 규제 이슈로 인해 투자 심리가 위축되며 하락 압력을 받고 있습니다." },
        { title: "{t} 실적, 시장 기대 하회", content: "{t}의 최근 분기 실적이 월가의 예상을 밑돌며 투자자들을 실망시켰습니다." },
        { title: "{t}, 경쟁 심화로 마진 압박", content: "{t}가 업계 경쟁 심화로 수익성에 대한 우려가 커지고 있습니다." },
        { title: "{t}, 내부자 매도 보고로 심리 위축", content: "{t}의 경영진이 대규모 지분을 매각한 것으로 알려지며 우려가 확산되고 있습니다." },
        { title: "{t}, 소송 리스크에 주가 부진", content: "{t}가 대규모 소송에 휘말리며 법적 리스크가 부각되고 있습니다." }
      ]
    },
    en: {
      positive: [
        { title: "{t} Surges on Strong Earnings Beat", content: "{t} shares jumped after reporting quarterly earnings that exceeded expectations." },
        { title: "{t} Unveils Innovation That Excites Market", content: "{t} announced a breakthrough product capturing investor attention." },
        { title: "{t} CEO Presents Bullish Outlook", content: "The CEO of {t} expressed strong confidence in future growth prospects." },
        { title: "{t} Announces Major Buyback Program", content: "{t} revealed a significant share repurchase program, signaling financial confidence." },
        { title: "{t} Rises on Strategic Partnership Deal", content: "{t} announced a strategic partnership with a major industry player." },
        { title: "{t} Price Targets Raised Across Wall Street", content: "Major brokerages raised price targets for {t}, citing strong growth." },
        { title: "{t} Expands AI Business as Growth Engine", content: "{t} is making significant AI investments, securing next-gen growth drivers." }
      ],
      negative: [
        { title: "{t} Falls on Regulatory Concerns", content: "{t} stock declined as new regulatory challenges dampened sentiment." },
        { title: "{t} Misses Earnings Expectations", content: "{t}'s latest quarterly results fell short of Wall Street estimates." },
        { title: "{t} Faces Margin Pressure from Competition", content: "{t} is seeing increased competitive pressure raising profitability concerns." },
        { title: "{t} Insider Selling Dampens Sentiment", content: "Reports of significant insider selling at {t} raised concerns." },
        { title: "{t} Weighed Down by Litigation Risk", content: "{t} is facing a major lawsuit, with legal risks in focus." }
      ]
    }
  };
  const news = [];
  tickers.forEach((ticker, idx) => {
    const num = Math.random() > 0.3 ? 2 : 3;
    const used = new Set();
    for (let i = 0; i < num; i++) {
      const s = Math.random() > 0.35 ? 'positive' : 'negative';
      let ti; do { ti = Math.floor(Math.random() * T[lang][s].length); } while (used.has(`${s}${ti}`) && used.size < T[lang][s].length);
      used.add(`${s}${ti}`);
      const tmpl = T[lang][s][ti];
      const h = Math.floor(Math.random() * 6) + 1;
      news.push({ title: tmpl.title.replace(/{t}/g, ticker), content: tmpl.content.replace(/{t}/g, ticker), ticker, source: ['Reuters','Bloomberg','CNBC','MarketWatch','WSJ'][idx%5], time: lang==='ko'?`${h}시간 전`:`${h}h ago`, impact: s, tier: 'core', tierLabel: lang==='ko'?'📌 내 종목':'📌 My Stocks' });
    }
  });
  return news;
}

function generateRelatedNews(tickers, lang) {
  const T = { ko: ["{sector} 업종, {theme} 수요 증가로 주목 — {rt}를 비롯한 관련주들이 수혜가 기대됩니다.","{rt}, {theme} 분야에서 경쟁력 강화 — 사업 확대를 본격화하며 시장의 주목을 받고 있습니다.","{sector} 섹터 ETF 자금 유입 지속 — {rt} 등 주요 종목들의 강세가 긍정적 영향을 미치고 있습니다.","{rt}, {theme} 신기술 공개 — 차세대 기술로 업계 이목 집중","{sector} 업종 전망 긍정적 — 월가에서 {rt} 등 주요 기업 실적 개선 기대"], en: ["{sector} Sector Gains on Rising {theme} Demand — {rt} among stocks benefiting.","{rt} Strengthens Position in {theme} — Ramping up expansion.","{sector} ETFs See Continued Inflows — {rt} supporting broader sector.","{rt} Reveals Next-Gen {theme} Technology — Capturing attention.","{sector} Outlook: Analysts Bullish — {rt} expected to improve."] };
  const news = []; const usedT = new Set(tickers); const sectors = new Set();
  tickers.forEach(ticker => {
    const info = sectorMap[ticker];
    if (info && !sectors.has(info.sector)) {
      sectors.add(info.sector);
      info.related.filter(t => !usedT.has(t)).slice(0, 3).forEach(rt => {
        usedT.add(rt);
        const tmplStr = T[lang][Math.floor(Math.random() * T[lang].length)];
        const theme = info.themes[Math.floor(Math.random() * info.themes.length)];
        const sn = sectorNames[lang][info.sector] || info.sector;
        const parts = tmplStr.replace(/{sector}/g, sn).replace(/{rt}/g, rt).replace(/{theme}/g, theme).split(' — ');
        const h = Math.floor(Math.random() * 12) + 3;
        news.push({ title: parts[0], content: parts[1]||parts[0], ticker: rt, source: ['Reuters','Bloomberg','FT',"Barron's",'Seeking Alpha'][Math.floor(Math.random()*5)], time: lang==='ko'?`${h}시간 전`:`${h}h ago`, impact: Math.random()>0.3?'positive':'neutral', tier: 'related', tierLabel: lang==='ko'?`🔗 관련 업종 · ${sn}`:`🔗 Related · ${sn}` });
      });
    }
  });
  return news;
}

function generateMarketNews(lang) {
  const T = { ko: [{ t:"S&P 500, 사상 최고치 경신 후 차익 실현 매물 출회",c:"S&P 500이 사상 최고치 후 차익 실현 매물이 나오며 소폭 조정 중입니다."},{ t:"나스닥, 기술주 강세에 1% 이상 상승",c:"나스닥이 대형 기술주 강세에 힘입어 1% 넘게 올랐습니다."},{ t:"다우존스, 경기 방어주 중심 혼조세",c:"다우존스가 방어주와 가치주 중심으로 혼조세를 보였습니다."},{ t:"VIX 공포지수, 20 돌파하며 변동성 확대",c:"VIX가 20을 넘어서며 시장 불안감이 커지고 있습니다."},{ t:"미국 증시, 경제 지표 앞두고 관망세",c:"주요 경제 지표 발표를 앞두고 증시가 혼조세입니다."},{ t:"월가, 하반기 연착륙 전망 우세",c:"주요 투자은행들이 연착륙 가능성에 무게를 두고 있습니다."},{ t:"옵션 만기일 앞두고 변동성 확대",c:"대규모 옵션 만기일을 앞두고 변동성이 확대되고 있습니다."},{ t:"미국 소비 심리 3개월 연속 하락",c:"소비자심리지수가 3개월 연속 하락하며 소비 둔화 우려가 커지고 있습니다."}], en: [{ t:"S&P 500 Pulls Back After All-Time High",c:"The S&P 500 saw profit-taking after reaching a record."},{ t:"Nasdaq Up Over 1% on Tech Strength",c:"Nasdaq rose over 1% on large-cap tech strength."},{ t:"Dow Mixed Amid Defensive Rotation",c:"The Dow traded mixed as investors rotated into defensives."},{ t:"VIX Jumps Above 20",c:"The VIX surged past 20, signaling rising anxiety."},{ t:"US Markets Await Key Data",c:"Investors cautious ahead of key economic data."},{ t:"Wall Street Expects Soft Landing",c:"Major banks bet on a soft landing scenario."},{ t:"Options Expiry Drives Volatility",c:"Markets volatile ahead of major options expiration."},{ t:"Consumer Sentiment Falls 3rd Month",c:"Michigan Sentiment Index declined for the third month."}] };
  return pickRandom(T[lang],8).map((item,i)=>({ title:item.t,content:item.c,ticker:lang==='ko'?'미국 시장':'U.S. Market',source:['Bloomberg','FT','WSJ','Reuters','AP','CNBC','MarketWatch',"Barron's"][i%8],time:rTime(lang),impact:'neutral',tier:'market',tierLabel:lang==='ko'?'🌍 시장 뉴스':'🌍 Market News' }));
}

function generateFedRateNews(lang) {
  const T = { ko: [{ t:"연준 의장, 금리 인하 서두르지 않겠다",c:"파월 의장이 인플레이션 목표치 전까지 금리 인하를 서두르지 않겠다고 밝혔습니다."},{ t:"미국 10년물 수익률, 4.5% 돌파",c:"10년물 수익률이 4.5%를 돌파하며 성장주 부담이 커지고 있습니다."},{ t:"연준 위원, 연내 금리 인하 가능성 시사",c:"연준 이사가 데이터 뒷받침 시 연내 금리 인하 가능성을 언급했습니다."},{ t:"CME 페드워치, 9월 인하 확률 60%",c:"9월 금리 인하 확률이 60%를 넘어섰습니다."},{ t:"미국 CPI, 인플레이션 둔화 신호",c:"CPI가 예상을 소폭 하회하며 인플레이션 둔화 기대감이 높아졌습니다."},{ t:"FOMC 회의록, 위원 간 의견 분열",c:"회의록에서 금리 정책 방향에 대한 의견 차이가 확인되었습니다."},{ t:"미국 PPI 상승, 생산자 물가 압력 지속",c:"PPI가 예상을 상회하며 공급측 인플레이션 압력이 지속 중입니다."},{ t:"고용 지표, 예상보다 견고",c:"비농업 고용이 예상을 상회하며 노동시장 견조함을 보여주었습니다."}], en: [{ t:"Fed Chair: No Rush to Cut Rates",c:"Powell reiterated no rush to cut until inflation reaches target."},{ t:"10-Year Yield Breaks 4.5%",c:"The 10-year surged past 4.5%, pressuring growth valuations."},{ t:"Fed Governor Hints at Rate Cut This Year",c:"A Fed governor suggested cuts possible if data supports."},{ t:"FedWatch Shows 60% Sept Cut Probability",c:"CME FedWatch now shows 60%+ probability of September cut."},{ t:"CPI Shows Cooling Inflation",c:"Latest CPI slightly below expectations, boosting rate cut hopes."},{ t:"FOMC Minutes Show Divided Officials",c:"Minutes revealed disagreement on rate policy direction."},{ t:"PPI Rises, Producer Pressure Persists",c:"PPI beat expectations, suggesting supply-side inflation continues."},{ t:"Jobs Report Shows Resilient Market",c:"Non-farm payrolls beat expectations, showing labor resilience."}] };
  return pickRandom(T[lang],8).map((item,i)=>({ title:item.t,content:item.c,ticker:lang==='ko'?'금리·연준':'Fed & Rates',source:['Bloomberg','Reuters','WSJ','CNBC','FT','AP','MarketWatch',"Barron's"][i%8],time:rTime(lang),impact:'neutral',tier:'fed',tierLabel:lang==='ko'?'🏦 금리·연준':'🏦 Fed & Rates' }));
}

function generatePoliticsNews(lang) {
  const T = { ko: [{ t:"바이든 행정부, 반도체 보조금 2차 배분",c:"반도체 산업 육성 2차 보조금 배분 계획이 발표되었습니다."},{ t:"의회, 빅테크 규제 법안 심의 착수",c:"빅테크 독점 규제 법안 심의에 착수했습니다."},{ t:"대선 여론조사, 경제 정책이 핵심 이슈",c:"경제 정책이 유권자들의 최대 관심사로 나타났습니다."},{ t:"트럼프, 관세 강화 시사… 시장 긴장",c:"중국산 제품 관세 대폭 인상을 시사하며 시장이 긴장하고 있습니다."},{ t:"SEC, 암호화폐 규제 프레임워크 발표",c:"SEC가 암호화폐 새 규제 프레임워크를 발표했습니다."},{ t:"AI 규제 행정명령 발표",c:"백악관이 AI 안전성 관련 행정명령을 발표했습니다."},{ t:"예산안 교착, 셧다운 우려 고조",c:"예산안 협상 난항으로 정부 셧다운 가능성이 부각되고 있습니다."},{ t:"방산 예산 역대 최대 규모 추진",c:"역대 최대 규모의 방산 예산이 추진되고 있습니다."},{ t:"FTC, 대형 M&A 심사 강화",c:"FTC가 대형 인수합병 심사를 강화하겠다고 발표했습니다."},{ t:"전기차 보조금 자격 요건 강화",c:"EV 세금 공제 자격 요건이 강화되었습니다."}], en: [{ t:"Biden Admin: 2nd Round CHIPS Funding",c:"Second round of semiconductor subsidies announced."},{ t:"Congress Reviews Big Tech Regulation",c:"Formal antitrust hearings targeting major tech companies began."},{ t:"Polls: Economy Top Voter Concern",c:"Economic policy is the top issue for voters."},{ t:"Trump Signals Stronger Tariffs",c:"Trump indicated plans to raise tariffs on Chinese goods."},{ t:"SEC Unveils Crypto Framework",c:"The SEC announced a new crypto regulatory framework."},{ t:"White House AI Regulation Order",c:"New executive order on AI safety issued."},{ t:"Budget Impasse Raises Shutdown Fears",c:"Budget negotiations stalled, reviving shutdown concerns."},{ t:"Record Defense Budget Pushed",c:"The US pushes the largest defense budget in history."},{ t:"FTC Tightens M&A Review",c:"Enhanced scrutiny for large mergers announced."},{ t:"EV Tax Credit Requirements Tightened",c:"Stricter EV tax credit eligibility requirements announced."}] };
  return pickRandom(T[lang],10).map((item,i)=>({ title:item.t,content:item.c,ticker:lang==='ko'?'미국 정치':'US Politics',source:['Politico','AP','Reuters','WSJ','WashPost','CNN','Bloomberg','The Hill','NYT','NPR'][i%10],time:rTime(lang),impact:'neutral',tier:'politics',tierLabel:lang==='ko'?'🏛️ 정치·정책':'🏛️ Politics & Policy' }));
}

function generateUSChinaNews(lang) {
  const T = { ko: [{ t:"미국, 중국 AI 칩 수출 규제 추가 강화",c:"중국 대상 AI 칩 수출 규제가 추가 강화되었습니다."},{ t:"중국, 희토류 수출 제한으로 맞대응",c:"중국이 핵심 희토류 수출을 제한하겠다고 발표했습니다."},{ t:"딥시크 공개, 미국 AI 우위 위협?",c:"중국 AI 스타트업 딥시크가 저비용 고성능 AI 모델을 공개했습니다."},{ t:"화웨이, 자체 칩으로 AI 서버 출시",c:"화웨이가 자체 개발 칩 탑재 AI 서버를 출시했습니다."},{ t:"미중 무역 갈등, 공급망 재편 가속",c:"무역 갈등 심화로 글로벌 공급망 재편이 가속화되고 있습니다."},{ t:"중국 전기차, 유럽 시장 점유율 급증",c:"BYD 등 중국 EV 업체들이 유럽 시장을 빠르게 확대하고 있습니다."},{ t:"중국 바이오테크 투자 제한 검토",c:"미국이 중국 바이오테크 투자 제한을 검토 중입니다."},{ t:"대만 해협 긴장, 반도체 리스크 부각",c:"대만 해협 긴장이 반도체 공급망 리스크를 부각시키고 있습니다."},{ t:"중국 경제 둔화, 글로벌 수요 우려",c:"중국 성장률 하락으로 글로벌 수요 감소 우려가 커지고 있습니다."},{ t:"미중 기술 경쟁, 양자컴퓨터로 확산",c:"기술 패권 경쟁이 양자컴퓨터 분야로 확산 중입니다."}], en: [{ t:"US Tightens AI Chip Controls to China",c:"Further AI chip export restrictions to China announced."},{ t:"China Retaliates with Rare Earth Limits",c:"China restricting key rare earth exports in retaliation."},{ t:"DeepSeek Threatens US AI Dominance",c:"Chinese AI startup DeepSeek unveiled low-cost high-performance model."},{ t:"Huawei Launches AI Server with Own Chips",c:"Huawei launched AI servers with self-developed chips."},{ t:"US-China Tensions Accelerate Supply Shift",c:"Trade tensions driving global supply chain restructuring."},{ t:"Chinese EVs Surge in Europe",c:"BYD and Chinese EV makers gaining European market share rapidly."},{ t:"US Reviews China Biotech Investment Limits",c:"US reviewing restrictions on Chinese biotech investment."},{ t:"Taiwan Tensions Rise, Chip Risk Grows",c:"Taiwan Strait tensions highlighting semiconductor supply risks."},{ t:"China Slowdown Raises Demand Concerns",c:"China's growth below expectations, fueling demand worries."},{ t:"US-China Tech Race Goes Quantum",c:"Technology rivalry expanding into quantum computing."}] };
  return pickRandom(T[lang],10).map((item,i)=>({ title:item.t,content:item.c,ticker:lang==='ko'?'미중 경쟁':'US-China',source:['Reuters','Bloomberg','SCMP','Nikkei','WSJ','FT','AP','CNN','Diplomat','Politico'][i%10],time:rTime(lang),impact:'neutral',tier:'uschina',tierLabel:lang==='ko'?'🇺🇸🇨🇳 미중 경쟁':'🇺🇸🇨🇳 US-China Rivalry' }));
}

function generateGeopoliticsNews(lang) {
  const T = { ko: [{ t:"중동 긴장 고조, 유가 급등",c:"중동 지정학적 긴장으로 유가가 급등하고 있습니다."},{ t:"우크라이나 장기화, 유럽 에너지 위기",c:"분쟁 장기화로 유럽 에너지 안보 우려가 커지고 있습니다."},{ t:"NATO, 방위비 증액 합의",c:"NATO 동맹국들이 방위비 GDP 3%까지 증액에 합의했습니다."},{ t:"엔화 약세 지속, 환율 전쟁 우려",c:"엔화 약세가 지속되며 환율 전쟁 우려가 나오고 있습니다."},{ t:"인도, 제조업 허브로 급부상",c:"인도가 중국 대체 제조업 허브로 급부상하고 있습니다."},{ t:"글로벌 식량 가격 상승",c:"기후변화와 지정학적 요인으로 식량 가격이 상승하고 있습니다."},{ t:"OPEC+, 감산 연장 결정",c:"OPEC+가 원유 감산을 연장하기로 합의했습니다."},{ t:"홍해 위기, 해운 비용 급등",c:"홍해 안보 위협으로 해운 비용이 급등하고 있습니다."}], en: [{ t:"Middle East Tensions Spike, Oil Surges",c:"Geopolitical tensions driving oil prices higher."},{ t:"Ukraine Conflict Drags, Europe Crisis",c:"Prolonged conflict reviving European energy concerns."},{ t:"NATO Boosts Defense Spending",c:"NATO agreed to increase defense spending to 3% GDP."},{ t:"Yen Weakness, Currency War Fears",c:"Yen continues weakening, raising currency war concerns."},{ t:"India: New Manufacturing Hub",c:"India emerging as alternative manufacturing hub to China."},{ t:"Global Food Prices Rise",c:"Climate and geopolitical factors driving food prices higher."},{ t:"OPEC+ Extends Production Cuts",c:"OPEC+ agreed to extend oil production cuts."},{ t:"Red Sea Crisis: Shipping Costs Surge",c:"Red Sea threats causing global shipping cost spikes."}] };
  return pickRandom(T[lang],8).map((item,i)=>({ title:item.t,content:item.c,ticker:lang==='ko'?'지정학':'Geopolitics',source:['Reuters','Bloomberg','BBC','Al Jazeera','FT','AP','DW','Nikkei'][i%8],time:rTime(lang),impact:'neutral',tier:'geopolitics',tierLabel:lang==='ko'?'🌐 지정학':'🌐 Geopolitics' }));
}

function generateCryptoNews(lang) {
  const T = { ko: [{ t:"비트코인, 10만 달러 후 조정",c:"비트코인이 10만 달러 돌파 후 차익 실현으로 조정 중입니다."},{ t:"이더리움 ETF 기대감, 시장 활기",c:"이더리움 ETF 승인 기대감에 가격이 상승하고 있습니다."},{ t:"스테이블코인 규제 법안 통과 임박",c:"스테이블코인 규제 법안이 의회 통과를 앞두고 있습니다."},{ t:"반감기 후 채굴업체 수익성 분화",c:"반감기 이후 채굴업체들의 수익성이 크게 갈리고 있습니다."},{ t:"기관투자자, 암호화폐 비중 확대",c:"블랙록 등 기관투자자들이 암호화폐 비중을 늘리고 있습니다."},{ t:"DeFi 시장 부활, TVL 최고치",c:"DeFi 총 예치금이 사상 최고치를 기록했습니다."}], en: [{ t:"Bitcoin Corrects After $100K",c:"Bitcoin pulled back on profit-taking after $100K."},{ t:"ETH ETF Hopes Boost Market",c:"Ethereum ETF expectations driving ETH prices higher."},{ t:"Stablecoin Bill Nears Approval",c:"Stablecoin regulatory bill approaching Congressional vote."},{ t:"Post-Halving Mining Diverges",c:"Mining profitability diverging widely after the halving."},{ t:"Institutions Boost Crypto Allocations",c:"BlackRock, Fidelity increasing crypto allocations."},{ t:"DeFi Revival: TVL All-Time High",c:"DeFi TVL hits new all-time high on renewed interest."}] };
  return pickRandom(T[lang],6).map((item,i)=>({ title:item.t,content:item.c,ticker:lang==='ko'?'암호화폐':'Crypto',source:['CoinDesk','The Block','Decrypt','Bloomberg','CoinTelegraph','Messari'][i%6],time:rTime(lang),impact:Math.random()>0.5?'positive':'neutral',tier:'crypto',tierLabel:lang==='ko'?'₿ 암호화폐':'₿ Crypto' }));
}

function generateTechTrendsNews(lang) {
  const T = { ko: [{ t:"오픈AI, GPT-5 공개 임박",c:"오픈AI가 GPT-5 공개를 앞두고 있습니다."},{ t:"글로벌 AI 투자, 2,000억 달러 돌파 전망",c:"전 세계 AI 투자가 연간 2,000억 달러를 넘어설 전망입니다."},{ t:"애플 비전 프로 2세대 개발 중",c:"애플이 비전 프로 2세대를 개발 중인 것으로 알려졌습니다."},{ t:"자율주행, 레벨4 상용화 가시권",c:"자율주행 기술이 레벨4 상용화에 근접하고 있습니다."},{ t:"양자컴퓨터, 실용화 단계 진입",c:"IBM과 구글이 양자컴퓨터 실용 활용 사례를 발표했습니다."},{ t:"AI 에이전트 시대 개막",c:"AI 에이전트 기술이 업무 자동화에 혁명을 일으키고 있습니다."},{ t:"데이터센터 수요 폭증, 전력 문제",c:"AI 수요로 데이터센터 건설이 가속화되지만 전력 부족이 문제입니다."},{ t:"휴머노이드 로봇 시대 열린다",c:"테슬라 옵티머스 등 휴머노이드 로봇이 빠르게 성장 중입니다."}], en: [{ t:"GPT-5 Launch Imminent",c:"OpenAI nearing GPT-5 launch, expected to reshape AI industry."},{ t:"Global AI Investment to Top $200B",c:"Worldwide AI investment projected to surpass $200B annually."},{ t:"Apple Vision Pro 2 in Development",c:"Apple developing lighter, cheaper second-gen Vision Pro."},{ t:"Level 4 Self-Driving Nears Reality",c:"Autonomous driving approaching Level 4 commercialization."},{ t:"Quantum Computing Goes Practical",c:"IBM and Google demonstrated practical quantum applications."},{ t:"AI Agent Era Begins",c:"AI agents revolutionizing enterprise workflow automation."},{ t:"Data Center Boom Meets Power Crunch",c:"AI-driven data center growth constrained by power supply."},{ t:"Humanoid Robots Take Off",c:"Tesla Optimus and others driving rapid humanoid robot growth."}] };
  return pickRandom(T[lang],8).map((item,i)=>({ title:item.t,content:item.c,ticker:lang==='ko'?'테크 트렌드':'Tech Trends',source:['TechCrunch','The Verge','Wired','Ars Technica','MIT Review','Bloomberg','Reuters','CNBC'][i%8],time:rTime(lang),impact:'positive',tier:'techtrends',tierLabel:lang==='ko'?'🚀 테크 트렌드':'🚀 Tech Trends' }));
}

function generateCommoditiesNews(lang) {
  const T = { ko: [{ t:"금 가격, 사상 최고치 근접",c:"지정학적 불확실성으로 금 가격이 사상 최고치에 근접하고 있습니다."},{ t:"유가, 중동 리스크에 85달러 돌파",c:"중동 긴장으로 유가가 85달러를 넘어섰습니다."},{ t:"구리 급등, AI 데이터센터 수요",c:"AI 데이터센터 구리 수요 급증으로 가격이 올랐습니다."},{ t:"리튬 반등, EV 배터리 수요 회복",c:"리튬 가격이 반등하며 EV 배터리 수요 회복이 기대됩니다."},{ t:"천연가스, 겨울철 수요 증가로 상승",c:"겨울철 난방 수요 전망으로 천연가스 가격이 오르고 있습니다."},{ t:"은 가격 동반 상승, 산업 수요 확대",c:"금과 함께 은도 상승하며 태양광 수요가 늘고 있습니다."}], en: [{ t:"Gold Nears All-Time High",c:"Geopolitical uncertainty driving gold near record highs."},{ t:"Oil Breaks $85 on Middle East Risk",c:"Middle East tensions pushed crude above $85."},{ t:"Copper Surges on Data Center Demand",c:"AI data center copper demand driving prices higher."},{ t:"Lithium Rebounds on EV Demand",c:"Lithium recovering on EV battery demand expectations."},{ t:"Natural Gas Rises on Winter Demand",c:"Winter heating outlook pushing natural gas prices up."},{ t:"Silver Rallies with Gold",c:"Silver rising alongside gold with expanding solar demand."}] };
  return pickRandom(T[lang],6).map((item,i)=>({ title:item.t,content:item.c,ticker:lang==='ko'?'원자재':'Commodities',source:['Bloomberg','Reuters','Kitco','OilPrice','Mining.com','S&P Global'][i%6],time:rTime(lang),impact:'neutral',tier:'commodities',tierLabel:lang==='ko'?'⛏️ 원자재':'⛏️ Commodities' }));
}

function generateEarningsNews(lang) {
  const T = { ko: [{ t:"실적 시즌, S&P 500 75% 예상 상회",c:"S&P 500 기업 75%가 예상을 상회하는 실적을 보고했습니다."},{ t:"빅테크 실적 주간, 변동성 확대 예상",c:"AAPL, MSFT, GOOGL 등 빅테크 실적 발표가 예정되어 있습니다."},{ t:"은행 실적 호조, 금리 수혜 확인",c:"주요 은행들이 예상을 뛰어넘는 실적을 발표했습니다."},{ t:"소비재 실적 둔화, 소비 위축?",c:"소비재 기업 실적이 예상을 밑돌며 소비 둔화 우려가 커지고 있습니다."},{ t:"AI 수혜 기업, 가이던스 상향",c:"AI 관련 기업들이 실적 가이던스를 일제히 상향했습니다."},{ t:"헬스케어, 안정적 실적으로 방어주 역할",c:"헬스케어 기업들이 안정적 실적으로 방어주 역할을 하고 있습니다."}], en: [{ t:"Earnings: 75% of S&P 500 Beat",c:"Three-quarters of S&P 500 beat earnings consensus."},{ t:"Big Tech Earnings Week Ahead",c:"Major AAPL, MSFT, GOOGL earnings expected to drive volatility."},{ t:"Bank Earnings Strong on Rates",c:"Banks reported above-expectation earnings from higher rates."},{ t:"Consumer Earnings Slow",c:"Consumer company results raising spending slowdown concerns."},{ t:"AI Names Raise Guidance",c:"AI beneficiaries uniformly raised earnings guidance."},{ t:"Healthcare Delivers Steady Results",c:"Healthcare showing stable earnings as defensive play."}] };
  return pickRandom(T[lang],6).map((item,i)=>({ title:item.t,content:item.c,ticker:lang==='ko'?'실적 시즌':'Earnings',source:['Bloomberg','Reuters','CNBC','MarketWatch',"Barron's",'Seeking Alpha'][i%6],time:rTime(lang),impact:Math.random()>0.5?'positive':'neutral',tier:'earnings',tierLabel:lang==='ko'?'📊 실적 시즌':'📊 Earnings Season' }));
}

function generateTrendingNews(tickers, lang) {
  const T = { ko: [{ ticker:'PLTR',t:"PLTR, 정부 계약으로 거래량 급증",c:"팔란티어가 대규모 정부 계약을 수주했습니다.",i:"positive"},{ ticker:'COIN',t:"COIN, 비트코인 랠리 동반 급등",c:"코인베이스가 암호화폐 강세에 급등했습니다.",i:"positive"},{ ticker:'SMCI',t:"SMCI, AI 서버 수요에 급등",c:"슈퍼마이크로가 AI 서버 수요로 급등했습니다.",i:"positive"},{ ticker:'SOFI',t:"SOFI, 은행 면허 성장 가속",c:"소파이가 사업 다각화로 성장 중입니다.",i:"positive"},{ ticker:'ARM',t:"ARM, AI 칩 수요 수혜",c:"ARM이 모바일 AI 칩 수요로 수혜를 받고 있습니다.",i:"positive"},{ ticker:'CRWD',t:"CRWD, 사이버보안 수요 급증",c:"크라우드스트라이크가 보안 투자 확대로 성장 중입니다.",i:"positive"},{ ticker:'SNOW',t:"SNOW, 클라우드 플랫폼 확대",c:"스노우플레이크가 클라우드 시장 입지를 강화하고 있습니다.",i:"positive"},{ ticker:'UBER',t:"UBER, 자율주행 파트너십 발표",c:"우버가 자율주행 기업과 파트너십을 체결했습니다.",i:"positive"},{ ticker:'AI',t:"C3.ai, 엔터프라이즈 AI 수요 급등",c:"C3.ai가 기업용 AI 수요 급증으로 급등했습니다.",i:"positive"},{ ticker:'MARA',t:"MARA, 채굴 효율 개선",c:"마라홀딩스가 채굴 효율을 크게 개선했습니다.",i:"positive"}], en: [{ ticker:'PLTR',t:"PLTR Surges on Gov Contract",c:"Palantir saw huge volume on contract win.",i:"positive"},{ ticker:'COIN',t:"COIN Rallies with Bitcoin",c:"Coinbase jumped amid crypto rally.",i:"positive"},{ ticker:'SMCI',t:"SMCI Jumps on AI Demand",c:"Super Micro surged on AI server demand.",i:"positive"},{ ticker:'SOFI',t:"SOFI Growth Accelerates",c:"SoFi leveraging banking license for growth.",i:"positive"},{ ticker:'ARM',t:"ARM Benefits from AI Chips",c:"ARM sees royalty boost from AI chip demand.",i:"positive"},{ ticker:'CRWD',t:"CRWD on Cybersecurity Demand",c:"CrowdStrike growing on security spending.",i:"positive"},{ ticker:'SNOW',t:"SNOW Expands Cloud Platform",c:"Snowflake strengthening cloud market position.",i:"positive"},{ ticker:'UBER',t:"UBER Autonomous Partnership",c:"Uber partnered with self-driving tech company.",i:"positive"},{ ticker:'AI',t:"C3.ai Surges on AI Demand",c:"C3.ai jumped on enterprise AI demand.",i:"positive"},{ ticker:'MARA',t:"MARA Mining Efficiency Up",c:"Marathon reports significant mining gains.",i:"positive"}] };
  const filtered = T[lang].filter(x => !tickers.includes(x.ticker));
  return pickRandom(filtered,8).map((item,i)=>({ title:item.t,content:item.c,ticker:item.ticker,source:['Reddit','WSB','Seeking Alpha','Benzinga','TipRanks','Motley Fool','Stocktwits','Finviz'][i%8],time:rTime(lang),impact:item.i,tier:'trending',tierLabel:lang==='ko'?'🔥 트렌딩':'🔥 Trending' }));
}

function pickRandom(arr, n) { return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length)); }
function rTime(lang) { const h = Math.floor(Math.random() * 24) + 1; return lang === 'ko' ? `${h}시간 전` : `${h}h ago`; }

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Stock News running on port ${PORT}`);
});
