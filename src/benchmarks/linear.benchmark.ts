import fs from "fs";
import { linearQF, Contribution } from "../index.js";

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

let rawContributions: any;
let contributions: Contribution[];

benchmark("loading raw donations", () => {
  rawContributions = JSON.parse(data);
});

benchmark(
  `convert ${rawContributions.length} raw contributions to contributions`,
  () => {
    contributions = rawContributions.map((raw: any) => ({
      contributor: raw.voter,
      recipient: raw.projectId,
      amount: raw.amount,
    }));
  }
);

// let results: any;

benchmark("match calculation", () => {
  linearQF(contributions, 333000);
});

// console.log(results);
