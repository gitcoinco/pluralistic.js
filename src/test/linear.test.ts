import { linearQF, RecipientsCalculations } from "../index.js";

// Tests taken from
// https://github.com/gitcoinco/grants-stack/blob/main/packages/api/docs/linearQF.md#qf-calculation-example
// ALl numbers are converted to BitInt, so we don't have real decimals.
// Here we are testing like if we were using USDC with 6 decimals.
const contributions = [
  {
    contributor: "sender_1",
    recipient: "project_1",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_2",
    recipient: "project_1",
    amount: 4_000_000n,
  },
  {
    contributor: "sender_3",
    recipient: "project_1",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_4",
    recipient: "project_1",
    amount: 9_000_000n,
  },

  {
    contributor: "sender_1",
    recipient: "project_2",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_2",
    recipient: "project_2",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_3",
    recipient: "project_2",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_4",
    recipient: "project_2",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_5",
    recipient: "project_2",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_6",
    recipient: "project_2",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_7",
    recipient: "project_2",
    amount: 4_000_000n,
  },

  {
    contributor: "sender_1",
    recipient: "project_3",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_2",
    recipient: "project_3",
    amount: 9_000_000n,
  },
  {
    contributor: "sender_3",
    recipient: "project_3",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_4",
    recipient: "project_3",
    amount: 9_000_000n,
  },
  {
    contributor: "sender_5",
    recipient: "project_3",
    amount: 1_000_000n,
  },
  {
    contributor: "sender_6",
    recipient: "project_3",
    amount: 9_000_000n,
  },
  {
    contributor: "sender_7",
    recipient: "project_3",
    amount: 4_000_000n,
  },
];

const DECIMALS_PRECISION = 6n;

const testDistributedAmount = (
  rc: RecipientsCalculations,
  expectedAmount: bigint,
  maxDifference = 0n
) => {
  let totalDistributed = 0n;

  for (const recipient in rc) {
    totalDistributed += rc[recipient].matched;
  }
  if (maxDifference === 0n) {
    expect(totalDistributed).toEqual(expectedAmount);
  } else {
    expect(totalDistributed).not.toBeGreaterThan(expectedAmount);
    expect(totalDistributed).not.toBeLessThan(expectedAmount - maxDifference);
  }
};

describe("linearQF", () => {
  describe("simple calculation", () => {
    test("calculates the matches when round is saturated", async () => {
      const matchAmount = 100_000_000n;
      const res = linearQF(contributions, matchAmount, DECIMALS_PRECISION, {
        minimumAmount: 0n,
        ignoreSaturation: false,
        matchingCapAmount: undefined,
      });

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        contributionsCount: 4n,
        capOverflow: 0n,
        sumOfSqrt: 7_000n,
        totalReceived: 15_000_000n,
        matchedWithoutCap: 13_600_000n,
        matched: 13_600_000n,
      });

      expect(res["project_2"]).toEqual({
        contributionsCount: 7n,
        capOverflow: 0n,
        sumOfSqrt: 8000n,
        totalReceived: 10_000_000n,
        matchedWithoutCap: 21_600_000n,
        matched: 21_600_000n,
      });

      expect(res["project_3"]).toEqual({
        contributionsCount: 7n,
        capOverflow: 0n,
        sumOfSqrt: 14000n,
        totalReceived: 34_000_000n,
        matchedWithoutCap: 64_800_000n,
        matched: 64_800_000n,
      });

      testDistributedAmount(res, 100_000_000n, 0n);
    });

    test("calculates the matches when round is not saturated", async () => {
      // 1000 instead of the previous 100.
      // The sum of matches is 250 so it's not saturated
      const matchAmount = 1_000_000_000n;
      const res = linearQF(contributions, matchAmount, DECIMALS_PRECISION, {
        minimumAmount: 0n,
        ignoreSaturation: false,
        matchingCapAmount: undefined,
      });

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        contributionsCount: 4n,
        capOverflow: 0n,
        sumOfSqrt: 7_000n,
        totalReceived: 15_000_000n,
        matchedWithoutCap: 34_000_000n,
        matched: 34_000_000n,
      });

      expect(res["project_2"]).toEqual({
        contributionsCount: 7n,
        capOverflow: 0n,
        sumOfSqrt: 8000n,
        totalReceived: 10_000_000n,
        matchedWithoutCap: 54_000_000n,
        matched: 54_000_000n,
      });

      expect(res["project_3"]).toEqual({
        contributionsCount: 7n,
        capOverflow: 0n,
        sumOfSqrt: 14000n,
        totalReceived: 34_000_000n,
        matchedWithoutCap: 162_000_000n,
        matched: 162_000_000n,
      });

      // since it's not saturated we distribute 250 instead of 1000
      testDistributedAmount(res, 250_000_000n, 0n);
    });

    test("calculates the matches when round is not saturated but forcing saturation", async () => {
      const matchAmount = 1_000_000_000n;
      const res = linearQF(contributions, matchAmount, DECIMALS_PRECISION, {
        minimumAmount: 0n,
        ignoreSaturation: true,
        matchingCapAmount: undefined,
      });

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        contributionsCount: 4n,
        capOverflow: 0n,
        sumOfSqrt: 7_000n,
        totalReceived: 15_000_000n,
        matchedWithoutCap: 136_000_000n,
        matched: 136_000_000n,
      });

      expect(res["project_2"]).toEqual({
        contributionsCount: 7n,
        capOverflow: 0n,
        sumOfSqrt: 8000n,
        totalReceived: 10_000_000n,
        matchedWithoutCap: 216_000_000n,
        matched: 216_000_000n,
      });

      expect(res["project_3"]).toEqual({
        contributionsCount: 7n,
        capOverflow: 0n,
        sumOfSqrt: 14000n,
        totalReceived: 34_000_000n,
        matchedWithoutCap: 648_000_000n,
        matched: 648_000_000n,
      });

      testDistributedAmount(res, 1_000_000_000n, 0n);
    });

    test("calculates the matches with total donations greater than matching amount", async () => {
      const matchAmount = 10_000_000n;
      const res = linearQF(contributions, matchAmount, DECIMALS_PRECISION);

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        contributionsCount: 4n,
        capOverflow: 0n,
        sumOfSqrt: 7000n,
        totalReceived: 15_000_000n,
        matchedWithoutCap: 1_360_000n,
        matched: 1_360_000n,
      });

      expect(res["project_2"]).toEqual({
        contributionsCount: 7n,
        capOverflow: 0n,
        sumOfSqrt: 8000n,
        totalReceived: 10_000_000n,
        matchedWithoutCap: 2_160_000n,
        matched: 2_160_000n,
      });

      expect(res["project_3"]).toEqual({
        contributionsCount: 7n,
        capOverflow: 0n,
        sumOfSqrt: 14000n,
        totalReceived: 34_000_000n,
        matchedWithoutCap: 6_480_000n,
        matched: 6_480_000n,
      });

      testDistributedAmount(res, 10_000_000n, 0n);
    });

    test("calculates the matches with matching cap", async () => {
      const matchAmount = 100_000_000n;
      const res = linearQF(contributions, matchAmount, DECIMALS_PRECISION, {
        minimumAmount: 0n,
        ignoreSaturation: true,
        matchingCapAmount: 50_000_000n,
      });

      expect(Object.keys(res).length).toEqual(3);

      // results taken from https://github.com/gitcoinco/grants-stack/blob/main/packages/api/docs/linearQF.md#if-match-cap-is-05
      expect(res["project_1"]).toEqual({
        contributionsCount: 4n,
        capOverflow: -36_400_000n,
        sumOfSqrt: 7000n,
        totalReceived: 15_000_000n,
        matchedWithoutCap: 13_600_000n,
        matched: 19_318_181n,
      });

      expect(res["project_2"]).toEqual({
        contributionsCount: 7n,
        capOverflow: -28_400_000n,
        sumOfSqrt: 8000n,
        totalReceived: 10_000_000n,
        matchedWithoutCap: 21_600_000n,
        matched: 30_681_818n,
      });

      expect(res["project_3"]).toEqual({
        contributionsCount: 7n,
        capOverflow: 14_800_000n,
        sumOfSqrt: 14000n,
        totalReceived: 34_000_000n,
        matchedWithoutCap: 64_800_000n,
        matched: 50_000_000n,
      });

      testDistributedAmount(res, 100_000_000n, 1n);
    });
  });

  test("calculates when all projects receive less than one contribution", async () => {
    const matchAmount = 100000n;
    const contributions = [
      {
        contributor: "sender_1",
        recipient: "project_1",
        amount: 100n,
      },
      {
        contributor: "sender_2",
        recipient: "project_2",
        amount: 200n,
      },
    ];

    const res = linearQF(contributions, matchAmount, DECIMALS_PRECISION, {
      minimumAmount: 0n,
      ignoreSaturation: true,
      matchingCapAmount: undefined,
    });

    expect(res["project_1"]).toEqual({
      contributionsCount: 1n,
      capOverflow: 0n,
      sumOfSqrt: 10n,
      totalReceived: 100n,
      matchedWithoutCap: 0n,
      matched: 0n,
    });

    expect(res["project_2"]).toEqual({
      contributionsCount: 1n,
      capOverflow: 0n,
      sumOfSqrt: 14n,
      totalReceived: 200n,
      matchedWithoutCap: 0n,
      matched: 0n,
    });
  });
});
