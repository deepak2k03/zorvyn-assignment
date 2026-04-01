import { Router, Response } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { dball, dbget } from "../db";
import "express-async-errors";

const router = Router();

// Everyone can view summaries (VIEWER, ANALYST, ADMIN)
router.get(
  "/summary",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const [totalIncomeResult, totalExpenseResult, recentResult] =
      await Promise.all([
        dbget("SELECT SUM(amount) as total FROM records WHERE type = 'INCOME'"),
        dbget(
          "SELECT SUM(amount) as total FROM records WHERE type = 'EXPENSE'",
        ),
        dball("SELECT * FROM records ORDER BY date DESC LIMIT 5"),
      ]);

    const totalIncome = (totalIncomeResult as any)?.total || 0;
    const totalExpense = (totalExpenseResult as any)?.total || 0;

    res.json({
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      recentActivity: recentResult,
    });
  },
);

router.get(
  "/category-totals",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const results = await dball(`
    SELECT category, type, SUM(amount) as total
    FROM records
    GROUP BY category, type
    ORDER BY total DESC
  `);

    res.json(results);
  },
);

router.get(
  "/monthly-trends",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    // Group records by YEAR-MONTH
    const results = await dball(`
    SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
    FROM records
    GROUP BY strftime('%Y-%m', date), type
    ORDER BY month DESC
  `);

    // Reshape to nice JSON object per month
    const trends: Record<string, any> = {};
    for (const row of results) {
      const month = row.month;
      if (!trends[month]) trends[month] = { month, INCOME: 0, EXPENSE: 0 };
      trends[month][row.type] = row.total;
    }

    res.json(Object.values(trends));
  },
);

export default router;
