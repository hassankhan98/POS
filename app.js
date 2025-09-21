// app.js

// ---- Helpers ----
const $ = s => document.querySelector(s);
const fmt = n => Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
const fmtDate = ts => {
  if(!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
};

// DOM refs
const addProductForm = $('#addProductForm');
const productsTableBody = $('#productsTable tbody');
const saleProductSelect = $('#sale_product');
const addSaleForm = $('#addSaleForm');
const salesTableBody = $('#salesTable tbody');
const totalSalesEl = $('#totalSales');
const totalProfitEl = $('#totalProfit');
const exportExcelBtn = $('#exportExcel');
const exportPDFBtn = $('#exportPDF');

let productsCache = {}; // id -> product object
let salesCache = []; // sales array

// ---- Products realtime ----
function listenProducts(){
  db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snap=>{
    productsTableBody.innerHTML = '';
    saleProductSelect.innerHTML = '<option value="">-- select --</option>';
    productsCache = {};
    snap.forEach(doc=>{
      const p = doc.data();
      p.id = doc.id;
      productsCache[doc.id] = p;
      // populate table
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.name}</td>
                      <td>£${fmt(p.costPrice||0)}</td>
                      <td>${p.units||0}</td>
                      <td class="actions">
                        <button data-id="${p.id}" class="delete">Delete</button>
                        <button data-id="${p.id}" class="edit">Edit</button>
                      </td>`;
      productsTableBody.appendChild(tr);

      // populate select
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (£${fmt(p.costPrice||0)})`;
      saleProductSelect.appendChild(opt);
    });
  });
}

// Add product
addProductForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = $('#p_name').value.trim();
  const costPrice = parseFloat($('#p_cost').value) || 0;
  const units = parseInt($('#p_units').value) || 0;
  if(!name){ alert('Enter product name'); return; }
  await db.collection('products').add({
    name, costPrice, units,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  addProductForm.reset();
});

// product table actions (delete/edit)
productsTableBody.addEventListener('click', async (e)=>{
  const id = e.target.getAttribute('data-id');
  if(!id) return;
  if(e.target.classList.contains('delete')){
    if(confirm('Delete this product?')) await db.collection('products').doc(id).delete();
  } else if(e.target.classList.contains('edit')){
    const p = productsCache[id];
    if(!p) return;
    const newName = prompt('Product name', p.name);
    const newCost = prompt('Cost price', p.costPrice);
    const newUnits = prompt('Units', p.units);
    if(newName!==null){
      await db.collection('products').doc(id).update({
        name: newName,
        costPrice: parseFloat(newCost) || 0,
        units: parseInt(newUnits) || 0
      });
    }
  }
});

// ---- Sales realtime ----
function listenSales(){
  db.collection('sales').orderBy('createdAt','desc').onSnapshot(snap=>{
    salesTableBody.innerHTML = '';
    salesCache = [];
    let totalSales = 0;
    let totalProfit = 0;
    snap.forEach(doc=>{
      const s = doc.data();
      s.id = doc.id;
      salesCache.push(s);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${fmtDate(s.createdAt)}</td>
                      <td>${s.productName}</td>
                      <td>${s.quantity || 1}</td>
                      <td>£${fmt(s.soldPrice)}</td>
                      <td>£${fmt(s.costPrice)}</td>
                      <td>£${fmt(s.profit)}</td>
                      <td>${s.platform}</td>`;
      salesTableBody.appendChild(tr);

      totalSales += (s.soldPrice || 0) * (s.quantity || 1);
      totalProfit += Number(s.profit || 0);
    });

    totalSalesEl.textContent = `£${fmt(totalSales)}`;
    totalProfitEl.textContent = `£${fmt(totalProfit)}`;
  });
}

// Add sale
addSaleForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const pid = $('#sale_product').value;
  const qty = parseInt($('#sale_qty').value) || 1;
  const soldPrice = parseFloat($('#sale_price').value) || 0;
  const platform = $('#sale_platform').value;
  if(!pid){ alert('Select product'); return; }

  // get product snapshot
  const pDoc = await db.collection('products').doc(pid).get();
  if(!pDoc.exists){ alert('Product not found'); return; }
  const p = pDoc.data();

  const costPrice = Number(p.costPrice || 0);
  const profitPerUnit = soldPrice - costPrice;
  const profitTotal = profitPerUnit * qty;

  // create sale
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

  // update stock (optional)
  const newUnits = (p.units || 0) - qty;
  await db.collection('products').doc(pid).update({ units: newUnits });

  addSaleForm.reset();
});

// ---- Export Excel ----
exportExcelBtn.addEventListener('click', () => {
  // prepare arrays
  const prodArr = Object.values(productsCache).map(p=>({
    id: p.id, name: p.name, costPrice: p.costPrice, units: p.units
  }));
  const saleArr = salesCache.map(s=>({
    id: s.id,
    date: s.createdAt ? s.createdAt.toDate().toISOString() : '',
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

// ---- Export PDF (simple table) ----
exportPDFBtn.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt', format:'a4'});
  doc.setFontSize(14);
  doc.text('POS Sales Report', 40, 40);

  let y = 70;
  doc.setFontSize(10);

  // header
  doc.text('Date', 40, y);
  doc.text('Product', 140, y);
  doc.text('Qty', 320, y);
  doc.text('Sold/unit', 360, y);
  doc.text('Cost/unit', 430, y);
  doc.text('Profit', 500, y);
  y += 14;

  salesCache.forEach(s=>{
    if(y > 750){ doc.addPage(); y = 40; }
    const dateStr = s.createdAt ? s.createdAt.toDate().toLocaleString() : '';
    doc.text(dateStr, 40, y);
    doc.text(s.productName, 140, y);
    doc.text(String(s.quantity || 1), 320, y);
    doc.text('£' + (s.soldPrice || 0).toFixed(2), 360, y);
    doc.text('£' + (s.costPrice || 0).toFixed(2), 430, y);
    doc.text('£' + (s.profit || 0).toFixed(2), 500, y);
    y += 12;
  });

  doc.save('sales-report.pdf');
});

// ---- Init ----
listenProducts();
listenSales();
