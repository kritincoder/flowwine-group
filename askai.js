import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "../middleware/auth.js";
import { pool } from "../db/pool.js";
import { withSalesforce } from "../services/salesforce.js";
import { logApiError } from "../services/logger.js";

const router = Router();
router.use(requireAuth);

// IMPORTANT: we do NOT hand the model raw Salesforce/SOQL access. Instead we expose four
// narrow tools, each hard-scoped server-side to the caller's own SFDC Account Id. This is
// what enforces "Ask AI can only see this client's events, wine sold, reporting, and photos" —
// the restriction lives in code, not in a prompt instruction the model could be talked out of.
const TOOLS = [
  {
    name: "get_my_events",
    description: "List the logged-in client's events. Use when asked about upcoming or past events.",
    input_schema: {
      type: "object",
      properties: {
        when: { type: "string", enum: ["upcoming", "past"] },
        limit: { type: "integer", default: 10 },
      },
      required: ["when"],
    },
  },
  {
    name: "get_wine_sold",
    description: "Get wine sold line items for a specific event belonging to the logged-in client.",
    input_schema: {
      type: "object",
      properties: { eventId: { type: "string" } },
      required: ["eventId"],
    },
  },
  {
    name: "get_event_report",
    description: "Get aggregate reporting (bottles sold, revenue, event count) for the logged-in client, optionally filtered by year.",
    input_schema: {
      type: "object",
      properties: { year: { type: "integer" } },
    },
  },
  {
    name: "get_event_photos",
    description: "Get photo links for a specific event belonging to the logged-in client.",
    input_schema: {
      type: "object",
      properties: { eventId: { type: "string" } },
      required: ["eventId"],
    },
  },
];

async function runTool(name, input, accountId) {
  return withSalesforce(null, async (conn) => {
    switch (name) {
      case "get_my_events": {
        const nowIso = new Date().toISOString();
        const op = input.when === "upcoming" ? ">=" : "<";
        const r = await conn.query(
          `SELECT Id, Name, Start_Date_Time__c, Location_Name__c, Status__c
           FROM Event__c WHERE Customer_Pitched__c='${accountId}' AND Start_Date_Time__c ${op} ${nowIso}
           ORDER BY Start_Date_Time__c ${input.when === "upcoming" ? "ASC" : "DESC"} LIMIT ${input.limit || 10}`
        );
        return r.records;
      }
      case "get_wine_sold": {
        // guard: confirm the event actually belongs to this account before returning line items
        const owns = await conn.query(`SELECT Id FROM Event__c WHERE Id='${input.eventId}' AND Customer_Pitched__c='${accountId}'`);
        if (!owns.records.length) return { error: "Event not found for this account" };
        const r = await conn.query(
          `SELECT Item_Name__c, Quantity_Sold__c, Price_per_Unit__c, Sales_Revenue__c
           FROM Event_Item__c WHERE Event__c='${input.eventId}'`
        );
        return r.records;
      }
      case "get_event_report": {
        const year = input.year || new Date().getFullYear();
        const r = await conn.query(
          `SELECT COUNT(Id) events, SUM(Number_of_Bottles_Sold__c) bottles, SUM(Event_Revenue_Total__c) revenue
           FROM Event__c WHERE Customer_Pitched__c='${accountId}'
           AND Start_Date_Time__c >= ${year}-01-01T00:00:00Z AND Start_Date_Time__c < ${Number(year)+1}-01-01T00:00:00Z`
        );
        return r.records[0];
      }
      case "get_event_photos": {
        const owns = await conn.query(`SELECT Id FROM Event__c WHERE Id='${input.eventId}' AND Customer_Pitched__c='${accountId}'`);
        if (!owns.records.length) return { error: "Event not found for this account" };
        const r = await conn.query(`SELECT Photo_Name__c, Box_Photo_URL__c FROM Box_Event_Photo__c WHERE Events__c='${input.eventId}'`);
        return r.records;
      }
      default:
        return { error: "Unknown tool" };
    }
  });
}

router.post("/", async (req, res) => {
  const { message, history = [] } = req.body;
  const accountId = req.user.sfdcAccountId;

  try {
    const { rows } = await pool.query(`SELECT api_key, model, enabled FROM claude_settings WHERE id = 1`);
    const settings = rows[0];
    if (!settings?.enabled || !settings?.api_key) {
      return res.status(400).json({ error: "Ask AI is not configured yet — see Admin > Claude Settings" });
    }

    const anthropic = new Anthropic({ apiKey: settings.api_key });
    const messages = [...history, { role: "user", content: message }];

    let response = await anthropic.messages.create({
      model: settings.model,
      max_tokens: 1024,
      system: "You help a Flow Wine Group client with THEIR OWN events, wine sold, reporting, and event photos only. Never discuss other clients or unrelated Salesforce data.",
      tools: TOOLS,
      messages,
    });

    // simple single-round tool loop
    while (response.stop_reason === "tool_use") {
      const toolUse = response.content.find(b => b.type === "tool_use");
      const result = await runTool(toolUse.name, toolUse.input, accountId);
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) }],
      });
      response = await anthropic.messages.create({
        model: settings.model, max_tokens: 1024, tools: TOOLS, messages,
      });
    }

    const text = response.content.find(b => b.type === "text")?.text || "";
    res.json({ reply: text, messages });
  } catch (err) {
    await logApiError("Ask AI request failed", { error: err.message }, req.user.id);
    res.status(500).json({ error: "Ask AI could not process that request" });
  }
});

export default router;
