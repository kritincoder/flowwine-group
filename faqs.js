import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { withSalesforce } from "../services/salesforce.js";
import { logApiError } from "../services/logger.js";

const router = Router();
router.use(requireAuth);

// FAQs now come straight from Salesforce (ClientFAQ__c), ordered by Sequence_Number__c,
// rather than the local Postgres faqs table.
router.get("/", async (req, res) => {
  try {
    const faqs = await withSalesforce(null, async (conn) => {
      const result = await conn.query(
        `SELECT Id, Sequence_Number__c, FAQ_Question__c, FAQ_Answer__c
         FROM ClientFAQ__c
         ORDER BY Sequence_Number__c ASC NULLS LAST`
      );
      return result.records;
    });

    res.json(faqs.map(f => ({
      id: f.Id,
      sequence: f.Sequence_Number__c,
      title: f.FAQ_Question__c,
      description: f.FAQ_Answer__c,
    })));
  } catch (err) {
    await logApiError("Failed to load FAQs from Salesforce", { error: err.message }, req.user.id);
    res.status(500).json({ error: "Could not load FAQs" });
  }
});

export default router;
