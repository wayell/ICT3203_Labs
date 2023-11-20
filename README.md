# Environment Setup

## Pre-requisites

- [Node.js](https://nodejs.org/en/download/current)
- [Environment Variables](https://drive.google.com/drive/folders/1QeBQyGiHBhnptG59HhXoh0zVKVI2jzh3?usp=sharing)

##### Note: rename both env files to .env and place into their respective folders (services/backend or services/frontend)

## Running the App On 2 Terminals 
### Terminal 1:

##### From root directory:
```
cd services/backend && npm install
```
##### In backend folder:
```
npm start
```

### Terminal 2:
##### From root directory:
```
cd services/frontend && npm install
```
##### In frontend folder:
```
npm start
test
```

## Folder Structure
```
ict3x03-web-app
├─ Jenkinsfile-dev
├─ Jenkinsfile-prod
├─ jest.config.js
├─ README.md
├─ services
│  ├─ backend
│  │  ├─ .env
│  │  ├─ breached_passwords.txt
│  │  ├─ Dockerfile.dev
│  │  ├─ Dockerfile.prod
│  │  ├─ index.js
│  │  ├─ logs.log
│  │  ├─ models
│  │  │  ├─ model_bankaccount.js
│  │  │  ├─ model_log.js
│  │  │  ├─ model_otp.js
│  │  │  ├─ model_token.js
│  │  │  ├─ model_transaction.js
│  │  │  └─ model_user.js
│  │  ├─ package-lock.json
│  │  ├─ package.json
│  │  ├─ routes
│  │  │  ├─ bankaccounts.js
│  │  │  ├─ middleware.js
│  │  │  ├─ transactions.js
│  │  │  └─ users.js
│  │  ├─ sample_data
│  │  │  ├─ insertall.bat
│  │  │  ├─ mongoimport.exe
│  │  │  ├─ sample_bankaccounts.json
│  │  │  ├─ sample_data_fake
│  │  │  │  ├─ sample_all_data.json
│  │  │  │  ├─ sample_clients.json
│  │  │  │  ├─ sample_contracts.json
│  │  │  │  ├─ sample_devices.json
│  │  │  │  └─ sample_jobs.json
│  │  │  ├─ sample_transactions.json
│  │  │  └─ sample_users.json
│  │  ├─ services
│  │  │  ├─ database_handler.js
│  │  │  ├─ email_handler.js
│  │  │  ├─ jwt_handler.js
│  │  │  ├─ log_handler.js
│  │  │  ├─ otp_handler.js
│  │  │  ├─ socket_handler.js
│  │  │  └─ user_handler.js
│  │  └─ tests
│  │     ├─ 1_registration.test.js
│  │     ├─ 2_login.test.js
│  │     ├─ 3_middleware.test.js
│  │     ├─ 4_jwt_handler.test.js
│  │     ├─ 5_otp_handler.test.js
│  │     └─ 6_user_handler.test.js
│  └─ frontend
│     ├─ .env
│     ├─ Dockerfile.dev
│     ├─ Dockerfile.prod
│     ├─ package-lock.json
│     ├─ package.json
│     ├─ public
│     │  ├─ favicon.ico
│     │  ├─ index.html
│     │  ├─ Logo.webp
│     │  ├─ logo192.png
│     │  ├─ logo512.png
│     │  ├─ manifest.json
│     │  ├─ profileIcon.webp
│     │  └─ robots.txt
│     ├─ README.md
│     ├─ src
│     │  ├─ App.css
│     │  ├─ App.js
│     │  ├─ Components
│     │  │  ├─ AppNav.js
│     │  │  └─ PrivateRoute.js
│     │  ├─ Home
│     │  │  ├─ ChartCurrency.js
│     │  │  └─ Home.js
│     │  ├─ index.css
│     │  ├─ index.js
│     │  ├─ Landing
│     │  │  └─ Landing.js
│     │  ├─ Services
│     │  │  ├─ EmailService.js
│     │  │  ├─ MySocket.js
│     │  │  └─ VerifyUser.js
│     │  ├─ Transactions
│     │  │  └─ Transactions.js
│     │  ├─ Transfer
│     │  │  └─ Transfer.js
│     │  └─ User
│     │     ├─ ChangePassword.js
│     │     ├─ EmailVerificationResult.js
│     │     ├─ ForgetPassword.js
│     │     ├─ PREmailVerificationResult.js
│     │     ├─ Profile.css
│     │     ├─ Profile.js
│     │     └─ Register.js
│     └─ __test__
│        ├─ forgot_password-test.js
│        ├─ Landing-test.js
│        └─ Sign_up-test.js
└─ suppressions.xml
 ```
