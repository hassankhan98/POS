// app.js
// POS frontend <-> Firestore glue

// Helpers
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const money = n => '£' + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = ts => {
  if (!ts) return '';
  try {
    return ts.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString();
  } catch { return String(ts); }
};

// DOM
const addProductForm = $('#addProductForm');
const productsTable = $('#productsTable'); // tbody
const saleProductSelect = $('#sale_product');
const addSaleForm = $('#addSaleForm');
const salesTable = $('#salesTable');
const totalSalesEl = $('#totalSales');
const totalProfitEl = $('#totalProfit');
const totalProductsEl = $('#totalProducts');

const miniProducts = $('#miniProducts');
const miniSales = $('#miniSales');
const miniRevenue = $('#miniRevenue');
const miniProfit = $('#miniProfit');

const exportExcelBtn = $('#exportExcel');
const exportPDFBtn = $('#exportPDF');

let productsCache = {}; // id => product
let salesCache = [];    // array of sale objects

// Listen to products (realtime)
function listenProducts() {
  db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    productsTable.innerHTML = '';
    saleProductSelect.innerHTML = '<option value="">-- select product --</option>';
    productsCache = {};
    snapshot.forEach(doc => {
      const p = doc.data();
      p.id = doc.id;
      productsCache[p.id] = p;

      // table row
      const tr = document.createElement('tr');
      tr.className = 'odd:bg-slate-900';
      tr.innerHTML = `
        <td class="px-2 py-2">${p.name || ''}</td>
        <td class="px-2 py-2">${money(p.costPrice || 0)}</td>
        <td class="px-2 py-2">${p.units || 0}</td>
        <td class="px-2 py-2">
          <button data-id="${p.id}" class="edit text-xs mr-2 px-2 py-1 bg-yellow-500 rounded">Edit</button>
          <button data-id="${p.id}" class="delete text-xs px-2 py-1 bg-red-600 rounded">Delete</button>
        </td>
      `;
      productsTable.appendChild(tr);

      // select option
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${money(p.costPrice || 0)})`;
      saleProductSelect.appendChild(opt);
    });

    // update counts
    totalProductsEl.textContent = Object.keys(productsCache).length;
    miniProducts.textContent = Object.keys(productsCache).length;
  }, err => console.error('products listen error', err));
}

// Add product
addProductForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('#p_name').value.trim();
  const costPrice = parseFloat($('#p_cost').value) || 0;
  const units = parseInt($('#p_units').value) || 0;
  if (!name) return alert('Enter product name');

  await db.collection('products').add({
    name, costPrice, units,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  addProductForm.reset();
});

// Edit / Delete product (event delegation)
productsTable.addEventListener('click', async (e) => {
  const id = e.target.getAttribute('data-id');
  if (!id) return;
  if (e.target.classList.contains('delete')) {
    if (!confirm('Delete this product?')) return;
    await db.collection('products').doc(id).delete();
  } else if (e.target.classList.contains('edit')) {
    const p = productsCache[id];
    if (!p) return;
    const newName = prompt('Product name', p.name);
    if (newName === null) return;
    const newCost = prompt('Cost price', p.costPrice);
    const newUnits = prompt('Units', p.units);
    await db.collection('products').doc(id).update({
      name: newName,
      costPrice: parseFloat(newCost) || 0,
      units: parseInt(newUnits) || 0
    });
  }
});

// Listen to sales (realtime)
function listenSales() {
  db.collection('sales').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    salesTable.innerHTML = '';
    salesCache = [];
    let totalRevenue = 0;
    let totalProfit = 0;

    snapshot.forEach(doc => {
      const s = doc.data();
      s.id = doc.id;
      salesCache.push(s);

      const tr = document.createElement('tr');
      tr.className = 'odd:bg-slate-900';
      tr.innerHTML = `
        <td class="px-2 py-2">${fmtDate(s.createdAt)}</td>
        <td class="px-2 py-2">${s.productName}</td>
        <td class="px-2 py-2">${s.quantity || 1}</td>
        <td class="px-2 py-2">${money(s.soldPrice)}</td>
        <td class="px-2 py-2">${money(s.costPrice)}</td>
        <td class="px-2 py-2">${money(s.profit)}</td>
        <td class="px-2 py-2">${s.platform || ''}</td>
      `;
      salesTable.appendChild(tr);

      totalRevenue += (Number(s.soldPrice) || 0) * (Number(s.quantity) || 1);
      totalProfit += Number(s.profit) || 0;
    });

    totalSalesEl.textContent = money(totalRevenue);
    totalProfitEl.textContent = money(totalProfit);

    // mini stats
    miniSales.textContent = salesCache.length;
    miniRevenue.textContent = money(totalRevenue);
    miniProfit.textContent = money(totalProfit);
  }, err => console.error('sales listen error', err));
}

// Record Sale
addSaleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pid = $('#sale_product').value;
  const qty = parseInt($('#sale_qty').value) || 1;
  const soldPrice = parseFloat($('#sale_price').value) || 0;
  const platform = $('#sale_platform').value || '';

  if (!pid) return alert('Select product');

  // fetch product snapshot (to get latest units and cost)
  const pDoc = await db.collection('products').doc(pid).get();
  if (!pDoc.exists) return alert('Product not found (maybe deleted)');

  const p = pDoc.data();
  const costPrice = Number(p.costPrice || 0);
  const profitPerUnit = soldPrice - costPrice;
  const profitTotal = profitPerUnit * qty;

  // add sale
  await db.collection('sales').add({
    productId: pid,
    productName: p.name,
    quantity: qty,
    soldPrice,
    costPrice,
    platform,
    profit: profitTotal,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // update stock
  const newUnits = (p.units || 0) - qty;
  await db.collection('products').doc(pid).update({ units: newUnits });

  addSaleForm.reset();
});

// Export Excel
exportExcelBtn.addEventListener('click', () => {
  const prodArr = Object.values(productsCache).map(p => ({
    id: p.id, name: p.name, costPrice: p.costPrice, units: p.units
  }));
  const saleArr = salesCache.map(s => ({
    id: s.id,
    date: s.createdAt ? (s.createdAt.toDate ? s.createdAt.toDate().toISOString() : s.createdAt) : '',
    productName: s.productName,
    quantity: s.quantity,
    soldPrice: s.soldPrice,
    costPrice: s.costPrice,
    profit: s.profit,
    platform: s.platform
  }));

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(prodArr);
  const ws2 = XLSX.utils.json_to_sheet(saleArr);
  XLSX.utils.book_append_sheet(wb, ws1, 'Products');
  XLSX.utils.book_append_sheet(wb, ws2, 'Sales');
  XLSX.writeFile(wb, 'pos-data.xlsx');
});

// Export PDF
exportPDFBtn.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('POS Sales Report', 40, 40);
  doc.setFontSize(10);

  let y = 70;
  doc.text('Date', 40, y);
  doc.text('Product', 140, y);
  doc.text('Qty', 320, y);
  doc.text('Sold/unit', 360, y);
  doc.text('Cost/unit', 430, y);
  doc.text('Profit', 500, y);
  y += 14;

  salesCache.forEach(s => {
    if (y > 750) { doc.addPage(); y = 40; }
    const dateStr = s.createdAt ? (s.createdAt.toDate ? s.createdAt.toDate().toLocaleString() : String(s.createdAt)) : '';
    doc.text(dateStr, 40, y);
    doc.text(s.productName, 140, y);
    doc.text(String(s.quantity || 1), 320, y);
    doc.text(money(s.soldPrice), 360, y);
    doc.text(money(s.costPrice), 430, y);
    doc.text(money(s.profit), 500, y);
    y += 12;
  });

  doc.save('sales-report.pdf');
});

// Init listeners
listenProducts();
listenSales();
