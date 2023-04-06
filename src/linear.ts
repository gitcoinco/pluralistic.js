export interface Contribution {
  contributor: string;
  recipient: string;
  amount: number;
}

type AggregatedContribution = {
  totalReceived: number;
  contributions: { [contributor: string]: number };
};

type AggregatedContributions = {
  totalReceived: number;
  list: {
    [recipient: string]: AggregatedContribution;
  };
};

export type LinearQFOptions = {
  minimumAmount: number;
  ignoreSaturation: boolean;
};

export type Calculation = {
  totalReceived: number;
  sumOfSqrt: number;
  matched: number;
};

export type RecipientsCalculations = {
  [recipient: string]: Calculation;
};

const defaultLinearQFOptions = (): LinearQFOptions => ({
  minimumAmount: 0,
  ignoreSaturation: false,
});

const newCalculation = (totalReceived: number): Calculation => ({
  totalReceived,
  sumOfSqrt: 0,
  matched: 0,
});

export const aggregateContributions = (
  contributions: Contribution[],
  options: LinearQFOptions
): AggregatedContributions => {
  const ag: AggregatedContributions = {
    totalReceived: 0,
    list: {},
  };

  for (const contribution of contributions) {
    if (contribution.amount <= options.minimumAmount) {
      continue;
    }

    ag.list[contribution.recipient] ||= {
      totalReceived: 0,
      contributions: {},
    };

    ag.totalReceived += contribution.amount;
    ag.list[contribution.recipient].totalReceived += contribution.amount;
    ag.list[contribution.recipient].contributions[
      contribution.contributor
    ] ||= 0;
    ag.list[contribution.recipient].contributions[contribution.contributor] +=
      contribution.amount;
  }

  return ag;
};

export const linearQF = (
  rawContributions: Contribution[],
  matchAmount: number,
  options: LinearQFOptions = defaultLinearQFOptions()
) => {
  const aggregated: AggregatedContributions = aggregateContributions(
    rawContributions,
    options
  );
  const calculations: RecipientsCalculations = {};

  let totSqrtSum = 0;

  // for each recipient
  for (const recipient in aggregated.list) {
    let totRecipientSqrtSum = 0;
    // for each recipient contribution aggregated by contributor
    for (const contributor in aggregated.list[recipient].contributions) {
      const amount = aggregated.list[recipient].contributions[contributor];
      const sqrt = Math.sqrt(amount);

      calculations[recipient] ||= newCalculation(
        aggregated.list[recipient].totalReceived
      );

      calculations[recipient].sumOfSqrt += sqrt;
      totRecipientSqrtSum += sqrt;
    }

    totSqrtSum +=
      Math.pow(totRecipientSqrtSum, 2) - calculations[recipient].totalReceived;
  }

  // for each recipient
  for (const recipient in aggregated.list) {
    const val =
      Math.pow(calculations[recipient].sumOfSqrt, 2) -
      calculations[recipient].totalReceived;

    let matchRatio = 1;

    if (
      aggregated.totalReceived < matchAmount &&
      options.ignoreSaturation === false
    ) {
      matchRatio = aggregated.totalReceived / matchAmount;
    }

    calculations[recipient].matched =
      ((val * matchAmount) / totSqrtSum) * matchRatio;
  }

  return calculations;
};
