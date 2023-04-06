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
      const res = linearQF(contributions, matchAmount);

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        sumOfSqrt: 7,
        totalReceived: 15,
        matched: 13.6,
      });

      expect(res["project_2"]).toEqual({
        sumOfSqrt: 8,
        totalReceived: 10,
        matched: 21.6,
      });

      expect(res["project_3"]).toEqual({
        sumOfSqrt: 14,
        totalReceived: 34,
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
      });

      expect(Object.keys(res).length).toEqual(3);
      expect(res["project_4"]).toEqual(undefined);
    });
  });
});
