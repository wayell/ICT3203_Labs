// my-selenium-test.js
const { Builder, By, Key, until } = require('selenium-webdriver');
// const chrome = require('selenium-webdriver/chrome');
const { Options } = require('selenium-webdriver/firefox');
const { create } = require('xmlbuilder');
const fs = require('fs');
const path = require('path');

// const opts = new chrome.Options();
// opts.headless();

(async function runTest() {

  const firefoxOptions = new Options();

  // Set any desired Firefox options (e.g., headless mode)
  firefoxOptions.headless();

  const driver = new Builder()
    // .forBrowser('chrome')
    // .setChromeOptions(opts)
    // .build();
    .forBrowser('firefox')
    .setFirefoxOptions(firefoxOptions)
    .build();

  const junitReport = create('testsuite')
    .att('name', 'Landing Page Test')
    .ele('properties');

  let junitXml;

  try {
    // Navigate to your React application's URL
    await driver.get('http://localhost:3000/');
    // await driver.get('https://www.competent-kapitsa.cloud');

    // You can interact with the React components using Selenium.
    // For example, finding an element and performing actions:
    const login_button = await driver.findElement(By.id('login-button'));

    if (login_button) {
      console.log('Landing page renders successfully.');
    } else {
      console.log('Landing page not renders successfully.');
      junitReport.ele('testcase', { name: 'Landing Page Rendering', status: 'failed' })
        .ele('error', { message: 'Landing page not rendered successfully' });
    }


  } catch (error) {
    if (error.name === 'NoSuchElementError') {
      console.log('Element not found on the page.');
      junitReport.ele('testcase', { name: 'Element Not Found', status: 'failed' })
        .ele('error', { message: 'Element not found on the page' });
    } else {
      console.error('An error occurred:', error);
      junitReport.ele('testcase', { name: 'Test Execution Error', status: 'failed' })
        .ele('error', { message: error.message });
    }
  }
  finally {
    await driver.quit();

    junitXml = junitReport.end({ pretty: true });

    // Save the JUnit XML report to a file
    const reportFilePath = path.join(__dirname, 'junit-landing-report.xml');
    fs.writeFileSync(reportFilePath, junitXml);

    console.log(`JUnit XML report saved to ${reportFilePath}`);
  }
})();