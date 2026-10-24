import { config } from 'dotenv';

config({ path: '../../.env', quiet: true });

const { DATABASE_URL_TEST, REDIS_URL_TEST } = process.env;
if (!DATABASE_URL_TEST || !REDIS_URL_TEST) {
  throw new Error('DATABASE_URL_TEST and REDIS_URL_TEST are required to run integration tests');
}
if (!new URL(DATABASE_URL_TEST).pathname.endsWith('_test')) {
  throw new Error('DATABASE_URL_TEST must point to a database whose name ends with _test');
}
if (!/\/[1-9]\d*$/.test(REDIS_URL_TEST)) {
  throw new Error('REDIS_URL_TEST must select a non-default Redis database (e.g. /1)');
}

// Runtime variables win over the .env file in @nestjs/config, so the app under test
// connects to the test database and never to the development one.
process.env.DATABASE_URL = DATABASE_URL_TEST;
process.env.REDIS_URL = REDIS_URL_TEST;
