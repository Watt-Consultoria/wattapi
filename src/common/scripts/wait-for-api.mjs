import { exec } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({
  path: '.env.development',
});

function checkAPI() {
  exec(`curl --silent --fail http://localhost:3001/status`, handleReturn);

  function handleReturn(error, stdout) {
    if (error || !stdout.includes('opened_connections')) {
      process.stdout.write('.');
      setTimeout(checkAPI, 500);
      return;
    }

    console.log('\n🟢 API is ready\n');
  }
}

process.stdout.write('🔴 Awaiting for API');
checkAPI();
