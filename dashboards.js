import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { withSalesforce } from "../services/salesforce.js";
import { logApiError } from "../services/logger.js";

const router = Router();
router.use(requireAuth);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Pulls every event for the account in a given year once, then aggregates
// in-memory for month-wise / state-wise / brand-wise views. Avoids relying on
// SOQL GROUP BY on formula/picklist fields, which is unreliable for some of them
// (see salesforce-sales-prompts skill notes on Venue_State__c grouping errors).
async function loadYearEvents(accountId, year) {
  const start = `${year}-01-01T00:00:00Z`;
  const end = `${Number(year) + 1}-01-01T00:00:00Z`;
  return withSalesforce(null, async (conn) => {
    const result = await conn.query(
      `SELECT Id, Name, Start_Date_Time__c, Venue_State__c, Number_of_Bottles_Sold__c,
              Event_Revenue_Total__c, Wine_Brand__c
       FROM Event__c
       WHERE Customer_Pitched__c = '${accountId}'
         AND Start_Date_Time__c >= ${start} AND Start_Date_Time__c < ${end}
       ORDER BY Start_Date_Time__c`
    );
    return result.records;
  });
}

router.get("/reports", async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const accountId = req.user.sfdcAccountId;

  try {
    const events = await loadYearEvents(accountId, year);

    const byMonth = {};   // "Jan" -> { count, bottles }
    const byQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const byState = {};   // "FL" -> { count, events: [] }
    const byBrand = {};   // "Aveniu Reserve" -> bottles

    for (const e of events) {
      const d = new Date(e.Start_Date_Time__c);
      const monthKey = MONTHS[d.getMonth()];
      const bottles = e.Number_of_Bottles_Sold__c || 0;

      byMonth[monthKey] = byMonth[monthKey] || { count: 0, bottles: 0, events: [] };
      byMonth[monthKey].count++;
      byMonth[monthKey].bottles += bottles;
      byMonth[monthKey].events.push({ id: e.Id, name: e.Name });

      const q = `Q${Math.floor(d.getMonth() / 3) + 1}`;
      byQuarter[q] += bottles;

      const state = e.Venue_State__c || "Unknown";
      byState[state] = byState[state] || { count: 0, events: [] };
      byState[state].count++;
      byState[state].events.push({ id: e.Id, name: e.Name });

      const brands = (e.Wine_Brand__c || "").split(";").filter(Boolean);
      for (const b of brands) {
        byBrand[b] = (byBrand[b] || 0) + bottles;
      }
    }

    res.json({
      year: Number(year),
      totalEvents: events.length,
      monthWiseEvents: MONTHS.map(m => ({ month: m, ...( byMonth[m] || { count: 0, bottles: 0, events: [] }) })),
      quarterWiseRevenue: byQuarter,
      stateWiseEvents: Object.entries(byState).map(([state, v]) => ({ state, ...v })).sort((a,b) => b.count - a.count),
      brandWiseRevenue: Object.entries(byBrand).map(([brand, bottles]) => ({ brand, bottles })).sort((a,b) => b.bottles - a.bottles),
    });
  } catch (err) {
    await logApiError("Failed to build reports", { error: err.message, year }, req.user.id);
    res.status(500).json({ error: "Could not load reports" });
  }
});

router.get("/summary", async (req, res) => {
  const accountId = req.user.sfdcAccountId;
  const year = req.query.year || new Date().getFullYear();
  try {
    const events = await loadYearEvents(accountId, year);
    const bottles = events.reduce((sum, e) => sum + (e.Number_of_Bottles_Sold__c || 0), 0);
    const revenue = events.reduce((sum, e) => sum + (e.Event_Revenue_Total__c || 0), 0);
    res.json({ eventsYtd: events.length, bottlesYtd: bottles, revenueYtd: revenue });
  } catch (err) {
    await logApiError("Failed to build dashboard summary", { error: err.message }, req.user.id);
    res.status(500).json({ error: "Could not load dashboard" });
  }
});

export default router;
