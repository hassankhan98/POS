// Switch Tabs
function showTab(tabId) {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.add("hidden"));
  document.getElementById(tabId).classList.remove("hidden");

  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("bg-indigo-500","text-white"));
  event.target.classList.add("bg-indigo-500","text-white");
}

// Add Product
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("productName").value;
  const units = parseInt(document.getElementById("productUnits").value);
  const cost = parseFloat(document.getElementById("productCost").value);

  if (name && units && cost) {
    await db.collection("products").add({ name, units, cost });
    document.getElementById("productForm").reset();
  }
});

// Show Products
db.collection("products").onSnapshot(snapshot => {
  const productList = document.getElementById("productList");
  const saleProduct = document.getElementById("saleProduct");
  productList.innerHTML = "";
  saleProduct.innerHTML = "";

  snapshot.forEach(doc => {
    const p = doc.data();
    productList.innerHTML += `<tr><td class="p-2">${p.name}</td><td class="p-2">${p.units}</td><td class="p-2">${p.cost}</td></tr>`;
    saleProduct.innerHTML += `<option value="${doc.id}">${p.name}</option>`;
  });
});

// Add Sale
document.getElementById("salesForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const productId = document.getElementById("saleProduct").value;
  const price = parseFloat(document.getElementById("salePrice").value);
  const platform = document.getElementById("salePlatform").value;

  if (productId && price && platform) {
    await db.collection("sales").add({ productId, price, platform });
    document.getElementById("salesForm").reset();
  }
});

// Show Sales
db.collection("sales").onSnapshot(async snapshot => {
  const salesList = document.getElementById("salesList");
  salesList.innerHTML = "";
  let totalProfit = 0;

  for (let sale of snapshot.docs) {
    const s = sale.data();
    const product = await db.collection("products").doc(s.productId).get();
    const cost = product.data()?.cost || 0;
    totalProfit += (s.price - cost);

    salesList.innerHTML += `<tr><td class="p-2">${product.data()?.name}</td><td class="p-2">${s.price}</td><td class="p-2">${s.platform}</td></tr>`;
  }

  document.getElementById("profitSummary").innerText = `Total Profit: $${totalProfit.toFixed(2)}`;
});

// Download CSV
function downloadCSV() {
  let csv = "Product,Price,Platform\n";
  const rows = document.querySelectorAll("#salesList tr");
  rows.forEach(row => {
    const cols = row.querySelectorAll("td");
    csv += Array.from(cols).map(c => c.innerText).join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sales.csv";
  link.click();
}
