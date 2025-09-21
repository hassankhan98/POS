import { db, firebaseModules } from './index.html';

const { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } = firebaseModules;

const productsCol = collection(db, 'products');
const salesCol = collection(db, 'sales');

function showSection(id){
  document.querySelectorAll('.section').forEach(s => s.style.display='none');
  document.getElementById(id).style.display='block';
}

// Add Product
window.addProduct = async () => {
  const name = document.getElementById('product-name').value;
  const price = parseFloat(document.getElementById('product-price').value);
  if(!name || isNaN(price)) return alert('Enter valid values');
  await addDoc(productsCol, { name, price });
  document.getElementById('product-name').value='';
  document.getElementById('product-price').value='';
};

// Add Sale
window.addSale = async () => {
  const product = document.getElementById('sale-product').value;
  const amount = parseFloat(document.getElementById('sale-amount').value);
  if(!product || isNaN(amount)) return alert('Enter valid values');
  await addDoc(salesCol, { product, amount, date: new Date().toISOString() });
  document.getElementById('sale-product').value='';
  document.getElementById('sale-amount').value='';
};

// Render Products Table
onSnapshot(productsCol, snapshot => {
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML='';
  snapshot.forEach(docu => {
    const data = docu.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${data.name}</td>
                    <td>$${data.price.toFixed(2)}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteProduct('${docu.id}')">Delete</button></td>`;
    tbody.appendChild(tr);
  });
});

// Render Sales Table & Dashboard
onSnapshot(salesCol, snapshot => {
  const tbody = document.querySelector('#sales-table tbody');
  tbody.innerHTML='';
  let totalSales = 0, totalRevenue = 0;
  snapshot.forEach(docu => {
    const data = docu.data();
    totalSales++;
    totalRevenue += data.amount;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${data.product}</td><td>$${data.amount.toFixed(2)}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteSale('${docu.id}')">Delete</button></td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('total-sales').innerText = totalSales;
  document.getElementById('total-revenue').innerText = `$${totalRevenue.toFixed(2)}`;
  document.getElementById('profit-margin').innerText = `${totalSales ? ((totalRevenue/totalSales).toFixed(2)) : 0}%`;

  updateCharts(snapshot);
});

// Delete Functions
window.deleteProduct = async id => await deleteDoc(doc(productsCol, id));
window.deleteSale = async id => await deleteDoc(doc(salesCol, id));

// Charts
let lineChart, doughnutChart;
function updateCharts(snapshot){
  const labels = snapshot.docs.map(d => new Date(d.data().date).toLocaleDateString());
  const data = snapshot.docs.map(d => d.data().amount);

  // Line Chart
  if(lineChart) lineChart.destroy();
  const ctx1 = document.getElementById('lineChart').getContext('2d');
  lineChart = new Chart(ctx1, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Revenue', data, borderColor:'#0d6efd', backgroundColor:'rgba(13,110,253,0.2)', tension:0.3 }] }
  });

  // Doughnut Chart (by product distribution)
  const productMap = {};
  snapshot.docs.forEach(d => {
    const p = d.data().product;
    productMap[p] = (productMap[p]||0) + d.data().amount;
  });
  if(doughnutChart) doughnutChart.destroy();
  const ctx2 = document.getElementById('doughnutChart').getContext('2d');
  doughnutChart = new Chart(ctx2, {
    type: 'doughnut',
    data: { labels:Object.keys(productMap), datasets:[{ data:Object.values(productMap), backgroundColor:['#0d6efd','#6c757d','#198754','#ffc107','#dc3545'] }] }
  });
}
