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
  const options = {
    minimumAmount: 1000000000000000000n,
    matchingCapAmount: 14000000000000000000000n,
    ignoreSaturation: false,
  };

  const matchAmount = 350000000000000000000000n;

  console.log("matchAmount ", matchAmount);
  console.log(options);

  const results = linearQF(contributions, matchAmount, 18n, options);

  let totalMatched = 0n;

  for (const id in results) {
    const result = results[id];
    totalMatched += result.matched;

    if (result.matched > options.matchingCapAmount) {
      console.error(
        "matched amount exceeds matching cap",
        result.matched,
        options.matchingCapAmount
      );
    }
  }

  const roundSaturation =
    Number(((totalMatched * BigInt(10_000)) / matchAmount) * BigInt(10_000)) /
    1_000_000;

  console.log("totalMatched", totalMatched);
  console.log("difference  ", matchAmount - totalMatched);
  console.log("saturation  ", roundSaturation, "%");
});
