console.warn(
  "[deprecated] runStatusContractAudit.js now proxies runCoverageAudit.js to avoid duplicated logic."
);

await import("./runCoverageAudit.js");