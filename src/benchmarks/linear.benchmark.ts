import fs from "fs";
import { linearQF, Contribution } from "../index.js";

interface RawContribution {
  voter: string;
  projectId: string;
  amountRoundToken: string;
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
      amount: BigInt(raw.amountRoundToken),
    }));
  }
);

benchmark("match calculation", () => {
  const matchAmount = 350000000000000000000000n;
  const matchingCapPercentage = 4;

  const matchingCapAmount =
    (matchAmount * BigInt(Math.trunc(matchingCapPercentage * 100))) / 10000n;

  const res = linearQF(contributions, matchAmount, 18n, {
    minimumAmount: 1000000000000000000n,
    ignoreSaturation: false,
    matchingCapAmount,
  });

  console.log(res);

  let totalDistributed = 0n;

  for (const recipient in res) {
    totalDistributed += res[recipient].matched;
  }

  console.log("totalApplications", Object.keys(res).length);
  console.log("cap", matchingCapAmount);
  console.log("totalDistributed", totalDistributed);
  console.log("distributed %", (totalDistributed * 100n) / matchAmount);
});
