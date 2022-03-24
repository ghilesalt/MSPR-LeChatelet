const formLogin = document.getElementById("form-login");
const formToken = document.getElementById("form-token");
const errorToken = document.getElementById("error-token");
const alerts = document.querySelector(".alerts");
const loginpage = document.querySelector(".login");
const homepage = document.querySelector(".home");
const userNameSpan = document.querySelector(".userNameSpan");

// Global State
const state = {
  user: {},
};

async function getLogin(event) {
  event.preventDefault();

  // requête http pour vérifier coté AD si l'utilisateur existe
  const formData = new FormData(formLogin);

  try {
    const { data } = await axios.post("/login", {
      name: formData.get("userName"),
      password: formData.get("password"),
    });

    state.user = data;

    showForm(formToken);
    if (data.twoFAFirstTime) {
      showAlerts(data.twoFAInfo);
    }
  } catch (err) {
    console.log(err);
  }
}

// 2FA
async function verifyToken(event) {
  // envoyer le token et le id d'utilisateur pour aller dans la page d'accueil
  event.preventDefault();

  const formData = new FormData(formToken);
  if (state.user.id && formData.get("token")) {
    try {
      const { data } = await axios.get(
        `/verify/token/${state.user.id}/${formData.get("token")}`
      );
      userNameSpan.innerText = state.user.user.displayName;
      showPage(homepage);
    } catch (err) {
      errorToken.innerText = err.response.data.message;
    }
  }
}

function showForm(form) {
  const forms = document.querySelectorAll(".form");
  forms.forEach((fm) => {
    fm.classList.add("inactive");
  });
  form.classList.remove("inactive");
}

function showPage(page) {
  const pages = document.querySelectorAll(".page");
  pages.forEach((pg) => {
    pg.classList.add("inactive");
  });
  page.classList.remove("inactive");
}

function showAlerts(data) {
  const div = document.createElement("div");
  const p = document.createElement("p");
  const a = document.createElement("a");
  p.innerHTML =
    "Vous Vous connectez pour la première fois donc Activez la double authentification grâce à ce QR Code";
  a.href = data.qr;
  a.textContent = "Cliquez-Ici";
  div.className = "alert";
  const content = `
    <div class="alert__container">
      <h1><marquee>Nouvelle Connection</marquee></h1>
      <p>Vous Vous connectez pour la première fois donc Activez la double authentification grâce au QR Code : </p>
      <a href="${data.qr}" target="_blank">Cliquez-ici</a>
      <p class="recommandation">Nous vous recommandons d'utiliser <span style="font-weight:bold;"> Google Authenticator</span> <img src="https://play-lh.googleusercontent.com/HPc5gptPzRw3wFhJE1ZCnTqlvEvuVFBAsV9etfouOhdRbkp-zNtYTzKUmUVPERSZ_lAL=s360-rw" width="60px"/>
      </p>
      <div class="close"><i class="fa-solid fa-circle-xmark fa-2x"></i></div>
    </div>
  `;
  div.innerHTML = content;

  alerts.appendChild(div);

  div.querySelector(".close").addEventListener("click", () => {
    div.remove();
  });

  // setTimeout(() => {
  //   div.remove();
  //   clearInterval(inetrvalId);
  // }, 30000);
}
