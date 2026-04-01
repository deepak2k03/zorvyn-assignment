"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const buildScope = (user) => {
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
const buildWhereClause = (scope, extraConditions = []) => {
    const conditions = [...scope.conditions, ...extraConditions];
    return conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
};
// Everyone can view summaries (VIEWER, ANALYST, ADMIN)
router.get("/summary", auth_1.authenticate, async (req, res) => {
    const scope = buildScope(req.user);
    const [totalIncomeResult, totalExpenseResult, recentResult] = await Promise.all([
        (0, db_1.dbget)(`SELECT COALESCE(SUM(amount), 0) as total FROM records${buildWhereClause(scope, ["type = ?"])}
          `, [...scope.params, "INCOME"]),
        (0, db_1.dbget)(`SELECT COALESCE(SUM(amount), 0) as total FROM records${buildWhereClause(scope, ["type = ?"])}
          `, [...scope.params, "EXPENSE"]),
        (0, db_1.dball)(`SELECT * FROM records${buildWhereClause(scope)} ORDER BY date DESC LIMIT 5`, scope.params),
    ]);
    const totalIncome = Number(totalIncomeResult?.total ?? 0);
    const totalExpense = Number(totalExpenseResult?.total ?? 0);
    res.json({
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        recentActivity: recentResult,
    });
});
router.get("/category-totals", auth_1.authenticate, async (req, res) => {
    const scope = buildScope(req.user);
    const results = await (0, db_1.dball)(`
    SELECT category, type, SUM(amount) as total
    FROM records${buildWhereClause(scope)}
    GROUP BY category, type
    ORDER BY total DESC
  `, scope.params);
    res.json(results);
});
router.get("/monthly-trends", auth_1.authenticate, async (req, res) => {
    const scope = buildScope(req.user);
    // Group records by YEAR-MONTH
    const results = await (0, db_1.dball)(`
    SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
    FROM records${buildWhereClause(scope)}
    GROUP BY strftime('%Y-%m', date), type
    ORDER BY month DESC
  `, scope.params);
    // Reshape to nice JSON object per month
    const trends = {};
    for (const row of results) {
        const month = row.month;
        if (!trends[month])
            trends[month] = { month, INCOME: 0, EXPENSE: 0 };
        trends[month][row.type] = Number(row.total ?? 0);
    }
    res.json(Object.values(trends));
});
exports.default = router;
