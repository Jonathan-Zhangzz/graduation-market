const DB = {
  get()        { try { return JSON.parse(localStorage.getItem('gm_products') || '[]'); } catch { return []; } },
  getContact() { try { return JSON.parse(localStorage.getItem('gm_contact')  || '{}'); } catch { return {}; } }
};

function renderDetail() {
  const id      = new URLSearchParams(location.search).get('id');
  const product = DB.get().find(p => p.id === id);
  const contact = DB.getContact();
  const wrap    = document.getElementById('detailContent');

  if (!product) {
    wrap.innerHTML = `
      <div class="empty-state" style="padding-top:80px">
        <div class="emoji">😕</div>
        <p>商品不存在或已被删除</p>
        <a href="index.html" style="color:#6c5ce7;font-size:14px;display:block;margin-top:16px">← 返回首页</a>
      </div>`;
    return;
  }

  document.title = `${product.name} — 毕业市集`;

  wrap.innerHTML = `
    <div class="detail-wrap">
      <img class="detail-img" src="${product.image || ''}" alt="${product.name}"
           onerror="this.style.display='none'">
      <div class="detail-body">
        ${product.status === 'sold'
          ? '<div style="background:#ffeaea;color:#d63031;padding:8px 14px;border-radius:10px;font-size:13px;margin-bottom:14px">⚠️ 该商品已售出</div>'
          : ''}
        <div class="detail-tag">${product.category || '其他'}</div>
        <div class="detail-name">${product.name}</div>
        <div class="detail-price"><span>¥</span>${product.price}</div>
        <hr class="detail-divider">
        <div class="detail-desc">${product.description || '卖家暂未填写描述'}</div>
        <div class="contact-card">
          <h3>📬 购买方式</h3>
          <p style="font-size:13px;color:#FFFFFF;margin-bottom:12px">请线下联系摊主交易～</p>
          ${contact.wechat ? `<div class="contact-row"><span class="icon">💬</span><span>微信：<strong>${contact.wechat}</strong></span></div>` : ''}
          ${contact.phone  ? `<div class="contact-row"><span class="icon">📞</span><span>电话：<strong>${contact.phone}</strong></span></div>`  : ''}
          ${contact.note   ? `<div class="contact-row"><span class="icon">📍</span><span>${contact.note}</span></div>` : ''}
          ${!contact.wechat && !contact.phone && !contact.note
            ? '<p style="font-size:13px;color:#b2bec3">摊主暂未设置联系方式</p>' : ''}
        </div>
        <a href="index.html" style="display:block;text-align:center;color:#6c5ce7;font-size:14px;padding:20px">
          ← 继续浏览其他商品
        </a>
      </div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', renderDetail);
