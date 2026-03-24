import { runRegressionSuite } from "../src/regression/runRegressionSuite.js";
import { runStatusContractSuite } from "../src/regression/runStatusContractSuite.js";

const regression = runRegressionSuite();
const contract = runStatusContractSuite();

if ((regression?.fail || 0) > 0 || (contract?.fail || 0) > 0) {
  process.exit(1);
}
