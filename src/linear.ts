export interface Donation {
  voter: string;
  projectId: string;
  amountUSD: number;
}

type AggregatedDonations = {
  [projectId: string]: {
    totalReceived: number;
    donations: { [voter: string]: number };
  };
};

export type LinearQFOptions = {};

export type Calculation = {
  totalReceived: number;
  sumOfSqrt: number;
  matched: number;
};

export type ProjectsCalculations = {
  [projectId: string]: Calculation;
};

const defaultLinearQFOptions = (): LinearQFOptions => ({});

const newCalculation = (totalReceived: number): Calculation => ({
  totalReceived,
  sumOfSqrt: 0,
  matched: 0,
});

export const aggregateDonations = (
  donations: Donation[]
): AggregatedDonations => {
  const ag: AggregatedDonations = {};

  for (const donation of donations) {
    ag[donation.projectId] ||= {
      totalReceived: 0,
      donations: {},
    };

    ag[donation.projectId].totalReceived += donation.amountUSD;
    ag[donation.projectId].donations[donation.voter] ||= 0;
    ag[donation.projectId].donations[donation.voter] += donation.amountUSD;
  }

  return ag;
};

export const linearQF = (
  rawDonations: Donation[],
  matchAmount: number,
  options: LinearQFOptions = defaultLinearQFOptions()
) => {
  const aggregated: AggregatedDonations = aggregateDonations(rawDonations);
  const calculations: ProjectsCalculations = {};

  let totSqrtSum = 0;

  // for each project
  for (const projectId in aggregated) {
    let totProjectSqrtSum = 0;
    // for each project donation aggregated by voter
    for (const voter in aggregated[projectId].donations) {
      const amount = aggregated[projectId].donations[voter];
      const sqrt = Math.sqrt(amount);

      calculations[projectId] ||= newCalculation(
        aggregated[projectId].totalReceived
      );
      calculations[projectId].sumOfSqrt += sqrt;

      totProjectSqrtSum += sqrt;
    }

    totSqrtSum +=
      Math.pow(totProjectSqrtSum, 2) - calculations[projectId].totalReceived;
  }

  // for each project
  for (const projectId in aggregated) {
    const val =
      Math.pow(calculations[projectId].sumOfSqrt, 2) -
      calculations[projectId].totalReceived;
    calculations[projectId].matched = (val * matchAmount) / totSqrtSum;
  }

  return calculations;
};
