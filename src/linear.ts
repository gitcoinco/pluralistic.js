export interface Contribution {
  contributor: string;
  recipient: string;
  amount: number;
}

type AggregatedContributions = {
  [recipient: string]: {
    totalReceived: number;
    contributions: { [contributor: string]: number };
  };
};

export type LinearQFOptions = {};

export type Calculation = {
  totalReceived: number;
  sumOfSqrt: number;
  matched: number;
};

export type RecipientsCalculations = {
  [recipient: string]: Calculation;
};

const defaultLinearQFOptions = (): LinearQFOptions => ({});

const newCalculation = (totalReceived: number): Calculation => ({
  totalReceived,
  sumOfSqrt: 0,
  matched: 0,
});

export const aggregateContributions = (
  contributions: Contribution[]
): AggregatedContributions => {
  const ag: AggregatedContributions = {};

  for (const contribution of contributions) {
    ag[contribution.recipient] ||= {
      totalReceived: 0,
      contributions: {},
    };

    ag[contribution.recipient].totalReceived += contribution.amount;
    ag[contribution.recipient].contributions[contribution.contributor] ||= 0;
    ag[contribution.recipient].contributions[contribution.contributor] +=
      contribution.amount;
  }

  return ag;
};

export const linearQF = (
  rawContributions: Contribution[],
  matchAmount: number,
  options: LinearQFOptions = defaultLinearQFOptions()
) => {
  const aggregated: AggregatedContributions =
    aggregateContributions(rawContributions);
  const calculations: RecipientsCalculations = {};

  let totSqrtSum = 0;

  // for each recipient
  for (const recipient in aggregated) {
    let totRecipientSqrtSum = 0;
    // for each recipient contribution aggregated by contributor
    for (const contributor in aggregated[recipient].contributions) {
      const amount = aggregated[recipient].contributions[contributor];
      const sqrt = Math.sqrt(amount);

      calculations[recipient] ||= newCalculation(
        aggregated[recipient].totalReceived
      );
      calculations[recipient].sumOfSqrt += sqrt;

      totRecipientSqrtSum += sqrt;
    }

    totSqrtSum +=
      Math.pow(totRecipientSqrtSum, 2) - calculations[recipient].totalReceived;
  }

  // for each recipient
  for (const recipient in aggregated) {
    const val =
      Math.pow(calculations[recipient].sumOfSqrt, 2) -
      calculations[recipient].totalReceived;
    calculations[recipient].matched = (val * matchAmount) / totSqrtSum;
  }

  return calculations;
};
