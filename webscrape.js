const { test, expect, chromium } = require("@playwright/test");
const moment = require("moment");

require("dotenv").config();

function extractISODate(details) {
  const dateRegex =
    /\b(\d{1,2} \w{3}'\d{2}|\d{2} \w{3}'\d{2}|\w+\sday|yesterday)\b/i;
  const timeRegex = /\b\d{1,2}:\d{2} (AM|PM)\b/i;

  const matchDate = details.match(dateRegex);
  const matchTime = details.match(timeRegex);
  const currentDate = new Date();

  let extractedDate = currentDate;

  if (matchDate) {
    const datePart = matchDate[0].toLowerCase();

    if (datePart === "yesterday") {
      extractedDate.setDate(currentDate.getDate() - 1);
    } else if (/\d{1,2} \w{3}'\d{2}/.test(datePart)) {
      extractedDate = new Date(datePart.replace("'", "20"));
    }
  }

  // Combine extracted date with the time if available
  if (matchTime) {
    const timePart = matchTime[0];
    const [hours, minutes] = timePart.split(/[: ]/).map(Number);
    const isPM = timePart.includes("PM");

    extractedDate.setHours(isPM ? hours + 12 : hours, minutes);
  }

  return extractedDate.toISOString();
}

async function scrollToLoadAllLeads(page) {
  const scrollableContainerSelector = ".ReactVirtualized__Grid";
  const leadsSelector = ".list .row";
  const leadsData = [];
  let previousLeadCount = 0;
  let scrollAttempts = 0;
  let maxNoNewLeadsScrolls = 5; // Stop after this many attempts with no new leads
  let noNewLeadsCounter = 0;
  const scrollDelay = 2000; // Delay between scrolls

  // Wait for the scrollable container to load
  await page.waitForSelector(scrollableContainerSelector, { timeout: 30000 });
  console.log("Scrollable container found.");

  while (true) {
    // Get all visible leads in the current view
    const currentLeadsData = await page.evaluate(
      ({ scrollableContainerSelector, leadsSelector }) => {
        const container = document.querySelector(scrollableContainerSelector);
        if (!container) {
          throw new Error("Scrollable container not found.");
        }

        const leads = document.querySelectorAll(leadsSelector);

        return Array.from(leads).map((lead) => {
          const dateTimeElement = lead.querySelector(".fr .fs12.clr77");
          const dateTime = dateTimeElement
            ? dateTimeElement.innerText.trim()
            : "N/A";

          // Clone the element and remove the date/time to avoid including it in details
          const detailsClone = lead.cloneNode(true);
          if (dateTimeElement) {
            dateTimeElement.remove();
          }

          return {
            id:
              lead.getAttribute("data-id") ||
              lead.querySelector(".wrd_elip")?.innerText?.trim() ||
              "N/A",
            name: lead.querySelector(".wrd_elip")?.innerText?.trim() || "N/A",
            productName:
              lead.querySelector(".wrd_elip .prod-name")?.innerText?.trim() ||
              "N/A",
            startDate: "N/A", // Storing extracted date/time separately
            dateTime,
            details:
              detailsClone.innerText.trim().replace(dateTime, "") || "N/A", // Excluding date/time from details
            elementIndex: [
              ...container.querySelectorAll(leadsSelector),
            ].indexOf(lead),
          };
        });
      },
      { scrollableContainerSelector, leadsSelector }
    );

    console.log(`Found ${currentLeadsData.length} leads in the current view.`);

    let newLeadsAdded = false;

    for (const lead of currentLeadsData) {
      if (leadsData.some((l) => l.id === lead.id)) {
        continue; // Skip already processed leads
      }

      lead.startDate = extractISODate(lead.dateTime);

      newLeadsAdded = true;

      try {
        // Click the lead using a robust locator
        const leadElement = await page
          .locator(`.wrd_elip:has-text("${lead.name}")`)
          .first();
        await leadElement.scrollIntoViewIfNeeded(); // Scroll to make it visible
        await leadElement.click();
        console.log(`Clicked on lead: ${lead.name}`);
        await page.waitForTimeout(1000); // Short delay for the page to stabilize

        // Fetch label
        try {
          const labelLocator = page
            .locator("#splitviewlabelheader .wrd_elip")
            .first();
          if ((await labelLocator.count()) > 0) {
            lead.label = await labelLocator
              .innerText()
              .then((text) => text.trim());
            console.log(`Fetched label: ${lead.label}`);
          } else {
            lead.label = "N/A";
          }
        } catch (error) {
          console.error(`Error fetching label for ${lead.name}:`, error);
        }

        // Fetch mobile number
        try {
          const mobileElement = page.locator("#headerMobile");
          if ((await mobileElement.count()) > 0) {
            await mobileElement.click();
            const mobileNumber = await page.evaluate(async () => {
              return await navigator.clipboard.readText();
            });

            if (mobileNumber && !isNaN(Number(mobileNumber))) {
              lead.mobile = mobileNumber;
              console.log(`Fetched mobile: ${lead.mobile}`);
            } else {
              lead.mobile = "N/A";
              console.log(`No valid mobile number copied for ${lead.name}`);
            }
          }
        } catch (error) {
          console.error(
            `Error fetching mobile number for ${lead.name}:`,
            error
          );
        }
        // **New Email Fetching Logic**
        try {
          const emailElement = page.locator("#headerEmail");
          if ((await emailElement.count()) > 0) {
            await emailElement.click();
            const email = await page.evaluate(
              async () => await navigator.clipboard.readText()
            );
            lead.email = email && email.includes("@") ? email : "N/A";
            console.log(`Fetched email: ${lead.email}`);
          } else {
            lead.email = "N/A";
            console.log(`No email found for ${lead.name}`);
          }
        } catch (error) {
          console.error(`Error fetching email for ${lead.name}:`, error);
          lead.email = "N/A";
        }

        leadsData.push(lead);
      } catch (error) {
        console.error(`Error processing lead ${lead.name}:`, error);
        continue;
      }
    }

    if (newLeadsAdded) {
      noNewLeadsCounter = 0;
    } else {
      noNewLeadsCounter++;
      console.log(
        `No new leads found. Attempt ${noNewLeadsCounter} of ${maxNoNewLeadsScrolls}.`
      );
    }

    if (noNewLeadsCounter >= maxNoNewLeadsScrolls) {
      console.log(
        "Max scroll attempts with no new leads reached. Stopping scroll."
      );
      break;
    }

    // Scroll to load more leads
    const currentScrollHeight = await page.evaluate(
      (scrollableContainerSelector) => {
        const container = document.querySelector(scrollableContainerSelector);
        if (!container) {
          throw new Error("Scrollable container not found.");
        }
        const previousScrollTop = container.scrollTop;
        container.scrollBy(0, 10); // Scroll down by 10px
        return {
          scrollTop: container.scrollTop,
          maxScrollHeight: container.scrollHeight,
          previousScrollTop,
        };
      },
      scrollableContainerSelector
    );

    if (
      currentScrollHeight.scrollTop === currentScrollHeight.previousScrollTop &&
      currentScrollHeight.scrollTop + 10 >= currentScrollHeight.maxScrollHeight
    ) {
      console.log("Reached the bottom of the list. No more leads to process.");
      break;
    }

    previousLeadCount = leadsData.length;
    scrollAttempts++;
    console.log(`Scroll attempt ${scrollAttempts} completed.`);

    // Add a consistent delay between scroll attempts
    await page.waitForTimeout(scrollDelay);
  }

  console.log("All leads processed", leadsData);

  return leadsData;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchLeads = async ({
  mobileNumber,
  password,
  start_dayToSelect,
  start_monthToSelect,
  start_yearToSelect,
  end_dayToSelect,
  end_monthToSelect,
  end_yearToSelect,
}) => {
  console.log("In fetchLeads");
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"], // Enable clipboard access
  });
  const page = await context.newPage();

  try {
    // Navigate to IndiaMART
    await page.goto("https://seller.indiamart.com/");
    console.log("Navigated to IndiaMART");
    await delay(2000); // Wait for 2 seconds

    // // Login process
    // await page.locator("#user_sign_in").click();
    // console.log("Clicked on Sign In");
    // await delay(1000); // Wait for 1 second

    // await page.getByPlaceholder("Enter Your Mobile Number").fill(mobileNumber);
    // console.log("Filled mobile number");
    // await delay(2000); // Wait for 1 second

    // await page.getByRole("button", { name: "Submit" }).click();
    await delay(2000);
    await page
      .getByPlaceholder("Enter 10 digit mobile number")
      .fill(mobileNumber);
    await delay(1000);
    await page.getByRole("button", { name: "Start Selling" }).click();
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

    await page
      .locator(".rdrYearPicker select")
      .selectOption(`${start_yearToSelect}`);
    console.log("Selected year");
    await delay(1000);

    await page
      .locator(".rdrMonthPicker select")
      .selectOption(`${start_monthToSelect}`);
    console.log("Selected month");
    await delay(1000);
    // Select the desired year

    // Select the desired day

    await page
      .locator(`.rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled)`)
      .filter({
        hasText: `${start_dayToSelect}`,
      })
      .first()
      .click();
    console.log("Selected day");
    await delay(2000);

    if (
      start_yearToSelect !== end_yearToSelect ||
      start_monthToSelect !== end_monthToSelect ||
      start_dayToSelect !== end_dayToSelect
    ) {
      await page
        .locator(".rdrYearPicker select")
        .selectOption(`${end_yearToSelect}`);
      console.log("Selected year for end date");
      await delay(1000);
      await page
        .locator(".rdrMonthPicker select")
        .selectOption(`${end_monthToSelect}`);
      console.log("Selected month for end date");
      await delay(1000);
      await page
        .locator(`.rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled)`)
        .filter({
          hasText: `${end_dayToSelect}`,
        })
        .first()
        .click();

      console.log("Selected day for end date");
      await delay(1000);
    }
    // Apply the filter
    await page
      .getByText("Apply", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("Apply", { exact: true }).click();
    console.log("Applied custom date filter");
    await delay(3000);

    // Scroll to load all leads
    return await scrollToLoadAllLeads(page);

    // Example of using clipboard functionality
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await browser.close();
  }
};

// fetchLeads( {mobileNumber: "9892492782", password :"KIPINDIAMART2022",
//   start_dayToSelect : "24"
//   , start_monthToSelect : "0" // April (0-based index: 0 : January, 1 : February, etc.)
//   , start_yearToSelect : "2025"
//   , end_dayToSelect : "25"
//   , end_monthToSelect : "0" // April (0-based index: 0 : January, 1 : February, etc.)
//   , end_yearToSelect : "2025"
// });

module.exports = fetchLeads;
