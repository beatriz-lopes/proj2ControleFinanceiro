import { get } from "./api.js";

export function getFinancialHealth() {
  return get("/financial-health");
}
