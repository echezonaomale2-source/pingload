# Pingload

A production-ready VTU and bill payment mobile application for Nigeria. Buy airtime, data, pay electricity/TV bills, fund wallet, and manage transactions — all in one premium fintech experience.

## Project Structure

```
ping/
├── README.md
├── backend/                    # Node.js + Express API
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   └── src/
│       ├── config/
│       │   ├── db.js           # MongoDB connection
│       │   └── env.js          # Environment validation
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── walletController.js
│       │   ├── vtuController.js
│       │   ├── transactionController.js
│       │   ├── notificationController.js
│       │   ├── referralController.js
│       │   └── webhookController.js
│       ├── middleware/
│       │   ├── auth.js         # JWT verification
│       │   ├── rateLimiter.js
│       │   ├── validate.js     # Input validation
│       │   └── errorHandler.js
│       ├── models/
│       │   ├── User.js
│       │   ├── Transaction.js
│       │   ├── Wallet.js
│       │   ├── Notification.js
│       │   └── Referral.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── walletRoutes.js
│       │   ├── vtuRoutes.js
│       │   ├── transactionRoutes.js
│       │   ├── notificationRoutes.js
│       │   ├── referralRoutes.js
│       │   └── webhookRoutes.js
│       ├── services/
│       │   ├── termiiService.js    # OTP via Termii
│       │   ├── paystackService.js  # Payment gateway
│       │   └── vtpassService.js  # VTU provider
│       └── utils/
│           ├── generateReference.js
│           ├── generateReferralCode.js
│           └── sendEmail.js
└── mobile/                     # React Native + Expo app
    ├── package.json
    ├── app.json
    ├── App.js
    ├── babel.config.js
    └── src/
        ├── assets/
        ├── components/
        │   ├── BalanceCard.js
        │   ├── ServiceGrid.js
        │   ├── TransactionItem.js
        │   ├── PromoBanner.js
        │   ├── LoadingSpinner.js
        │   └── CustomButton.js
        ├── context/
        │   ├── AuthContext.js
        │   └── ThemeContext.js
        ├── navigation/
        │   ├── AppNavigator.js
        │   ├── AuthNavigator.js
        │   └── TabNavigator.js
        ├── screens/
        │   ├── SplashScreen.js
        │   ├── onboarding/
        │   ├── auth/
        │   ├── home/
        │   ├── wallet/
        │   ├── services/
        │   ├── history/
        │   ├── notifications/
        │   ├── referral/
        │   ├── support/
        │   └── profile/
        ├── services/
        │   ├── api.js
        │   ├── authService.js
        │   ├── walletService.js
        │   ├── vtuService.js
        │   └── transactionService.js
        ├── utils/
        │   ├── colors.js
        │   ├── constants.js
        │   └── formatters.js
        └── theme/
            └── theme.js
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React Native, Expo, React Navigation, React Native Paper, React Query, Axios |
| Backend | Node.js, Express.js, JWT |
| Database | MongoDB Atlas, Mongoose |
| OTP | Termii Verify |
| Payments | Paystack |
| VTU | VTpass |
| Hosting | Render |

## Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account
- Expo CLI (`npm install -g expo-cli`)
- Android Studio / Xcode (for device builds)
- API keys: Termii, Paystack, VTpass

## Setup Instructions

### 1. Clone & Install

```bash
cd ping

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials

# Mobile
cd ../mobile
npm install
```

### 2. Environment Variables (Backend)

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pingload
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Termii OTP
TERMII_API_KEY=your-termii-api-key
TERMII_SENDER_ID=Pingload

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx

# VTpass
VTPASS_ENV=live
VTPASS_API_KEY=your-vtpass-api-key
VTPASS_PUBLIC_KEY=your-vtpass-public-key
VTPASS_SECRET_KEY=your-vtpass-secret-key

# App
FRONTEND_URL=http://localhost:8081
REFERRAL_BONUS=100
```

### 3. Mobile API Configuration

Update `mobile/src/utils/constants.js`:

```js
export const API_BASE_URL = 'http://YOUR_IP:5000/api'; // Use your machine IP for device testing
export const PAYSTACK_PUBLIC_KEY = 'pk_test_xxx';
```

### 4. Run Backend

```bash
cd backend
npm run dev
```

Server runs at `http://localhost:5000`

### 5. Run Mobile App

```bash
cd mobile
npx expo start
```

Scan QR code with Expo Go or press `a` for Android emulator.

### 6. Deploy to Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repo
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add all environment variables from `.env`
7. Set Paystack webhook URL: `https://your-app.onrender.com/api/webhooks/paystack`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP code |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/forgot-password` | Request password reset OTP |
| POST | `/api/auth/reset-password` | Reset password with OTP |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet/balance` | Get wallet balance |
| POST | `/api/wallet/fund` | Initialize Paystack funding |
| GET | `/api/wallet/verify/:reference` | Verify payment |

### VTU Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vtu/airtime` | Buy airtime |
| POST | `/api/vtu/data` | Buy data |
| GET | `/api/vtu/data-plans/:network` | Fetch data plans |
| POST | `/api/vtu/electricity` | Pay electricity bill |
| POST | `/api/vtu/tv` | Pay TV subscription |
| POST | `/api/vtu/education` | Buy education pins |
| POST | `/api/vtu/betting` | Fund betting wallet |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (filterable) |
| GET | `/api/transactions/:id` | Get transaction details |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/:id/read` | Mark as read |

### Referrals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/referrals` | Get referral stats |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/paystack` | Paystack payment webhook |

## Brand Colors

| Color | Hex |
|-------|-----|
| Primary Blue | `#0057D9` |
| Orange | `#FF7A00` |
| Gray | `#6B7280` |
| White | `#FFFFFF` |

## Security Features

- JWT authentication with bcrypt password hashing
- Rate limiting on auth endpoints
- Helmet security headers
- CORS configuration
- Input validation with express-validator
- Paystack webhook signature verification
- Secure environment variable management

## License

MIT
