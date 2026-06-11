const API_BASE = "https://sheiko-mail-worker.khusnadwi7.workers.dev";

let emails = [];
let selectedEmail = null;

const names = ["rizky","dinda","budi","nabila","arif","salsa","fajar","putri","aldi","melati","bayu","rani"];

function randomEmailName(){
  return names[Math.floor(Math.random()*names.length)] + Math.floor(100 + Math.random()*900);
}

function showToast(text){
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.style.display = "block";
  setTimeout(() => toast.style.display = "none", 1800);
}

function escapeHtml(text){
  return String(text ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function decodeText(text){
  return String(text || "")
    .replace(/=\r?\n/g, "")
    .replace(/=3D/g, "=")
    .replace(/=20/g, " ")
    .replace(/=E2=86=92/g, "→")
    .replace(/=C2=A0/g, " ")
    .replace(/=C2=A9/g, "©")
    .replace(/=C2=B7/g, "·")
    .replace(/=E2=80=94/g, "—")
    .replace(/=E2=80=99/g, "'")
    .replace(/=E2=80=9C/g, '"')
    .replace(/=E2=80=9D/g, '"')
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanHtml(html){
  return decodeText(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
}

function textOnly(text){
  return decodeText(text || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function getFullEmail(){
  const username = document.getElementById("username").value.trim();
  const domain = document.getElementById("domain").value;
  return username ? `${username}@${domain}` : "-";
}

function updateCurrentEmail(){
  document.getElementById("currentEmail").textContent = getFullEmail();
}

function ambilEmail(){
  const input = document.getElementById("username");
  if(!input.value.trim()) input.value = randomEmailName();
  updateCurrentEmail();
  loadEmails();
  showToast("Email aktif: " + getFullEmail());
}

function newEmail(){
  document.getElementById("username").value = randomEmailName();
  selectedEmail = null;
  updateCurrentEmail();
  renderReader(null);
  loadEmails();
}

async function copyEmail(){
  updateCurrentEmail();
  await navigator.clipboard.writeText(getFullEmail());
  showToast("Email disalin");
}

async function loadEmails(){
  try {
    updateCurrentEmail();

    if(!emails.length){
      document.getElementById("emailList").innerHTML = '<div class="empty">Loading...</div>';
    }

    const res = await fetch(API_BASE + "/api/inbox?ts=" + Date.now());

    if(!res.ok){
      throw new Error("API error");
    }

    const data = await res.json();
    const activeEmail = getFullEmail().trim().toLowerCase();
    const inbox = data.inbox || [];

    emails = inbox.filter(email => {
      const to = String(email.to || "").trim().toLowerCase();
      return to === activeEmail;
    });

    renderList();
  } catch (err) {
    console.error("LOAD EMAIL ERROR:", err);
    document.getElementById("emailList").innerHTML =
      '<div class="empty">Gagal mengambil email</div>';
  }
}

function renderList(){
  const list = document.getElementById("emailList");
  const key = document.getElementById("search").value.toLowerCase();

  const filtered = emails.filter(email =>
    String(email.from || "").toLowerCase().includes(key) ||
    String(email.subject || "").toLowerCase().includes(key) ||
    String(email.preview || "").toLowerCase().includes(key)
  );

  document.getElementById("countText").textContent =
    filtered.length ? `${filtered.length} pesan masuk` : "Belum ada pesan masuk";

  if(!filtered.length){
    list.innerHTML = `
      <div class="empty">
        Empty Inbox<br>
        <small>Kirim email ke alamat aktif</small>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(email => `
    <div class="email-item ${selectedEmail && selectedEmail.id === email.id ? "active" : ""} unread"
      onclick="openEmail('${email.id}')">
      <div class="email-from">${escapeHtml(email.from || "Unknown Sender")}</div>
      <div class="email-subject">${escapeHtml(email.subject || "(No Subject)")}</div>
      <div class="email-preview">${escapeHtml(textOnly(email.preview || ""))}</div>
      <div class="email-date">${formatDate(email.receivedAt || email.date)}</div>
    </div>
  `).join("");
}

async function openEmail(id){
  try {
    const res = await fetch(API_BASE + "/api/message/" + encodeURIComponent(id) + "?ts=" + Date.now());

    if(!res.ok){
      throw new Error("Message API error");
    }

    const data = await res.json();

    if(!data.ok || !data.message){
      showToast("Email tidak ditemukan");
      return;
    }

    selectedEmail = data.message;
    renderReader(selectedEmail);
    renderList();
  } catch (err) {
    console.error("OPEN EMAIL ERROR:", err);
    showToast("Gagal membuka email");
  }
}

function renderReader(email){
  const reader = document.getElementById("reader");

  if(!email){
    reader.innerHTML = '<div class="reader-empty">Pilih pesan untuk membaca email</div>';
    return;
  }

  const html = cleanHtml(email.html || "");
  const text = textOnly(email.text || email.preview || "");

  const body = html
    ? html
    : `<pre>${escapeHtml(text || "Tidak ada isi email")}</pre>`;

  reader.innerHTML = `
    <div class="reader-head">
      <h2>${escapeHtml(email.subject || "(No Subject)")}</h2>
      <div class="reader-meta">
        Dari: ${escapeHtml(email.from || "-")}<br>
        Ke: ${escapeHtml(email.to || "-")}<br>
        Tanggal: ${escapeHtml(formatDate(email.receivedAt || email.date))}
      </div>
    </div>
    <div class="mail-body email-html">${body}</div>
  `;
}

function clearReader(){
  selectedEmail = null;
  renderReader(null);
  renderList();
}

function formatDate(date){
  if(!date) return "-";
  try {
    return new Date(date).toLocaleString("id-ID");
  } catch {
    return date;
  }
}

document.getElementById("username").value = "dinda609";
updateCurrentEmail();
loadEmails();

setInterval(loadEmails, 5000);
