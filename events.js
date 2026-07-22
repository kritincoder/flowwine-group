import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { withSalesforce } from "../services/salesforce.js";
import { logApiError } from "../services/logger.js";

const router = Router();
router.use(requireAuth);

const EVENT_FIELDS = `
  Id, Name, Type_of_Job__c, Status__c, Venue_Targeted_Location__c, Location_Name__c,
  Location_Address__c, Venue_State__c, Start_Date_Time__c, End_Date_Time__c,
  Related_Consultant__c, Related_Opportunity__c, Number_of_Bottles_Sold__c,
  Event_Revenue_Total__c, Customer_Pitched__c, Account_Name__c
`;

function soqlDate(d) {
  return new Date(d).toISOString();
}

// GET /api/events/mine?when=upcoming|past&search=&page=1&pageSize=10
router.get("/mine", async (req, res) => {
  const { when = "upcoming", search = "", page = 1, pageSize = 10 } = req.query;
  const accountId = req.user.sfdcAccountId;
  if (!accountId) return res.status(400).json({ error: "No Salesforce Account linked to this user" });

  const nowIso = soqlDate(new Date());
  const dateFilter = when === "upcoming"
    ? `Start_Date_Time__c >= ${nowIso}`
    : `Start_Date_Time__c < ${nowIso}`;
  const searchFilter = search ? ` AND Name LIKE '%${search.replace(/'/g, "\\'")}%'` : "";
  const offset = (Number(page) - 1) * Number(pageSize);

  try {
    const events = await withSalesforce(null, async (conn) => {
      const soql = `
        SELECT ${EVENT_FIELDS}
        FROM Event__c
        WHERE Customer_Pitched__c = '${accountId}' AND ${dateFilter}${searchFilter}
        ORDER BY Start_Date_Time__c ${when === "upcoming" ? "ASC" : "DESC"}
        LIMIT ${Number(pageSize)} OFFSET ${offset}
      `;
      const result = await conn.query(soql);
      const countResult = await conn.query(
        `SELECT COUNT(Id) total FROM Event__c WHERE Customer_Pitched__c = '${accountId}' AND ${dateFilter}${searchFilter}`
      );
      return { records: result.records, total: countResult.records[0].total };
    });
    res.json(events);
  } catch (err) {
    await logApiError("Failed to load client events", { error: err.message }, req.user.id);
    res.status(500).json({ error: "Could not load events" });
  }
});

// GET /api/events/:id — full event detail, scoped to the caller's account
router.get("/:id", async (req, res) => {
  const accountId = req.user.sfdcAccountId;
  try {
    const event = await withSalesforce(null, async (conn) => {
      const result = await conn.query(
        `SELECT ${EVENT_FIELDS} FROM Event__c WHERE Id = '${req.params.id}' AND Customer_Pitched__c = '${accountId}'`
      );
      return result.records[0];
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    await logApiError("Failed to load event detail", { error: err.message, eventId: req.params.id }, req.user.id);
    res.status(500).json({ error: "Could not load event" });
  }
});

// GET /api/events/:id/wine-sold?search=&page=1&pageSize=10 — Event_Item__c related list
router.get("/:id/wine-sold", async (req, res) => {
  const { search = "", page = 1, pageSize = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  const searchFilter = search ? ` AND Item_Name__c LIKE '%${search.replace(/'/g, "\\'")}%'` : "";

  try {
    const data = await withSalesforce(null, async (conn) => {
      const result = await conn.query(
        `SELECT Id, Item_Name__c, Wine_Name__c, Quantity_Sold__c, Price_per_Unit__c, Sales_Revenue__c
         FROM Event_Item__c
         WHERE Event__c = '${req.params.id}'${searchFilter}
         ORDER BY Item_Name__c
         LIMIT ${Number(pageSize)} OFFSET ${offset}`
      );
      const countResult = await conn.query(
        `SELECT COUNT(Id) total FROM Event_Item__c WHERE Event__c = '${req.params.id}'${searchFilter}`
      );
      return { records: result.records, total: countResult.records[0].total };
    });
    res.json(data);
  } catch (err) {
    await logApiError("Failed to load wine sold list", { error: err.message, eventId: req.params.id }, req.user.id);
    res.status(500).json({ error: "Could not load wine sold" });
  }
});

// GET /api/events/:id/photos — Box_Event_Photo__c related list
router.get("/:id/photos", async (req, res) => {
  try {
    const photos = await withSalesforce(null, async (conn) => {
      const result = await conn.query(
        `SELECT Id, Photo_Name__c, Box_Photo_URL__c, CreatedDate
         FROM Box_Event_Photo__c
         WHERE Events__c = '${req.params.id}'
         ORDER BY CreatedDate DESC`
      );
      return result.records;
    });
    res.json(photos);
  } catch (err) {
    await logApiError("Failed to load event photos", { error: err.message, eventId: req.params.id }, req.user.id);
    res.status(500).json({ error: "Could not load photos" });
  }
});

export default router;
