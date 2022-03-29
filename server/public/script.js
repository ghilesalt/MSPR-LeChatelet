const formLogin = document.getElementById("form-login");
const formToken = document.getElementById("form-token");
const errorToken = document.getElementById("error-token");
const alerts = document.querySelector(".alerts");
const loginpage = document.querySelector(".login");
const homepage = document.querySelector(".home");
const userNameSpan = document.querySelector(".userNameSpan");
const googleRecaptcha = document.querySelector(".g-recaptcha");

// Global State
const state = {
  user: {},
  nb_attempt: 0
};

async function onSubmitGoogleRecaptcha(e) {
  console.log(e);
  formLogin.submit();
}

function verifyAttempts(times) {
  if (state.nb_attempt >= times) {
    return true
  }
  return false;
}

async function getIPAddress() {
  return fetch('https://api.db-ip.com/v2/free/self')
    .then(res => res.json());
}

async function getLogin(event) {
  event?.preventDefault();

  // requête http pour vérifier coté AD si l'utilisateur existe
  const formData = new FormData(formLogin);

  try {
    if (verifyAttempts(50)) {
      const response = grecaptcha.getResponse();
      // si on obtien un token grace au captcha
      if (response.length == 0) {
        alert("Veuillez verifier que vous n'êtes pas un robot");
        return;
      } else grecaptcha.reset();
    }

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
    state.nb_attempt++;
    if (verifyAttempts(50)) {
      googleRecaptcha.style.display = "block";
    }
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
      
      const ipData = await getIPAddress();
      //console.log(ipData);

      // Get User Navigator
      var ua = navigator.userAgent;
      let UserNavigator;
      if (ua.indexOf('Chrome') != -1) {
        UserNavigator = "Chrome";
      } else if (ua.indexOf('Firefox') != -1) {
        UserNavigator = "Firefox";
      } else if (ua.indexOf('Safari') != -1) {
        UserNavigator = "Safari";
      } else if (ua.indexOf('Opera') != -1) {
        UserNavigator = "Opera"
      } else if (ua.indexOf('MSIE') != -1) {
        UserNavigator = "Microsoft";
      } else {
        UserNavigator = navigator.userAgent;
      }
      if(state.user.twoFAFirstTime) {
        const user = await axios.put("/user", {
          id: state.user.id,
          name: state.user.user.name,
          ip: ipData.ipAddress,
          navigator: UserNavigator
        });
  
        console.log(user);
      }else {
        if(ipData.ipAddress !== state.user.twoFAInfo.ip) {
        // if(ipData.ipAddress !=="kshish") {
          var EmailData = {
            service_id: 'service_j2lhc7o',
            template_id: 'template_vs1kyok',
            user_id: 'U3nplhed1z3c0uc2L',
            template_params: {
              'username': state.user.user.displayName,
              'usermail': state.user.user.mail,
              'message': `Nous avons détecté une connexion inhabituelle situé à ${ipData.countryName} - ${ipData.city}
              `
            }
          };
          await axios.post('https://api.emailjs.com/api/v1.0/email/send', EmailData);
          console.log("Mail Sended to", state.user.user.mail);
          return;
        }
      }

      userNameSpan.innerText = state.user.user.displayName;
      showPage(homepage);

    } catch (err) {
      console.log(err.message);
      errorToken.innerText = err.response?.data?.message;
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
