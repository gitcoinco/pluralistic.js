import fs from "fs";
import { linearQF, Contribution } from "../index.js";

interface RawContribution {
  voter: string;
  projectId: string;
  amount: number;
}

function benchmark(name: string, callback: () => void) {
  const start = new Date().getTime();
  callback();
  const end = new Date().getTime();
  const duration = end - start;
  console.log(`* ${name} (${duration} milliseconds)`);
}

if (process.argv.length !== 3) {
  console.log(`Usage: node ${process.argv[1]} CONTRIBUTIONS_FILE_PATH`);
  process.exit(1);
}

const filePath = process.argv[2];

const data = fs.readFileSync(filePath, {
  encoding: "utf8",
  flag: "r",
});

let rawContributions: RawContribution[] = [];
let contributions: Contribution[];

benchmark("loading raw donations", () => {
  rawContributions = JSON.parse(data);
});

benchmark(
  `convert ${rawContributions.length} raw contributions to contributions`,
  () => {
    contributions = rawContributions.map((raw: RawContribution) => ({
      contributor: raw.voter,
      recipient: raw.projectId,
      amount: BigInt(raw.amount),
    }));
  }
);

benchmark("match calculation", () => {
  linearQF(contributions, 333_000n, 6n);
});
