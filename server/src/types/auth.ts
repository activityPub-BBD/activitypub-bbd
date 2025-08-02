import type { JWTPayload } from "jose";

export interface IGoogleIdTokenPayload extends JWTPayload {
  iss: string;
  sub: string;
  aud: string;
  azp?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

