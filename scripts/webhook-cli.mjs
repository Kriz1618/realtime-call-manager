import { randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline/promises';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(repositoryRoot, '.env');
const requireFromApi = createRequire(resolve(repositoryRoot, 'apps/api/package.json'));
const { isValidPhoneNumber } = requireFromApi('libphonenumber-js');

if (existsSync(envFile)) process.loadEnvFile(envFile);

const terminal = createInterface({ input: process.stdin, output: process.stdout });

function randomPhoneNumber() {
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const nationalNumber = `3${randomInt(0, 1_000_000_000).toString().padStart(9, '0')}`;
    const phoneNumber = `+57${nationalNumber}`;
    if (isValidPhoneNumber(phoneNumber)) return phoneNumber;
  }

  throw new Error('No se pudo generar un número móvil colombiano válido.');
}

function createPayload(phoneNumber = randomPhoneNumber()) {
  return {
    callId: `call-${randomUUID()}`,
    phoneNumber,
    agent: `agente-${randomInt(1, 100).toString().padStart(2, '0')}`,
    durationSeconds: randomInt(0, 3601),
    recordingUrl: 'http://127.0.0.1:5173/sample.mp3',
  };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function getWebhookConfig() {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) throw new Error('Falta WEBHOOK_SECRET en el entorno o en el archivo .env raíz.');

  const baseUrl = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return { secret, url: `${baseUrl}/webhooks/calls` };
}

async function askCount() {
  while (true) {
    const answer = await terminal.question('¿Cuántos eventos quieres generar? ');
    const count = Number(answer);
    if (Number.isSafeInteger(count) && count > 0) return count;
    console.log('Ingresa un entero positivo.');
  }
}

async function main() {
  const requestedCount = await askCount();
  const action = await terminal.question('¿Qué deseas hacer? [1] Generar curl [2] Enviar eventos: ');
  if (action !== '1' && action !== '2') throw new Error('Selecciona 1 para generar curl o 2 para enviar eventos.');

  const duplicateAnswer = await terminal.question('¿Repetir el mismo evento para probar idempotencia? [s/N] ');
  const repeatSameEvent = ['s', 'si', 'sí'].includes(duplicateAnswer.trim().toLowerCase());
  const count = repeatSameEvent ? Math.max(2, requestedCount) : requestedCount;
  if (count !== requestedCount) {
    console.log('Para probar idempotencia se enviarán al menos 2 solicitudes del mismo evento.');
  }

  let samePhone = true;
  let sharedPhoneNumber;
  let payloads;

  if (repeatSameEvent) {
    const payload = createPayload();
    payloads = Array.from({ length: count }, () => payload);
  } else {
    const samePhoneAnswer = await terminal.question('¿Usar el mismo número para todos? [s/N] ');
    samePhone = ['s', 'si', 'sí'].includes(samePhoneAnswer.trim().toLowerCase());
    sharedPhoneNumber = samePhone ? randomPhoneNumber() : undefined;
    payloads = Array.from({ length: count }, () => createPayload(sharedPhoneNumber));
  }

  const { secret, url } = getWebhookConfig();

  if (action === '1') {
    for (const payload of payloads) {
      const body = JSON.stringify(payload);
      console.log(
        `curl -sS -X POST ${shellQuote(url)} -H 'Content-Type: application/json' -H ${shellQuote(`X-Webhook-Secret: ${secret}`)} -d ${shellQuote(body)}`,
      );
    }
    return;
  }

  const testDescription = repeatSameEvent
    ? `repitiendo callId ${payloads[0].callId}`
    : samePhone
      ? `desde ${sharedPhoneNumber}`
      : 'con números aleatorios';
  console.log(`Enviando ${count} evento(s) a ${url}, ${testDescription}`);
  for (const [index, payload] of payloads.entries()) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': secret,
      },
      body: JSON.stringify(payload),
    });
    const responseBody = await response.text();

    if (!response.ok) {
      throw new Error(`Evento ${index + 1}/${count}: HTTP ${response.status}: ${responseBody}`);
    }

    const result = JSON.parse(responseBody);
    console.log(`${index + 1}/${count}: HTTP ${response.status}, duplicated=${result.duplicated}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  terminal.close();
}
