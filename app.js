// ===== STATE =====
let apiKey = localStorage.getItem('gemini_api_key') || '';
let currentResults = { plan: '', didactic: '', presentation: '' };

// ===== INIT =====
window.onload = () => {
  if (apiKey) {
    document.getElementById('apiKey').value = apiKey;
    showApiStatus('✅ API кілті сақталған', 'success');
  }
};

// ===== API KEY =====
function saveApiKey() {
  const val = document.getElementById('apiKey').value.trim();
  if (!val || !val.startsWith('AIza')) {
    showApiStatus('❌ Дұрыс API кілт енгізіңіз (AIza... форматында)', 'error');
    return;
  }
  apiKey = val;
  localStorage.setItem('gemini_api_key', val);
  showApiStatus('✅ API кілті сәтті сақталды!', 'success');
}

function showApiStatus(msg, type) {
  const el = document.getElementById('apiStatus');
  el.textContent = msg;
  el.className = `api-status ${type}`;
  el.classList.remove('hidden');
}

// ===== INCLUSIVE TOGGLE =====
function toggleInclusiveDetail() {
  const val = document.getElementById('inclusive').value;
  const detail = document.getElementById('inclusiveDetail');
  detail.style.display = val === 'бар' ? 'flex' : 'none';
}

// ===== FORM DATA =====
function getFormData() {
  return {
    subject: document.getElementById('subject').value.trim(),
    grade: document.getElementById('grade').value,
    direction: document.getElementById('direction').value,
    topic: document.getElementById('topic').value.trim(),
    publisher: document.getElementById('publisher').value,
    inclusive: document.getElementById('inclusive').value,
    inclusiveType: document.getElementById('inclusiveType').value.trim()
  };
}

function validateForm(data) {
  const required = ['subject', 'grade', 'direction', 'topic', 'publisher'];
  for (const key of required) {
    if (!data[key]) {
      alert(`⚠️ "${fieldLabel(key)}" өрісін толтырыңыз`);
      return false;
    }
  }
  if (!apiKey) {
    alert('⚠️ Алдымен Gemini API кілтін енгізіп сақтаңыз');
    return false;
  }
  return true;
}

function fieldLabel(key) {
  const labels = { subject: 'Пән', grade: 'Сынып', direction: 'Сынып бағыты', topic: 'Тақырып', publisher: 'Кітап баспасы' };
  return labels[key] || key;
}

// ===== GENERATE =====
async function generatePlan() {
  const data = getFormData();
  if (!validateForm(data)) return;

  showLoading(true);
  animateSteps();

  try {
    const [plan, didactic, presentation] = await Promise.all([
      callGemini(buildPlanPrompt(data)),
      callGemini(buildDidacticPrompt(data)),
      callGemini(buildPresentationPrompt(data))
    ]);

    currentResults = { plan, didactic, presentation };
    renderResults();
  } catch (err) {
    showLoading(false);
    alert('❌ Қате: ' + err.message + '\n\nAPI кілтін және интернет байланысын тексеріңіз.');
  }
}

// ===== PROMPTS =====
function buildPlanPrompt(d) {
  const inclusiveText = d.inclusive === 'бар' && d.inclusiveType
    ? `\n- Инклюзивті оқушы бар: ${d.inclusiveType}. Сабақ жоспарына арнайы бейімдеу стратегиялары қосылсын.`
    : '';

  return `Сіз тәжірибелі қазақстандық мектеп мұғалімісіз. Төмендегі деректер бойынша толыққанды сабақ жоспарын ҚАЗАҚ тілінде жасаңыз.

Деректер:
- Пән: ${d.subject}
- Сынып: ${d.grade}
- Сынып бағыты: ${d.direction}
- Тақырып: ${d.topic}
- Оқулық баспасы: ${d.publisher}
- Сабақ ұзақтығы: 45 минут${inclusiveText}

Сабақ жоспары мынадай бөлімдерді қамтысын:

## 📋 САБАҚ АҚПАРАТЫ
Пән, сынып, тақырып, мерзім, мұғалім

## 🎯 МАҚСАТТАР
Білімділік, дамытушылық, тәрбиелік мақсаттар (SMART форматта)

## 📚 КҮТІЛЕТІН НӘТИЖЕЛЕР
Оқушылар нені меңгереді (3-5 нәтиже)

## 🛠️ САБАҚТЫҢ ЖАБДЫҚТАЛУЫ
Қажетті материалдар, ресурстар

## ⏱️ САБАҚ БАРЫСЫ

### 1. Ұйымдастыру кезеңі (3 мин)
### 2. Үй тапсырмасын тексеру (7 мин)
### 3. Жаңа тақырыпты түсіндіру (15 мин)
### 4. Бекіту және жаттығу (12 мин)
### 5. Өзіндік жұмыс (5 мин)
### 6. Рефлексия (3 мин)

## 📊 БАҒАЛАУ КРИТЕРИЙЛЕРІ
Формативті бағалау тәсілдері

## 📖 ҮЙГЕ ТАПСЫРМА
Нақты, орындалатын тапсырма

Барлық бөлімдерді толық, нақты, практикалық мазмұнмен толтырыңыз. Казахстан білім стандарттарына сай болсын.`;
}

function buildDidacticPrompt(d) {
  const inclusiveText = d.inclusive === 'бар' && d.inclusiveType
    ? `\nЕскерту: ${d.inclusiveType} ерекшелігі бар инклюзивті оқушыға арналған бейімдеу нұсқалары қосылсын.`
    : '';

  return `Тәжірибелі әдіскер ретінде "${d.topic}" тақырыбы бойынша ${d.grade}, ${d.direction} бағыты үшін дидактикалық материалдарды ҚАЗАҚ тілінде жасаңыз.
Пән: ${d.subject}, Баспа: ${d.publisher}${inclusiveText}

## 📝 ТАПСЫРМАЛАР ЖИЫНТЫҒЫ

### А деңгейі (базалық):
5 тапсырма — анықтамалар, фактілер, қарапайым операциялар

### Б деңгейі (орта):
5 тапсырма — қолдану, талдау, салыстыру

### В деңгейі (жоғары):
3 тапсырма — синтез, бағалау, шығармашылық

## 🃏 ФЛЭШ-КАРТОЧКАЛАР
10 маңызды ұғым — «Ұғым → Анықтама» форматында

## 🧩 ИНТЕРАКТИВТІ ТАПСЫРМА
Бір шығармашылық немесе топтық тапсырма (толық сипаттамасымен)

## 📋 ӨЗІНДІК ТЕКСЕРУ ПАРАҒЫ
Оқушыға арналған 10 сұрақ (иә/жоқ немесе қысқа жауап)

## 🔗 ПӘНАРАЛЫҚ БАЙЛАНЫС
2-3 байланыс (басқа пәндермен)

Барлық тапсырмалар нақты, тақырыпқа сай, оқушы орындай алатындай болсын.`;
}

function buildPresentationPrompt(d) {
  const inclusiveText = d.inclusive === 'бар' && d.inclusiveType
    ? `\nИнклюзивті оқушы (${d.inclusiveType}) үшін арнайы слайдтар немесе ескертулер қосылсын.`
    : '';

  return `Инструктор ретінде "${d.topic}" тақырыбындағы ${d.subject} пәні бойынша ${d.grade} сынып үшін презентация құрылымын ҚАЗАҚ тілінде жасаңыз.${inclusiveText}

## 🖥️ ПРЕЗЕНТАЦИЯ МАЗМҰНЫ

Барлығы 12-15 слайд. Әр слайд үшін:
**Слайд N: [Тақырып]**
- Мазмұн: ...
- Визуал: ... (сурет, диаграмма, схема немесе кесте)
- Мұғалімге ескерту: ...

Слайдтар тізімі:
1. Титул слайд
2. Алдыңғы тақырыпты еске түсіру / байланыс
3-4. Жаңа тақырыпты кіріспе
5-8. Негізгі тұжырымдамалар (2-4 слайд)
9-10. Мысалдар мен есептер
11. Бекіту жаттығуы (интерактив)
12. Маңызды тұжырымдар
13. Бағалау / тест сұрақтары
14. Үй тапсырмасы
15. Қосымша ресурстар (міндетті емес)

## 🎨 ДИЗАЙН ҰСЫНЫСТАРЫ
- Ұсынылатын түс палитрасы
- Қолданылатын шрифттер
- Жалпы стиль концепциясы

## 💡 МУЛЬТИМЕДИА РЕСУРСТАРЫ
3-5 нақты ресурс (YouTube, Bilim.kz, Khan Academy немесе т.б.)

Толық, нақты, іс жүзінде қолдануға болатын ұсыныстар беріңіз.`;
}

// ===== GEMINI API CALL =====
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096
      }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    const msg = err?.error?.message || response.statusText;
    if (msg.includes('API_KEY') || response.status === 400) throw new Error('API кілті жарамсыз. Тексеріңіз.');
    if (response.status === 429) throw new Error('Сұраныс шегі асып кетті. Бірнеше секунд күтіңіз.');
    throw new Error(msg);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '(Жауап алынбады)';
}

// ===== LOADING ANIMATION =====
let stepInterval = null;

function animateSteps() {
  const steps = ['step1', 'step2', 'step3'];
  let i = 0;
  steps.forEach(s => document.getElementById(s).className = 'step');

  stepInterval = setInterval(() => {
    if (i > 0) document.getElementById(steps[i - 1]).className = 'step done';
    if (i < steps.length) {
      document.getElementById(steps[i]).className = 'step active';
      i++;
    }
  }, 1800);
}

function showLoading(show) {
  const el = document.getElementById('loadingOverlay');
  if (show) {
    el.classList.remove('hidden');
    document.getElementById('generateBtn').disabled = true;
  } else {
    el.classList.add('hidden');
    document.getElementById('generateBtn').disabled = false;
    if (stepInterval) { clearInterval(stepInterval); stepInterval = null; }
    ['step1','step2','step3'].forEach(s => document.getElementById(s).className = 'step done');
  }
}

// ===== RENDER RESULTS =====
function renderResults() {
  showLoading(false);

  document.getElementById('tabPlan').innerHTML = markdownToHtml(currentResults.plan);
  document.getElementById('tabDidactic').innerHTML = markdownToHtml(currentResults.didactic);
  document.getElementById('tabPresentation').innerHTML = markdownToHtml(currentResults.presentation);

  document.getElementById('resultSection').classList.remove('hidden');
  document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Activate first tab
  switchTab('plan', document.querySelector('.tab'));
}

// ===== TAB SWITCH =====
function switchTab(name, btn) {
  document.querySelectorAll('.result-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  document.getElementById('tab' + capitalize(name)).classList.remove('hidden');
  if (btn) btn.classList.add('active');
}

// ===== MARKDOWN RENDERER =====
function markdownToHtml(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />')
    .replace(/^(.+)$/, '<p>$1</p>');
}

// ===== COPY =====
async function copyResult() {
  const activeTab = document.querySelector('.result-content:not(.hidden)');
  const text = activeTab ? activeTab.innerText : '';
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 Мәтін көшірілді!');
  } catch {
    showToast('❌ Көшіру мүмкін болмады');
  }
}

// ===== DOWNLOAD =====
function downloadResult() {
  const tabNames = { tabPlan: 'sabak_zhospary', tabDidactic: 'didaktikalyk_material', tabPresentation: 'prezentatsiya' };
  const activeId = [...document.querySelectorAll('.result-content')].find(el => !el.classList.contains('hidden'))?.id;
  const filename = (tabNames[activeId] || 'sabak') + '.txt';
  const activeTab = document.getElementById(activeId);
  const text = activeTab ? activeTab.innerText : '';

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('⬇️ Файл жүктелді!');
}

// ===== RESET =====
function resetForm() {
  document.getElementById('resultSection').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  currentResults = { plan: '', didactic: '', presentation: '' };
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    background: #1e293b; border: 1px solid rgba(255,255,255,0.15);
    color: #e8edf5; padding: 12px 24px; border-radius: 50px;
    font-size: 0.85rem; font-weight: 500; z-index: 9999;
    animation: fadeIn 0.3s ease; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

// ===== UTILS =====
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
