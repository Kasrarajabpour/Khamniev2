// منوی همبرگری
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sideMenu = document.getElementById('sideMenu');

if (hamburgerBtn && sideMenu) {
    hamburgerBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        hamburgerBtn.classList.toggle('active');
        sideMenu.classList.toggle('open');
    });
    
    const menuLinks = document.querySelectorAll('.side-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburgerBtn.classList.remove('active');
            sideMenu.classList.remove('open');
        });
    });
    
    document.addEventListener('click', function(event) {
        if (!hamburgerBtn.contains(event.target) && !sideMenu.contains(event.target)) {
            hamburgerBtn.classList.remove('active');
            sideMenu.classList.remove('open');
        }
    });
}

// مدیریت پروفایل و لاگین
let currentGlobalUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");

async function updateUI() {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");
    const profileSection = document.getElementById('profileSection');
    const profileName = document.getElementById('profileName');
    const loginBtn = document.getElementById('loginBtn');
    const welcomeUsername = document.getElementById('welcomeUsername');
    const adminLink = document.getElementById('adminLink');
    
    if (currentUser) {
        if(profileSection) profileSection.style.display = 'flex';
        if(loginBtn) loginBtn.style.display = 'none';
        if(profileName) profileName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        if(welcomeUsername) welcomeUsername.innerHTML = `<div style="font-size:1.2rem; color:#ff8c00; margin:10px 0">${currentUser.firstName} جان،</div>`;
        if(adminLink && currentUser.role === 'admin') adminLink.style.display = 'block';
    } else {
        if(profileSection) profileSection.style.display = 'none';
        if(loginBtn) loginBtn.style.display = 'block';
        if(welcomeUsername) welcomeUsername.innerHTML = '';
        if(adminLink) adminLink.style.display = 'none';
    }
}

// پاپ آپ ورود/ثبت نام
const modal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const modalTitle = document.getElementById('modalTitle');

function openLoginModal() {
    if (sessionStorage.getItem("currentUser")) { alert("شما قبلاً وارد شده‌اید"); return; }
    document.getElementById('loginNationalCode').value = '';
    document.getElementById('regNationalCode').value = '';
    document.getElementById('regFirstName').value = '';
    document.getElementById('regLastName').value = '';
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    modalTitle.textContent = '🔐 ورود به حساب';
    document.getElementById('switchText').innerHTML = 'حساب کاربری ندارید؟ <a href="#" id="switchToRegister">ثبت‌نام کنید</a>';
    modal.classList.add('open');
    
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        modalTitle.textContent = '📝 ثبت‌نام جدید';
        document.getElementById('switchText').innerHTML = 'قبلاً ثبت‌نام کرده‌اید؟ <a href="#" id="switchToLogin">ورود</a>';
        document.getElementById('switchToLogin')?.addEventListener('click', (e2) => {
            e2.preventDefault();
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            modalTitle.textContent = '🔐 ورود به حساب';
            document.getElementById('switchText').innerHTML = 'حساب کاربری ندارید؟ <a href="#" id="switchToRegister">ثبت‌نام کنید</a>';
        });
    });
}

function closeLoginModal() { modal.classList.remove('open'); }

if(loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nationalCode = document.getElementById('loginNationalCode').value.trim();
        if(!/^\d{10}$/.test(nationalCode)) { alert("کد ملی باید ۱۰ رقم باشد"); return; }
        const result = await loginUser(nationalCode);
        if(result.success) {
            sessionStorage.setItem("currentUser", JSON.stringify(result.user));
            closeLoginModal();
            updateUI();
            alert(`خوش آمدید ${result.user.firstName}`);
            location.reload();
        } else { alert(result.message); }
    });
}

// تغییر در تابع ثبت‌نام - بدون رمز مدیریت
if(registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nationalCode = document.getElementById('regNationalCode').value.trim();
        const firstName = document.getElementById('regFirstName').value.trim();
        const lastName = document.getElementById('regLastName').value.trim();
        
        if(!/^\d{10}$/.test(nationalCode)) { alert("کد ملی باید ۱۰ رقم باشد"); return; }
        if(!firstName || !lastName) { alert("لطفاً نام و نام خانوادگی را وارد کنید"); return; }
        
        // ثبت نام بدون رمز مدیریت - همه کاربران عادی می‌شوند
        const result = await registerUser(nationalCode, firstName, lastName);
        
        if(result.success) {
            sessionStorage.setItem("currentUser", JSON.stringify(result.user));
            closeLoginModal();
            updateUI();
            alert(`ثبت نام موفق! خوش آمدید ${firstName}`);
            location.reload();
        } else { alert(result.message); }
    });
}

document.getElementById('closeModalBtn')?.addEventListener('click', closeLoginModal);
modal?.addEventListener('click', (e) => { if(e.target === modal) closeLoginModal(); });

document.getElementById('loginBtn')?.addEventListener('click', openLoginModal);

const profileSection = document.getElementById('profileSection');
if(profileSection) {
    profileSection.addEventListener('click', (e) => { e.stopPropagation(); profileSection.classList.toggle('active'); });
    document.addEventListener('click', () => profileSection.classList.remove('active'));
}

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem("currentUser");
    location.href = "index.html";
});

updateUI();

// اطلاعیه‌ها و نوتیفیکیشن
async function initNotifications() {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        await Notification.requestPermission();
    }
}

initNotifications();