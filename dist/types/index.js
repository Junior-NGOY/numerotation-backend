"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = isAuthenticated;
exports.getAuthenticatedUser = getAuthenticatedUser;
function isAuthenticated(req) {
    return req.user !== undefined;
}
function getAuthenticatedUser(req) {
    if (!req.user) {
        throw new Error("User not authenticated");
    }
    return req.user;
}
