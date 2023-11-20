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
        const linkElement = await driver.findElement(By.linkText("Sign up for an Account"));
        await linkElement.click();

        const sign_up_page = await driver.findElement(By.id('next_button'));
        if (sign_up_page) {
            console.log('Sign up page renders successfully.');
        } else {
            console.log('Sign up page not renders successfully.');
            junitReport.ele('testcase', { name: 'Sign-up Page Rendering', status: 'failed' })
                .ele('error', { message: 'Sign-up page not rendered successfully' });
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
        const reportFilePath = path.join(__dirname, 'junit-signup-report.xml');
        fs.writeFileSync(reportFilePath, junitXml);

        console.log(`JUnit XML report saved to ${reportFilePath}`);
    }
})();