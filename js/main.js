const DB = {
  get()        { try { return JSON.parse(localStorage.getItem('gm_products') || '[]'); } catch { return []; } },
  getContact() { try { return JSON.parse(localStorage.getItem('gm_contact')  || '{}'); } catch { return {}; } }
};

let currentCategory = '全部';

function getCategories(products) {
  return ['全部', ...new Set(products.map(p => p.category || '其他'))];
}

function renderFilter(products) {
  document.getElementById('filterBar').innerHTML = getCategories(products).map(c => `
    <button class="filter-btn ${c === currentCategory ? 'active' : ''}"
            onclick="filterBy('${c}')">${c}</button>
  `).join('');
}

function filterBy(cat) {
  currentCategory = cat;
  const products = DB.get();
  renderFilter(products);
  renderGrid(products);
}

function renderGrid(products) {
  const grid     = document.getElementById('productGrid');
  const count    = document.getElementById('productCount');
  const filtered = currentCategory === '全部'
    ? products
    : products.filter(p => (p.category || '其他') === currentCategory);

  count.textContent = `共 ${filtered.length} 件`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="emoji">🛍️</div>
        <p>暂无商品，请稍后再来～</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card ${p.status === 'sold' ? 'sold' : ''}"
         onclick="location.href='product.html?id=${p.id}'">
      ${p.status === 'sold' ? '<div class="sold-badge">已售出</div>' : ''}
      <div class="card-img-wrap">
        <img src="${p.image || ''}" alt="${p.name}" onerror="this.style.display='none'">
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-desc">${p.description || '暂无描述'}</div>
        <div class="card-price"><span>¥</span>${p.price}</div>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const products = DB.get();
  renderFilter(products);
  renderGrid(products);
});
