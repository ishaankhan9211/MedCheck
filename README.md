# 🏥 MedCheck – AI Drug Interaction Checker

## 📌 Overview

MedCheck is an AI-powered web application designed to analyze patient data and identify potential drug interactions. It helps users understand possible risks associated with medications by combining clinical inputs with AI-based insights.

This project simulates a basic clinical decision-support system that evaluates medications, vitals, and lab values to provide meaningful recommendations.

---

## 🎯 Objectives

* Detect potential drug-drug interactions
* Analyze patient health parameters
* Provide AI-based clinical suggestions
* Build an intuitive healthcare tool

---

## 🚀 Features

* 👤 Add patient details (age, weight, allergies)
* 💊 Add and manage medications
* 🧪 Input lab values (HbA1c, Creatinine, etc.)
* ❤️ Record vital signs (BP, HR)
* 🤖 AI-powered interaction analysis
* ⚡ Fast and responsive UI
* 📋 Clean and structured output

---

## 🛠️ Tech Stack

* **Frontend:** React.js, Vite
* **Language:** JavaScript (ES6)
* **Styling:** CSS
* **API:** Groq API (LLM)
* **Version Control:** Git & GitHub

---

## 📂 Project Structure

drug-checker/
│── public/
│── src/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── App.jsx
│   ├── main.jsx
│── index.html
│── package.json
│── README.md

---

## ⚙️ Installation & Setup

### 🔹 Clone the repository

git clone https://github.com/your-username/medcheck.git
cd medcheck

---

### 🔹 Install dependencies

npm install

---

### 🔹 Setup environment variables

Create a `.env` file and add:
VITE_GROQ_API_KEY=your_api_key_here

⚠️ Do NOT share your API key publicly.

---

### 🔹 Run the project

npm run dev

👉 Open: http://localhost:5173

---

## 🔐 Environment Variables

VITE_GROQ_API_KEY → API key for AI interaction

---

## 🧠 How It Works

1. User enters patient details and medications
2. Data is sent to AI model
3. AI analyzes drug interactions and health data
4. Results are displayed in readable format



## ⚠️ Disclaimer

This project is for **educational purposes only** and should NOT be used for real medical decisions.

---

## 🔮 Future Improvements

* User authentication
* PDF report generation
* Better medical dataset
* Live deployment (Vercel/Netlify)

---

## 🐞 Known Issues

* Depends on API response
* Limited real-world accuracy

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch
3. Make changes
4. Submit PR

---

## 👨‍💻 Author

Ishaan Khan

---

## 🌟 Support

⭐ Star the repo
🍴 Fork it
📢 Share it

---
