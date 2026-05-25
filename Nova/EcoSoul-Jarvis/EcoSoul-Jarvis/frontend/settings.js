
        // Function to load settings from localStorage
       // Function to load settings from localStorage safely
function loadSettings() {
    // 1. Helper function: Check agar element hai tabhi value set karein
    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };

    const setCheck = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.checked = (value === 'true' || value === true);
    };

    // 2. Data load karein
    const name = localStorage.getItem('name');
    const email = localStorage.getItem('email');
    const phone = localStorage.getItem('phone');
    const language = localStorage.getItem('language') || 'English';

    // 3. Elements ko safely update karein
    setVal('name', name);
    setVal('email', email);
    setVal('phone', phone);
    setVal('language', language);

    setCheck('emailNotifications', localStorage.getItem('emailNotifications'));
    setCheck('smsAlerts', localStorage.getItem('smsAlerts'));
    setCheck('twoFA', localStorage.getItem('twoFA'));

    // Dark Mode Logic
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const dmToggle = document.getElementById('darkMode');
    if (dmToggle) dmToggle.checked = darkMode;
    
    // Body class hamesha update honi chahiye
    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}
        // Function to save settings to localStorage
        function saveSettings() {
            localStorage.setItem('name', document.getElementById('name').value);
            localStorage.setItem('email', document.getElementById('email').value);
            localStorage.setItem('phone', document.getElementById('phone').value);
            localStorage.setItem('emailNotifications', document.getElementById('emailNotifications').checked);
            localStorage.setItem('smsAlerts', document.getElementById('smsAlerts').checked);
            localStorage.setItem('darkMode', document.getElementById('darkMode').checked);
            localStorage.setItem('twoFA', document.getElementById('twoFA').checked);
            localStorage.setItem('language', document.getElementById('language').value);

            alert('Settings saved successfully!');
        }

        // Function to handle password change (simulation)
        function changePassword() {
            const currentPass = document.getElementById('currentPass').value;
            const newPass = document.getElementById('newPass').value;
            const confirmPass = document.getElementById('confirmPass').value;

            if (newPass || confirmPass) {
                if (!currentPass) {
                    alert('Please enter your current password to change it.');
                    return false;
                }
                if (newPass !== confirmPass) {
                    alert('New passwords do not match.');
                    return false;
                }
                if (newPass.length < 8) {
                    alert('New password must be at least 8 characters long.');
                    return false;
                }
                // Simulate success
                alert('Password changed successfully!');
                document.getElementById('currentPass').value = '';
                document.getElementById('newPass').value = '';
                document.getElementById('confirmPass').value = '';
            }
            return true;
        }

        // 1. Dark Mode Toggle (Safe Code)
const darkModeToggle = document.getElementById('darkMode');
if (darkModeToggle) {
    darkModeToggle.addEventListener('change', function() {
        document.body.classList.toggle('dark-mode', this.checked);
        localStorage.setItem('darkMode', this.checked);
    });
}

// 2. Save Button (Safe Code)
const saveButton = document.getElementById('saveBtn');
if (saveButton) {
    saveButton.addEventListener('click', function() {
        // Yeh check karega ki functions exist karte hain ya nahi taaki error na aaye
        if (typeof changePassword === 'function' && typeof saveSettings === 'function') {
            if (changePassword()) {
                saveSettings();
            }
        } else {
            console.warn("Save functions not found");
        }
    });
}

        // Load settings on page load
        window.addEventListener('load', loadSettings);
  