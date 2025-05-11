export function replaceBaseUrl(text: string, ip: string): string {
  if (!text || !ip) {
    throw new Error("Both text and IP must be provided.");
  }
  return text.replace("{{BASE_URL}}", ip);
}
