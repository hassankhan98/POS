import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { jsPDF } from "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collections
const productsCol = collection(db, 'products');
const salesCol = collection(db, 'sales');

// Sections
window.showSection = id => {
  document.querySelectorAll('.section').forEach(s => s.style.display='none');
  document.getElementById(id).style.display='block';
};

// Buttons
document.getElementById('add-product-btn').onclick = async () => {
  const name = document.getElementById('product-name').value;
  const price = parseFloat(document.getElementById('product-price').value);
  if(!name || isNaN(price)) return alert('Enter valid product');
  await addDoc(productsCol, { name, price });
  document.getElementById('product-name').value='';
  document.getElementById('product-price').value='';
};

document.getElementById('add-sale-btn').onclick = async () => {
  const product = document.getElementById('sale-product').value;
  const amount = parseFloat(document.getElementById('sale-amount').value);
  if(!product || isNaN(amount)) return alert('Enter valid sale');
  await addDoc(salesCol, { product, amount, date: new Date().toISOString() });
  document.getElementById('sale-product').value='';
  document.getElementById('sale-amount').value='';
};

// Real-time Tables
onSnapshot(productsCol, snapshot => {
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML='';
  snapshot.forEach(docu => {
    const d = docu.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.name}</td><td>$${d.price.toFixed(2)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteDoc(doc(productsCol,'${docu.id}'))">Delete</button></td>`;
    tbody.appendChild(tr);
  });
});

onSnapshot(salesCol, snapshot => {
  const tbody = document.querySelector('#sales-table tbody');
  tbody.innerHTML='';
  let totalSales=0, totalRevenue=0;
  snapshot.forEach(docu => {
    const d = docu.data();
    totalSales++; totalRevenue += d.amount;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.product}</td><td>$${d.amount.toFixed(2)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteDoc(doc(salesCol,'${docu.id}'))">Delete</button></td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('total-sales').innerText = totalSales;
  document.getElementById('total-revenue').innerText = `$${totalRevenue.toFixed(2)}`;
  document.getElementById('profit-margin').innerText = `${totalSales?((totalRevenue/totalSales).toFixed(2)) : 0}%`;

  updateCharts(snapshot);
});

// Charts
let lineChart, doughnutChart;
function updateCharts(snapshot){
  const labels = snapshot.docs.map(d => new Date(d.data().date).toLocaleDateString());
  const data = snapshot.docs.map(d => d.data().amount);

  if(lineChart) lineChart.destroy();
  lineChart = new Chart(document.getElementById('lineChart'), {
    type:'line',
    data:{ labels, datasets:[{ label:'Revenue', data, borderColor:'#0d6efd', backgroundColor:'rgba(13,110,253,0.2)', tension:0.3 }] }
  });

  const productMap = {};
  snapshot.docs.forEach(d => { const p=d.data().product; productMap[p]=(productMap[p]||0)+d.data().amount; });
  if(doughnutChart) doughnutChart.destroy();
  doughnutChart = new Chart(document.getElementById('doughnutChart'), {
    type:'doughnut',
    data:{ labels:Object.keys(productMap), datasets:[{ data:Object.values(productMap), backgroundColor:['#0d6efd','#6c757d','#198754','#ffc107','#dc3545'] }] }
  });
}

// Export
document.getElementById('export-products').onclick = () => exportTable('products-table', 'Products');
document.getElementById('export-sales').onclick = () => exportTable('sales-table', 'Sales');

function exportTable(tableId, name){
  const table = document.getElementById(tableId);
  const wb = XLSX.utils.table_to_book(table, {sheet:name});
  XLSX.writeFile(wb, `${name}.xlsx`);

  const doc = new jsPDF();
  doc.text(`${name} List`,10,10);
  doc.autoTable({ html: table, startY:20 });
  doc.save(`${name}.pdf`);
}
