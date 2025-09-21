import { db } from "./firebase-config.js";
import {
  collection, addDoc, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.6.11/firebase-firestore.js";

// ---------- LOGIN ----------
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

loginBtn.addEventListener("click", () => {
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
});

logoutBtn.addEventListener("click", () => {
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
});

// ---------- PRODUCTS ----------
const addProductBtn = document.getElementById("addProductBtn");
addProductBtn.addEventListener("click", async () => {
  const name = document.getElementById("productName").value;
  const cost = parseFloat(document.getElementById("costPrice").value);
  const units = parseInt(document.getElementById("units").value);

  if (!name || !cost || !units) return alert("Fill all fields");

  await addDoc(collection(db, "products"), { name, cost, units });
  alert("Product added!");
  loadProducts();
});

async function loadProducts() {
  const snapshot = await getDocs(collection(db, "products"));
  const dropdown = document.getElementById("productDropdown");
  dropdown.innerHTML = "";
  snapshot.forEach(doc => {
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = doc.data().name;
    dropdown.appendChild(option);
  });
}

// ---------- SALES ----------
const addSaleBtn = document.getElementById("addSaleBtn");
addSaleBtn.addEventListener("click", async () => {
  const productId = document.getElementById("productDropdown").value;
  const soldPrice = parseFloat(document.getElementById("soldPrice").value);
  const platform = document.getElementById("platform").value;

  if (!productId || !soldPrice) return alert("Fill all fields");

  const productDoc = await getDoc(doc(db, "products", productId));
  const product = productDoc.data();
  const profit = soldPrice - product.cost;

  await addDoc(collection(db, "sales"), {
    product: product.name,
    cost: product.cost,
    soldPrice,
    platform,
    profit
  });

  alert("Sale recorded!");
  loadSales();
});

async function loadSales() {
  const snapshot = await getDocs(collection(db, "sales"));
  const table = document.getElementById("salesTableBody");
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
