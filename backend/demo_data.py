from datetime import datetime, timedelta


def get_demo_messages():
    now = datetime.now()
    return [
        # --- PayPal campaign (3 messages) ---
        {
            "id": "msg-001",
            "sender": "paypal-security@securemail.info",
            "subject": "URGENT: Your PayPal Account Has Been Limited",
            "body": "Dear PayPal User,\n\nWe've detected suspicious activity on your PayPal account. Your account access has been limited until you verify your information.\n\nClick here to restore access:\nhttp://paypal-verify-account.xyz/restore\n\nYou must complete verification within 24 hours or your funds will be frozen permanently.\n\nPayPal Security Center",
            "timestamp": (now - timedelta(minutes=15)).isoformat(),
            "type": "email",
            "auth": {"spf": "fail", "dkim": "fail", "dmarc": "fail"},
        },
        {
            "id": "msg-002",
            "sender": "support@paypal-notifications.net",
            "subject": "PayPal: Unusual Sign-in Activity Detected",
            "body": "Hello,\n\nWe noticed a sign-in to your PayPal account from an unrecognized device in Russia.\n\nIf this wasn't you, secure your account immediately:\nhttp://paypal-secure-login.tk/verify\n\nIgnoring this may result in unauthorized transactions.\n\nPayPal Trust & Safety",
            "timestamp": (now - timedelta(hours=3)).isoformat(),
            "type": "email",
            "auth": {"spf": "fail", "dkim": "fail", "dmarc": "fail"},
        },
        {
            "id": "msg-003",
            "sender": "noreply@paypal-billing.info",
            "subject": "PayPal Invoice #PP-28491 — Payment of $499.99",
            "body": "You sent a payment of $499.99 to Electronics Wholesale Ltd.\n\nTransaction ID: 8KF39201JN\nDate: Today\n\nIf you did not authorize this payment, dispute it immediately:\nhttp://paypal-disputes.xyz/claim\n\nYou have 24 hours to file a dispute before the transaction is finalized.",
            "timestamp": (now - timedelta(hours=6)).isoformat(),
            "type": "email",
            "auth": {"spf": "fail", "dkim": "none", "dmarc": "fail"},
        },
        # --- Bank of America phishing ---
        {
            "id": "msg-004",
            "sender": "security@bankofamerica-verify.com",
            "subject": "URGENT: Your Bank Account Has Been Compromised",
            "body": "Dear Customer,\n\nWe have detected unusual activity on your Bank of America account. Your account has been temporarily suspended for your protection.\n\nPlease click the link below to verify your identity and restore access immediately:\nhttp://boa-secure-verify.xyz/login\n\nFailure to verify within 24 hours will result in permanent account closure.\n\nBank of America Security Team",
            "timestamp": (now - timedelta(minutes=30)).isoformat(),
            "type": "email",
            "auth": {"spf": "fail", "dkim": "fail", "dmarc": "fail"},
        },
        # --- Fake delivery (FedEx/UPS campaign) ---
        {
            "id": "msg-005",
            "sender": "+1-555-0342",
            "subject": "SMS Message",
            "body": "FedEx: Your package (tracking: 7291038475) could not be delivered. Reschedule delivery and pay $1.99 redelivery fee: http://fedex-redeliver.info/pay",
            "timestamp": (now - timedelta(hours=2)).isoformat(),
            "type": "sms",
        },
        {
            "id": "msg-006",
            "sender": "+1-555-0198",
            "subject": "SMS Message",
            "body": "UPS: We attempted delivery of your package but no one was home. Schedule redelivery or it will be returned: http://ups-redelivery.net/schedule",
            "timestamp": (now - timedelta(hours=8)).isoformat(),
            "type": "sms",
        },
        # --- IRS/Tax scam SMS campaign ---
        {
            "id": "msg-007",
            "sender": "+1-555-0876",
            "subject": "SMS Message",
            "body": "IRS NOTICE: You have an outstanding tax debt of $4,329. Immediate payment required to avoid arrest warrant. Call 1-800-555-0199 or visit http://irs-payment-portal.net to pay now.",
            "timestamp": (now - timedelta(hours=4)).isoformat(),
            "type": "sms",
        },
        {
            "id": "msg-008",
            "sender": "+1-555-0412",
            "subject": "SMS Message",
            "body": "FINAL WARNING: IRS case #29481 filed against you. Pay $3,215 in back taxes within 4 hours to avoid legal proceedings. Payment link: http://irs-settle-now.com/pay",
            "timestamp": (now - timedelta(hours=9)).isoformat(),
            "type": "sms",
        },
        # --- Microsoft password reset scam ---
        {
            "id": "msg-009",
            "sender": "it-support@microsoft-helpdesk.net",
            "subject": "Password Reset Required — Immediate Action Needed",
            "body": "Your Microsoft 365 password will expire in 2 hours.\n\nTo avoid losing access to your email and files, please reset your password immediately using the secure link below:\n\nhttp://microsoft365-reset.tk/password-update\n\nIf you did not request this, please reset anyway for security purposes.\n\nMicrosoft IT Support",
            "timestamp": (now - timedelta(hours=1)).isoformat(),
            "type": "email",
            "auth": {"spf": "fail", "dkim": "fail", "dmarc": "none"},
        },
        # --- Walmart gift card scam ---
        {
            "id": "msg-010",
            "sender": "+1-555-0567",
            "subject": "SMS Message",
            "body": "CONGRATS! You've won a $1000 Walmart gift card! Claim NOW before it expires: http://bit.ly/free-walmart-gc Reply STOP to opt out.",
            "timestamp": (now - timedelta(hours=5)).isoformat(),
            "type": "sms",
        },
        # --- CEO impersonation / invoice fraud ---
        {
            "id": "msg-011",
            "sender": "ceo.johnson@company-corp.net",
            "subject": "Wire Transfer Needed — Confidential",
            "body": "Hi,\n\nI need you to process an urgent wire transfer of $12,500 to our new vendor. This is time-sensitive and confidential — please don't discuss with anyone else.\n\nBank: First National\nAccount: 4829103847\nRouting: 021000021\n\nPlease confirm once completed.\n\nBest,\nJohn (sent from mobile)",
            "timestamp": (now - timedelta(hours=2, minutes=30)).isoformat(),
            "type": "email",
            "auth": {"spf": "pass", "dkim": "none", "dmarc": "none"},
        },
        # --- Legitimate emails ---
        {
            "id": "msg-012",
            "sender": "sarah.johnson@company.com",
            "subject": "Q3 Marketing Report — Review Needed",
            "body": "Hi team,\n\nI've attached the Q3 marketing report for your review. Key highlights:\n\n- Website traffic up 23% QoQ\n- Email campaign CTR improved to 4.2%\n- Social media engagement doubled\n\nPlease review and share feedback by Friday. We'll discuss in our weekly sync.\n\nBest,\nSarah",
            "timestamp": (now - timedelta(hours=3, minutes=15)).isoformat(),
            "type": "email",
            "auth": {"spf": "pass", "dkim": "pass", "dmarc": "pass"},
        },
        {
            "id": "msg-013",
            "sender": "david.chen@company.com",
            "subject": "Lunch tomorrow?",
            "body": "Hey!\n\nWant to grab lunch tomorrow at that new Thai place on 5th? I heard their pad thai is amazing.\n\nLet me know if 12:30 works for you.\n\nDave",
            "timestamp": (now - timedelta(hours=7)).isoformat(),
            "type": "email",
            "auth": {"spf": "pass", "dkim": "pass", "dmarc": "pass"},
        },
        {
            "id": "msg-014",
            "sender": "hr@company.com",
            "subject": "Updated PTO Policy — Please Review",
            "body": "Hi all,\n\nWe've updated our PTO policy effective May 1st. Key changes:\n\n- PTO increased from 15 to 20 days annually\n- Rollover limit increased to 5 days\n- New mental health days (3 per year)\n\nFull policy document is available on the HR portal. Please review and acknowledge by April 25th.\n\nBest,\nHR Team",
            "timestamp": (now - timedelta(hours=10)).isoformat(),
            "type": "email",
            "auth": {"spf": "pass", "dkim": "pass", "dmarc": "pass"},
        },
        {
            "id": "msg-015",
            "sender": "noreply@amazon.com",
            "subject": "Your order #112-9374625-3847261 has shipped",
            "body": "Hello,\n\nGreat news! Your order has shipped and is on its way.\n\nOrder #112-9374625-3847261\nEstimated delivery: Thursday, April 15\n\nTrack your package:\nhttps://www.amazon.com/gp/your-orders\n\nThank you for shopping with Amazon.",
            "timestamp": (now - timedelta(hours=5, minutes=30)).isoformat(),
            "type": "email",
            "auth": {"spf": "pass", "dkim": "pass", "dmarc": "pass"},
        },
        # --- Marketing ---
        {
            "id": "msg-016",
            "sender": "newsletter@techcrunch.com",
            "subject": "TechCrunch Daily: AI Startups Raise Record Funding",
            "body": "Good morning!\n\nToday's top stories:\n\n1. AI Startups Raise Record $12B in Q1 2026\n2. Apple Unveils New AR Glasses at Spring Event\n3. Congress Debates New Data Privacy Legislation\n4. Review: The Best Laptops for Developers in 2026\n\nRead more at techcrunch.com\n\nUnsubscribe: https://techcrunch.com/unsubscribe",
            "timestamp": (now - timedelta(hours=11)).isoformat(),
            "type": "email",
            "auth": {"spf": "pass", "dkim": "pass", "dmarc": "pass"},
        },
        {
            "id": "msg-017",
            "sender": "promo@shopify-deals.com",
            "subject": "FLASH SALE: 70% Off Everything — Today Only!",
            "body": "MEGA FLASH SALE!\n\n70% OFF EVERYTHING for the next 12 hours only!\n\nShop now and save big on:\n- Electronics\n- Fashion\n- Home & Garden\n\nUse code: FLASH70 at checkout\n\nShop Now: https://shopify-deals.com/flash-sale\n\nUnsubscribe | Privacy Policy",
            "timestamp": (now - timedelta(hours=12)).isoformat(),
            "type": "email",
            "auth": {"spf": "pass", "dkim": "pass", "dmarc": "none"},
        },
        # --- Netflix phishing ---
        {
            "id": "msg-018",
            "sender": "billing@netflix-account-update.com",
            "subject": "Your Netflix Membership Has Been Suspended",
            "body": "Dear Member,\n\nWe were unable to validate your payment information for your next billing cycle. As a result, your membership has been suspended.\n\nUpdate your payment details within 48 hours to avoid losing access:\nhttp://netflix-billing-update.xyz/payment\n\nNetflix Support Team",
            "timestamp": (now - timedelta(hours=1, minutes=45)).isoformat(),
            "type": "email",
            "auth": {"spf": "fail", "dkim": "fail", "dmarc": "fail"},
        },
    ]
