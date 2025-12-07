let expenses = [];
let categoryChart = null;
let currentFilter = "all";
let currentMonthTotal = 0;

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const expenseForm = document.getElementById("expenseForm");
  const expenseTableBody = document.getElementById("expenseTableBody");
  const searchInput = document.getElementById("searchInput");

  const todayTotalEl = document.getElementById("todayTotal");
  const monthTotalEl = document.getElementById("monthTotal");
  const allTimeTotalEl = document.getElementById("allTimeTotal");

  const dateInput = document.getElementById("date");
  const summarySection = document.querySelector(".summary-card");
  const tableSection = document.querySelector(".table-card");
  const filterButtons = document.querySelectorAll(".filter-btn");

  const budgetInput = document.getElementById("budgetInput");
  const saveBudgetBtn = document.getElementById("saveBudgetBtn");
  const budgetBar = document.getElementById("budgetBar");
  const budgetText = document.getElementById("budgetText");

  // Edit modal elements
  const editModal = document.getElementById("editModal");
  const closeEditModalBtn = document.getElementById("closeEditModal");
  const editForm = document.getElementById("editForm");
  const editTitleInput = document.getElementById("editTitle");
  const editAmountInput = document.getElementById("editAmount");
  const editCategoryInput = document.getElementById("editCategory");
  const editDateInput = document.getElementById("editDate");
  let editingId = null;

  // Set default date as today
  if (dateInput) {
    const today = new Date();
    dateInput.value = formatDate(today);
  }

  // Filter buttons
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.range || "all";
      render();
    });
  });

  // Add expense
  if (expenseForm) {
    expenseForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("title").value.trim();
      const amount = parseFloat(document.getElementById("amount").value);
      const category = document.getElementById("category").value;
      const date = document.getElementById("date").value;

      if (!title || isNaN(amount) || !category || !date) {
        window.showToast("Please fill all fields correctly", "error");
        return;
      }

      const newExpense = {
        id: Date.now(),
        title,
        amount,
        category,
        date,
      };

      expenses.push(newExpense);
      expenseForm.reset();
      dateInput.value = formatDate(new Date());

      render();
      window.showToast("Expense added", "success");
    });
  }

  // Search
  if (searchInput) {
    searchInput.addEventListener("input", render);
  }

  // Edit modal handlers
  function openEditModal(exp) {
    if (!editModal) return;
    editingId = exp.id;
    editTitleInput.value = exp.title;
    editAmountInput.value = exp.amount;
    editCategoryInput.value = exp.category;
    editDateInput.value = exp.date;
    editModal.classList.add("active");
  }

  function closeEditModal() {
    if (!editModal) return;
    editingId = null;
    editModal.classList.remove("active");
  }

  if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener("click", closeEditModal);
  }

  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!editingId) return;

      const title = editTitleInput.value.trim();
      const amount = parseFloat(editAmountInput.value);
      const category = editCategoryInput.value;
      const date = editDateInput.value;

      if (!title || isNaN(amount) || !category || !date) {
        window.showToast("Fill all fields correctly", "error");
        return;
      }

      const idx = expenses.findIndex((exp) => exp.id === editingId);
      if (idx !== -1) {
        expenses[idx] = { ...expenses[idx], title, amount, category, date };
      }

      render();
      closeEditModal();
      window.showToast("Expense updated", "success");
    });
  }

  // Budget helpers
  function getBudget() {
    const raw = localStorage.getItem("det_budget");
    if (!raw) return 0;
    const val = parseFloat(raw);
    return isNaN(val) ? 0 : val;
  }

  function setBudget(value) {
    localStorage.setItem("det_budget", String(value));
  }

  function updateBudgetUI() {
    if (!budgetBar || !budgetText) return;

    const budget = getBudget();
    if (!budget || budget <= 0) {
      budgetBar.style.width = "0%";
      budgetBar.style.background =
        "linear-gradient(90deg, #9ca3af, #d1d5db)";
      budgetText.textContent = "No budget set";
      return;
    }

    const usage = (currentMonthTotal / budget) * 100;
    const clamped = Math.min(usage, 130);

    budgetBar.style.width = clamped + "%";

    if (usage < 80) {
      budgetBar.style.background =
        "linear-gradient(90deg, #22c55e, #4ade80)";
    } else if (usage < 100) {
      budgetBar.style.background =
        "linear-gradient(90deg, #f97316, #fb923c)";
    } else {
      budgetBar.style.background =
        "linear-gradient(90deg, #ef4444, #fb7185)";
    }

    const usedText = currentMonthTotal.toFixed(2);
    const budgetTextStr = budget.toFixed(2);

    if (usage < 80) {
      budgetText.textContent = `₹${usedText} of ₹${budgetTextStr} used`;
    } else if (usage < 100) {
      budgetText.textContent = `⚠ ₹${usedText} of ₹${budgetTextStr} used (high usage)`;
    } else {
      budgetText.textContent = `🚨 Over budget! Spent ₹${usedText} of ₹${budgetTextStr}`;
    }
  }

  if (saveBudgetBtn) {
    saveBudgetBtn.addEventListener("click", () => {
      const value = parseFloat(budgetInput.value);
      if (isNaN(value) || value <= 0) {
        window.showToast("Enter a valid positive budget", "error");
        return;
      }
      setBudget(value);
      updateBudgetUI();
      window.showToast("Monthly budget saved", "success");
    });
  }

  if (budgetInput) {
    const initialBudget = getBudget();
    if (initialBudget > 0) budgetInput.value = initialBudget;
  }

  // Core helpers
  function passesFilter(exp) {
    const expDate = new Date(exp.date);
    const today = new Date();

    if (currentFilter === "today") {
      return (
        expDate.getDate() === today.getDate() &&
        expDate.getMonth() === today.getMonth() &&
        expDate.getFullYear() === today.getFullYear()
      );
    }

    if (currentFilter === "month") {
      return (
        expDate.getMonth() === today.getMonth() &&
        expDate.getFullYear() === today.getFullYear()
      );
    }

    return true; // all
  }

  function deleteExpense(id) {
    expenses = expenses.filter((exp) => exp.id !== id);
    render();
    window.showToast("Expense deleted", "info");
  }

  function renderTable() {
    if (!expenseTableBody) return;

    const query =
      searchInput && searchInput.value
        ? searchInput.value.toLowerCase().trim()
        : "";

    expenseTableBody.innerHTML = "";

    const filtered = expenses
      .filter(passesFilter)
      .filter((exp) => {
        const text = (exp.title + " " + exp.category).toLowerCase();
        return text.includes(query);
      });

    if (filtered.length === 0) {
      expenseTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; opacity:0.7;">
            No expenses yet. Add your first one! 🧾
          </td>
        </tr>
      `;
      return;
    }

    filtered
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((exp) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${exp.date}</td>
          <td>${exp.title}</td>
          <td>${exp.category}</td>
          <td>₹${exp.amount.toFixed(2)}</td>
          <td>
            <button class="btn-small btn-secondary">Edit</button>
            <button class="btn-small">Delete</button>
          </td>
        `;

        const [editBtn, deleteBtn] = tr.querySelectorAll("button");
        editBtn.addEventListener("click", () => openEditModal(exp));
        deleteBtn.addEventListener("click", () => deleteExpense(exp.id));

        expenseTableBody.appendChild(tr);
      });
  }

  function updateSummary() {
    if (!todayTotalEl || !monthTotalEl || !allTimeTotalEl) return;

    const today = new Date();
    const todayStr = formatDate(today);
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    let todayTotal = 0;
    let monthTotal = 0;
    let allTimeTotal = 0;

    expenses.forEach((exp) => {
      const expDate = new Date(exp.date);
      allTimeTotal += exp.amount;

      if (exp.date === todayStr) {
        todayTotal += exp.amount;
      }
      if (
        expDate.getMonth() === thisMonth &&
        expDate.getFullYear() === thisYear
      ) {
        monthTotal += exp.amount;
      }
    });

    currentMonthTotal = monthTotal;

    todayTotalEl.textContent = "₹" + todayTotal.toFixed(2);
    monthTotalEl.textContent = "₹" + monthTotal.toFixed(2);
    allTimeTotalEl.textContent = "₹" + allTimeTotal.toFixed(2);
  }

  function updateChart() {
    const canvas = document.getElementById("categoryChart");
    if (!canvas) return;

    const categoryTotals = {};

    expenses.filter(passesFilter).forEach((exp) => {
      if (!categoryTotals[exp.category]) {
        categoryTotals[exp.category] = 0;
      }
      categoryTotals[exp.category] += exp.amount;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    const ctx = canvas.getContext("2d");

    if (categoryChart) {
      categoryChart.destroy();
    }

    if (labels.length === 0) {
      categoryChart = null;
      return;
    }

    categoryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            labels: {
              color: "#111827",
            },
          },
        },
      },
    });
  }

  function toggleSections() {
    if (!summarySection || !tableSection) return;

    if (expenses.length === 0) {
      summarySection.classList.add("hidden");
      tableSection.classList.add("hidden");
    } else {
      summarySection.classList.remove("hidden");
      tableSection.classList.remove("hidden");
    }
  }

  function render() {
    toggleSections();
    renderTable();
    updateSummary();
    updateChart();
    updateBudgetUI();
  }

  // Initial budget + UI render
  render();
});

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
