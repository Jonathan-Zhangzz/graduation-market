// js/admin.js

// ===== ⚠️ 填写你的 Cloudinary 配置 =====
const CLOUDINARY_CLOUD_NAME  = 'dgk5brjh1';       // 如: dxxxxxxxx
const CLOUDINARY_UPLOAD_PRESET = 'graduation_market'; // 与你创建的 preset 名一致

// ===== 管理员密码 =====
const ADMIN_PASSWORD = 'zjl20031114'; // 与 login.html 保持一致
// js/admin.js


const GITHUB_TOKEN  = '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';               // ghp_xxxxxxxxxxxx
const GITHUB_OWNER  = 'Jonathan-Zhangzz';               // 如: zhangsan
const GITHUB_REPO   = 'graduation-market';              // 仓库名
const GITHUB_LABEL  = 'product';                        // Issue 标签（用于区分商品数据）


// ===== GitHub Issues API =====
const GH = {
  headers() {
    return {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  },
  baseUrl() {
    return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;
  },

  async createProduct(product) {
    const res = await fetch(this.baseUrl(), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        title: product.name,
        body: JSON.stringify(product),
        labels: [GITHUB_LABEL]
      })
    });
    // ★ 详细错误信息
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody.message || res.status;
      throw new Error(`GitHub API 错误(${res.status})：${msg}`);
    }
    return await res.json();
  },

  async getProducts() {
    const res = await fetch(
      `${this.baseUrl()}?labels=${GITHUB_LABEL}&state=open&per_page=100`,
      { headers: this.headers() }
    );
    if (!res.ok) return [];
    const issues = await res.json();
    // 过滤掉 Pull Request（GitHub API 会把 PR 也当 issue 返回）
    return issues
      .filter(i => !i.pull_request)
      .map(issue => {
        try {
          const p = JSON.parse(issue.body);
          p._issueNumber = issue.number;
          // 同步 sold 状态（通过 label 判断）
          const labelNames = issue.labels.map(l => l.name);
          if (labelNames.includes('sold')) p.status = 'sold';
          return p;
        } catch { return null; }
      }).filter(Boolean);
  },

  async patchIssue(issueNumber, data) {
    const res = await fetch(`${this.baseUrl()}/${issueNumber}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(`操作失败(${res.status})：${errBody.message || ''}`);
    }
    return await res.json();
  },

  async markSold(issueNumber) {
    // 获取当前 labels，加上 sold
    const res = await fetch(`${this.baseUrl()}/${issueNumber}`, { headers: this.headers() });
    const issue = await res.json();
    const labels = [...new Set([...issue.labels.map(l => l.name), 'sold'])];
    await this.patchIssue(issueNumber, { labels });
  },

  async markRestore(issueNumber) {
    const res = await fetch(`${this.baseUrl()}/${issueNumber}`, { headers: this.headers() });
    const issue = await res.json();
    const labels = issue.labels.map(l => l.name).filter(l => l !== 'sold');
    await this.patchIssue(issueNumber, { labels });
  },

  async deleteProduct(issueNumber) {
    await this.patchIssue(issueNumber, { state: 'closed' });
  }
};

// ===== 本地缓存 =====
const DB = {
  get()        { try { return JSON.parse(localStorage.getItem('gm_products_cache') || '[]'); } catch { return []; } },
  save(d)      { localStorage.setItem('gm_products_cache', JSON.stringify(d)); },
  getContact() { try { return JSON.parse(localStorage.getItem('gm_contact') || '{}'); } catch { return {}; } },
  saveContact(c) { localStorage.setItem('gm_contact', JSON.stringify(c)); }
};

// ===== 工具函数 =====
function checkAuth() { return sessionStorage.getItem('gm_admin') === '1'; }
function genId()     { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#d63031' : '#00b894';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000); // 错误提示显示更久
}

function setLoading(isLoading, msg = '') {
  const btn = document.getElementById('submitBtn');
  if (!btn) return;
  btn.disabled    = isLoading;
  btn.textContent = isLoading ? (msg || '⏳ 处理中...') : '🚀 发布商品';
}

// ===== 上传图片到 Cloudinary =====
async function uploadImageToCloudinary(file) {
  const url  = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Cloudinary 上传失败：${err.error?.message || res.status}`);
  }
  const data = await res.json();
  return data.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_800/');
}

// ===== 图片预览 =====
function handleImagePreview(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('⚠️ 请选择图片文件', true); input.value = ''; return; }
  if (file.size > 10 * 1024 * 1024)   { showToast('⚠️ 图片不能超过 10MB', true); input.value = ''; return; }

  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('imagePreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('previewWrap').style.display = 'block';
    document.getElementById('uploadLabel').textContent   = '📷 重新选择图片';
  };
  reader.readAsDataURL(file);
}

// ===== 渲染统计 =====
function renderStats(products) {
  document.getElementById('statTotal').textContent = products.length;
  document.getElementById('statAvail').textContent = products.filter(p => p.status !== 'sold').length;
  document.getElementById('statSold').textContent  = products.filter(p => p.status === 'sold').length;
}

// ===== 渲染商品列表 =====
function renderList(products) {
  const container = document.getElementById('productList');
  if (products.length === 0) {
    container.innerHTML = `<div style="padding:30px;text-align:center;color:#b2bec3;font-size:14px">还没有商品，快去添加吧～</div>`;
    return;
  }
  container.innerHTML = products.map(p => `
    <div class="product-item">
      <img class="item-img"
           src="${p.image || 'https://placehold.co/56x56?text=图'}"
           alt="${p.name}"
           onerror="this.src='https://placehold.co/56x56?text=图'">
      <div class="item-info">
        <div class="item-name">${p.name}</div>
        <div class="item-meta">${p.category || '其他'} · ${p.status === 'sold' ? '✅ 已售出' : '🟢 在售'}</div>
      </div>
      <div class="item-price">¥${p.price}</div>
      <div class="item-actions">
        ${p.status !== 'sold'
          ? `<button class="btn-sold"    onclick="markSold(${p._issueNumber})">售出</button>`
          : `<button class="btn-restore" onclick="markRestore(${p._issueNumber})">恢复</button>`}
        <button class="btn-delete" onclick="deleteProduct(${p._issueNumber})">删除</button>
      </div>
    </div>
  `).join('');
}

// ===== 从云端加载商品 =====
async function loadProducts() {
  const cached = DB.get();
  if (cached.length > 0) { renderStats(cached); renderList(cached); }
  try {
    const products = await GH.getProducts();
    DB.save(products);
    renderStats(products);
    renderList(products);
  } catch (err) {
    console.error('loadProducts error:', err);
    showToast(`⚠️ 加载失败：${err.message}`, true);
  }
}

// ===== 添加商品 =====
async function handleAddProduct(e) {
  e.preventDefault();

  const name      = document.getElementById('pName').value.trim();
  const price     = parseFloat(document.getElementById('pPrice').value);
  const category  = document.getElementById('pCategory').value;
  const desc      = document.getElementById('pDesc').value.trim();
  const fileInput = document.getElementById('pImageFile');
  const file      = fileInput.files[0];

  if (!name || isNaN(price) || price < 0) {
    showToast('⚠️ 请填写完整的商品名称和价格', true);
    return;
  }

  try {
    let imageUrl = '';
    if (file) {
      setLoading(true, '📤 上传图片中...');
      imageUrl = await uploadImageToCloudinary(file);
    }

    setLoading(true, '☁️ 同步云端中...');
    const product = {
      id: genId(), name, price, category,
      image: imageUrl,
      description: desc,
      status: 'available',
      createdAt: new Date().toLocaleDateString('zh-CN')
    };

    await GH.createProduct(product); // ← 任何错误都会在这里抛出，不会静默失败

    e.target.reset();
    document.getElementById('previewWrap').style.display = 'none';
    document.getElementById('uploadLabel').textContent   = '📷 点击选择图片';

    showToast('✅ 商品已发布，全网同步成功！');
    await loadProducts();

  } catch (err) {
    console.error('handleAddProduct error:', err);
    showToast(`❌ ${err.message}`, true); // ← 错误信息直接显示给你
  } finally {
    setLoading(false);
  }
}

// ===== 售出 / 恢复 / 删除 =====
async function markSold(issueNumber) {
  try {
    await GH.markSold(issueNumber);
    showToast('✅ 已标记为售出');
    await loadProducts();
  } catch (err) { showToast(`❌ ${err.message}`, true); }
}

async function markRestore(issueNumber) {
  try {
    await GH.markRestore(issueNumber);
    showToast('🔄 已恢复为在售');
    await loadProducts();
  } catch (err) { showToast(`❌ ${err.message}`, true); }
}

async function deleteProduct(issueNumber) {
  if (!confirm('确定要删除这件商品吗？')) return;
  try {
    await GH.deleteProduct(issueNumber);
    showToast('🗑️ 已删除');
    await loadProducts();
  } catch (err) { showToast(`❌ ${err.message}`, true); }
}

// ===== 保存联系方式 =====
function handleSaveContact(e) {
  e.preventDefault();
  DB.saveContact({
    wechat: document.getElementById('cWechat').value.trim(),
    phone:  document.getElementById('cPhone').value.trim(),
    note:   document.getElementById('cNote').value.trim()
  });
  showToast('✅ 联系方式已保存');
}

// ===== 页面初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) { location.href = 'login.html'; return; }

  const c = DB.getContact();
  if (c.wechat) document.getElementById('cWechat').value = c.wechat;
  if (c.phone)  document.getElementById('cPhone').value  = c.phone;
  if (c.note)   document.getElementById('cNote').value   = c.note;

  await loadProducts();

  document.getElementById('pImageFile').addEventListener('change', function () {
    handleImagePreview(this);
  });
  document.getElementById('addForm').addEventListener('submit', handleAddProduct);
  document.getElementById('contactForm').addEventListener('submit', handleSaveContact);
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('gm_admin');
    location.href = 'login.html';
  });
});
