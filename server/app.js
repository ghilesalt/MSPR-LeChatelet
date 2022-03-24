// https://www.npmjs.com/package/ldap-authentication
const { authenticate } = require("ldap-authentication");
// https://www.npmjs.com/package/node-2fa
const twofactor = require("node-2fa");

const express = require("express");
const { connectDB } = require("./db");
const { getUserByName, saveUser, getUserById } = require("./db/query");

const db = connectDB();

const app = express();

const { response } = require("express");



app.use(express.static("./public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.sendFile("index.html");
});


const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');



const redis = new Redis();
// Each IP can only send 5 login requests in 10 minutes
const loginRateLimiter = rateLimit({ max: 5, windowMS: 1000 * 60 * 10 });

const maxNumberOfFailedLogins = 3;
const timeWindowForFailedLogins = 60 * 60 * 1;




app.get('login', loginRateLimiter, async (req, res) => {
  const userData = req.body;
  const keys = Object.keys(userData);
 // check user is not attempted too many login requests
 const userAttempts = await redis.get(userData);
 if (userAttempts > maxNumberOfFailedLogins) {
   return res.status(429).send("Too Many Attempts try it one hour later")
 }

 // Let's check user
 const loginResult = await authenticate({
  ldapOpts: { url: "ldap://192.168.0.150" },
  // adminDn: "cn=read-only-admin,dc=clin,dc=local",
  // adminPassword: "Vqatqbpp1954",
  userDn: `cn=${userData.name},ou=ldap,dc=clin,dc=local`,
  userPassword: userData.password,
  userSearchBase: "dc=clin,dc=local",
  usernameAttribute: "cn",
  username: userData.name,
});

 // user attempt failed
 if(!loginResult) {
   await redis.set(userData, ++userAttempts, 'ex', timeWindowForFailedLogins)
   res.send("failed")
 } else {
  // successful login
  await redis.del(userData)
  res.send("success")
 }
})

app.post("/login", loginRateLimiter,async (req, res) => {
  let user = null;
  const userData = req.body;
  const keys = Object.keys(userData);

  const userAttempts = await redis.get(userData.name);
   if (userAttempts > maxNumberOfFailedLogins) {
     return res.status(429).send("Too Many Attempts try it one hour later");
   }


  if (!keys.includes("password") && !keys.includes("name"))
    return res.status(401);

  try {
    // connecter à notre ad

    user = await authenticate({
      ldapOpts: { url: "ldap://192.168.0.150" },
      // adminDn: "cn=read-only-admin,dc=clin,dc=local",
      // adminPassword: "Vqatqbpp1954",
      userDn: `cn=${userData.name},ou=ldap,dc=clin,dc=local`,
      userPassword: userData.password,
      userSearchBase: "dc=clin,dc=local",
      usernameAttribute: "cn",
      username: userData.name,
    });
  } catch (error) {
    //console.log(error);
  }
  

  //console.log(user);

  if (!user){

    try{
      await redis.set(userData.name, ++userAttempts, 'ex', timeWindowForFailedLogins);
    } catch (error){
        return res.status(401).json({
        error:
          "Nous n'avons pas trouvé d'utilisateurs avec les identifiants fournies",
        user: null,
      });
    }  
  } 

  // bdd pour 2FA
  let userRetrieved = await getUserByName(db, user.displayName);
  if (!userRetrieved) {
    const newSecret = twofactor.generateSecret({
      name: "MSPR",
      account: user.displayName,
    });
    const data = {
      name: user.displayName,
      secret: newSecret.secret,
      uri: newSecret.uri,
      qr: newSecret.qr,
    };
    userRetrieved = await saveUser(db, data);

    // first time connection, send the link for setup 2FA with google authenticator
    // we use a qr code to add into google authenticator
    return res.json({
      user,
      id: userRetrieved.id,
      twoFAInfo: userRetrieved,
      twoFAFirstTime: true,
    });
  }

  res.json({ user, id: userRetrieved.id, twoFAInfo: userRetrieved });
});

app.get("/verify/token/:userId/:token", async (req, res) => {
  const userId = req.params.userId;
  const token = req.params.token;
  const user = await getUserById(db, userId);
  const data = twofactor.verifyToken(user.secret, token);

  if (data == null)
    return res.status(401).json({ message: "Ce token n'existe pas" });

  if (data.delta == 0) return res.json({ message: "Connecté avec succès" });

  res.status(401).json({ message: "Vérifiez que Votre Token n'a pas expiré" });
});

// Generate Manually tokens
// app.get("/token", (req, res) => {
//   const newToken = twofactor.generateToken(newSecret.secret);
//   console.log(newToken);
//   res.json(newToken);
// });

// 404
app.use((req, res) => {
  res.status(404).json({
    error: "Page non trouvé",
  });
});

/*const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server running in port " + PORT);
});*/

const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('localhost.key'),
  cert: fs.readFileSync('localhost.crt')
  
};

https.createServer(options, function (req, res) {
  res.writeHead(200);
  res.end("hello world\n");
}).listen(3000);
