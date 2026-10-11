/** States and union territories of India, for address forms. */
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export const PIN_CODE_RE = /^[1-9][0-9]{5}$/;
/** Indian mobile number, optionally prefixed with +91 / 91 / 0. */
export const INDIAN_MOBILE_RE = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/;

export function normaliseIndianMobile(input: string): string {
  const digits = input.replace(/\D/g, "");
  return `+91${digits.slice(-10)}`;
}
