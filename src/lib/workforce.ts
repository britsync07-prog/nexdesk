export const WORKERS_BY_LOCATION = {
  Mirpur: ["Palash", "Rezaul", "Rashed", "Polok"],
  Narshinghpur: ["Tuhin", "Mithu", "Sajinur", "Sujon", "Sakil", "Shakib", "Susanto", "Rana", "Sagor", "Likhon", "Mamun", "Hussain"],
} as const;

export const LOCATIONS = Object.keys(WORKERS_BY_LOCATION) as (keyof typeof WORKERS_BY_LOCATION)[];

export function isAllowedWorker(location: string, name: string) {
  return name === "Hajira" || (WORKERS_BY_LOCATION[location as keyof typeof WORKERS_BY_LOCATION] || []).includes(name as never);
}
