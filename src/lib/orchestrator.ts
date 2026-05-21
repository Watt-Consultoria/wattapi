import retry from 'async-retry';

async function waitForAllServices() {
  await waitForWebServer();

  async function waitForWebServer() {
    process.stdout.write('Waiting for web server to be ready');

    await retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      process.stdout.write('.');
      const response = await fetch('http://localhost:3000/status');

      if (response.status !== 200) {
        throw Error();
      }
      process.stdout.write(' Web server is ready!\n');
    }
  }
}

export default {
  waitForAllServices,
};
