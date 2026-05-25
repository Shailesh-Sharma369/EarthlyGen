
## Author

Shailesh Sharma
B.E. — Information Technology
www.linkedin.com/in/shaileshsharma369
AI & Agentic AI Developer | Cybersecurity Practitioner


# EarthlyGen (RUHI) — Agentic AI Voice Assistant

AI-powered voice assistant and agentic workflow system built using a fine-tuned Mistral 7B model with lightweight 4-bit quantization.

EarthlyGen (RUHI) combines conversational AI, backend orchestration, and social-commerce workflows into a unified intelligent assistant capable of understanding user intent and performing real application-level actions.

---

## Overview

EarthlyGen is designed to move beyond traditional chatbots by enabling AI agents to coordinate tasks across backend services, conversational interfaces, and application workflows.

The system supports:

* Conversational AI interaction
* Voice and text-based input
* Backend action execution
* Product and order workflows
* Social interaction handling
* Context-aware assistance
* Intelligent request routing

The project follows a hybrid architecture combining Python-based AI orchestration with Node.js backend services.

---

## Core Architecture

### Agentic AI Layer

Handles:

* Intent detection
* AI reasoning
* Workflow orchestration
* Context management
* Tool/action selection

Built using:

* Python
* FastAPI
* Transformers
* PEFT (LoRA)
* PyTorch
* BitsAndBytes
* Quantized Mistral 7B

---

### Application Layer

Handles:

* Frontend interaction
* Authentication
* E-commerce workflows
* API communication
* User session management

Built using:

* Node.js
* JavaScript
* REST APIs
* JWT Authentication

---

## System Workflow

1. User interacts through voice or text.
2. Frontend sends request with context and authentication data.
3. Python AI server processes the request.
4. Agent controller detects user intent.
5. Depending on the request, the system:

   * generates AI responses,
   * executes backend operations,
   * retrieves contextual data,
   * or coordinates application workflows.
6. Results are normalized and returned to the frontend.
7. Frontend updates the UI or completes the requested action.

---

## Technology Stack

### AI / ML

* Mistral 7B
* 4-bit Quantization
* Transformers
* PEFT (LoRA Fine-Tuning)
* PyTorch
* BitsAndBytes
* Accelerate
* Safetensors

### Backend

* Python
* FastAPI
* Uvicorn
* Node.js
* REST APIs

### Frontend

* HTML
* JavaScript

### Security & Authentication

* JWT Authentication
* Environment-based secret management

---

## Key Features

* Agentic AI workflow orchestration
* Fine-tuned Mistral 7B integration
* Lightweight quantized inference
* Context-aware conversations
* Backend API integration
* Voice assistant architecture
* Modular AI + backend design
* Social-commerce workflow support

---

## Project Structure

```bash
EarthlyGen/
│
├── AIVS/
│   ├── agentic_ai/
│   ├── app.py
│   ├── controller.py
│   ├── server.py
│
├── Nova/
│   ├── frontend/
│   ├── backend/
│
├── docs/
├── screenshots/
├── README.md
└── .gitignore

```
Working Flow
<img width="1536" height="1024" alt="ChatGPT Image May 25, 2026, 04_17_36 PM" src="https://github.com/user-attachments/assets/9fbc737d-72b0-4bcf-9dfe-4e99ce7c1397" />
---

## Running the Project

### Python AI Server

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the AI server:

```bash
python server.py
```

---

### Node.js Backend

Install dependencies:

```bash
npm install
```

Run backend services:

```bash
node server.js
```

---

## Security Notes

Sensitive assets are excluded from GitHub using `.gitignore`.

Not included in the repository:

* `.env` files
* API keys
* Firebase credentials
* Model checkpoints
* Quantized model weights
* Local datasets
* Cache/build artifacts

---

## What I Learned

This project gave me hands-on experience in building and deploying practical AI systems beyond basic chatbot development.

Key learnings from the project include:

* Fine-tuning Mistral 7B using QLoRA for domain-specific agentic AI workflows
* Implementing 4-bit quantization to run LLMs efficiently on limited hardware (8GB VRAM)
* Designing agentic AI pipelines capable of coordinating reasoning with backend API execution
* Integrating FastAPI-based AI services with Node.js backend workflows
* Building modular AI orchestration systems for conversational and action-based tasks
* Working with transformer optimization libraries such as PEFT, Accelerate, and BitsAndBytes
* Managing context-aware conversational workflows and backend routing logic
* Structuring a full-stack AI application combining AI inference, backend services, and frontend interaction
* Applying secure development practices including environment-based secret management and API isolation
* Collaborating in a team-based final year project environment while leading AI development and integration

---

## Future Scope

* Real-time voice processing
* Multi-agent AI coordination
* Autonomous task execution
* RAG-based memory systems
* Mobile application integration
* Cloud-native deployment
* AI-powered recommendation engine

---

