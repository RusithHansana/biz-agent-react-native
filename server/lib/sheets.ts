import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';

import type { AppendBookingInput, BookingSlot } from '../types/booking';

const REQUIRED_HEADERS = ['Timestamp', 'Name', 'Email', 'ServiceType', 'Date', 'Time', 'Status'] as const;

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

function readServiceAccountCredentials(): ServiceAccountCredentials {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!raw || raw.trim().length === 0) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY must be valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY must be a JSON object.');
  }

  const candidate = parsed as Record<string, unknown>;
  const clientEmail = candidate.client_email;
  const privateKey = candidate.private_key;

  if (typeof clientEmail !== 'string' || clientEmail.trim().length === 0) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY.client_email is required.');
  }

  if (typeof privateKey !== 'string' || privateKey.trim().length === 0) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY.private_key is required.');
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
  };
}

function readSheetId(): string {
  const value = process.env.SHEET_ID?.trim();
  if (!value) {
    throw new Error('Missing SHEET_ID.');
  }

  return value;
}

function readOptionalSheetName(): string | null {
  const value = process.env.SHEET_NAME?.trim();
  return value && value.length > 0 ? value : null;
}

async function ensureHeaderRow(sheet: GoogleSpreadsheetWorksheet): Promise<void> {
  let headerValues: string[] = [];
  try {
    await sheet.loadHeaderRow();
    headerValues = sheet.headerValues;
  } catch (error) {
    // If the sheet is empty, loadHeaderRow throws an error.
  }

  const hasAllHeaders = REQUIRED_HEADERS.every((header, index) => headerValues[index] === header);
  if (hasAllHeaders && headerValues.length >= REQUIRED_HEADERS.length) {
    return;
  }

  if (sheet.rowCount > 0 && headerValues.length > 0 && !hasAllHeaders) {
    throw new Error('Sheet exists with data but wrong headers. Please use an empty sheet or correct headers.');
  }

  await sheet.setHeaderRow([...REQUIRED_HEADERS]);
}

export async function getBookingsSheet(): Promise<GoogleSpreadsheetWorksheet> {
  const credentials = readServiceAccountCredentials();
  const sheetId = readSheetId();
  const preferredSheetName = readOptionalSheetName();

  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key.replace(/\\n/g, '\n').replace(/"/g, '').trim(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const document = new GoogleSpreadsheet(sheetId, auth);

  await document.loadInfo();

  const fallbackFirstSheet = document.sheetsByIndex[0];
  const selectedSheet = preferredSheetName
    ? document.sheetsByTitle[preferredSheetName] ?? fallbackFirstSheet
    : fallbackFirstSheet;

  if (!selectedSheet) {
    throw new Error('No worksheet available in configured spreadsheet.');
  }

  await ensureHeaderRow(selectedSheet);

  return selectedSheet;
}

export async function findConflict(slot: BookingSlot): Promise<boolean> {
  const sheet = await getBookingsSheet();
  
  // Limiting the fetch to the last 1000 rows to avoid catastrophic in-memory load
  const limit = 1000;
  const offset = Math.max(0, sheet.rowCount - limit - 1);
  
  const rows = await sheet.getRows<Record<string, string>>({ offset, limit });

  return rows.some((row) => {
    const date = row.get('Date');
    const time = row.get('Time');
    return date === slot.date && time === slot.time;
  });
}

export async function appendBookingRow(input: AppendBookingInput): Promise<void> {
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const sheet = await getBookingsSheet();

      await sheet.addRow({
        Timestamp: new Date().toISOString(),
        Name: input.name,
        Email: input.email,
        ServiceType: input.serviceType,
        Date: input.date,
        Time: input.time,
        Status: 'Confirmed',
      });
      return;
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) {
        throw error;
      }
      // Simple exponential backoff
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}