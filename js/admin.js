// js/admin.js

// ===== ⚠️ 填写你的 Cloudinary 配置 =====
const CLOUDINARY_CLOUD_NAME  = 'dgk5brjh1';       // 如: dxxxxxxxx
const CLOUDINARY_UPLOAD_PRESET = 'graduation_market'; // 与你创建的 preset 名一致

// ===== 管理员密码 =====
const ADMIN_PASSWORD = 'zjl20031114'; // 与 login.html 保持一致

// ===== 数据操作（localStorage） =====
const DB = {
  get()   { try { return JSON.parse(localStorage.getItem('gm_products') || '[]'); } catch { return []; } },
  save(d) { localStorage.setItem('gm_products', JSON.stringify(d)); },
  getContact()   { try { return JSON.parse(localStorage.getItem('gm_contact') || '{}'); } catch { return {}; } },
  saveContact(c) { localStorage.setItem('gm_contact', JSON.stringify(c)); }
};

// ===== 工具函数 =====
function checkAuth() { return sessionStorage.getItem('gm_admin') === '1'; }
function genId()     { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
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
    throw new Error(err.error?.message || '图片上传失败');
  }
  const data = await res.json();

  // 返回经过优化的图片 URL（自动压缩、转 WebP，加载更快）
  return data.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_800/');
}

// ===== 图片预览 =====
function handleImagePreview(input) {
  const file = input.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('⚠️ 请选择图片文件');
    input.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('⚠️ 图片不能超过 10MB');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('imagePreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('previewWrap').style.display  = 'block';
    document.getElementById('uploadLabel').textContent    = '📷 重新选择图片';
  };
  reader.readAsDataURL(file);
}

// ===== 渲染统计 =====
function renderStats() {
  const products = DB.get();
  document.getElementById('statTotal').textContent = products.length;
  document.getElementById('statAvail').textContent = products.filter(p => p.status !== 'sold').length;
  document.getElementById('statSold').textContent  = products.filter(p => p.status === 'sold').length;
}

// ===== 渲染商品列表 =====
function renderList() {
  const products  = DB.get();
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
          ? `<button class="btn-sold"    onclick="markSold('${p.id}')">售出</button>`
          : `<button class="btn-restore" onclick="markRestore('${p.id}')">恢复</button>`}
        <button class="btn-delete" onclick="deleteProduct('${p.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

// ===== 添加商品（含 Cloudinary 图片上传）=====
async function handleAddProduct(e) {
  e.preventDefault();

  const name      = document.getElementById('pName').value.trim();
  const price     = parseFloat(document.getElementById('pPrice').value);
  const category  = document.getElementById('pCategory').value;
  const desc      = document.getElementById('pDesc').value.trim();
  const fileInput = document.getElementById('pImageFile');
  const file      = fileInput.files[0];

  if (!name || isNaN(price) || price < 0) {
    showToast('⚠️ 请填写完整的商品名称和价格');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled    = true;
  btn.textContent = '⏳ 上传中...';

  try {
    let imageUrl = '';

    if (file) {
      showToast('📤 图片上传中，请稍候...');
      imageUrl = await uploadImageToCloudinary(file);
    }

    const products = DB.get();
    products.unshift({
      id: genId(), name, price, category,
      image: imageUrl,
      description: desc,
      status: 'available',
      createdAt: new Date().toLocaleDateString('zh-CN')
    });
    DB.save(products);

    // 重置表单
    e.target.reset();
    document.getElementById('previewWrap').style.display  = 'none';
    document.getElementById('uploadLabel').textContent    = '📷 点击选择图片';

    renderStats();
    renderList();
    showToast('✅ 商品发布成功！');

  } catch (err) {
    console.error(err);
    showToast(`❌ 失败：${err.message}`);
  } finally {
    btn.disabled    = false;
    btn.textContent = '🚀 发布商品';
  }
}

// ===== 标记售出 / 恢复 / 删除 =====
function markSold(id) {
  const products = DB.get();
  const p = products.find(x => x.id === id);
  if (p) { p.status = 'sold'; DB.save(products); renderStats(); renderList(); showToast('✅ 已标记为售出'); }
}
function markRestore(id) {
  const products = DB.get();
  const p = products.find(x => x.id === id);
  if (p) { p.status = 'available'; DB.save(products); renderStats(); renderList(); showToast('🔄 已恢复为在售'); }
}
function deleteProduct(id) {
  if (!confirm('确定要删除这件商品吗？')) return;
  DB.save(DB.get().filter(x => x.id !== id));
  renderStats(); renderList();
  showToast('🗑️ 已删除');
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
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) { location.href = 'login.html'; return; }

  const c = DB.getContact();
  if (c.wechat) document.getElementById('cWechat').value = c.wechat;
  if (c.phone)  document.getElementById('cPhone').value  = c.phone;
  if (c.note)   document.getElementById('cNote').value   = c.note;

  renderStats();
  renderList();

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
