import { Router, Response } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { dball, dbget } from "../db";

const router = Router();

type Scope = {
  conditions: string[];
  params: unknown[];
};

const buildScope = (user: AuthRequest["user"]): Scope => {
  if (user?.role === "VIEWER") {
    return {
      conditions: ["userId = ?"],
      params: [user.id],
    };
  }

  return {
    conditions: [],
    params: [],
  };
};

const buildWhereClause = (scope: Scope, extraConditions: string[] = []): string => {
  const conditions = [...scope.conditions, ...extraConditions];
  return conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
};

// Everyone can view summaries (VIEWER, ANALYST, ADMIN)
router.get(
  "/summary",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const scope = buildScope(req.user);

    const [totalIncomeResult, totalExpenseResult, recentResult] =
      await Promise.all([
        dbget(
          `SELECT COALESCE(SUM(amount), 0) as total FROM records${buildWhereClause(scope, ["type = ?"])}
          `,
          [...scope.params, "INCOME"],
        ),
        dbget(
          `SELECT COALESCE(SUM(amount), 0) as total FROM records${buildWhereClause(scope, ["type = ?"])}
          `,
          [...scope.params, "EXPENSE"],
        ),
        dball(
          `SELECT * FROM records${buildWhereClause(scope)} ORDER BY date DESC LIMIT 5`,
          scope.params,
        ),
      ]);

    const totalIncome = Number(
      (totalIncomeResult as { total?: number | string | null } | undefined)?.total ?? 0,
    );
    const totalExpense = Number(
      (totalExpenseResult as { total?: number | string | null } | undefined)?.total ?? 0,
    );

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
    const scope = buildScope(req.user);
    const results = await dball(
      `
    SELECT category, type, SUM(amount) as total
    FROM records${buildWhereClause(scope)}
    GROUP BY category, type
    ORDER BY total DESC
  `,
      scope.params,
    );

    res.json(results);
  },
);

router.get(
  "/monthly-trends",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const scope = buildScope(req.user);
    // Group records by YEAR-MONTH
    const results = await dball(`
    SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
    FROM records${buildWhereClause(scope)}
    GROUP BY strftime('%Y-%m', date), type
    ORDER BY month DESC
  `, scope.params);

    // Reshape to nice JSON object per month
    const trends: Record<string, { month: string; INCOME: number; EXPENSE: number }> = {};
    for (const row of results as Array<{ month: string; type: "INCOME" | "EXPENSE"; total: number | string | null }>) {
      const month = row.month;
      if (!trends[month]) trends[month] = { month, INCOME: 0, EXPENSE: 0 };
      trends[month][row.type] = Number(row.total ?? 0);
    }

    res.json(Object.values(trends));
  },
);

export default router;
