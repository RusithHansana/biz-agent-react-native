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
  const headerValues = sheet.headerValues;

  const hasAllHeaders = REQUIRED_HEADERS.every((header, index) => headerValues[index] === header);
  if (hasAllHeaders && headerValues.length >= REQUIRED_HEADERS.length) {
    return;
  }

  await sheet.setHeaderRow([...REQUIRED_HEADERS]);
}

export async function getBookingsSheet(): Promise<GoogleSpreadsheetWorksheet> {
  const credentials = readServiceAccountCredentials();
  const sheetId = readSheetId();
  const preferredSheetName = readOptionalSheetName();

  const document = new GoogleSpreadsheet(sheetId, {
    auth: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  });

  await document.loadInfo();

  const fallbackFirstSheet = document.sheetsByIndex[0];
  const selectedSheet = preferredSheetName
    ? document.sheetsByTitle[preferredSheetName] ?? fallbackFirstSheet
    : fallbackFirstSheet;

  if (!selectedSheet) {
    throw new Error('No worksheet available in configured spreadsheet.');
  }

  await selectedSheet.loadHeaderRow();
  await ensureHeaderRow(selectedSheet);

  return selectedSheet;
}

export async function findConflict(slot: BookingSlot): Promise<boolean> {
  const sheet = await getBookingsSheet();
  const rows = await sheet.getRows<Record<string, string>>();

  return rows.some((row) => {
    const date = row.get('Date');
    const time = row.get('Time');
    return date === slot.date && time === slot.time;
  });
}

export async function appendBookingRow(input: AppendBookingInput): Promise<void> {
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
}