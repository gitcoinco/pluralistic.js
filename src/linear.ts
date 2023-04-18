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
  matchingCapAmount: number | undefined; // an amount, not a percentage
};

export type Calculation = {
  totalReceived: number;
  sumOfSqrt: number;
  capOverflow: number;
  matchedWithoutCap: number;
  matched: number;
};

export type RecipientsCalculations = {
  [recipient: string]: Calculation;
};

const defaultLinearQFOptions = (): LinearQFOptions => ({
  minimumAmount: 0,
  ignoreSaturation: false,
  matchingCapAmount: undefined,
});

const newCalculation = (totalReceived: number): Calculation => ({
  totalReceived,
  sumOfSqrt: 0,
  capOverflow: 0,
  matchedWithoutCap: 0,
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

  // for each recipient in aggregated.list we calculate the sum
  // of sqrt in the calculations object,
  // and we sum all the sqrt in totSqrtSum
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

  let totalCapOverflow = 0;
  let totalUnderCap = 0;

  // for each recipient in calculations
  // we calculate the final match based on
  // its sqrt and the totSqrtSum
  for (const recipient in calculations) {
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

    let match = ((val * matchAmount) / totSqrtSum) * matchRatio;
    let matchWithoutCap = match;
    let capOverflow = 0;

    if (options.matchingCapAmount !== undefined) {
      // negative if lower than the cap
      capOverflow = match - options.matchingCapAmount;

      if (capOverflow > 0) {
        match = options.matchingCapAmount;
      } else {
        totalUnderCap -= capOverflow;
      }
    }

    calculations[recipient].matchedWithoutCap = matchWithoutCap;
    calculations[recipient].matched = match;
    calculations[recipient].capOverflow = capOverflow;

    if (capOverflow > 0) {
      totalCapOverflow += capOverflow;
    }
  }

  if (options.matchingCapAmount !== undefined && totalCapOverflow > 0) {
    // redistribute the totalCapOverflow to all
    for (const recipient in calculations) {
      const recipientOverflow = calculations[recipient].capOverflow;
      if (recipientOverflow < 0) {
        // recipientOverflow is negative so we can distribute something
        // to the current recipient
        const maxAmountToCap = -recipientOverflow;
        const newMatch = (maxAmountToCap * totalUnderCap) / totalUnderCap;
        calculations[recipient].matched = newMatch;
      }
    }
  }

  return calculations;
};
