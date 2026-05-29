# Google Sheets Integration Setup Guide 📊

This guide walks you through setting up the Google Sheets API to automatically log orders from your **Three_Hearts Handmades** website directly into a Google Sheet.

---

## Step 1: Create a Google Cloud Project & Enable Sheets API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your Google account.
3. Click on the project dropdown in the top-left menu and click **New Project**. Name it something like `Three-Hearts-Store` and click **Create**.
4. Make sure your new project is selected in the top dropdown.
5. In the top search bar, search for **Google Sheets API**.
6. Select the **Google Sheets API** from the results and click the **Enable** button.

---

## Step 2: Create a Service Account & Download Credentials

1. Go to the **Credentials** page in the left sidebar (under APIs & Services).
2. Click **+ CREATE CREDENTIALS** at the top and select **Service Account**.
3. Fill in the details:
   - **Service account name**: `sheets-logger`
   - **Service account ID**: (automatically generated)
   - Click **CREATE AND CONTINUE**.
4. Under **Grant this service account access to project** (optional), you can leave it blank and click **CONTINUE**.
5. Click **DONE** at the bottom.
6. Now, under the **Service Accounts** list, you will see your new service account. Click on the **Email address** of the service account to open its settings.
7. Go to the **KEYS** tab at the top.
8. Click **ADD KEY** -> **Create new key**.
9. Select **JSON** as the key type and click **CREATE**.
10. A JSON credentials file will automatically download to your computer.

---

## Step 3: Configure Your Codebase

1. Copy the downloaded JSON credentials file into the root folder of your project `f:\Three_hearts`.
2. Rename the file to `google-credentials.json` (or edit the `GOOGLE_APPLICATION_CREDENTIALS` path in your `.env` file to match the downloaded file's name).
3. Open your `.env` file and make sure the key exists:
   ```properties
   GOOGLE_APPLICATION_CREDENTIALS=google-credentials.json
   ```

---

## Step 4: Create a Google Sheet & Connect It

1. Create a new Google Sheet in Google Drive.
2. Share the Google Sheet:
   - Open your downloaded `google-credentials.json` file.
   - Find the `"client_email"` key (it will look like `sheets-logger@your-project-id.iam.gserviceaccount.com`).
   - Copy this email address.
   - Click the **Share** button in the top-right corner of your Google Sheet.
   - Paste the service account email, select **Editor** role, and click **Send** (uncheck "Notify people" if desired).
3. Get the Spreadsheet ID:
   - Copy the spreadsheet ID from the URL of your Google Sheet. The URL looks like:
     `https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J/edit`
   - In this example, the ID is `1A2B3C4D5E6F7G8H9I0J`.
4. Add the spreadsheet ID to your `.env` file:
   ```properties
   SPREADSHEET_ID=1A2B3C4D5E6F7G8H9I0J
   ```

---

## How It Works in the Backend

- On startup or on the first order placement, the server will check if the service credentials are ready.
- If they are ready, it will check if a tab/sheet named **"Orders"** exists in your spreadsheet.
- If **"Orders"** doesn't exist, the backend will automatically create it and set the header row to:
  `Customer Name | Phone Number | Address | Product Model | Quantity | Color | Date & Time`
- If it does exist, it will simply append new order rows to it.
- **Fallback Mode**: If credentials or SPREADSHEET_ID are missing, the server logs orders to a local text file `data/orders_fallback.txt` and continues to work normally. Once setup is complete, new orders will automatically flow to Google Sheets.
