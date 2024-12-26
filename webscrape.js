const { test, expect, chromium } = require("@playwright/test")
const moment= require("moment")

require("dotenv").config();


async function scrollToLoadAllLeads(page) {
  const scrollableContainerSelector = ".ReactVirtualized__Grid";
  const leadsSelector = ".list .row";
  const leadsDataMap = new Map();
  let previousLeadCount = 0;
  let scrollAttempts = 0;

  do {
    // Fetch visible items in the container
    const currentLeadsData = await page.evaluate((leadsSelector) => {
      const leads = document.querySelectorAll(leadsSelector);
      return Array.from(leads).map((lead) => {
        const name = lead.querySelector(".wrd_elip")?.innerText?.trim() || "N/A";
        return {
          id: lead.getAttribute("data-id") || name, // Use a unique identifier
          name,
          productName:
            lead.querySelector(".wrd_elip .prod-name")?.innerText?.trim() ||
            "N/A",
          label: lead.querySelector(".f1")?.innerText?.trim() || "N/A",
          mobile: "N/A",
          details: lead.querySelector(".por")?.innerText?.trim() || "N/A",
        };
      });
    }, leadsSelector);

    // Add new items to the map to ensure uniqueness
    for (const lead of currentLeadsData) {
      if (!leadsDataMap.has(lead.id)) {
        leadsDataMap.set(lead.id, lead);
      }
    }

    console.log(
      `Fetched ${currentLeadsData.length} leads. Total unique leads so far: ${leadsDataMap.size}`
    );

    // Scroll the container
    await page.evaluate((scrollableContainerSelector) => {
      const container = document.querySelector(scrollableContainerSelector);
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, scrollableContainerSelector);

    // Wait for new items to load
    await page.waitForTimeout(10000);
   

    // Check if new leads are added
    if (leadsDataMap.size === previousLeadCount) {
      console.log("No new leads found, stopping scrolling.");
      break;
    }

    previousLeadCount = leadsDataMap.size;
    scrollAttempts++;

    console.log(`Scroll attempt ${scrollAttempts} completed.`);
  } while (scrollAttempts < 20); // Limit to prevent infinite scrolling

  // Convert leads map to an array
  const leadsData = Array.from(leadsDataMap.values());
  console.log("All leads loaded", leadsData);

  // Process leads into tasks (as per your original logic)
  const tasks = leadsData.map((lead) => ({
    projectId: "673eb6d62e87a01115656930",
    taskStageId: "671b472f9ccb60f1a05dfca9",
    companyId: "66ebbbc2c5bb38ee351dc0b2",
    title: lead.productName || "N/A",
    description: `
        Address: ${lead.details},
        Label: ${lead.label}`,
    startDate: moment().format("YYYY-MM-DD"),
    customFieldValues: {
      date: moment().format("DD/MM/YY"),
      name: lead.name,
      mobile_number: lead.mobile,
      company_name: lead.details || "N/A",
    },
    isDeleted: false,
    createdOn: new Date(),
    modifiedOn: new Date(),
  }));

  console.log("Tasks Data", JSON.stringify(tasks, null, 2));

  expect(tasks).toBeDefined();
  expect(tasks.length).toBeGreaterThan(0);
}






const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Custom date filter selection logic
async function selectCustomDate(page, startYear, startMonth, startDay, endYear, endMonth, endDay) {
  console.log("Selecting start date...");
  await page.locator("#custom_date_start").scrollIntoViewIfNeeded();
  await page.locator("#custom_date_start").click();
  await delay(1000);

  console.log("Selecting year for start date...");
  await page.locator(".rdrYearPicker select").selectOption(startYear);
  await delay(1000);

  console.log("Selecting month for start date...");
  await page.locator(".rdrMonthPicker select").selectOption(startMonth);
  await delay(1000);

  console.log("Selecting day for start date...");
  const startDaySelector = `.rdrDay:not(.rdrDayDisabled) span:has-text("${startDay}")`;
  await page.locator(startDaySelector).click();
  await delay(2000);

  console.log("Selecting end date...");
  await page.locator("#custom_date_end").scrollIntoViewIfNeeded();
  await page.locator("#custom_date_end").click();
  await delay(1000);

  console.log("Selecting year for end date...");
  await page.locator(".rdrYearPicker select").selectOption(endYear);
  await delay(1000);

  console.log("Selecting month for end date...");
  await page.locator(".rdrMonthPicker select").selectOption(endMonth);
  await delay(1000);

  console.log("Selecting day for end date...");
  const endDaySelector = `.rdrDay:not(.rdrDayDisabled) span:has-text("${endDay}")`;
  await page.locator(endDaySelector).click();
  await delay(2000);

  console.log("Applying the custom date filter...");
  await page.getByText("Apply", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
  await page.getByText("Apply", { exact: true }).click();
  await delay(3000);
}


const fetchLeads = async () => {
  const browser = await chromium.launch({ headless: true });
  const start_dayToSelect = "18";
const start_monthToSelect = "11"; // April (0-based index: 0 = January, 1 = February, etc.)
const start_yearToSelect = "2024";

const end_dayToSelect = "24";
const end_monthToSelect = "11"; // April (0-based index: 0 = January, 1 = February, etc.)
const end_yearToSelect = "2024";


  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"], // Enable clipboard access
  });
  const page = await context.newPage();

 

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

    // Wait for the date picker to be visible
await page.waitForSelector("#custom_date_start", { timeout: 1000000 });
await page.locator("#custom_date_start").scrollIntoViewIfNeeded();
await delay(1000);
await page.locator("#custom_date_start").click();
console.log("Clicked on start date");

// Select the desired month

await page.locator(".rdrYearPicker select").selectOption(start_yearToSelect);
console.log("Selected year");
await delay(1000);

await page.locator(".rdrMonthPicker select").selectOption(start_monthToSelect);
console.log("Selected month");
await delay(1000);
// Select the desired year

// Select the desired day

await page.getByRole("button", { name: start_dayToSelect }).click();
console.log("Selected day");
await delay(2000);
// Repeat the process for the end date
// await page.locator("#custom_date_end").scrollIntoViewIfNeeded();
// await delay(1000);
// await page.locator("#custom_date_end").click();
// console.log("Clicked on end date");
// await delay(1000);
await page.locator(".rdrYearPicker select").selectOption(end_yearToSelect);
console.log("Selected year for end date");
await delay(1000);
await page.locator(".rdrMonthPicker select").selectOption(end_monthToSelect);
console.log("Selected month for end date");
await delay(1000);
await page.getByRole("button", { name: end_dayToSelect }).click();
console.log("Selected day for end date");
await delay(1000);
// Apply the filter
await page.getByText("Apply", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
await page.getByText("Apply", { exact: true }).click();
console.log("Applied custom date filter");
await delay(3000);


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


