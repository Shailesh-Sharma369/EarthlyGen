
const payments = JSON.parse(localStorage.getItem('ecoPayments')) || [];
let nextId = payments.length ? Math.max(...payments.map(p => p.id)) + 1 : 1;

function $(id) { return document.getElementById(id); }

function renderPayments(search = '') {
    const container = $('paymentList');
    container.innerHTML = '';

    const filtered = payments.filter(p => {
        const text = `${p.nickname||''} ${p.type} ${p.upiId||''} ${p.bankName||''}`.toLowerCase();
        return text.includes(search.toLowerCase());
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>🌿 No eco-payment methods yet</h2>
                <p>Start adding sustainable payment options!</p>
            </div>`;
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = `payment-card ${p.primary ? 'primary' : ''}`;
        card.innerHTML = `
            <img class="logo" src="${getLogo(p.type)}" alt="${p.type}">
            <h3>${p.nickname || getTypeName(p.type)}</h3>
            <div class="details">${getDetails(p)}</div>
            <div class="eco-benefit">${getEcoBenefit(p.type)}</div>
            ${p.primary ? '<span class="status">Default</span>' : ''}
            <div class="actions">
                <button class="btn btn-edit" onclick="editPayment(${p.id})">Edit</button>
                <button class="btn btn-delete" onclick="deletePayment(${p.id})">Delete</button>
                ${!p.primary ? `<button class="btn btn-primary" onclick="setPrimary(${p.id})">Set Default</button>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

function getLogo(type) {
    const logos = {
        upi: "https://img.icons8.com/color/96/000000/upi.png",
        card: "https://img.icons8.com/color/96/credit-card.png",
        netbanking: "https://img.icons8.com/color/96/bank.png",
        wallet: "https://img.icons8.com/color/96/mobile-wallet.png",
        cod: "https://img.icons8.com/color/96/cash-on-delivery.png"
    };
    return logos[type] || "https://img.icons8.com/color/96/question-mark.png";
}

function getTypeName(type) {
    return {
        upi: "UPI",
        card: "Eco Card",
        netbanking: "Green Netbanking",
        wallet: "Eco Wallet",
        cod: "Cash on Delivery"
    }[type] || type;
}

function getDetails(p) {
    switch(p.type) {
        case 'upi': return `UPI ID: ${p.upiId || '—'}`;
        case 'card': return `•••• •••• •••• ${p.cardNumber?.slice(-4) || '••••'}`;
        case 'netbanking': return `Bank: ${p.bankName || '—'}`;
        case 'wallet': return `${p.walletProvider || '—'} • ${p.walletNumber || '—'}`;
        case 'cod': return 'Cash on Delivery';
        default: return '';
    }
}

function getEcoBenefit(type) {
    const benefits = {
        upi: "🌱 100% digital & paperless",
        card: "♻️ Recycled materials card",
        netbanking: "🌍 Supports sustainable banking",
        wallet: "📱 Zero plastic footprint",
        cod: "🚲 Local low-emission delivery"
    };
    return benefits[type] || "Eco-conscious choice";
}

function openPaymentModal(id = null) {
    const modal = $('paymentModal');
    modal.classList.add('active');

    $('paymentForm').reset();
    document.querySelectorAll('.card-fields, .netbanking-fields, .wallet-fields, .cod-fields')
        .forEach(el => el.style.display = 'none');

    if (id) {
        const payment = payments.find(p => p.id === id);
        if (!payment) return;

        $('paymentModalTitle').textContent = 'Edit Payment Method';
        $('paymentId').value = payment.id;
        $('nickname').value = payment.nickname || '';
        $('setPrimary').checked = payment.primary;

        document.querySelectorAll('.payment-option')
            .forEach(el => el.classList.toggle('active', el.dataset.type === payment.type));

        showPaymentFields(payment.type);
        // fill fields...
        if (payment.type === 'upi') $('upiId').value = payment.upiId || '';
        // ... add other fields when implemented
    } else {
        $('paymentModalTitle').textContent = 'Add New Payment Method';
        $('paymentId').value = '';
        $('setPrimary').checked = payments.length === 0;

        document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('active'));
        document.querySelector('[data-type="upi"]').classList.add('active');
        showPaymentFields('upi');
    }
}

function closePaymentModal() {
    $('paymentModal').classList.remove('active');
}

function showPaymentFields(type) {
    document.querySelectorAll('[class*="-fields"]')
        .forEach(el => el.style.display = 'none');

    const field = document.querySelector(`.${type}-fields`);
    if (field) field.style.display = 'block';
}

function validateForm(type) {
    if (type === 'upi') {
        const upi = $('upiId').value.trim();
        return upi.length > 5 && upi.includes('@');
    }
    // Add more validation for other types when implemented
    return true;
}

$('savePaymentBtn').addEventListener('click', () => {
    const active = document.querySelector('.payment-option.active');
    if (!active) return alert('Please select a payment type');

    const type = active.dataset.type;
    if (!validateForm(type)) {
        alert('Please fill required fields correctly');
        return;
    }

    const id = $('paymentId').value ? Number($('paymentId').value) : nextId++;
    const primary = $('setPrimary').checked;

    if (primary) {
        payments.forEach(p => p.primary = false);
    }

    const payment = {
        id,
        type,
        nickname: $('nickname').value.trim(),
        primary,
    };

    if (type === 'upi') payment.upiId = $('upiId').value.trim();

    // Add other field extraction when you implement those sections

    const existingIndex = payments.findIndex(p => p.id === id);
    if (existingIndex > -1) {
        payments[existingIndex] = payment;
    } else {
        payments.push(payment);
    }

    localStorage.setItem('ecoPayments', JSON.stringify(payments));
    renderPayments($('paymentSearchInput').value);
    closePaymentModal();
});

function deletePayment(id) {
    if (!confirm('Remove this payment method?')) return;
    payments.splice(payments.findIndex(p => p.id === id), 1);
    localStorage.setItem('ecoPayments', JSON.stringify(payments));
    renderPayments($('paymentSearchInput').value);
}

function setPrimary(id) {
    payments.forEach(p => p.primary = p.id === id);
    localStorage.setItem('ecoPayments', JSON.stringify(payments));
    renderPayments($('paymentSearchInput').value);
}

function editPayment(id) {
    openPaymentModal(id);
}

// Event Listeners
$('addPaymentBtn').onclick = () => openPaymentModal();
$('paymentSearchInput').oninput = e => renderPayments(e.target.value);

document.querySelectorAll('.payment-option').forEach(opt => {
    opt.onclick = () => {
        document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        showPaymentFields(opt.dataset.type);
    };
});

window.onclick = e => {
    if (e.target.classList.contains('modal')) {
        closePaymentModal();
    }
};

// Init
renderPayments();