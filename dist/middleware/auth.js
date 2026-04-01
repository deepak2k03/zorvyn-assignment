"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = exports.getJwtSecret = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getJwtSecret = () => process.env.JWT_SECRET;
exports.getJwtSecret = getJwtSecret;
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    const jwtSecret = (0, exports.getJwtSecret)();
    if (!jwtSecret) {
        return res
            .status(500)
            .json({ error: "Server misconfigured: JWT secret is not set" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(403).json({ error: "Forbidden: Invalid token" });
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res
                .status(403)
                .json({ error: "Forbidden: Insufficient permissions" });
        }
        next();
    };
};
exports.authorize = authorize;
