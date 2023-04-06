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
      });

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
        ignoreSaturation: true,
      });

      expect(Object.keys(res).length).toEqual(3);
      expect(res["project_4"]).toEqual(undefined);
    });

    test("calculates the matches with total donations greater than matching amount", async () => {
      const matchAmount = 10;
      const res = linearQF(contributions, matchAmount);

      expect(Object.keys(res).length).toEqual(3);

      expect(res["project_1"]).toEqual({
        sumOfSqrt: 7,
        totalReceived: 15,
        matched: 1.36,
      });

      expect(res["project_2"]).toEqual({
        sumOfSqrt: 8,
        totalReceived: 10,
        matched: 2.16,
      });

      expect(res["project_3"]).toEqual({
        sumOfSqrt: 14,
        totalReceived: 34,
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
        sumOfSqrt: 8.94427190999916,
        totalReceived: 20,
        matched: 36,
      });

      expect(res["project_2"]).toEqual({
        sumOfSqrt: 8.94427190999916,
        totalReceived: 40,
        matched: 24,
      });
    });
  });
});
