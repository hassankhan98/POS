// Simple admin login
function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  if (user === "admin" && pass === "admin") {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    loadProducts();
    loadSales();
  } else {
    document.getElementById("loginError").classList.remove("hidden");
  }
}

function logout() {
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
}

// Add product
async function addProduct() {
  const name = document.getElementById("productName").value;
  const cost = parseFloat(document.getElementById("costPrice").value);
  const units = parseInt(document.getElementById("units").value);

  if (!name || !cost || !units) return alert("Please fill all fields");

  await db.collection("products").add({ name, cost, units });
  alert("Product added!");
  loadProducts();
}

// Load products into dropdown
async function loadProducts() {
  const snapshot = await db.collection("products").get();
  const dropdown = document.getElementById("productDropdown");
  dropdown.innerHTML = "";
  snapshot.forEach(doc => {
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = doc.data().name;
    dropdown.appendChild(option);
  });
}

// Add sale
async function addSale() {
  const productId = document.getElementById("productDropdown").value;
  const soldPrice = parseFloat(document.getElementById("soldPrice").value);
  const platform = document.getElementById("platform").value;

  if (!productId || !soldPrice) return alert("Fill all fields");

  const productDoc = await db.collection("products").doc(productId).get();
  const product = productDoc.data();
  const profit = soldPrice - product.cost;

  await db.collection("sales").add({
    product: product.name,
    cost: product.cost,
    soldPrice,
    platform,
    profit
  });

  alert("Sale recorded!");
  loadSales();
}

// Load sales
async function loadSales() {
  const snapshot = await db.collection("sales").get();
  const table = document.getElementById("salesTable");
  table.innerHTML = "";
  snapshot.forEach(doc => {
    const sale = doc.data();
    const row = `<tr class="border-t border-gray-700">
      <td class="p-3">${sale.product}</td>
      <td class="p-3">£${sale.cost}</td>
      <td class="p-3">£${sale.soldPrice}</td>
      <td class="p-3">${sale.platform}</td>
      <td class="p-3 text-green-400">£${sale.profit}</td>
    </tr>`;
    table.innerHTML += row;
  });
}

// Export PDF
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Sales Report", 10, 10);
  doc.autoTable({ html: "#salesTable" });
  doc.save("sales-report.pdf");
}

// Export Excel
function exportExcel() {
  const table = document.getElementById("salesTable");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Sales" });
  XLSX.writeFile(wb, "sales-report.xlsx");
}
