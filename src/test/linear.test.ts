import { linearQF } from "../index.js";

const votes = [
  {
    voter: "sender_1",
    projectId: "project_1",
    amountUSD: 1,
  },
  {
    voter: "sender_2",
    projectId: "project_1",
    amountUSD: 4,
  },
  {
    voter: "sender_3",
    projectId: "project_1",
    amountUSD: 1,
  },
  {
    voter: "sender_4",
    projectId: "project_1",
    amountUSD: 9,
  },

  {
    voter: "sender_1",
    projectId: "project_2",
    amountUSD: 1,
  },
  {
    voter: "sender_2",
    projectId: "project_2",
    amountUSD: 1,
  },
  {
    voter: "sender_3",
    projectId: "project_2",
    amountUSD: 1,
  },
  {
    voter: "sender_4",
    projectId: "project_2",
    amountUSD: 1,
  },
  {
    voter: "sender_5",
    projectId: "project_2",
    amountUSD: 1,
  },
  {
    voter: "sender_6",
    projectId: "project_2",
    amountUSD: 1,
  },
  {
    voter: "sender_7",
    projectId: "project_2",
    amountUSD: 4,
  },


  {
    voter: "sender_1",
    projectId: "project_3",
    amountUSD: 1,
  },
  {
    voter: "sender_2",
    projectId: "project_3",
    amountUSD: 9,
  },
  {
    voter: "sender_3",
    projectId: "project_3",
    amountUSD: 1,
  },
  {
    voter: "sender_4",
    projectId: "project_3",
    amountUSD: 9,
  },
  {
    voter: "sender_5",
    projectId: "project_3",
    amountUSD: 1,
  },
  {
    voter: "sender_6",
    projectId: "project_3",
    amountUSD: 9,
  },
  {
    voter: "sender_7",
    projectId: "project_3",
    amountUSD: 4,
  },
];

describe("linearQF", () => {
  describe("simple calculation", () => {
    test("calculates the matches", async () => {
      const matchAmount = 100;
      const res = linearQF(votes, matchAmount);

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
  });
});
