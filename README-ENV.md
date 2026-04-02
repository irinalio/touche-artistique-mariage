# Environment Variables Setup

This project uses environment variables to securely manage API credentials.

## Files

- **`.env`** - Contains your actual credentials (NEVER commit this to git)
- **`.env.example`** - Template showing what variables are needed

## Current Configuration

The `.env` file is already set up with your credentials:

```
PAYPAL_CLIENT_ID=ASK_NS7p1jvTYGZq-2nKAzbeAXoxufrU4XSzR9MKBkN2GYqXDo8F2JYHgq3b2G-F08_1-DDONh35CvSn
PAYPAL_ENV=sandbox
```

## How to Switch Between Sandbox and Live

### For Testing (Sandbox):
```
PAYPAL_CLIENT_ID=ASK_NS7p1jvTYGZq-2nKAzbeAXoxufrU4XSzR9MKBkN2GYqXDo8F2JYHgq3b2G-F08_1-DDONh35CvSn
PAYPAL_ENV=sandbox
```

### For Production (Live):
```
PAYPAL_CLIENT_ID=AUET1MZ19ElqGvCbS7cidX3h8sdmZsf3ISRXG3OeMhov1yDsXZFE5gn-hHV8peYmOiIb0gqyE9DbiclO
PAYPAL_ENV=production
```

## Security Best Practices

1. **Never commit `.env` to git** - Add it to `.gitignore`
2. **Keep credentials private** - Don't share your `.env` file
3. **Use different credentials** for sandbox and production
4. **Rotate keys** periodically in your PayPal dashboard

## How It Works

1. The server reads `.env` file on startup
2. PayPal Client ID is stored in `process.env.PAYPAL_CLIENT_ID`
3. The frontend fetches config from `/api/paypal-config` endpoint
4. PayPal SDK loads dynamically with the correct credentials

## Testing PayPal

1. Use sandbox mode for testing
2. Create test buyer accounts at: https://developer.paypal.com/dashboard/accounts
3. Test payments without real money
4. Switch to live mode only when ready for production