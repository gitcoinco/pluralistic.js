import { linearQF, RecipientsCalculations } from "../index.js";

// BigInt literals (0n) are not available when targeting lower than ES2020
const b = BigInt;

// Tests taken from
// https://github.com/gitcoinco/grants-stack/blob/main/packages/api/docs/linearQF.md#qf-calculation-example
// ALl numbers are converted to BitInt, so we don't have real decimals.
// Here we are testing like if we were using USDC with 6 decimals.
const contributions = [
  {
    contributor: "sender_1",
    recipient: "project_1",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_2",
    recipient: "project_1",
    amount: b(4_000_000),
  },
  {
    contributor: "sender_3",
    recipient: "project_1",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_4",
    recipient: "project_1",
    amount: b(9_000_000),
  },

  {
    contributor: "sender_1",
    recipient: "project_2",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_2",
    recipient: "project_2",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_3",
    recipient: "project_2",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_4",
    recipient: "project_2",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_5",
    recipient: "project_2",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_6",
    recipient: "project_2",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_7",
    recipient: "project_2",
    amount: b(4_000_000),
  },

  {
    contributor: "sender_1",
    recipient: "project_3",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_2",
    recipient: "project_3",
    amount: b(9_000_000),
  },
  {
    contributor: "sender_3",
    recipient: "project_3",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_4",
    recipient: "project_3",
    amount: b(9_000_000),
  },
  {
    contributor: "sender_5",
    recipient: "project_3",
    amount: b(1_000_000),
  },
  {
    contributor: "sender_6",
    recipient: "project_3",
    amount: b(9_000_000),
  },
  {
    contributor: "sender_7",
    recipient: "project_3",
    amount: b(4_000_000),
  },
];

const DECIMALS_PRECISION = b(6);

const testDistributedAmount = (
  rc: RecipientsCalculations,
  expectedAmount: bigint,
  maxDifference: bigint = b(0)
) => {
  let totalDistributed = b(0);

  for (const recipient in rc) {
    totalDistributed += rc[recipient].matched;
  }
  if (maxDifference === b(0)) {
    expect(totalDistributed).toEqual(expectedAmount);
  } else {
    expect(totalDistributed).not.toBeGreaterThan(expectedAmount);
    expect(totalDistributed).not.toBeLessThan(expectedAmount - maxDifference);
  }
};

describe("linearQF", () => {
  describe("simple calculation", () => {
    test("calculates the matches", async () => {
      const matchAmount = b(100_000_000);
      const res = linearQF(contributions, matchAmount, DECIMALS_PRECISION, {
        minimumAmount: b(0),
        ignoreSaturation: true,
        matchingCapAmount: undefined,
      });

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(7_000),
        totalReceived: b(15_000_000),
        matchedWithoutCap: b(13_600_000),
        matched: b(13_600_000),
      });

      expect(res["project_2"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(8000),
        totalReceived: b(10_000_000),
        matchedWithoutCap: b(21_600_000),
        matched: b(21_600_000),
      });

      expect(res["project_3"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(14000),
        totalReceived: b(34_000_000),
        matchedWithoutCap: b(64_800_000),
        matched: b(64_800_000),
      });

      testDistributedAmount(res, b(100_000_000), b(0));
    });

    test("calculates the matches skipping donations under threshold", async () => {
      const matchAmount = b(100_000_000);
      const contributionsWithLowAmounts = [
        ...contributions,
        {
          contributor: "sender_1",
          recipient: "project_4",
          amount: b(100_000),
        },
        {
          contributor: "sender_2",
          recipient: "project_4",
          amount: b(500_000),
        },
      ];

      const res = linearQF(
        contributionsWithLowAmounts,
        matchAmount,
        DECIMALS_PRECISION,
        {
          minimumAmount: b(1_000_000),
          ignoreSaturation: true,
          matchingCapAmount: undefined,
        }
      );

      expect(Object.keys(res).length).toEqual(3);
      expect(res["project_4"]).toEqual(undefined);

      expect(res["project_1"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(7_000),
        totalReceived: b(15_000_000),
        matchedWithoutCap: b(13_600_000),
        matched: b(13_600_000),
      });

      expect(res["project_2"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(8000),
        totalReceived: b(10_000_000),
        matchedWithoutCap: b(21_600_000),
        matched: b(21_600_000),
      });

      expect(res["project_3"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(14000),
        totalReceived: b(34_000_000),
        matchedWithoutCap: b(64_800_000),
        matched: b(64_800_000),
      });

      testDistributedAmount(res, b(100_000_000), b(0));
    });

    test("calculates the matches with total donations greater than matching amount", async () => {
      const matchAmount = b(10_000_000);
      const res = linearQF(contributions, matchAmount, DECIMALS_PRECISION);

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(7000),
        totalReceived: b(15_000_000),
        matchedWithoutCap: b(1_360_000),
        matched: b(1_360_000),
      });

      expect(res["project_2"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(8000),
        totalReceived: b(10_000_000),
        matchedWithoutCap: b(2_160_000),
        matched: b(2_160_000),
      });

      expect(res["project_3"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(14000),
        totalReceived: b(34_000_000),
        matchedWithoutCap: b(6_480_000),
        matched: b(6_480_000),
      });

      testDistributedAmount(res, b(10_000_000), b(0));
    });

    test("calculates the matches with total donations less than matching amount", async () => {
      const matchAmount = b(100_000_000);
      const contributions = [
        {
          contributor: "sender_1",
          recipient: "project_1",
          amount: b(5_000_000),
        },
        {
          contributor: "sender_2",
          recipient: "project_1",
          amount: b(5_000_000),
        },
        {
          contributor: "sender_3",
          recipient: "project_1",
          amount: b(5_000_000),
        },
        {
          contributor: "sender_4",
          recipient: "project_1",
          amount: b(5_000_000),
        },

        {
          contributor: "sender_3",
          recipient: "project_2",
          amount: b(20_000_000),
        },
        {
          contributor: "sender_4",
          recipient: "project_2",
          amount: b(20_000_000),
        },
      ];

      const res = linearQF(contributions, matchAmount, DECIMALS_PRECISION);

      expect(res["project_1"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(8944),
        totalReceived: b(20_000_000),
        matchedWithoutCap: b(36_000_583),
        matched: b(36_000_583),
      });

      expect(res["project_2"]).toEqual({
        capOverflow: b(0),
        sumOfSqrt: b(8_944),
        totalReceived: b(40_000_000),
        matchedWithoutCap: b(23_999_416),
        matched: b(23_999_416),
      });

      testDistributedAmount(res, b(60_000_000), b(1));
    });

    test("calculates the matches with matching cap", async () => {
      const matchAmount = b(100_000_000);
      const res = linearQF(contributions, matchAmount, DECIMALS_PRECISION, {
        minimumAmount: b(0),
        ignoreSaturation: true,
        matchingCapAmount: b(50_000_000),
      });

      expect(Object.keys(res).length).toEqual(3);

      // results taken from https://github.com/gitcoinco/grants-stack/blob/main/packages/api/docs/linearQF.md#if-match-cap-is-05
      expect(res["project_1"]).toEqual({
        capOverflow: b(-36_400_000),
        sumOfSqrt: b(7000),
        totalReceived: b(15_000_000),
        matchedWithoutCap: b(13_600_000),
        // matched: 19.3,
        // we will change this test in the next PRs using BigInt and cents or token decimals
        matched: b(19_318_181),
      });

      expect(res["project_2"]).toEqual({
        capOverflow: b(-28_400_000),
        sumOfSqrt: b(8000),
        totalReceived: b(10_000_000),
        matchedWithoutCap: b(21_600_000),
        // matched: 30.7,
        // we will change this test in the next PRs using BigInt and cents or token decimals
        matched: b(30_681_818),
      });

      expect(res["project_3"]).toEqual({
        // we will change this test in the next PRs using BigInt and cents or token decimals
        capOverflow: b(14_800_000),
        sumOfSqrt: b(14000),
        totalReceived: b(34_000_000),
        matchedWithoutCap: b(64_800_000),
        matched: b(50_000_000),
      });

      testDistributedAmount(res, b(100_000_000), b(1));
    });
  });
});
