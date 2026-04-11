# AI Inbox Guardian

AI-powered phishing detection system that analyzes emails and SMS messages, assigns risk scores, explains threats, and organizes messages into categories.

## Features

- **Gmail & Outlook Integration** — Connect your real email accounts via OAuth2 and import messages
- **AI-Powered Analysis** — Each message is analyzed by GPT-4o-mini for phishing, scam, and threat detection
- **Risk Scoring** — 0–100 risk scores with clear explanations
- **Smart Categorization** — Messages classified as phishing, scam, marketing, or legit
- **Severity Levels** — Color-coded as safe (green), suspicious (yellow), or dangerous (red)
- **Grandma Mode** — Large, clear scam warnings for less tech-savvy users
- **User Actions** — Mark safe, block sender, move to spam
- **Add Custom Messages** — Paste any email or SMS to analyze it in real-time

## Tech Stack

| Layer    | Technology         |
|----------|--------------------|
| Frontend | Next.js + Tailwind CSS |
| Backend  | FastAPI (Python)   |
| AI       | OpenAI GPT-4o-mini |
| Email    | Gmail API + Microsoft Graph API |
| Storage  | In-memory          |

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API key
- (Optional) Google OAuth credentials for Gmail
- (Optional) Microsoft Azure app registration for Outlook

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — see the sections below for each service
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

---

## Connecting Email Accounts

The app works out of the box with 12 demo messages. To connect **real** email accounts, follow the setup below.

### Gmail (Google)

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a project (or use an existing one)
3. Click **Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Add **Authorized redirect URI**: `http://localhost:8000/oauth/gmail/callback`
6. Copy the Client ID and Client Secret
7. Go to [API Library](https://console.cloud.google.com/apis/library/gmail.googleapis.com) and **enable the Gmail API**
8. Add your values to `backend/.env`:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Outlook (Microsoft)

1. Go to [Azure App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. Click **New registration**
3. Name: `AI Inbox Guardian` (or anything)
4. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
5. Redirect URI → **Web**: `http://localhost:8000/oauth/outlook/callback`
6. Under **API permissions**, add: **Microsoft Graph → Mail.Read** (delegated)
7. Under **Certificates & secrets**, create a new **client secret** and copy the value
8. Add your values to `backend/.env`:

```
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
```

### Using the Connection

Once credentials are set:
1. Start the backend and frontend
2. Click **Connect Gmail** or **Connect Outlook** in the dashboard header
3. You'll be redirected to sign in and grant permission
4. After granting access, you'll be redirected back to the dashboard with your emails imported
5. Use the **refresh** button next to a connected account to fetch new emails
6. Click the **X** button to disconnect an account

---

## API Endpoints

| Method | Endpoint                      | Description                  |
|--------|-------------------------------|------------------------------|
| GET    | `/messages`                   | List all messages            |
| GET    | `/messages/{id}`              | Get single message           |
| POST   | `/messages`                   | Add new message              |
| POST   | `/analyze-message`            | Analyze arbitrary text       |
| POST   | `/messages/{id}/analyze`      | Analyze a stored message     |
| POST   | `/analyze-all`                | Analyze all messages at once |
| POST   | `/messages/{id}/action`       | Mark safe / block / spam     |
| GET    | `/connections`                | Check connected providers    |
| GET    | `/oauth/gmail/authorize`      | Start Gmail OAuth flow       |
| GET    | `/oauth/gmail/callback`       | Gmail OAuth callback         |
| GET    | `/oauth/outlook/authorize`    | Start Outlook OAuth flow     |
| GET    | `/oauth/outlook/callback`     | Outlook OAuth callback       |
| POST   | `/fetch-emails/{provider}`    | Re-fetch emails from provider|
| POST   | `/disconnect/{provider}`      | Disconnect a provider        |

## Demo Walkthrough (2–3 minutes)

1. Open the dashboard — see 12 preloaded messages
2. Click **Scan All Messages** — watch AI analyze every message in real time
3. Browse the inbox — dangerous messages are red, safe are green
4. Click a phishing email — see the risk score, category, and AI explanation
5. Toggle **Grandma Mode** — see the large scam warning banner
6. Connect your Gmail or Outlook to import real emails
7. Try adding your own message with the **Add Message** button
8. Use filters to show only dangerous or suspicious messages
