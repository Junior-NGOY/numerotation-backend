// Type definitions for the application

import { Request } from "express";

// Interface pour les requêtes authentifiées
export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  }
}

// Type guard pour vérifier si la requête est authentifiée
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return req.user !== undefined;
}

// Helper function to get authenticated user from request
export function getAuthenticatedUser(req: Request) {
  if (!req.user) {
    throw new Error("User not authenticated");
  }
  return req.user;
}

// API Response type
export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    pages?: number;
    limit?: number;
  };
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Search params
export interface SearchParams extends PaginationParams {
  query?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
