export interface Contribution {
  contributor: string;
  recipient: string;
  amount: bigint;
}

type AggregatedContribution = {
  totalReceived: bigint;
  contributions: { [contributor: string]: bigint };
};

type AggregatedContributions = {
  totalReceived: bigint;
  list: {
    [recipient: string]: AggregatedContribution;
  };
};

const BigIntMath = {
  // Babylonian method
  sqrt: (n: bigint) => {
    if (n < 0n) {
      throw new Error("Square root of negative numbers is not supported.");
    }

    if (n === 0n || n === 1n) {
      return n;
    }

    // better initial guess with n / 2
    let x = n >> 1n;
    let y = (x + 1n) >> 1n;

    while (y < x) {
      x = y;
      y = (x + n / x) >> 1n;
    }

    return x;
  },

  pow: (x: bigint, y: bigint) => x ** y,
};

export type LinearQFOptions = {
  minimumAmount: bigint;
  ignoreSaturation: boolean;
  matchingCapAmount: bigint | undefined; // an amount, not a percentage
};

export type Calculation = {
  totalReceived: bigint;
  contributionsCount: bigint;
  sumOfSqrt: bigint;
  capOverflow: bigint;
  matchedWithoutCap: bigint;
  matched: bigint;
};

export type RecipientsCalculations = {
  [recipient: string]: Calculation;
};

const defaultLinearQFOptions = (): LinearQFOptions => ({
  minimumAmount: 0n,
  ignoreSaturation: false,
  matchingCapAmount: undefined,
});

const newCalculation = (totalReceived: bigint): Calculation => ({
  totalReceived,
  contributionsCount: 0n,
  sumOfSqrt: 0n,
  capOverflow: 0n,
  matchedWithoutCap: 0n,
  matched: 0n,
});

export const aggregateContributions = (
  contributions: Contribution[],
  options: LinearQFOptions
): AggregatedContributions => {
  const ag: AggregatedContributions = {
    totalReceived: 0n,
    list: {},
  };

  for (const contribution of contributions) {
    if (contribution.amount < options.minimumAmount) {
      continue;
    }

    ag.list[contribution.recipient] ||= {
      totalReceived: 0n,
      contributions: {},
    };

    ag.totalReceived += contribution.amount;
    ag.list[contribution.recipient].totalReceived += contribution.amount;
    ag.list[contribution.recipient].contributions[contribution.contributor] ||=
      0n;
    ag.list[contribution.recipient].contributions[contribution.contributor] +=
      contribution.amount;
  }

  return ag;
};

export const linearQF = (
  rawContributions: Contribution[],
  matchAmount: bigint,
  decimalsPrecision: bigint,
  options: LinearQFOptions = defaultLinearQFOptions()
) => {
  const aggregated: AggregatedContributions = aggregateContributions(
    rawContributions,
    options
  );
  const calculations: RecipientsCalculations = {};

  let totalSqrtSum = 0n;

  // for each recipient in aggregated.list we calculate the sum
  // of sqrt in the calculations object,
  // and we sum all the sqrt in totalSqrtSum
  for (const recipient in aggregated.list) {
    let totalRecipientSqrtSum = 0n;
    // for each recipient contribution aggregated by contributor
    for (const contributor in aggregated.list[recipient].contributions) {
      const amount = aggregated.list[recipient].contributions[contributor];
      const sqrt = BigIntMath.sqrt(amount);

      calculations[recipient] ||= newCalculation(
        aggregated.list[recipient].totalReceived
      );

      calculations[recipient].contributionsCount += 1n;
      calculations[recipient].sumOfSqrt += sqrt;
      totalRecipientSqrtSum += sqrt;
    }

    if (calculations[recipient].contributionsCount > 1) {
      totalSqrtSum +=
        BigIntMath.pow(totalRecipientSqrtSum, 2n) -
        calculations[recipient].totalReceived;
    }
  }

  let totalCapOverflow = 0n;
  let totalUnderCap = 0n;
  let totalMatchedFromUncapped = 0n;

  // for each recipient in calculations
  // we calculate the final match based on
  // its sqrt and the totalSqrtSum
  for (const recipient in calculations) {
    let val = 0n;
    if (calculations[recipient].contributionsCount > 1n) {
      val =
        BigIntMath.pow(calculations[recipient].sumOfSqrt, 2n) -
        calculations[recipient].totalReceived;
    }

    const scalingFactor = 10n ** decimalsPrecision;
    let matchRatio = 1n * scalingFactor;

    if (
      aggregated.totalReceived < matchAmount &&
      options.ignoreSaturation === false
    ) {
      matchRatio = (aggregated.totalReceived * scalingFactor) / matchAmount;
    }

    let match = 0n;

    if (totalSqrtSum > 0) {
      match =
        (((val * matchAmount) / totalSqrtSum) * matchRatio) / scalingFactor;
    }

    const matchWithoutCap = match;
    let capOverflow = 0n;

    if (options.matchingCapAmount !== undefined) {
      // negative if lower than the cap
      capOverflow = match - options.matchingCapAmount;

      if (capOverflow > 0n) {
        match = options.matchingCapAmount;
      } else {
        totalUnderCap = totalUnderCap - capOverflow;
        totalMatchedFromUncapped += match;
      }
    }

    calculations[recipient].matchedWithoutCap = matchWithoutCap;
    calculations[recipient].matched = match;
    calculations[recipient].capOverflow = capOverflow;

    if (capOverflow > 0n) {
      totalCapOverflow += capOverflow;
    }
  }

  // if everyone is over the cap, but there's no one eligible
  // for the distribution of the overflow
  if (totalMatchedFromUncapped === 0n) {
    return calculations;
  }

  if (options.matchingCapAmount !== undefined && totalCapOverflow > 0n) {
    // redistribute the totalCapOverflow to all

    let totalLeft = totalCapOverflow;

    while (totalLeft > 0n) {
      let iterationTotalDistribution = 0n;

      for (const recipient in calculations) {
        const recipientOverflow = calculations[recipient].capOverflow;
        if (recipientOverflow < 0n) {
          // recipientOverflow is negative so we can distribute something
          // to the current recipient
          // matched : totalMatchedFromUncapped = x : totalLeft
          const additionalMatch =
            (calculations[recipient].matched * totalLeft) /
            totalMatchedFromUncapped;

          let newMatch = calculations[recipient].matched + additionalMatch;

          if (newMatch >= options.matchingCapAmount) {
            const distributed =
              options.matchingCapAmount - calculations[recipient].matched;
            iterationTotalDistribution += distributed;
            newMatch = options.matchingCapAmount;
            calculations[recipient].capOverflow = 0n;
          } else {
            iterationTotalDistribution += additionalMatch;
            calculations[recipient].capOverflow += additionalMatch;
          }

          calculations[recipient].matched = newMatch;
        }
      }

      if (iterationTotalDistribution === 0n) {
        break;
      }

      totalLeft -= iterationTotalDistribution;
    }
  }

  return calculations;
};
