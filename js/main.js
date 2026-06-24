// js/main.js

// ===== ⚠️ 与 admin.js 保持一致 =====
const GITHUB_OWNER = 'Jonathan-Zhangzz';
const GITHUB_REPO  = 'graduation-market';
const GITHUB_LABEL = 'product';

// ===== 读取商品（前台无需 Token，直接公开读取）=====
async function fetchProducts() {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?labels=${GITHUB_LABEL}&state=open&per_page=100`
  );
  if (!res.ok) return [];
  const issues = await res.json();
  return issues.map(issue => {
    try { return JSON.parse(issue.body); } catch { return null; }
  }).filter(Boolean);
}

// ===== 读取联系方式（存在 localStorage，仅限同设备）=====
// 注意：联系方式只在后台设置的那台设备上有，
// 如需全网同步联系方式，请在下方 CONTACT 常量里直接写死
const CONTACT_FALLBACK = {
  wechat: 'wxid15036081392',   // ⚠️ 改为你的真实微信号
  phone:  '',
  note:   '欢迎扫码浏览，有意向请微信联系～'
};

function getContact() {
  try {
    const c = JSON.parse(localStorage.getItem('gm_contact') || '{}');
    return Object.keys(c).length > 0 ? c : CONTACT_FALLBACK;
  } catch { return CONTACT_FALLBACK; }
}

// ===== 渲染商品卡片 =====
function renderProducts(products) {
  const container = document.getElementById('productGrid');
  if (!container) return;

  const available = products.filter(p => p.status !== 'sold');
  const sold      = products.filter(p => p.status === 'sold');
  const sorted    = [...available, ...sold];

  if (sorted.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#b2bec3">
        <div style="font-size:48px">🛍️</div>
        <div style="margin-top:12px;font-size:15px">商品即将上架，敬请期待～</div>
      </div>`;
    return;
  }

  container.innerHTML = sorted.map(p => `
    <div class="product-card ${p.status === 'sold' ? 'sold-out' : ''}"
         onclick="location.href='product.html?id=${p.id}'">
      <div class="card-img-wrap">
        <img src="${p.image || 'https://placehold.co/300x300?text=图'}"
             alt="${p.name}"
             onerror="this.src='https://placehold.co/300x300?text=图'">
        ${p.status === 'sold' ? '<div class="sold-badge">已售出</div>' : ''}
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-meta">${p.category || '其他'}</div>
        <div class="card-price">¥${p.price}</div>
      </div>
    </div>
  `).join('');
}

// ===== 渲染联系方式 =====
function renderContact() {
  const c = getContact();
  const el = document.getElementById('contactInfo');
  if (!el) return;
  el.innerHTML = `
    ${c.wechat ? `<span>💬 微信：<strong>${c.wechat}</strong></span>` : ''}
    ${c.phone  ? `<span>📞 电话：<strong>${c.phone}</strong></span>`  : ''}
    ${c.note   ? `<span>📍 ${c.note}</span>` : ''}
  `;
}

// ===== 页面初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
  renderContact();

  // 先显示加载状态
  const grid = document.getElementById('productGrid');
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#b2bec3">
        <div style="font-size:32px">⏳</div>
        <div style="margin-top:8px;font-size:14px">加载商品中...</div>
      </div>`;
  }

  try {
    const products = await fetchProducts();
    renderProducts(products);
  } catch (err) {
    console.error(err);
    if (grid) grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#e17055">
        <div style="font-size:32px">⚠️</div>
        <div style="margin-top:8px;font-size:14px">加载失败，请刷新重试</div>
      </div>`;
  }
});
