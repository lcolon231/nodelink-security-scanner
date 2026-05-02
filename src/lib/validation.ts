import { z } from 'zod';

const DOMAIN_RE = /^(?!-)(?:[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$/;

export const DomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(4)
  .max(253)
  .transform((s) => s.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, ''))
  .refine((s) => DOMAIN_RE.test(s), { message: 'Invalid domain format' });