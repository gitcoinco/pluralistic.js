import { linearQF } from "../index.js";

// Tests taken from
// https://github.com/gitcoinco/grants-stack/blob/main/packages/api/docs/linearQF.md#qf-calculation-example
const contributions = [
  {
    contributor: "sender_1",
    recipient: "project_1",
    amount: 100,
  },
  {
    contributor: "sender_2",
    recipient: "project_1",
    amount: 400,
  },
  {
    contributor: "sender_3",
    recipient: "project_1",
    amount: 100,
  },
  {
    contributor: "sender_4",
    recipient: "project_1",
    amount: 900,
  },

  {
    contributor: "sender_1",
    recipient: "project_2",
    amount: 100,
  },
  {
    contributor: "sender_2",
    recipient: "project_2",
    amount: 100,
  },
  {
    contributor: "sender_3",
    recipient: "project_2",
    amount: 100,
  },
  {
    contributor: "sender_4",
    recipient: "project_2",
    amount: 100,
  },
  {
    contributor: "sender_5",
    recipient: "project_2",
    amount: 100,
  },
  {
    contributor: "sender_6",
    recipient: "project_2",
    amount: 100,
  },
  {
    contributor: "sender_7",
    recipient: "project_2",
    amount: 400,
  },

  {
    contributor: "sender_1",
    recipient: "project_3",
    amount: 100,
  },
  {
    contributor: "sender_2",
    recipient: "project_3",
    amount: 900,
  },
  {
    contributor: "sender_3",
    recipient: "project_3",
    amount: 100,
  },
  {
    contributor: "sender_4",
    recipient: "project_3",
    amount: 900,
  },
  {
    contributor: "sender_5",
    recipient: "project_3",
    amount: 100,
  },
  {
    contributor: "sender_6",
    recipient: "project_3",
    amount: 900,
  },
  {
    contributor: "sender_7",
    recipient: "project_3",
    amount: 400,
  },
];

describe("linearQF", () => {
  describe("simple calculation", () => {
    test("calculates the matches", async () => {
      const matchAmount = 100_00;
      const res = linearQF(contributions, matchAmount, {
        minimumAmount: 0,
        ignoreSaturation: true,
        matchingCapAmount: undefined,
      });

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 70,
        totalReceived: 1500,
        matchedWithoutCap: 1360,
        matched: 1360,
      });

      expect(res["project_2"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 80,
        totalReceived: 1000,
        matchedWithoutCap: 2160,
        matched: 2160,
      });

      expect(res["project_3"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 140,
        totalReceived: 3400,
        matchedWithoutCap: 6480,
        matched: 6480,
      });
    });

    test("calculates the matches skipping donations under threshold", async () => {
      const matchAmount = 100_00;
      const contributionsWithLowAmounts = [
        ...contributions,
        {
          contributor: "sender_1",
          recipient: "project_4",
          amount: 10,
        },
        {
          contributor: "sender_2",
          recipient: "project_4",
          amount: 50,
        },
      ];

      const res = linearQF(contributionsWithLowAmounts, matchAmount, {
        minimumAmount: 100,
        ignoreSaturation: true,
        matchingCapAmount: undefined,
      });

      expect(Object.keys(res).length).toEqual(3);
      expect(res["project_4"]).toEqual(undefined);
    });

    test("calculates the matches with total donations greater than matching amount", async () => {
      const matchAmount = 10_00;
      const res = linearQF(contributions, matchAmount);

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 70,
        totalReceived: 1500,
        matchedWithoutCap: 136,
        matched: 136,
      });

      expect(res["project_2"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 80,
        totalReceived: 1000,
        matchedWithoutCap: 216,
        matched: 216,
      });

      expect(res["project_3"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 140,
        totalReceived: 3400,
        matchedWithoutCap: 648,
        matched: 648,
      });
    });

    test("calculates the matches with total donations less than matching amount", async () => {
      const matchAmount = 100_00;
      const contributions = [
        {
          contributor: "sender_1",
          recipient: "project_1",
          amount: 500,
        },
        {
          contributor: "sender_2",
          recipient: "project_1",
          amount: 500,
        },
        {
          contributor: "sender_3",
          recipient: "project_1",
          amount: 500,
        },
        {
          contributor: "sender_4",
          recipient: "project_1",
          amount: 500,
        },

        {
          contributor: "sender_3",
          recipient: "project_2",
          amount: 2000,
        },
        {
          contributor: "sender_4",
          recipient: "project_2",
          amount: 2000,
        },
      ];
      const res = linearQF(contributions, matchAmount);

      expect(Object.keys(res).length).toEqual(2);

      expect(res["project_1"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 89.44271909999159,
        totalReceived: 2000,
        matchedWithoutCap: 3600,
        matched: 3600,
      });

      expect(res["project_2"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 89.44271909999159,
        totalReceived: 4000,
        matchedWithoutCap: 2400,
        matched: 2400,
      });
    });

    test("calculates the matches with matching cap", async () => {
      const matchAmount = 100_00;
      const res = linearQF(contributions, matchAmount, {
        minimumAmount: 0,
        ignoreSaturation: true,
        matchingCapAmount: 5000,
      });

      expect(Object.keys(res).length).toEqual(3);

      // results taken from https://github.com/gitcoinco/grants-stack/blob/main/packages/api/docs/linearQF.md#if-match-cap-is-05
      expect(res["project_1"]).toEqual({
        capOverflow: -3640,
        sumOfSqrt: 70,
        totalReceived: 1500,
        matchedWithoutCap: 1360,
        // matched: 19.3,
        // we will change this test in the next PRs using BigInt and cents or token decimals
        matched: 1931.818181818182,
      });

      expect(res["project_2"]).toEqual({
        capOverflow: -2840,
        sumOfSqrt: 80,
        totalReceived: 1000,
        matchedWithoutCap: 2160,
        // matched: 30.7,
        // we will change this test in the next PRs using BigInt and cents or token decimals
        matched: 3068.181818181818,
      });

      expect(res["project_3"]).toEqual({
        // we will change this test in the next PRs using BigInt and cents or token decimals
        capOverflow: 1480,
        sumOfSqrt: 140,
        totalReceived: 3400,
        matchedWithoutCap: 6480,
        matched: 5000,
      });

      let totalDistributed = 0;
      for (const recipient in res) {
        totalDistributed += res[recipient].matched;
      }

      expect(totalDistributed).toEqual(100_00);
    });
  });
});
