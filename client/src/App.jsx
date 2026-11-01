import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(
  new Date().toLocaleDateString("en-CA")
);
  const [filterCategory, setFilterCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
  new Date().toISOString().slice(0, 7)
);
  const [transactions, setTransactions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const API_URL = "https://expense-tracker-eight-green-34.vercel.app";

    // Authentication states
  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [authMode, setAuthMode] = useState("login");

    // Login / Register form states
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);


  // Load transactions from MongoDB
useEffect(() => {
  async function loadTransactions() {
    if (!token) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    try {
      setLoadError("");

      const response = await fetch(
        `${API_URL}/api/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Token expired or invalid
      if (response.status === 401) {
        localStorage.removeItem("token");
        setToken("");
        setIsLoggedIn(false);
        setTransactions([]);
        setLoadError("Your session expired. Please login again.");
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load transactions");
      }

      const data = await response.json();
      setTransactions(data);

    } catch (error) {
      console.error("Error loading transactions:", error);
      setLoadError(
        "Could not load transactions. Please check your backend connection."
      );
    } finally {
      setIsLoading(false);
    }
  }

  loadTransactions();
}, [token]);


  // Login / Register function
  async function handleAuthSubmit() {
    setAuthMessage("");

    if (!authEmail || !authPassword) {
      setAuthMessage("Please enter email and password.");
      return;
    }

    if (authMode === "register" && !authName.trim()) {
      setAuthMessage("Please enter your name.");
      return;
    }

    try {
      setAuthLoading(true);

      const endpoint =
        authMode === "login" ? "login" : "register";

      const response = await fetch(
        `${API_URL}/api/auth/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(authMode === "register" && { name: authName }),
            email: authEmail,
            password: authPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      if (authMode === "register") {
        setAuthMessage("Account created! Please login.");
        setAuthMode("login");
        setAuthName("");
        setAuthPassword("");
      } else {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setIsLoggedIn(true);
        setAuthMessage("");
      }
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleUnauthorized(response) {
  if (response.status === 401) {
    localStorage.removeItem("token");
    setToken("");
    setIsLoggedIn(false);
    setTransactions([]);
    setLoadError("Your session expired. Please login again.");

    return true;
  }

  return false;
}



  // Add or update a transaction
  async function handleSubmit() {
    if (
  name.trim() === "" ||
  amount === "" ||
  !Number.isFinite(Number(amount)) ||
  Number(amount) <= 0 ||
  category.trim() === ""
) {
  alert("Please enter a name, valid amount and category");
  return;
}

    const transactionData = {
      name: name.trim(),
      amount: Number(amount),
      type,
      category,
      date
    };

    try {
      const isEditing = editingId !== null;

  const url = isEditing
    ? `${API_URL}/api/transactions/${editingId}`
    : `${API_URL}/api/transactions`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
        body: JSON.stringify(transactionData),
      });

      const data = await response.json();

      if (handleUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      if (isEditing) {
        setTransactions((current) =>
          current.map((transaction) =>
            transaction._id === editingId ? data : transaction
          )
        );
      } else {
        setTransactions((current) => [...current, data]);
      }

      handleCancelEdit();
    } catch (error) {
      alert(error.message);
    }
  }

  // Fill the form for editing
  function handleEdit(transaction) {
    setName(transaction.name);
    setAmount(String(transaction.amount));
    setType(transaction.type);
    setCategory(transaction.category || "Food");
    setDate(
  transaction.date
    ? new Date(transaction.date).toLocaleDateString("en-CA")
    : new Date().toLocaleDateString("en-CA")
);
    setEditingId(transaction._id);
  }

  // Cancel editing and clear the form
  function handleCancelEdit() {
    setEditingId(null);
    setName("");
    setAmount("");
    setType("expense");
    setDate(new Date().toLocaleDateString("en-CA"));
    setCategory("Food");
  }

  // Delete a transaction from MongoDB
  async function handleDelete(id) {
    try {
      const response = await fetch(
        `${API_URL}/api/transactions/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
        if (handleUnauthorized(response)) {
          return;
        }
      if (!response.ok) {
        throw new Error(data.message || "Delete failed");
      }

      setTransactions((current) =>
        current.filter((transaction) => transaction._id !== id)
      );

      if (editingId === id) {
        handleCancelEdit();
      }
    } catch (error) {
      alert(error.message);
    }
  }

  
function handleExportCSV() {
  const headers = [
    "Name",
    "Amount",
    "Type",
    "Category",
    "Date",
  ];

  const rows = filteredTransactions.map((transaction) => [
    transaction.name,
    transaction.amount,
    transaction.type,
    transaction.category,
    transaction.date
      ? new Date(transaction.date).toLocaleDateString()
      : "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((value) =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "expense-transactions.csv";
  link.click();

  URL.revokeObjectURL(url);
}


  // Calculate totals
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const balance = totalIncome - totalExpenses;
  
  
const monthlyTransactions = transactions.filter(
  (transaction) => {
    if (!transaction.date) return false;

    const transactionDate = new Date(transaction.date);

    const transactionMonth = transactionDate
      .toISOString()
      .slice(0, 7);

    return transactionMonth === selectedMonth;
  }
);

const monthlyIncome = monthlyTransactions
  .filter((transaction) => transaction.type === "income")
  .reduce((total, transaction) => total + transaction.amount, 0);

const monthlyExpenses = monthlyTransactions
  .filter((transaction) => transaction.type === "expense")
  .reduce((total, transaction) => total + transaction.amount, 0);

const monthlyBalance = monthlyIncome - monthlyExpenses;
  const totalTransactions = transactions.length;

const filteredTransactions = transactions.filter(
  (transaction) => {
    const matchesCategory =
      filterCategory === "All" ||
      transaction.category === filterCategory;

    const matchesSearch = transaction.name
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());

    return matchesCategory && matchesSearch;
  }
);

  // Show login/register form if user is not logged in
  if (!isLoggedIn) {
    return (
      <div className="container">
        <h1>Expense Tracker</h1>

        <h2>
          {authMode === "login" ? "Login" : "Create Account"}
        </h2>

        {authMode === "register" && (
          <input
            type="text"
            placeholder="Your Name"
            value={authName}
            onChange={(e) => setAuthName(e.target.value)}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={authEmail}
          onChange={(e) => setAuthEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
        />

        <button onClick={handleAuthSubmit} disabled={authLoading}>
          {authLoading
            ? "Please wait..."
            : authMode === "login"
              ? "Login"
              : "Register"}
        </button>

        <button
          onClick={() => {
            setAuthMode(authMode === "login" ? "register" : "login");
            setAuthMessage("");
          }}
        >
          {authMode === "login"
            ? "Create New Account"
            : "Already have an account? Login"}
        </button>

        {authMessage && <p>{authMessage}</p>}
      </div>
    );
  }

  const chartData = [
  {
    name: "Income",
    value: transactions
      .filter((item) => item.type === "income")
      .reduce((total, item) => total + Number(item.amount), 0),
  },
  {
    name: "Expenses",
    value: transactions
      .filter((item) => item.type === "expense")
      .reduce((total, item) => total + Number(item.amount), 0),
  },
].filter((item) => item.value > 0);

const monthlyReport = transactions.reduce((report, item) => {
  const month = new Date(item.date).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (!report[month]) {
    report[month] = {
      income: 0,
      expense: 0,
    };
  }

  if (item.type === "income") {
    report[month].income += Number(item.amount);
  } else {
    report[month].expense += Number(item.amount);
  }

  return report;
}, {});



  return (
    <div className="container">
      <h1>Expense Tracker</h1>
     <button
      onClick={() => {
        localStorage.removeItem("token");
        setToken("");
        setIsLoggedIn(false);
        setTransactions([]);
          }}
        >
          Logout
        </button> 
<div className="summary-card">
  <h3>Total Transactions</h3>
  <h2>{totalTransactions}</h2>
</div>

      <div className="balance-card">
        <h2>My Balance</h2>
        <p>Rs. {balance}</p>
      </div>

      <div className="summary">
        <div className="summary-card">
          <h3>Total Income</h3>
          <h2 className="income">Rs. {totalIncome}</h2>
        </div>

        <div className="summary-card">
          <h3>Total Expenses</h3>
          <h2 className="expense">Rs. {totalExpenses}</h2>
        </div>
      </div>

      <div className="form-card">
        <h2>
          {editingId !== null
            ? "Edit Transaction"
            : "Add New Transaction"}
        </h2>

        <input
          type="text"
          placeholder="Enter transaction name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="Food">Food</option>
          <option value="Bills">Bills</option>
          <option value="Transport">Transport</option>
          <option value="Salary">Salary</option>
          <option value="Education">Education</option>
          <option value="Other">Other</option>
        </select>
        
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />


        <button onClick={handleSubmit}>
          {editingId !== null
            ? "Update Transaction"
            : "Add Transaction"}
        </button>

        {editingId !== null && (
          <button
            className="cancel-button"
            onClick={handleCancelEdit}
          >
            Cancel Edit
          </button>
        )}
      </div>

<div className="monthly-summary">
  <h2>Monthly Summary</h2>
        <input
  type="month"
  value={selectedMonth}
  onChange={(event) => setSelectedMonth(event.target.value)}
/>
  <div className="summary">
    <div className="summary-card income">
      <h3>Monthly Income</h3>
      <p>Rs. {monthlyIncome.toLocaleString()}</p>
    </div>

    <div className="summary-card expense">
      <h3>Monthly Expenses</h3>
      <p>Rs. {monthlyExpenses.toLocaleString()}</p>
    </div>

    <div className="summary-card">
      <h3>Monthly Balance</h3>
      <p>Rs. {monthlyBalance.toLocaleString()}</p>
    </div>
  </div>
</div>

<div className="chart-container">
  <h2>Income vs Expenses</h2>

  {chartData.length > 0 ? (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          <Cell fill="#16a34a" />
          <Cell fill="#dc2626" />
        </Pie>

        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  ) : (
    <p>No transaction data available for chart.</p>
  )}
</div>

<div className="monthly-report">
  <h2>Monthly Reports</h2>

  {Object.entries(monthlyReport).length > 0 ? (
    Object.entries(monthlyReport).map(([month, values]) => (
      <div className="report-card" key={month}>
        <h3>{month}</h3>

        <p>
          Income: <strong>Rs. {values.income.toLocaleString()}</strong>
        </p>

        <p>
          Expenses: <strong>Rs. {values.expense.toLocaleString()}</strong>
        </p>

        <p>
          Savings:{" "}
          <strong>
            Rs. {(values.income - values.expense).toLocaleString()}
          </strong>
        </p>
      </div>
    ))
  ) : (
    <p>No monthly report available.</p>
  )}
</div>

      <h2>My Transactions</h2>

<input
  type="text"
  placeholder="Search transactions by name..."
  value={searchTerm}
  onChange={(event) => setSearchTerm(event.target.value)}
/>

      
<select
  value={filterCategory}
  onChange={(event) =>
    setFilterCategory(event.target.value)
  }
>
  <option value="All">All Categories</option>
  <option value="Food">Food</option>
  <option value="Bills">Bills</option>
  <option value="Transport">Transport</option>
  <option value="Salary">Salary</option>
  <option value="Education">Education</option>
  <option value="Other">Other</option>
</select>

<button
  type="button"
  onClick={handleExportCSV}
  disabled={filteredTransactions.length === 0}
>
  Export Transactions to CSV
</button>

{isLoading ? (
  <p>Loading transactions...</p>
) : loadError ? (
  <p>{loadError}</p>
) : transactions.length === 0 ? (
  <p>No transactions yet. Add your first transaction!</p>
) : (
  filteredTransactions.map((transaction) => (
    <div
      className="transaction-card"
      key={transaction._id}
    >
      <div>
        <strong>{transaction.name}</strong>
        <p>
          Rs. {transaction.amount} ({transaction.type})
        </p>
        <p>
  Category: {transaction.category || "Uncategorized"}
</p>
<p>
  Date: {transaction.date
    ? new Date(transaction.date).toLocaleDateString("en-GB")
    : "Date unavailable"}
</p>
      </div>

      <div>
        <button onClick={() => handleEdit(transaction)}>
          Edit
        </button>
        <button
          className="delete-button"
          onClick={() => handleDelete(transaction._id)}
        >
          Delete
        </button>
      </div>
    </div>
  ))
)}
</div>
  );
}

export default App;
