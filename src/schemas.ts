import { z } from 'zod';

export const postLookupZipSchema = z.object({
  location: z.string().nonempty()
});

export const postConvZonesSchema = z.object({
  name: z.string().nonempty(),
  latitude: z.number(),
  longitude: z.number(),
  cbg_list: z.array(z.string()),
  start_date: z.string().datetime(),
  size: z.number().nonnegative()
});

export const deleteConvZonesSchema = z.object({
  czone_id: z.coerce.number().nonnegative()
});

export const postPatternsSchema = z.object({
  czone_id: z.number().nonnegative(),
  papdata: z.object({}).passthrough(),
  patterns: z.object({}).passthrough()
});

export const getPatternsSchema = z.object({
  czone_id: z.coerce.number().nonnegative()
});

export const postSimDataSchema = z.object({
  czone_id: z.coerce.number().nonnegative(),
  simdata: z.string().nonempty()
});

export const getSimDataSchema = z.object({
  czone_id: z.coerce.number().nonnegative()
});
