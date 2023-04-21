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

// BigInt literals (0n) are not available when targeting lower than ES2020
const zero = BigInt(0);
const one = BigInt(1);
const two = BigInt(2);

const BigIntMath = {
  sqrt: (n: bigint) => {
    if (n < zero) {
      throw new Error("Square root of negative numbers is not supported.");
    }

    if (n === zero || n === one) {
      return n;
    }

    let x = n;
    let y = (x + one) >> one;

    while (y < x) {
      x = y;
      y = (x + n / x) >> one;
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
  sumOfSqrt: bigint;
  capOverflow: bigint;
  matchedWithoutCap: bigint;
  matched: bigint;
};

export type RecipientsCalculations = {
  [recipient: string]: Calculation;
};

const defaultLinearQFOptions = (): LinearQFOptions => ({
  minimumAmount: zero,
  ignoreSaturation: false,
  matchingCapAmount: undefined,
});

const newCalculation = (totalReceived: bigint): Calculation => ({
  totalReceived,
  sumOfSqrt: zero,
  capOverflow: zero,
  matchedWithoutCap: zero,
  matched: zero,
});

export const aggregateContributions = (
  contributions: Contribution[],
  options: LinearQFOptions
): AggregatedContributions => {
  const ag: AggregatedContributions = {
    totalReceived: zero,
    list: {},
  };

  for (const contribution of contributions) {
    if (contribution.amount < options.minimumAmount) {
      continue;
    }

    ag.list[contribution.recipient] ||= {
      totalReceived: zero,
      contributions: {},
    };

    ag.totalReceived += contribution.amount;
    ag.list[contribution.recipient].totalReceived += contribution.amount;
    ag.list[contribution.recipient].contributions[contribution.contributor] ||=
      zero;
    ag.list[contribution.recipient].contributions[contribution.contributor] +=
      contribution.amount;
  }

  return ag;
};

export const linearQF = (
  rawContributions: Contribution[],
  matchAmount: bigint,
  options: LinearQFOptions = defaultLinearQFOptions()
) => {
  const aggregated: AggregatedContributions = aggregateContributions(
    rawContributions,
    options
  );
  const calculations: RecipientsCalculations = {};

  let totalSqrtSum = zero;

  // for each recipient in aggregated.list we calculate the sum
  // of sqrt in the calculations object,
  // and we sum all the sqrt in totalSqrtSum
  for (const recipient in aggregated.list) {
    let totalRecipientSqrtSum = zero;
    // for each recipient contribution aggregated by contributor
    for (const contributor in aggregated.list[recipient].contributions) {
      const amount = aggregated.list[recipient].contributions[contributor];
      const sqrt = BigIntMath.sqrt(amount);

      calculations[recipient] ||= newCalculation(
        aggregated.list[recipient].totalReceived
      );

      calculations[recipient].sumOfSqrt += sqrt;
      totalRecipientSqrtSum += sqrt;
    }

    totalSqrtSum +=
      BigIntMath.pow(totalRecipientSqrtSum, two) -
      calculations[recipient].totalReceived;
  }

  let totalCapOverflow = zero;
  let totalUnderCap = zero;
  let totalMatchedFromUncapped = zero;

  // for each recipient in calculations
  // we calculate the final match based on
  // its sqrt and the totalSqrtSum
  for (const recipient in calculations) {
    const val =
      BigIntMath.pow(calculations[recipient].sumOfSqrt, two) -
      calculations[recipient].totalReceived;

    const x = BigInt(100_000_000);
    let matchRatio = one * x;

    if (
      aggregated.totalReceived < matchAmount &&
      options.ignoreSaturation === false
    ) {
      matchRatio = (aggregated.totalReceived * x) / matchAmount;
    }

    let match = (((val * matchAmount) / totalSqrtSum) * matchRatio) / x;
    const matchWithoutCap = match;
    let capOverflow = zero;

    if (options.matchingCapAmount !== undefined) {
      // negative if lower than the cap
      capOverflow = match - options.matchingCapAmount;

      if (capOverflow > zero) {
        match = options.matchingCapAmount;
      } else {
        totalUnderCap = totalUnderCap - capOverflow;
        totalMatchedFromUncapped += match;
      }
    }

    calculations[recipient].matchedWithoutCap = matchWithoutCap;
    calculations[recipient].matched = match;
    calculations[recipient].capOverflow = capOverflow;

    if (capOverflow > zero) {
      totalCapOverflow += capOverflow;
    }
  }

  if (options.matchingCapAmount !== undefined && totalCapOverflow > zero) {
    // redistribute the totalCapOverflow to all
    for (const recipient in calculations) {
      const recipientOverflow = calculations[recipient].capOverflow;
      if (recipientOverflow < zero) {
        // recipientOverflow is negative so we can distribute something
        // to the current recipient
        const additionalMatch =
          (calculations[recipient].matched * totalCapOverflow) /
          totalMatchedFromUncapped;
        const newMatch = calculations[recipient].matched + additionalMatch;
        calculations[recipient].matched = newMatch;
      }
    }
  }

  return calculations;
};
