import { linearQF } from "../index.js";

// Tests taken from
// https://github.com/gitcoinco/grants-stack/blob/main/packages/api/docs/linearQF.md#qf-calculation-example
const contributions = [
  {
    contributor: "sender_1",
    recipient: "project_1",
    amount: 1,
  },
  {
    contributor: "sender_2",
    recipient: "project_1",
    amount: 4,
  },
  {
    contributor: "sender_3",
    recipient: "project_1",
    amount: 1,
  },
  {
    contributor: "sender_4",
    recipient: "project_1",
    amount: 9,
  },

  {
    contributor: "sender_1",
    recipient: "project_2",
    amount: 1,
  },
  {
    contributor: "sender_2",
    recipient: "project_2",
    amount: 1,
  },
  {
    contributor: "sender_3",
    recipient: "project_2",
    amount: 1,
  },
  {
    contributor: "sender_4",
    recipient: "project_2",
    amount: 1,
  },
  {
    contributor: "sender_5",
    recipient: "project_2",
    amount: 1,
  },
  {
    contributor: "sender_6",
    recipient: "project_2",
    amount: 1,
  },
  {
    contributor: "sender_7",
    recipient: "project_2",
    amount: 4,
  },

  {
    contributor: "sender_1",
    recipient: "project_3",
    amount: 1,
  },
  {
    contributor: "sender_2",
    recipient: "project_3",
    amount: 9,
  },
  {
    contributor: "sender_3",
    recipient: "project_3",
    amount: 1,
  },
  {
    contributor: "sender_4",
    recipient: "project_3",
    amount: 9,
  },
  {
    contributor: "sender_5",
    recipient: "project_3",
    amount: 1,
  },
  {
    contributor: "sender_6",
    recipient: "project_3",
    amount: 9,
  },
  {
    contributor: "sender_7",
    recipient: "project_3",
    amount: 4,
  },
];

describe("linearQF", () => {
  describe("simple calculation", () => {
    test("calculates the matches", async () => {
      const matchAmount = 100;
      const res = linearQF(contributions, matchAmount, {
        minimumAmount: 0,
        ignoreSaturation: true,
        matchingCapAmount: undefined,
      });

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 7,
        totalReceived: 15,
        matchedWithoutCap: 13.6,
        matched: 13.6,
      });

      expect(res["project_2"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 8,
        totalReceived: 10,
        matchedWithoutCap: 21.6,
        matched: 21.6,
      });

      expect(res["project_3"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 14,
        totalReceived: 34,
        matchedWithoutCap: 64.8,
        matched: 64.8,
      });
    });

    test("calculates the matches skipping donations under threshold", async () => {
      const matchAmount = 100;
      const contributionsWithLowAmounts = [
        ...contributions,
        {
          contributor: "sender_1",
          recipient: "project_4",
          amount: 0.1,
        },
        {
          contributor: "sender_2",
          recipient: "project_4",
          amount: 0.5,
        },
      ];

      const res = linearQF(contributionsWithLowAmounts, matchAmount, {
        minimumAmount: 1,
        ignoreSaturation: true,
        matchingCapAmount: undefined,
      });

      expect(Object.keys(res).length).toEqual(3);
      expect(res["project_4"]).toEqual(undefined);
    });

    test("calculates the matches with total donations greater than matching amount", async () => {
      const matchAmount = 10;
      const res = linearQF(contributions, matchAmount);

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 7,
        totalReceived: 15,
        matchedWithoutCap: 1.36,
        matched: 1.36,
      });

      expect(res["project_2"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 8,
        totalReceived: 10,
        matchedWithoutCap: 2.16,
        matched: 2.16,
      });

      expect(res["project_3"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 14,
        totalReceived: 34,
        matchedWithoutCap: 6.48,
        matched: 6.48,
      });
    });

    test("calculates the matches with total donations less than matching amount", async () => {
      const matchAmount = 100;
      const contributions = [
        {
          contributor: "sender_1",
          recipient: "project_1",
          amount: 5,
        },
        {
          contributor: "sender_2",
          recipient: "project_1",
          amount: 5,
        },
        {
          contributor: "sender_3",
          recipient: "project_1",
          amount: 5,
        },
        {
          contributor: "sender_4",
          recipient: "project_1",
          amount: 5,
        },

        {
          contributor: "sender_3",
          recipient: "project_2",
          amount: 20,
        },
        {
          contributor: "sender_4",
          recipient: "project_2",
          amount: 20,
        },
      ];
      const res = linearQF(contributions, matchAmount);

      expect(Object.keys(res).length).toEqual(2);

      expect(res["project_1"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 8.94427190999916,
        totalReceived: 20,
        matchedWithoutCap: 36,
        matched: 36,
      });

      expect(res["project_2"]).toEqual({
        capOverflow: 0,
        sumOfSqrt: 8.94427190999916,
        totalReceived: 40,
        matchedWithoutCap: 24,
        matched: 24,
      });
    });

    test("calculates the matches with matching cap", async () => {
      const matchAmount = 100;
      const res = linearQF(contributions, matchAmount, {
        minimumAmount: 0,
        ignoreSaturation: true,
        matchingCapAmount: 50,
      });

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        capOverflow: -36.4,
        sumOfSqrt: 7,
        totalReceived: 15,
        matchedWithoutCap: 13.6,
        matched: 36.4,
      });

      expect(res["project_2"]).toEqual({
        capOverflow: -28.4,
        sumOfSqrt: 8,
        totalReceived: 10,
        matchedWithoutCap: 21.6,
        matched: 28.4,
      });

      expect(res["project_3"]).toEqual({
        // we will change this test in the next PRs using BigInt and cents or token decimals
        capOverflow: 14.799999999999997,
        sumOfSqrt: 14,
        totalReceived: 34,
        matchedWithoutCap: 64.8,
        matched: 50,
      });
    });
  });
});
