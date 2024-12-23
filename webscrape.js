const { test, expect, chromium } = require("@playwright/test")
const moment= require("moment")

require("dotenv").config();

async function scrollToLoadAllLeads(page) {
  let previousHeight = 0;
  let currentHeight = 0;
  let previousLeadCount = 0;
  let currentLeadCount = 0;
  let previousLeadsData = [];
  let currentLeadsData = [];
  let leadsData = [];
  let scrollAttempts = 0;

  const scrollableContainerSelector = ".ReactVirtualized__Grid";

  do {
    previousHeight = currentHeight;
    previousLeadCount = currentLeadCount;
    previousLeadsData = currentLeadsData;

    // Scroll the container by its height
    await page.evaluate((scrollableContainerSelector) => {
      const container = document.querySelector(scrollableContainerSelector);
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, scrollableContainerSelector);

    await page.waitForTimeout(3000);

    // Get the current scroll height of the container
    currentHeight = await page.evaluate((scrollableContainerSelector) => {
      const container = document.querySelector(scrollableContainerSelector);
      return container ? container.scrollHeight : 0;
    }, scrollableContainerSelector);

    await page.waitForSelector(".list .row", { timeout: 1000000 });
    console.log("Leads container found");

    // Get the current number of leads on the page
    currentLeadCount = await page.evaluate(() => {
      const leads = document.querySelectorAll(".list .row");
      return leads.length;
    });

    // Get the current leads data (for example, text or specific elements)
    currentLeadsData = await page.evaluate(() => {
      const leads = document.querySelectorAll(".list .row");
      return Array.from(leads).map((lead) => {
        return {
          name: lead.querySelector(".wrd_elip")?.innerText?.trim() || "N/A",
          label: lead.querySelector(".f1")?.innerText?.trim() || "N/A",
          mobile: "N/A",
          details: lead.querySelector(".por")?.innerText?.trim() || "N/A",
        };
      });
    });

    for (const lead of currentLeadsData) {
      if (lead.name === "Buyer") {
        console.log(`Lead is Buyer, skipping: ${lead.name}`);
        continue;
      }

      if (lead.label === "N/A") {
        console.log(`Processing lead: ${lead.name}`);

        await page.getByText(lead.name).click();
        console.log(`Clicked on lead: ${lead.name}`);

        try {
          const locator = await page.locator("#splitviewlabelheader .wrd_elip");

          const isElementAvailable = await locator.count();
          if (isElementAvailable === 0) {
            console.log(`No label found for ${lead.name}, skipping.`);
            continue;
          }

          const label = await locator
            .innerText()
            .then((text) => text.trim())
            .catch(() => "N/A");

          console.log("label......", label);

          if (label === "N/A") {
            console.log(`No label available for ${lead.name}, skipping.`);
            continue;
          }

          lead.label = label;
          console.log("Fetched label:", lead.label);
        } catch (error) {
          console.log(`Error fetching label for ${lead.name}:`, error);
          continue;
        }
      }
    }

    for (const lead of currentLeadsData) {
      if (lead.name === "Buyer") {
        console.log(`Lead is Buyer, skipping: ${lead.name}`);
        continue;
      }

      try {
        console.log(`Processing lead: ${lead.name}`);
        await page.getByText(lead.name).click();
        console.log(`Clicked on lead: ${lead.name}`);

        // Click on the mobile element
        const mobileElement = await page.locator("#headerMobile");
        if (await mobileElement.count()) {
          await mobileElement.click();
          console.log(`Clicked on mobile element for ${lead.name}`);

          // Fetch the mobile number from the clipboard
          const mobileNumber = await page.evaluate(async () => {
            return await navigator.clipboard.readText();
          });

          if (mobileNumber && !isNaN(Number(mobileNumber))) {
            lead.mobile = mobileNumber;
            console.log(`Fetched mobile: ${lead.mobile}`);
          } else {
            console.log(`No mobile number copied for ${lead.name}`);
          }
        } else {
          console.log(`No mobile element found for ${lead.name}, skipping.`);
        }
      } catch (error) {
        console.error(`Error processing lead ${lead.name}:`, error);
        continue;
      }
    }

    // Combine previous and current leads data
    leadsData = [...previousLeadsData, ...currentLeadsData];

    console.log(
      `Scrolled. Previous height: ${previousHeight}, Current height: ${currentHeight}. Previous lead count: ${previousLeadCount}, Current lead count: ${currentLeadCount}`
    );

    scrollAttempts++;
  } while (
    currentHeight > previousHeight ||
    currentLeadCount > previousLeadCount
  );

  // while (
  //   (currentHeight > previousHeight || currentLeadCount > previousLeadCount) &&
  //   scrollAttempts < 20  // Limit the number of scroll attempts to avoid infinite loop
  // );

  console.log("All leads loaded", leadsData);

  // Create tasks from lead data
  const tasks = leadsData.map((lead) => ({
    projectId: "673eb6d62e87a01115656930",
    taskStageId: "671b472f9ccb60f1a05dfca9",
    companyId: "66ebbbc2c5bb38ee351dc0b2",
    title: lead.name,
    description: `
        Address: ${lead.details},
        Label: ${lead.label}`,
    startDate: moment().format("YYYY-MM-DD"),
    customFieldValues: {
      date: moment().format("DD/MM/YY"),
      name: lead.name,
      mobile_number: lead.mobile, // Changed to mobile_number
      company_name: lead.details || "N/A",
    },
    isDeleted: false,
    createdOn: new Date(),
    modifiedOn : new Date(),
  }));

  // Output the tasks as JSON to verify task creation
  console.log("Tasks Data", JSON.stringify(tasks, null, 2));

  // Assertion to check tasks were created
  expect(tasks).toBeDefined();
  expect(tasks.length).toBeGreaterThan(0);
}

// test("Scrape leads data from IndiaMART within a date range", async () => {
  // Launch browser with clipboard permissions

// const fetchLeads = async ()=> {
//   const browser = await chromium.launch({ headless: true });
//   const context = await browser.newContext({
//     permissions: ["clipboard-read", "clipboard-write"], // Enable clipboard access
//   });
//   const page = await context.newPage();

//   try {
//     // Navigate to IndiaMART
//     await page.goto("https://seller.indiamart.com/");
//     console.log("Navigated to IndiaMART");

//     // Login process
//     await page.locator("#user_sign_in").click();
//     console.log("Clicked on Sign In");

//     const mobileNumber = "9892492782";
//     const password = "KIPINDIAMART2022";

//     await page.getByPlaceholder("Enter Your Mobile Number").fill(mobileNumber);
//     console.log("Filled mobile number");

//     await page.getByRole("button", { name: "Submit" }).click();
//     await page.locator("#messageWid").click();
//     await page.getByRole("button", { name: "Enter Password" }).click();
//     await page.getByPlaceholder("Enter Password").fill(password);
//     console.log("Filled password");

//     await page.getByRole("button", { name: "Sign In" }).click();
//     console.log("Logged in successfully");

//     // Navigate to Lead Manager
//     await page.getByRole("link", { name: "Lead Manager" }).click();
//     console.log("Navigated to Lead Manager");

//     // Open custom date filter
//     await page.locator("#filterCTA").click();
//     console.log("Clicked on filter");

//     await page
//       .getByText("Filters", { exact: true })
//       .waitFor({ state: "visible" });
//     await page.getByText("Filters", { exact: true }).click();

//     await page
//       .getByText("Select Date", { exact: true })
//       .waitFor({ state: "visible" });
//     await page.getByText("Select Date", { exact: true }).click();
//     console.log("Clicked on 'Select Date'");

//     await page
//       .getByText("Custom Date", { exact: true })
//       .waitFor({ state: "visible" });
//     await page.getByText("Custom Date", { exact: true }).click();
//     console.log("Opened custom date filter");

//     // Set start and end dates
//     await page.waitForSelector("#custom_date_start", { timeout: 100000 });
//     await page.locator("#custom_date_start").scrollIntoViewIfNeeded();
//     await page.locator("#custom_date_start").click();
//     console.log("Clicked on start date");

//     await page.getByRole("button", { name: "18" }).click();
//     await page.locator("#custom_date_end").scrollIntoViewIfNeeded();
//     await page.getByRole("button", { name: "23" }).click();
//     console.log("Set custom date range");

//     // Apply the filter
//     await page
//       .getByText("Apply", { exact: true })
//       .waitFor({ state: "visible" });
//     await page.getByText("Apply", { exact: true }).click();
//     console.log("Applied custom date filter");

//     // Scroll to load all leads
//     await scrollToLoadAllLeads(page);

//     // Example of using clipboard functionality
//     const mobileElement = page.locator("#headerMobile");
//     if (await mobileElement.count()) {
//       await mobileElement.click();

//       // Read text from clipboard
//       const copiedText = await page.evaluate(async () => {
//         return await navigator.clipboard.readText();
//       });

//       if (copiedText) {
//         console.log(`Copied text: ${copiedText}`);
//       } else {
//         console.log("No text copied to clipboard.");
//       }
//     }
//   } catch (error) {
//     console.error("An error occurred:", error);
//   } finally {
//     await browser.close();
//   }
// // });
// }

const fetchLeads = async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"], // Enable clipboard access
  });
  const page = await context.newPage();

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    // Navigate to IndiaMART
    await page.goto("https://seller.indiamart.com/");
    console.log("Navigated to IndiaMART");
    await delay(2000); // Wait for 2 seconds

    // Login process
    await page.locator("#user_sign_in").click();
    console.log("Clicked on Sign In");
    await delay(1000); // Wait for 1 second

    const mobileNumber = "9892492782";
    const password = "KIPINDIAMART2022";

    await page.getByPlaceholder("Enter Your Mobile Number").fill(mobileNumber);
    console.log("Filled mobile number");
    await delay(1000); // Wait for 1 second

    await page.getByRole("button", { name: "Submit" }).click();
    await page.locator("#messageWid").click();
    await delay(2000); // Wait for 2 seconds

    await page.getByRole("button", { name: "Enter Password" }).click();
    await page.getByPlaceholder("Enter Password").fill(password);
    console.log("Filled password");
    await delay(1000); // Wait for 1 second

    await page.getByRole("button", { name: "Sign In" }).click();
    console.log("Logged in successfully");
    await delay(3000); // Wait for 3 seconds

    // Navigate to Lead Manager
    await page.getByRole("link", { name: "Lead Manager" }).click();
    console.log("Navigated to Lead Manager");
    await delay(3000); // Wait for 3 seconds

    // Open custom date filter
    await page.locator("#filterCTA").click();
    console.log("Clicked on filter");
    await delay(2000); // Wait for 2 seconds

    await page
      .getByText("Filters", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("Filters", { exact: true }).click();
    await delay(1000); // Wait for 1 second

    await page
      .getByText("Select Date", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("Select Date", { exact: true }).click();
    console.log("Clicked on 'Select Date'");
    await delay(1000); // Wait for 1 second

    await page
      .getByText("Custom Date", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("Custom Date", { exact: true }).click();
    console.log("Opened custom date filter");
    await delay(2000); // Wait for 2 seconds

    // Set start and end dates
    await page.waitForSelector("#custom_date_start", { timeout: 10000 });
    await page.locator("#custom_date_start").scrollIntoViewIfNeeded();
    await delay(1000); // Wait for 1 second
    await page.locator("#custom_date_start").click();
    console.log("Clicked on start date");
    await delay(1000); // Wait for 1 second

    await page.getByRole("button", { name: "18" }).click();
    await page.locator("#custom_date_end").scrollIntoViewIfNeeded();
    await delay(1000); // Wait for 1 second
    await page.getByRole("button", { name: "23" }).click();
    console.log("Set custom date range");

    // Apply the filter
    await page
      .getByText("Apply", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("Apply", { exact: true }).click();
    console.log("Applied custom date filter");
    await delay(3000); // Wait for 3 seconds

    // Scroll to load all leads
    await scrollToLoadAllLeads(page);

    // Example of using clipboard functionality
    const mobileElement = page.locator("#headerMobile");
    if (await mobileElement.count()) {
      await mobileElement.click();
      await delay(1000); // Wait for 1 second

      // Read text from clipboard
      const copiedText = await page.evaluate(async () => {
        return await navigator.clipboard.readText();
      });

      if (copiedText) {
        console.log(`Copied text: ${copiedText}`);
      } else {
        console.log("No text copied to clipboard.");
      }
    }
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await browser.close();
  }
};


fetchLeads()


