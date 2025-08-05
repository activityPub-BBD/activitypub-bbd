import type { NextFunction, Request, Response } from "express";
import federation from "../federation/federation"
import {config} from "@config/index";

export function attachFederationContext(req: Request, res: Response, next: NextFunction) {
  try {
    const domain = config.domain || 'localhost:8000';
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${domain}`;
    
    const federationContext = federation.createContext(
      new URL(req.originalUrl, baseUrl),
      {
        request: req,
        response: res
      }
    );
    (req as any).federationContext = federationContext;
    next();
  } catch (error) {
    console.error('Failed to create federation context:', error);
    next();
  }
}