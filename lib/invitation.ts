import { z } from "zod";
export type DateInvitation = {
  accepted: boolean;
  date: string;
  time: string;
  food: string;
  otherFood?: string;
};
export const foods = [
  ["🍕", "Pizza"],
  ["🍔", "Burger"],
  ["🍣", "Sushi"],
  ["🍝", "Pâtes"],
  ["🌮", "Tacos"],
  ["🍜", "Ramen"],
  ["🍗", "Poulet grillé"],
  ["🥩", "Brochettes"],
  ["🍲", "Romazava"],
  ["🥬", "Ravitoto"],
  ["🍚", "Vary amin'anana"],
  ["🥟", "Cuisine chinoise"],
  ["🍨", "Dessert / Glace"],
  ["☕", "Café / Chocolat chaud"],
  ["🍹", "Jus / Milkshake"],
  ["🎁", "Surprise-moi"],
  ["✏️", "Autre"],
] as const;
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function isFuture(date: string, time: string) {
  return new Date(`${date}T${time}`).getTime() > Date.now();
}
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
export const responseSchema = z
  .object({
    id: z.uuid(),
    accepted: z.literal(true),
    date: z.iso.date(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    food: z.string().refine((v) => foods.some(([, name]) => name === v)),
    otherFood: z.string().trim().max(120).optional(),
    timezoneOffset: z.number().int().min(-840).max(840),
  })
  .refine((v) => v.food !== "Autre" || Boolean(v.otherFood?.trim()), {
    message: "Précise ton envie.",
    path: ["otherFood"],
  });
export type DateResponse = z.infer<typeof responseSchema>;
export function appointmentTimestamp(v: DateResponse) {
  return Date.parse(`${v.date}T${v.time}:00Z`) + v.timezoneOffset * 60000;
}
