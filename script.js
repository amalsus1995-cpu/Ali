// ===================== إعدادات ثابتة =====================
const SUPABASE_URL = "https://scxntlerjrxfmibnuqvc.supabase.co";
const SUPABASE_KEY = "sb_publishable_vX81waCjj0Y0iQoDdadqTw_TqWPdGaY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// عنوان المحفظة USDT TRC20
const WALLET_ADDRESS = "TPNoGerv1EMBSdrs9Yca93eCQUVsoNiRvq";

// المبالغ المسموح بها للشحن
const ALLOWED_AMOUNTS = [20, 50, 100, 200, 300, 500, 1000];

// ===================== تسجيل مستخدم جديد =====================
async function registerUser(name, email, password) {
    const { data, error } = await supabase
        .from("users")
        .insert([{ name, email, password }]);

    if (error) {
        alert("المستخدم موجود أو خطأ في التسجيل!");
    } else {
        alert("تم إنشاء الحساب بنجاح!");
        window.location.href = "index.html";
    }
}

// ===================== تسجيل الدخول =====================
async function loginUser(email, password) {
    const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password);

    if (users.length === 1) {
        localStorage.setItem("user", JSON.stringify(users[0]));
        window.location.href = "dashboard.html";
    } else {
        alert("البريد الإلكتروني أو كلمة المرور غير صحيحة!");
    }
}

// ===================== جلب بيانات المستخدم =====================
function getCurrentUser() {
    return JSON.parse(localStorage.getItem("user")) || null;
}

// ===================== تسجيل الخروج =====================
function logoutUser() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

// ===================== إنشاء طلب شحن =====================
async function createDeposit(amount, txid) {
    const user = getCurrentUser();
    if (!user) return;

    const { error } = await supabase
        .from("deposits")
        .insert([{ user_id: user.id, amount, txid, status: "pending" }]);

    if (!error) {
        alert("تم إرسال طلب الشحن وسيتم التفعيل بعد المراجعة.");
    }
}

// ===================== حساب الربح لكل إعلان =====================
function calculateReward(totalDeposit) {
    if (totalDeposit >= 200) return 6;
    if (totalDeposit >= 100) return 3;
    return 1;
}

// ===================== تحميل البيانات في لوحة التحكم =====================
async function loadDashboard() {
    const user = getCurrentUser();
    if (!user) return;

    document.getElementById("userName").innerText = user.name;

    const { data: deposits } = await supabase
        .from("deposits")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "confirmed");

    let totalDeposit = 0;
    deposits.forEach(d => totalDeposit += d.amount);

    document.getElementById("totalBalance").innerText = totalDeposit + " USDT";

    let reward = calculateReward(totalDeposit);
    document.getElementById("rewardPerAd").innerText = reward + " $";
}

// ===================== فتح إعلان وزيادة الربح =====================
async function watchAd() {
    const user = getCurrentUser();
    if (!user) return;

    const reward = parseFloat(document.getElementById("rewardPerAd").innerText);

    await supabase.from("earnings").insert([
        { user_id: user.id, amount: reward }
    ]);

    alert("تم احتساب الربح: " + reward + " دولار");
}
